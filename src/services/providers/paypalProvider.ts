
import { Course } from '@/types/course';
import { transactionService } from '../transactionService';
import { enrollmentService } from '@/services/dummyEnrollmentService';
import { CURRENCY, ENVIRONMENT, TRANSACTION_STATUS } from '@/constants';
import { PaymentDetails } from '@/types/transaction';
export interface PayPalOrder {
  id: string;
  status: string;
  intent: string;
  purchase_units: Array<{
    amount: {
      currency_code: string;
      value: string;
    };
    description: string;
  }>;
};
class PayPalProvider {
  private readonly environment = import.meta.env.VITE_APP_ENVIRONMENT === ENVIRONMENT.PRODUCTION ? ENVIRONMENT.PRODUCTION : ENVIRONMENT.SANDBOX;
  private readonly clientId = this.environment === ENVIRONMENT.SANDBOX ? import.meta.env.VITE_PAYPAL_SANDBOX_CLIENT_ID : import.meta.env.VITE_PAYPAL_LIVE_CLIENT_ID;
  async loadPayPalSDK(): Promise<void> {
    return new Promise((resolve, reject) => {
      if ((window as any).paypal) {
        resolve();
        return;
      }
      const script = document.createElement('script');
script.src = `https://www.${
  this.environment === ENVIRONMENT.SANDBOX ? "sandbox.paypal.com" : "paypal.com"
}/sdk/js?client-id=${this.clientId}&currency=${CURRENCY.GBP}&intent=capture`;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load PayPal SDK'));
      document.head.appendChild(script);
    });
  }
  async processPayment(
    course: Course,
    userEmail: string,
    transactionId: string,
    amount: number,
    userId: string
  ): Promise<{ success: boolean; transactionId?: string; paymentId?: string; error?: string }> {
    try {
      console.log('PayPalProvider - Starting payment process:', {
        courseId: course.id,
        transactionId,
        amount,
        userId
      });
      await this.loadPayPalSDK();
      return new Promise((resolve) => {
        // Update transaction status to processing
        transactionService.updateTransactionStatus(transactionId, TRANSACTION_STATUS.PROCESSING);
        const paypal = (window as any).paypal;
        paypal.Buttons({
          createOrder: async (data: any, actions: any) => {
            return actions.order.create({
              intent: 'CAPTURE',
              purchase_units: [{
                amount: {
                  currency_code: 'GBP',
                  value: amount.toFixed(2),
                },
                description: `Enrollment for ${course.title}`,
                custom_id: transactionId,
              }],
              application_context: {
                shipping_preference: 'NO_SHIPPING',
              },
            });
          },
          onApprove: async (data: any, actions: any) => {
            try {
              const order = await actions.order.capture();
              console.log('PayPal payment successful:', order);
              // Update transaction with PayPal details
              await transactionService.updateTransactionStatus(transactionId, TRANSACTION_STATUS.COMPLETED, {
                orderId: order.id,
                payerId: order.payer.payer_id,
                paymentId: order.purchase_units[0].payments.captures[0].id,
                intent: order.intent,
                status: order.status,
              }
                // , {
                //     transactionId: order.purchase_units[0].payments.captures[0].id,
                //   }
              );
              // Auto-enroll user after successful payment
              try {
                await enrollmentService.enrollUser(
                  userId,
                 course.id, // :white_check_mark: targetId is a string
                  order.purchase_units[0].payments.captures[0].id,
                  'paypal'
                );
                console.log('PayPalProvider - User enrolled successfully after payment');
              } catch (enrollmentError) {
                console.error('PayPalProvider - Enrollment failed:', enrollmentError);
                // Don't fail the payment, but log the error
              }
              resolve({
                success: true,
                transactionId: transactionId,
                paymentId: order.purchase_units[0].payments.captures[0].id,
              });
            } catch (error) {
              console.error('PayPal capture error:', error);
              await transactionService.updateTransactionStatus(transactionId, TRANSACTION_STATUS.FAILED, {} as PaymentDetails, error instanceof Error ? error.message : 'PayPal capture failed');
              resolve({
                success: false,
                error: 'Payment capture failed',
              });
            }
          },
          onCancel: async (data: any) => {
            console.log('PayPal payment cancelled:', data);
            await transactionService.updateTransactionStatus(transactionId, TRANSACTION_STATUS.CANCELLED, {} as PaymentDetails, 'Payment cancelled by user');
            resolve({
              success: false,
              error: 'Payment cancelled by user',
            });
          },
          onError: async (err: any) => {
            console.error('PayPal payment error:', err);
            await transactionService.updateTransactionStatus(transactionId, TRANSACTION_STATUS.FAILED, {} as PaymentDetails, err.message || 'PayPal payment error');
            resolve({
              success: false,
              error: 'Payment failed. Please try again.',
            });
          },
        }).render('#paypal-button-container');
      });
    } catch (error) {
      console.error('PayPal payment setup failed:', error);
      await transactionService.updateTransactionStatus(transactionId, TRANSACTION_STATUS.FAILED, {} as PaymentDetails, error instanceof Error ? error.message : 'PayPal SDK load failed');
      return {
        success: false,
        error: 'PayPal payment setup failed',
      };
    }
  }
}
export const paypalProvider = new PayPalProvider();