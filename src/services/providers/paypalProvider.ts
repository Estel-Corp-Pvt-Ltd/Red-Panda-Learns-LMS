import { ENROLLED_PROGRAM_TYPE, ENVIRONMENT, TRANSACTION_STATUS } from "@/constants";
import { enrollmentService } from "@/services/enrollmentService";
import { Course } from "@/types/course";
import { Currency } from "@/types/general";
import { PaymentDetails } from "@/types/transaction";
import { transactionService } from "../transactionService";

class PayPalProvider {
  private readonly environment =
    import.meta.env.VITE_APP_ENVIRONMENT === ENVIRONMENT.PRODUCTION
      ? ENVIRONMENT.PRODUCTION
      : ENVIRONMENT.SANDBOX;

  private readonly clientId =
    this.environment === ENVIRONMENT.SANDBOX
      ? import.meta.env.VITE_PAYPAL_SANDBOX_CLIENT_ID
      : import.meta.env.VITE_PAYPAL_LIVE_CLIENT_ID;

  /** Dynamically load PayPal SDK for the selected currency. */
  async loadPayPalSDK(currency: Currency): Promise<void> {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(
        'script[src*="paypal.com/sdk/js"]'
      );

      // If already loaded with same currency, reuse it
      if ((window as any).paypal && existing) {
        const currentCurrency = new URL(existing.src).searchParams.get("currency");
        if (currentCurrency === currency) {
          resolve();
          return;
        }
        // Otherwise, remove old script and reset globals
        existing.remove();
        delete (window as any).paypal;
        delete (window as any).zoid; // PayPal’s internal bridge
      }

      const host =
        this.environment === ENVIRONMENT.SANDBOX
          ? "sandbox.paypal.com"
          : "paypal.com";

      const script = document.createElement("script");
      script.src = `https://${host}/sdk/js?client-id=${this.clientId}&currency=${currency}&intent=capture`;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load PayPal SDK"));
      document.head.appendChild(script);
    });
  }

  /** Launches the PayPal payment flow. */
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
        const container = document.getElementById("paypal-button-container");

        if (!paypal || !container) {
          resolve({
            success: false,
            error: "PayPal SDK failed to initialize correctly.",
          });
          return;
        }

        try {
          paypal
            .Buttons({
              createOrder: (_data: any, actions: any) => {
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
                  application_context: { shipping_preference: "NO_SHIPPING" },
                });
              },

              onApprove: async (_data: any, actions: any) => {
                try {
                  const order = await actions.order.capture();
                  console.log("PayPal payment successful", order);
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
                      ENROLLED_PROGRAM_TYPE.COURSE
                    );
                  } catch (e) {
                    console.error("Enrollment failed after PayPal payment:", e);
                  }

                  resolve({
                    success: true,
                    transactionId,
                    paymentId: capture?.id,
                  });
                } catch (err) {
                  console.error("PayPal capture error:", err);
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
                console.warn("PayPal payment cancelled:", data);
                await transactionService.updateTransactionStatus(
                  transactionId,
                  TRANSACTION_STATUS.CANCELLED,
                  {} as PaymentDetails,
                  "Payment cancelled by user"
                );
                resolve({ success: false, error: "Payment cancelled by user" });
              },

              onError: async (error: any) => {
                console.error("PayPal error:", error);
                await transactionService.updateTransactionStatus(
                  transactionId,
                  TRANSACTION_STATUS.FAILED,
                  {} as PaymentDetails,
                  error?.message || "PayPal payment error"
                );
                resolve({
                  success: false,
                  error: "PayPal payment failed. Please try again.",
                });
              },
            })
            .render("#paypal-button-container");
        } catch (renderErr) {
          console.error("Error rendering PayPal buttons:", renderErr);
          resolve({ success: false, error: "Failed to render PayPal buttons" });
        }
      });
    } catch (error) {
      console.error("PayPal setup failed:", error);
      await transactionService.updateTransactionStatus(
        transactionId,
        TRANSACTION_STATUS.FAILED,
        {} as PaymentDetails,
        (error as Error)?.message || "PayPal SDK load failed"
      );
      return { success: false, error: "PayPal payment setup failed" };
    }
  }
}

export const paypalProvider = new PayPalProvider();