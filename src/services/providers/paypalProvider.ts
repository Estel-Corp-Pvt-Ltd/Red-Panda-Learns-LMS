import { ENVIRONMENT, TRANSACTION_STATUS } from "@/constants";
import { Currency } from "@/types/general";
import { PaymentDetails, TransactionLineItem } from "@/types/transaction";
import { transactionService } from "../transactionService";
import { Address } from "@/types/order";
import { ok, Result } from "@/utils/response";
import { authService } from "../authService";

export interface PaypalOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
}

interface CreateOrderResponse {
  orderId: string;
  paypalOrder: PaypalOrder;
  currency: Currency;
  amount: number;
}

class PayPalProvider {
  private readonly environment =
    import.meta.env.VITE_APP_ENVIRONMENT === ENVIRONMENT.PRODUCTION
      ? ENVIRONMENT.PRODUCTION
      : ENVIRONMENT.DEVELOPMENT;

  private readonly clientId =
    this.environment === ENVIRONMENT.DEVELOPMENT
      ? import.meta.env.VITE_PAYPAL_SANDBOX_CLIENT_ID
      : import.meta.env.VITE_PAYPAL_LIVE_CLIENT_ID;

  private sdkLoaded = false;
  private buttonInstance: any = null;

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

      const response = await fetch(`${this.backendUrl}/createPaypalOrder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          provider: "PAYPAL",
          items,
          selectedCurrency,
          billingAddress,
          promoCode
        }),
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
          console.error("❌ Backend error:", errorData);
        } catch {
          const text = await response.text();
          console.error("❌ Non-JSON response:", text.substring(0, 500));
        }
        throw new Error(errorMessage);
      }

      if (!response.ok) {
        return fail('Failed to create order');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to create order");
      }

      return ok(data);
    } catch (error) {
      console.error('RazorpayProvider - Create order failed:', error);
      return fail('Failed to create order');
    }
  }

  /** Dynamically load PayPal SDK */
  async loadPayPalSDK(currency: Currency): Promise<void> {
    if (this.sdkLoaded && (window as any).paypal?.Buttons) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(
        'script[src*="paypal.com/sdk/js"]'
      );

      if (existing && (window as any).paypal?.Buttons) {
        this.sdkLoaded = true;
        resolve();
        return;
      }

      if (existing) {
        existing.remove();
        delete (window as any).paypal;
        delete (window as any).zoid;
      }

      const host =
        this.environment === ENVIRONMENT.DEVELOPMENT
          ? "sandbox.paypal.com"
          : "paypal.com";

      const script = document.createElement("script");
      script.src = `https://${host}/sdk/js?client-id=${this.clientId}&currency=${currency}&intent=capture`;
      script.async = true;

      script.onload = () => {
        this.waitForPayPalReady()
          .then(() => {
            this.sdkLoaded = true;
            resolve();
          })
          .catch(reject);
      };

      script.onerror = () => reject(new Error("Failed to load PayPal SDK"));
      document.head.appendChild(script);
    });
  }

  /** Wait for PayPal SDK to be fully initialized */
  private waitForPayPalReady(maxAttempts = 20, interval = 100): Promise<void> {
    return new Promise((resolve, reject) => {
      let attempts = 0;

      const checkReady = () => {
        attempts++;

        if ((window as any).paypal?.Buttons) {

          resolve();
          return;
        }

        if (attempts >= maxAttempts) {
          reject(new Error("PayPal SDK failed to initialize"));
          return;
        }

        setTimeout(checkReady, interval);
      };

      checkReady();
    });
  }

  /** Launches the PayPal payment flow */
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
      // const orderData = await this.createOrder(items, billingAddress, selectedCurrency, promoCode);

      // if (!orderData.success || !orderData.data) {
      //   throw new Error("Order creation failed");
      // }

      // const { orderId, paypalOrder, key_id } = orderData.data;

      await this.loadPayPalSDK(selectedCurrency);

      return new Promise((resolve) => {
        const paypal = (window as any).paypal;
        const container = document.getElementById("paypal-button-container");

        if (!container) {
          resolve({
            success: false,
            // error: "PayPal button container not found.",
          });
          return;
        }

        if (!paypal || typeof paypal.Buttons !== "function") {
          console.error("PayPal SDK not ready:", paypal);
          resolve({
            success: false,
            // error: "PayPal SDK failed to initialize correctly.",
          });
          return;
        }

        // ✅ Clear existing buttons
        container.innerHTML = "";

        try {
          this.buttonInstance = paypal.Buttons({
            style: {
              layout: "vertical",
              color: "gold",
              shape: "rect",
              label: "paypal",
            },

            // ✅ CREATE ORDER VIA BACKEND
            createOrder: async () => {
              try {
                const orderData = await this.createOrder(items, billingAddress, selectedCurrency, promoCode);
                if (!orderData.success || !orderData.data) {
                  throw new Error("Order creation failed");
                }
                const { paypalOrder } = orderData.data;
                return paypalOrder.id;
              } catch (error) {
                console.error("❌ Create order failed:", error);
                throw error;
              }
            },

            // ✅ CAPTURE PAYMENT VIA BACKEND
            onApprove: async (data: any) => {
              console.log("PayPal onApprove called:", data);
              // try {
              //   const url = `${import.meta.env.VITE_BACKEND_URL}/capturePaypalOrder`;

              //   const response = await fetch(url, {
              //     method: "POST",
              //     headers: { "Content-Type": "application/json" },
              //     body: JSON.stringify({
              //       orderId: data.orderID,
              //       transactionId,
              //       userId,
              //     }),
              //   });

              //   // ✅ Read response text first (can only read once!)
              //   const responseText = await response.text();
              //   // console.log("Response status:", response.status);
              //   // console.log("Response body:", responseText);

              //   // ✅ Try to parse as JSON
              //   let result;
              //   try {
              //     result = JSON.parse(responseText);
              //   } catch (parseError) {
              //     console.error("❌ Failed to parse response as JSON:", responseText);
              //     throw new Error(`Server error: ${response.statusText}`);
              //   }

              //   // ✅ Check if successful
              //   if (!response.ok) {
              //     const errorMessage = result.error || `HTTP ${response.status}: ${response.statusText}`;
              //     console.error("❌ Backend error:", result);
              //     throw new Error(errorMessage);
              //   }

              //   if (result.success) {
              //     // console.log("✅ Payment captured successfully");
              //     resolve({
              //       success: true,
              //       transactionId,
              //       paymentId: result.paymentId,
              //     });
              //   } else {
              //     throw new Error(result.error || "Capture failed");
              //   }
              // } catch (error) {
              //   console.error("❌ Capture failed:", error);
              //   resolve({
              //     success: false,
              //     error: error instanceof Error ? error.message : "Payment capture failed",
              //   });
              // }
            },

            onCancel: async (data: any) => {
              console.warn("PayPal payment cancelled:", data);
              // await transactionService.updateTransactionStatus(
              //   transactionId,
              //   TRANSACTION_STATUS.CANCELLED,
              //   {} as PaymentDetails,
              //   "Payment cancelled by user"
              // );
              resolve({ success: false, error: new Error("Payment cancelled by user") });
            },

            onError: async (error: any) => {
              console.error("PayPal error:", error);
              // await transactionService.updateTransactionStatus(
              //   transactionId,
              //   TRANSACTION_STATUS.FAILED,
              //   {} as PaymentDetails,
              //   error?.message || "PayPal payment error"
              // );
              resolve({
                success: false,
                error: new Error("PayPal payment failed. Please try again."),
              });
            },
          });

          // ✅ Render buttons
          this.buttonInstance.render("#paypal-button-container").catch((err: Error) => {
            console.error("Failed to render PayPal buttons:", err);
            resolve({ success: false, error: new Error("Failed to render PayPal buttons") });
          });

        } catch (renderErr) {
          console.error("Error creating PayPal buttons:", renderErr);
          resolve({ success: false, error: new Error("Failed to initialize PayPal buttons") });
        }
      });
    } catch (error) {
      console.error("PayPal setup failed:", error);
      return { success: false, error: new Error("PayPal payment setup failed") };
    }
  }

  /** Clean up method */
  cleanup() {
    const container = document.getElementById("paypal-button-container");
    if (container) {
      container.innerHTML = "";
    }
    if (this.buttonInstance) {
      try {
        this.buttonInstance.close?.();
      } catch (e) {
        console.warn("Error closing PayPal button:", e);
      }
      this.buttonInstance = null;
    }
  }
}

export const paypalProvider = new PayPalProvider();
