// RazorpayProvider.ts
import { Course } from '@/types/course';
import { transactionService } from '../transactionService';
import { enrollmentService } from '../enrollmentService';
import { CURRENCY, ENROLLED_PROGRAM_TYPE, TRANSACTION_STATUS } from '@/constants';
import { PaymentDetails } from '@/types/transaction';
import type { Currency } from '@/types/general';
import { TransactionLineItem } from '@/types/transaction';

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
};

class RazorpayProvider {
  private readonly backendUrl = import.meta.env.VITE_BACKEND_URL;

  async createOrder(
    amount: number,                // final amount in display units (e.g., 12.34 USD)
    currency: string,              // 'INR' | 'USD' | ...
    receipt: string,
    transactionId: string,
    notes?: Record<string, string> // optional: pass quoteId, courseId, userId
  ): Promise<any> {
    const safeReceipt = (receipt || "").substring(0, 40);

    const payload = {
      rawamount: amount,
      rawcurrency: currency,
      receipt: safeReceipt,
      notes,                       // backend can forward to Razorpay `notes`
    };

    // Helpful debug
    console.log('RazorpayProvider.createOrder payload:', payload);

    const response = await fetch(`${this.backendUrl}/createOrder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': transactionId,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      // Try to extract the real error
      let message = 'Failed to create order';
      try {
        const err = await response.json();
        message = err?.message || err?.error || message;
        console.error('createOrder failed:', response.status, err);
      } catch {
        const text = await response.text();
        console.error('createOrder failed (non-JSON):', response.status, text);
        if (text) message = text;
      }
      throw new Error(message);
    }

    return response.json();
  }

  // CHANGED: accept payCurrency + optional quoteId
  async processPayment(
  courseOrItems: Course | TransactionLineItem[],
  userEmail: string,
  transactionId: string,
  amount: number,               // should be the final total in selected currency
  userId: string,
  payCurrency: Currency = CURRENCY.INR,
  quoteId?: string              // to let backend verify pricing
): Promise<{ success: boolean; transactionId?: string; paymentId?: string; error?: string }> {
  return new Promise(async (resolve) => {
    try {
      // ✅ Normalize to items[]
      const items: TransactionLineItem[] = Array.isArray(courseOrItems)
        ? courseOrItems
        : [{
            itemId: courseOrItems.id,
            itemType: (courseOrItems as any).isBundle ? ENROLLED_PROGRAM_TYPE.BUNDLE : ENROLLED_PROGRAM_TYPE.COURSE,
            name: courseOrItems.title,
            amount,
          }];

      const displayName =
        items.length === 1
          ? items[0].name
          : `${items.length} items (${items.map(i => i.name).join(", ")})`;

      console.log("RazorpayProvider - Starting payment process:", {
        transactionId,
        amount,
        payCurrency,
        userId,
        items,
      });

      // Create order on backend
      const orderData = await this.createOrder(
        amount,
        payCurrency,
        transactionId,
        transactionId,
        { quoteId, userId, itemIds: items.map(i => i.itemId).join(",") }
      );

      console.log("RazorpayProvider - Order Data", orderData);

      if (!orderData.success) {
        throw new Error(orderData.error || "Order creation failed");
      }

      const { order, key_id } = orderData;

      await transactionService.updateTransactionStatus(
        transactionId,
        TRANSACTION_STATUS.PROCESSING,
        { orderId: order.id }
      );

      const options = {
        key: key_id,
        amount: order.amount,      // subunits from backend
        currency: order.currency,  // matches payCurrency
        order_id: order.id,
        name: "Vizuara AI Labs",
        description: `Enrollment for ${displayName}`,
        prefill: { email: userEmail },
        theme: { color: "#3b82f6" },
        handler: async (response: any) => {
          console.log("Razorpay payment successful:", response);
          try {
            const verificationResponse = await fetch(`${this.backendUrl}/verifyPayment`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                transaction_id: transactionId,
                quote_id: quoteId, // let backend tie to same quote
              }),
            });

            const verificationData = await verificationResponse.json();

            if (verificationData.success) {
              await transactionService.updateTransactionStatus(
                transactionId,
                TRANSACTION_STATUS.COMPLETED,
                {
                  orderId: order.id,
                  paymentId: response.razorpay_payment_id,
                  signature: response.razorpay_signature,
                }
              );

              // ✅ Handle enrollments for each purchased item
              for (const item of items) {
                try {
                  await enrollmentService.enrollUser(
                    userId,
                    item.itemId,
                    item.itemType
                  );
                } catch (enrollmentError) {
                  console.error("RazorpayProvider - Enrollment failed:", enrollmentError, item);
                }
              }

              resolve({
                success: true,
                transactionId,
                paymentId: response.razorpay_payment_id,
              });
            } else {
              console.log("RazorpayProvider - Payment verification failed");
              throw new Error(verificationData.error || "Payment verification failed");
            }
          } catch (error) {
            console.error("RazorpayProvider - Payment verification failed:", error);
            await transactionService.updateTransactionStatus(
              transactionId,
              TRANSACTION_STATUS.FAILED,
              {} as PaymentDetails,
              "Payment verification failed"
            );
            resolve({ success: false, error: "Payment verification failed" });
          }
        },
        modal: {
          ondismiss: async () => {
            console.log("RazorpayProvider - Payment dismissed by user");
            await transactionService.updateTransactionStatus(
              transactionId,
              TRANSACTION_STATUS.CANCELLED,
              {} as PaymentDetails,
              "Payment cancelled by user"
            );
            resolve({ success: false, error: "Payment cancelled by user" });
          },
        },
      };

      // Open Razorpay modal
      if (typeof window !== "undefined" && (window as any).Razorpay) {
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      } else {
        await transactionService.updateTransactionStatus(
          transactionId,
          TRANSACTION_STATUS.FAILED,
          {} as PaymentDetails,
          "Razorpay SDK not loaded"
        );
        resolve({ success: false, error: "Razorpay SDK not loaded" });
      }
    } catch (error) {
      console.error("RazorpayProvider - Payment failed:", error);
      await transactionService.updateTransactionStatus(
        transactionId,
        TRANSACTION_STATUS.FAILED,
        {} as PaymentDetails,
        error instanceof Error ? error.message : "Unknown error"
      );
      resolve({
        success: false,
        error: error instanceof Error ? error.message : "Payment failed. Please try again.",
      });
    }
  });
}

}

export const razorpayProvider = new RazorpayProvider();