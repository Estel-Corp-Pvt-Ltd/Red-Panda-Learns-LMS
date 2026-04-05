import type { Currency } from "@/types/general";
import { Address } from "@/types/order";
import { TransactionLineItem } from "@/types/transaction";
import { fail, ok, Result } from "@/utils/response";
import { authService } from "../authService";

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

/** Lazily load the Razorpay checkout script only when needed */
let razorpayLoaded: Promise<void> | null = null;
function loadRazorpayScript(): Promise<void> {
  if ((window as any).Razorpay) return Promise.resolve();
  if (razorpayLoaded) return razorpayLoaded;
  razorpayLoaded = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay SDK"));
    document.head.appendChild(script);
  });
  return razorpayLoaded;
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
      const idempotencyKey = `order_${Date.now()}_${crypto.randomUUID()}`;

      const response = await fetch(`${this.backendUrl}/createRazorpayOrder`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          provider: "RAZORPAY",
          items,
          selectedCurrency,
          billingAddress,
          promoCode,
        }),
      });

      if (!response.ok) {
        return fail("Failed to create order");
      }

      const data = await response.json();
      return ok(data);
    } catch (error) {
      console.error("RazorpayProvider - Create order failed:", error);
      return fail("Failed to create order");
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

      // Load Razorpay script on demand
      await loadRazorpayScript();
      if (!(window as any).Razorpay) {
        throw new Error("Razorpay payment gateway not available");
      }

      const options = {
        key: key_id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        order_id: razorpayOrder.id,
        name: "RedPanda Learns",
        description: this.getOrderDescription(items),
        prefill: {
          email: userEmail,
          name: billingAddress.fullName || "",
          contact: billingAddress.phone || "",
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
        orderId: orderId,
      });
    } catch (error) {
      onPaymentFail?.(error instanceof Error ? error.message : "Payment processing failed");
      console.error("RazorpayProvider - Payment processing failed:", error);
      return fail(error instanceof Error ? error.message : "Payment processing failed");
    }
  }

  private getOrderDescription(items: TransactionLineItem[]): string {
    const itemNames = items.map((item) => item.name);
    if (itemNames.length === 1) {
      return `Purchase: ${itemNames[0]}`;
    }
    return `Purchase: ${itemNames.length} items`;
  }
}

export const razorpayProvider = new RazorpayProvider();
