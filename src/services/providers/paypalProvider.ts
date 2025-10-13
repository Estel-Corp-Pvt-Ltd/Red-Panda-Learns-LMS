import { Course } from '@/types/course';
import { transactionService } from '../transactionService';
import { enrollmentService } from '@/services/dummyEnrollmentService';
import { CURRENCY, ENVIRONMENT, TRANSACTION_STATUS } from '@/constants';
import { PaymentDetails } from '@/types/transaction';
import { Currency } from '@/types/general';

class PayPalProvider {
  private readonly environment =
    import.meta.env.VITE_APP_ENVIRONMENT === ENVIRONMENT.PRODUCTION
      ? ENVIRONMENT.PRODUCTION
      : ENVIRONMENT.SANDBOX;

  private readonly clientId =
    this.environment === ENVIRONMENT.SANDBOX
      ? import.meta.env.VITE_PAYPAL_SANDBOX_CLIENT_ID
      : import.meta.env.VITE_PAYPAL_LIVE_CLIENT_ID;

  /**
   * Dynamically load PayPal SDK for the selected currency.
   * If another currency SDK is already loaded, reload it.
   */
  async loadPayPalSDK(currency: Currency): Promise<void> {
    return new Promise((resolve, reject) => {
      // Avoid double‑loading mismatched SDKs
      const existing = document.querySelector<HTMLScriptElement>(
        `script[src*="paypal.com/sdk/js"]`
      );

      // If SDK exists but currency differs → reload
      if (existing) {
        const alreadyLoadedFor = new URL(existing.src).searchParams.get("currency");
        if (alreadyLoadedFor !== currency) {
          existing.remove();
          (window as any).paypal = undefined;
        } else if ((window as any).paypal) {
          resolve();
          return;
        }
      }

      const script = document.createElement("script");
      script.src = `https://www.${
        this.environment === ENVIRONMENT.SANDBOX ? "sandbox.paypal.com" : "paypal.com"
      }/sdk/js?client-id=${this.clientId}&currency=${currency}&intent=capture`;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load PayPal SDK"));
      document.head.appendChild(script);
    });
  }

  /**
   * Launches the PayPal payment flow.
   */
  async processPayment(
    course: Course,
    userEmail: string,
    transactionId: string,
    amount: number,
    userId: string,
    currency: Currency
  ): Promise<{
    success: boolean;
    transactionId?: string;
    paymentId?: string;
    error?: string;
  }> {
    try {
      console.log("PayPalProvider - Starting payment:", {
        courseId: course.id,
        transactionId,
        amount,
        currency,
      });

      await this.loadPayPalSDK(currency);

      return new Promise((resolve) => {
        transactionService.updateTransactionStatus(
          transactionId,
          TRANSACTION_STATUS.PROCESSING
        );

        const paypal = (window as any).paypal;
        if (!paypal) {
          resolve({
            success: false,
            error: "PayPal SDK failed to load properly.",
          });
          return;
        }

        paypal
          .Buttons({
            createOrder: async (_data: any, actions: any) => {
              return actions.order.create({
                intent: "CAPTURE",
                purchase_units: [
                  {
                    amount: {
                      currency_code: currency,
                      value: amount.toFixed(2),
                    },
                    description: `Enrollment for ${course.title}`,
                    custom_id: transactionId,
                  },
                ],
                application_context: {
                  shipping_preference: "NO_SHIPPING",
                },
              });
            },

            onApprove: async (_data: any, actions: any) => {
              try {
                const order = await actions.order.capture();
                console.log("PayPal payment successful:", order);

                const capture =
                  order.purchase_units?.[0]?.payments?.captures?.[0];

                await transactionService.updateTransactionStatus(
                  transactionId,
                  TRANSACTION_STATUS.COMPLETED,
                  {
                    orderId: order.id,
                    payerId: order.payer?.payer_id,
                    paymentId: capture?.id,
                    intent: order.intent,
                    status: order.status,
                  }
                );

                try {
                  await enrollmentService.enrollUser(
                    userId,
                    course.id,
                    capture?.id,
                    "paypal"
                  );
                  console.log("Enrollment after PayPal payment complete");
                } catch (err) {
                  console.error("Enrollment failed after PayPal payment:", err);
                }

                resolve({
                  success: true,
                  transactionId,
                  paymentId: capture?.id,
                });
              } catch (error) {
                console.error("PayPal capture error:", error);
                await transactionService.updateTransactionStatus(
                  transactionId,
                  TRANSACTION_STATUS.FAILED,
                  {} as PaymentDetails,
                  "PayPal capture failed"
                );
                resolve({
                  success: false,
                  error: "Payment capture failed",
                });
              }
            },

            onCancel: async (data: any) => {
              console.log("PayPal cancelled:", data);
              await transactionService.updateTransactionStatus(
                transactionId,
                TRANSACTION_STATUS.CANCELLED,
                {} as PaymentDetails,
                "Payment cancelled by user"
              );
              resolve({
                success: false,
                error: "Payment cancelled by user",
              });
            },

            onError: async (err: any) => {
              console.error("PayPal onError:", err);
              await transactionService.updateTransactionStatus(
                transactionId,
                TRANSACTION_STATUS.FAILED,
                {} as PaymentDetails,
                err?.message || "PayPal payment error"
              );
              resolve({
                success: false,
                error: "PayPal payment failed. Please try again.",
              });
            },
          })
          .render("#paypal-button-container");
      });
    } catch (error) {
      console.error("PayPal payment setup failed:", error);
      await transactionService.updateTransactionStatus(
        transactionId,
        TRANSACTION_STATUS.FAILED,
        {} as PaymentDetails,
        error instanceof Error ? error.message : "PayPal SDK load failed"
      );
      return {
        success: false,
        error: "PayPal payment setup failed",
      };
    }
  }
}

export const paypalProvider = new PayPalProvider();