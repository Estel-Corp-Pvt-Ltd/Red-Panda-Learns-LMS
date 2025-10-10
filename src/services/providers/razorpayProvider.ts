import { Course } from '@/types/course';
import { transactionService } from '../transactionService';
import { enrollmentService } from '../dummyEnrollmentService';
import { CURRENCY, TRANSACTION_STATUS } from '@/constants';
import { PaymentDetails } from '@/types/transaction';

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
};

class RazorpayProvider {
  private readonly backendUrl = import.meta.env.VITE_BACKEND_URL;
  
async createOrder(amount: number, currency: string, receipt: string, transactionId: string): Promise<any> {
  const safeReceipt = (receipt || "").substring(0, 40);
  

  const response = await fetch(`${this.backendUrl}/createOrder`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': transactionId,   
    },
    body: JSON.stringify({
      rawamount: amount,
      rawcurrency: currency,
      receipt: safeReceipt,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create order');
  }

  return response.json();
}
  async processPayment(
    course: Course,
    userEmail: string,
    transactionId: string,
    amount: number,
    userId: string
  ): Promise<{ success: boolean; transactionId?: string; paymentId?: string; error?: string }> {
    return new Promise(async (resolve) => {
      try {
        console.log('RazorpayProvider - Starting payment process:', {
          courseId: course.id,
          transactionId,
          amount,
          userId,
          course
        });

        // Create order through backend
       const orderData = await this.createOrder(amount, CURRENCY.INR, transactionId, transactionId);

        console.log("THis is Order Data",orderData)
        if (!orderData.success) {
          throw new Error(orderData.error || 'Order creation failed');
        }

        const { order, key_id } = orderData;

        // Update transaction status
        await transactionService.updateTransactionStatus(transactionId, TRANSACTION_STATUS.PROCESSING, {
          orderId: order.id
        });

        const options = {
          key: key_id,
          amount: order.amount,
          currency: order.currency,
          order_id: order.id,
          name: 'Vizuara AI Labs',
          description: `Enrollment for ${course.title}`,
          prefill: {
            email: userEmail,
          },
          theme: {
            color: '#3b82f6',
          },
          handler: async (response: any) => {
            console.log('Razorpay payment successful:', response);

            // Verify payment on backend
            try {
              const verificationResponse = await fetch(`${this.backendUrl}/verifyPayment`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },

                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  transaction_id: transactionId,
                  
                }),
              });

              const verificationData = await verificationResponse.json();

              if (verificationData.success) {
                console.log('RazorpayProvider - Payment verified, enrolling user');

                // Update transaction with payment details
                await transactionService.updateTransactionStatus(transactionId, TRANSACTION_STATUS.COMPLETED, {
                  orderId: order.id,
                  paymentId: response.razorpay_payment_id,
                  signature: response.razorpay_signature,
                });

                // Auto-enroll user after successful payment
                try {
                  await enrollmentService.enrollUser(
                    userId,
                    course.id,
                    response.razorpay_payment_id,
                    'razorpay'
                  );
                  console.log('RazorpayProvider - User enrolled successfully after payment');
                } catch (enrollmentError) {
                  console.error('RazorpayProvider - Enrollment failed:', enrollmentError);
                  // Don't fail the payment, but log the error
                }

                resolve({
                  success: true,
                  transactionId: transactionId,
                  paymentId: response.razorpay_payment_id,
                });
              } else {
                console.log("RazorpayProvider - Payment verification failed");
                throw new Error(verificationData.error || 'Payment verification failed');
              }
            } catch (error) {
              console.error('RazorpayProvider - Payment verification failed:', error);
              await transactionService.updateTransactionStatus(transactionId, TRANSACTION_STATUS.FAILED, {} as PaymentDetails, 'Payment verification failed');

              resolve({
                success: false,
                error: 'Payment verification failed',
              });
            }
          },
          modal: {
            ondismiss: async () => {
              console.log('RazorpayProvider - Payment dismissed by user');
              await transactionService.updateTransactionStatus(transactionId, TRANSACTION_STATUS.CANCELLED, {} as PaymentDetails, 'Payment cancelled by user');

              resolve({
                success: false,
                error: 'Payment cancelled by user',
              });
            }
          }
        };

        // @ts-ignore - Razorpay is loaded externally
        if (typeof window !== 'undefined' && (window as any).Razorpay) {
          const rzp = new (window as any).Razorpay(options);
          rzp.open();
        } else {
          await transactionService.updateTransactionStatus(transactionId, TRANSACTION_STATUS.FAILED, {} as PaymentDetails, 'Razorpay SDK not loaded');

          resolve({
            success: false,
            error: 'Razorpay SDK not loaded',
          });
        }
      } catch (error) {
        console.error('RazorpayProvider - Payment failed:', error);

        await transactionService.updateTransactionStatus(transactionId, TRANSACTION_STATUS.FAILED, {} as PaymentDetails, error instanceof Error ? error.message : 'Unknown error');

        resolve({
          success: false,
          error: 'Payment failed. Please try again.',
        });
      }
    });
  }
}

export const razorpayProvider = new RazorpayProvider();