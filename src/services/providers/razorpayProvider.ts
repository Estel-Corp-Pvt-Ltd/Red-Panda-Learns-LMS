import type { Currency } from '@/types/general';
import { Address } from '@/types/order';
import { TransactionLineItem } from '@/types/transaction';
import { fail, ok, Result } from '@/utils/response';
import { authService } from '../authService';

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
}

interface CreateOrderResponse {
  orderId: string;
  razorpayOrder: RazorpayOrder;
  key_id: string;
  current: Currency;
  amount: number;
}

class RazorpayProvider {
  
  private readonly backendUrl = import.meta.env.VITE_BACKEND_URL;

  async createOrder(
    items: TransactionLineItem[],
    billingAddress: Address,
    selectedCurrency: Currency,
    promoCode?: string
  ): Promise<Result<CreateOrderResponse>> {
    try {
      const idToken = await authService.getToken();
      const idempotencyKey = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const response = await fetch(`${this.backendUrl}/createRazorpayOrder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          provider: "RAZORPAY",
          items,
          selectedCurrency,
          billingAddress,
          promoCode
        }),
      });

      if (!response.ok) {
        return fail('Failed to create order');
      }

      const data = await response.json();
      return ok(data);
    } catch (error) {
      console.error('RazorpayProvider - Create order failed:', error);
      return fail('Failed to create order');
    }
  }

  async processPayment(
    items: TransactionLineItem[],
    billingAddress: Address,
    selectedCurrency: Currency,
    userEmail: string,
    promoCode?: string,
    onPaymentSuccess?: (orderId: string) => void,
    onPaymentFail?: (message: string) => void
  ): Promise<Result<{ orderId: string }>> {
    try {
      // Create order on backend
      const orderData = await this.createOrder(items, billingAddress, selectedCurrency, promoCode);

      if (!orderData.success || !orderData.data) {
        throw new Error("Order creation failed");
      }

      const { orderId, razorpayOrder, key_id } = orderData.data;

      // Validate Razorpay availability
      if (typeof window === "undefined" || !(window as any).Razorpay) {
        throw new Error("Razorpay payment gateway not available");
      }

      const options = {
        key: key_id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        order_id: razorpayOrder.id,
        name: "Vizuara AI Labs",
        description: this.getOrderDescription(items),
        prefill: {
          email: userEmail,
          name: billingAddress.fullName || '',
          contact: billingAddress.phone || ''
        },
        theme: { color: "#3b82f6" },
        handler: () => {
          onPaymentSuccess?.(orderId);
        },
        modal: {
          ondismiss: () => {
            // this.handlePaymentCancellation(orderId);
          },
        },
      };

      // Open Razorpay modal
      const rzp = new (window as any).Razorpay(options);
      rzp.open();

      return ok({
        orderId: orderId
      });

    } catch (error) {
      onPaymentFail?.(error instanceof Error ? error.message : "Payment processing failed");
      console.error("RazorpayProvider - Payment processing failed:", error);
      return fail(error instanceof Error ? error.message : "Payment processing failed");
    }
  }

  private getOrderDescription(items: TransactionLineItem[]): string {
    const itemNames = items.map(item => item.name);
    if (itemNames.length === 1) {
      return `Purchase: ${itemNames[0]}`;
    }
    return `Purchase: ${itemNames.length} items`;
  }
}

export const razorpayProvider = new RazorpayProvider();
