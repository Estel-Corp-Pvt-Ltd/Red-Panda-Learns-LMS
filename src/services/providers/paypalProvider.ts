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
  paypalOrder: any;
  currency: Currency;
  amount: number;
  success: boolean;
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
  private paypalWindow: Window | null = null;

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
          items: items.map(item => ({
            itemId: item.itemId,
            itemType: item.itemType,
          })),
          selectedCurrency,
          billingAddress,
          promoCode
        }),
      });

      if (!response.ok) {
        return { success: false, error: new Error('Failed to create order') };
      }

      const data = await response.json();
      console.log('PaypalProvider - Create order response:', data);
      if (!data.success) {
        throw new Error(data.error || "Failed to create order");
      }

      return ok(data);
    } catch (error) {
      console.error('PaypalProvider - Create order failed:', error);
      return { success: false, error: new Error('Failed to create order') };
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

  /** Open PayPal popup window */
  private openPayPalPopup(paypalOrder: any): Window | null {
    // Find the approval link from the PayPal order response
    const approvalLink = paypalOrder.links.find(
      (link: any) => link.rel === "approve"
    );

    if (!approvalLink) {
      throw new Error("No approval link found in PayPal order");
    }

    // Calculate popup dimensions and position
    const width = 600;
    const height = 700;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;

    // Open the popup window with PayPal approval URL
    const popup = window.open(
      approvalLink.href,
      "PayPal",
      `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes,toolbar=no,location=no,menubar=no,status=no`
    );

    if (!popup) {
      throw new Error("Popup blocked. Please allow popups for this site.");
    }

    return popup;
  }

  /** Monitor PayPal popup for completion */
  private monitorPopup(
    popup: Window,
    orderId: string,
    onPaymentSuccess: (orderId: string) => void,
    onPaymentFail: (message: string) => void
  ): Promise<{ orderId: string }> {
    return new Promise((resolve, reject) => {
      console.log("Monitoring PayPal popup for payment completion...");
      // Check popup status periodically
      const interval = setInterval(() => {
        if (popup.closed) {
          clearInterval(interval);
          clearInterval(urlCheckInterval);

          // User closed the popup without completing payment
          onPaymentFail("Payment cancelled or popup closed");
          reject(new Error("Payment cancelled"));
        }
      }, 500);

      // Monitor URL changes in the popup for success/failure
      const urlCheckInterval = setInterval(() => {
        try {
          const currentUrl = popup.location.href;
          console.log("Monitoring PayPal popup URL:", currentUrl);
          // Check for success URLs (PayPal redirects)
          if (currentUrl.includes('/payment-success') ||
            currentUrl.includes('status=COMPLETED') ||
            currentUrl.includes('/capture/')) {

            clearInterval(interval);
            clearInterval(urlCheckInterval);

            // Small delay to ensure PayPal has processed everything
            setTimeout(() => {
              onPaymentSuccess(orderId);
              resolve({ orderId });
              popup.close();
            }, 1000);
          }

          // Check for failure/cancellation
          if (currentUrl.includes('/payment-cancel') ||
            currentUrl.includes('status=CANCELLED') ||
            currentUrl.includes('/cancel/')) {

            clearInterval(interval);
            clearInterval(urlCheckInterval);

            onPaymentFail("Payment cancelled by user");
            reject(new Error("Payment cancelled by user"));
            popup.close();
          }
        } catch (error) {
          console.error("Error monitoring PayPal popup:", error);
          // Cross-origin errors are expected when checking popup URL
        }
      }, 500);

      // Auto-close monitoring after 10 minutes (PayPal timeout)
      setTimeout(() => {
        clearInterval(interval);
        clearInterval(urlCheckInterval);
        if (!popup.closed) {
          popup.close();
          onPaymentFail("Payment timeout");
          reject(new Error("Payment timeout"));
        }
      }, 10 * 60 * 1000); // 10 minutes
    });
  }

  /** Launches the PayPal payment flow with popup */
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
      console.log("Initializing PayPal payment...");

      // Step 1: Create order via backend
      const orderData = await this.createOrder(items, billingAddress, selectedCurrency, promoCode);
      if (!orderData.success || !orderData.data) {
        throw new Error("Order creation failed");
      }

      console.log("✅ PayPal order created successfully:", orderData.data);

      const { orderId, paypalOrder } = orderData.data;

      // Step 2: Open PayPal popup
      try {
        this.paypalWindow = this.openPayPalPopup(paypalOrder);
      } catch (popupError) {
        console.error("Failed to open PayPal popup:", popupError);
        onPaymentFail && onPaymentFail("Failed to open payment window. Please allow popups.");
        return {
          success: false,
          error: new Error("Failed to open payment window. Please allow popups.")
        };
      }

      // Step 3: Monitor popup for completion
      if (this.paypalWindow) {
        try {
          const result = await this.monitorPopup(
            this.paypalWindow,
            orderId,
            (successOrderId) => {
              onPaymentSuccess && onPaymentSuccess(successOrderId);
            },
            (errorMessage) => {
              onPaymentFail && onPaymentFail(errorMessage);
            }
          );

          return ok(result);
        } catch (error) {
          console.error("Payment process error:", error);
          return {
            success: false,
            error: error instanceof Error ? error : new Error("Payment failed")
          };
        }
      }

      return { success: false, error: new Error("Failed to open PayPal popup") };

    } catch (error) {
      console.error("PayPal setup failed:", error);
      onPaymentFail && onPaymentFail("Payment setup failed");
      return {
        success: false,
        error: new Error("PayPal payment setup failed")
      };
    }
  }

  /** Alternative method: Use PayPal SDK buttons (if you prefer the inline approach) */
  async processPaymentWithButtons(
    items: TransactionLineItem[],
    billingAddress: Address,
    selectedCurrency: Currency,
    userEmail: string,
    promoCode?: string,
    onPaymentSuccess?: (orderId: string) => void,
    onPaymentFail?: (message: string) => void
  ): Promise<Result<{ orderId: string }>> {
    try {
      await this.loadPayPalSDK(selectedCurrency);
      const paypal = (window as any).paypal;

      if (!paypal || !paypal.Buttons) {
        throw new Error("PayPal SDK not loaded");
      }

      return new Promise((resolve) => {
        const container = document.getElementById("paypal-button-container");

        if (!container) {
          resolve({ success: false, error: new Error("PayPal container not found") });
          return;
        }

        // Clear existing buttons
        container.innerHTML = "";

        try {
          this.buttonInstance = paypal.Buttons({
            style: {
              layout: "vertical",
              color: "gold",
              shape: "rect",
              label: "paypal",
            },

            // Create order via your backend
            createOrder: async () => {
              try {
                const orderData = await this.createOrder(
                  items,
                  billingAddress,
                  selectedCurrency,
                  promoCode
                );

                if (!orderData.success || !orderData.data) {
                  throw new Error("Order creation failed");
                }

                return orderData.data.paypalOrder.id;
              } catch (error) {
                console.error("❌ Create order failed:", error);
                throw error;
              }
            },

            // Approve payment
            onApprove: async (data: any) => {
              console.log("Payment approved:", data);
              try {
                // You would typically capture the payment here via backend
                onPaymentSuccess && onPaymentSuccess(data.orderID);
                resolve(ok({ orderId: data.orderID }));
              } catch (error) {
                console.error("Payment capture failed:", error);
                onPaymentFail && onPaymentFail("Payment capture failed");
                resolve({ success: false, error: new Error("Payment capture failed") });
              }
            },

            onCancel: (data: any) => {
              console.log("Payment cancelled:", data);
              onPaymentFail && onPaymentFail("Payment cancelled");
              resolve({ success: false, error: new Error("Payment cancelled") });
            },

            onError: (error: any) => {
              console.error("PayPal error:", error);
              onPaymentFail && onPaymentFail("Payment error occurred");
              resolve({ success: false, error: new Error("Payment error occurred") });
            }
          });

          // Render the button
          this.buttonInstance.render("#paypal-button-container")
            .then(() => {
              console.log("PayPal button rendered successfully");
            })
            .catch((err: Error) => {
              console.error("Failed to render PayPal button:", err);
              resolve({ success: false, error: new Error("Failed to render PayPal button") });
            });

        } catch (renderErr) {
          console.error("Error creating PayPal button:", renderErr);
          resolve({ success: false, error: new Error("Failed to initialize PayPal button") });
        }
      });
    } catch (error) {
      console.error("PayPal button setup failed:", error);
      return { success: false, error: new Error("PayPal payment setup failed") };
    }
  }

  /** Clean up method */
  cleanup() {
    // Close PayPal popup if open
    if (this.paypalWindow && !this.paypalWindow.closed) {
      this.paypalWindow.close();
    }

    // Clean up button container
    const container = document.getElementById("paypal-button-container");
    if (container) {
      container.innerHTML = "";
    }

    // Clean up button instance
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
