import { Course } from '@/types/course';
import { currencyService } from './currencyService';
import { transactionService } from './transactionService';
import { enrollmentService } from './enrollmentService';
import { razorpayProvider } from './providers/razorpayProvider';
import { paypalProvider } from './providers/paypalProvider';
import { Currency, PaymentProvider } from '@/types/general';
import { CURRENCY, PAYMENT_PROVIDER, TRANSACTION_STATUS, TRANSACTION_TYPE } from '@/constants';

export type PaymentProviderOption = {
  id: PaymentProvider;
  name: string;
  displayName: string;
  currency: Currency;
  isAvailable: boolean;
  description: string;
};

export type PaymentResult = {
  success: boolean;
  transactionId?: string;
  paymentId?: string;
  error?: string;
};

class PaymentService {
  private providers: PaymentProviderOption[] = [
    {
      id: PAYMENT_PROVIDER.RAZORPAY,
      name: 'razorpay',
      displayName: 'Razorpay',
      currency: 'INR',
      isAvailable: !!import.meta.env.VITE_RAZORPAY_KEY_ID,
      description: 'Pay with Cards, UPI, Net Banking & Wallets',
    },
    {
      id: PAYMENT_PROVIDER.PAYPAL,
      name: 'paypal',
      displayName: 'PayPal',
      currency: 'USD',
      isAvailable: !!import.meta.env.VITE_PAYPAL_SANDBOX_CLIENT_ID,
      description: 'Pay securely with PayPal',
    },
  ];

  getAvailableProviders(): PaymentProviderOption[] {
    return this.providers.filter(provider => provider.isAvailable);
  }

  async calculatePricing(salePrice: number, targetCurrency: Currency) {
    const basePrice = salePrice || 0;
    const baseCurrency: Currency = CURRENCY.INR; // Assuming course prices are in INR

    if (baseCurrency === targetCurrency) {
      return {
        amount: basePrice,
        currency: targetCurrency,
        originalAmount: basePrice,
        originalCurrency: baseCurrency,
        exchangeRate: 1,
        formattedPrice: currencyService.formatCurrency(basePrice, targetCurrency),
      };
    }

    const conversion = await currencyService.convertAmount(basePrice, baseCurrency, targetCurrency);

    return {
      amount: conversion.convertedAmount,
      currency: targetCurrency,
      originalAmount: conversion.originalAmount,
      originalCurrency: conversion.originalCurrency,
      exchangeRate: conversion.exchangeRate,
      formattedPrice: currencyService.formatCurrency(conversion.convertedAmount, targetCurrency),
    };
  }

  async processPayment(
    provider: PaymentProvider,
    course: Course,
    userEmail: string,
    userId: string
  ): Promise<PaymentResult> {
    try {
      console.log('PaymentService - Processing payment:', {
        provider,
        courseId: course.id,
        userId,
        userEmail,
        course
      });

      const providerOption = this.providers.find(p => p.id === provider);
      if (!providerOption) {
        return {
          success: false,
          error: 'Unsupported payment provider',
        };
      }

      const pricing = await this.calculatePricing(course.salePrice, providerOption.currency);

      const transactionId = await transactionService.createTransaction({
        userId,
        courseId: course.id,
        type: TRANSACTION_TYPE.PAYMENT,
        amount: pricing.amount,
        currency: pricing.currency,
        originalAmount: pricing.originalAmount,
        originalCurrency: pricing.originalCurrency,
        exchangeRate: pricing.exchangeRate,
        paymentProvider: provider,
        status: TRANSACTION_STATUS.PENDING,
        paymentDetails: {
          orderId: "",
          paymentId: "",
        },
        metadata: {
          userEmail,
          courseTitle: course.title,
          userAgent: navigator.userAgent,
          ipAddress: "",
          paymentAttempts: 1,
        }
      });

      console.log('PaymentService - Transaction created:', transactionId);

      // Process payment with the specific provider
      let result: PaymentResult;

      if (provider === PAYMENT_PROVIDER.RAZORPAY) {
        result = await razorpayProvider.processPayment(course, userEmail, transactionId, pricing.amount, userId);
      } else if (provider === PAYMENT_PROVIDER.PAYPAL) {
        result = await paypalProvider.processPayment(course, userEmail, transactionId, pricing.amount, userId);
      } else {
        result = {
          success: false,
          error: 'Unsupported payment provider',
        };
      }

      // Handle successful payment
      if (result.success) {
        result.transactionId = transactionId;
        console.log('PaymentService - Payment successful, enrolling user:', {
          transactionId,
          paymentId: result.paymentId,
          courseId: course.id,
          userId
        });

        // Enroll user immediately after successful payment
        try {
          await enrollmentService.enrollUser(
            userId,
            course,
            result.paymentId,
            provider
          );
          console.log('PaymentService - User enrolled successfully after payment');
        } catch (enrollmentError) {
          console.error('PaymentService - Enrollment failed after payment:', enrollmentError);
          // Don't fail the payment, but log the error
        }
      } else {
        console.log('PaymentService - Payment failed:', result.error);
      }

      return result;
    } catch (error) {
      console.error('PaymentService - Payment processing failed:', error);
      return {
        success: false,
        error: 'Payment processing failed. Please try again.',
      };
    }
  }

  async getTransactionHistory(userId: string) {
    return transactionService.getUserTransactions(userId);
  }

  async getTransactionDetails(transactionId: string) {
    return transactionService.getTransaction(transactionId);
  }

  // Bundle payment processing
  // async processBundlePayment(
  //   provider: PaymentProvider,
  //   bundle: Bundle,
  //   userEmail: string,
  //   userId: string
  // ): Promise<PaymentResult> {
  //   try {
  //     console.log('PaymentService - Processing bundle payment:', {
  //       provider,
  //       bundleId: bundle.id,
  //       userId,
  //       userEmail
  //     });

  //     const providerOption = this.providers.find(p => p.id === provider);
  //     if (!providerOption) {
  //       return {
  //         success: false,
  //         error: 'Unsupported payment provider',
  //       };
  //     }

  //     // For bundles, convert bundle price to provider currency
  //     const conversion = await currencyService.convertAmount(
  //       bundle.salePrice,
  //       'USD', // Assuming bundle prices are in USD
  //       providerOption.currency
  //     );

  //     // Create transaction record
  //     const transactionId = await transactionService.createTransaction(
  //       userId,
  //       { ID: bundle?.id, course_price: bundle.salePrice.toString() } as Course,
  //       provider,
  //       providerOption.currency,
  //       conversion.convertedAmount,
  //       userEmail,
  //       {
  //         userAgent: navigator.userAgent,
  //         paymentAttempts: 1,
  //       }
  //     );

  //     // Process payment (same as course payment)
  //     let result: PaymentResult;
  //     if (provider === 'razorpay') {
  //       result = await razorpayProvider.processPayment(
  //         { ID: bundle?.id, course_price: conversion.convertedAmount.toString() } as Course,
  //         userEmail,
  //         transactionId,
  //         conversion.convertedAmount,
  //         userId
  //       );
  //     } else if (provider === 'paypal') {
  //       result = await paypalProvider.processPayment(
  //         { ID: parseInt(bundle.id), course_price: conversion.convertedAmount.toString() } as Course,
  //         userEmail,
  //         transactionId,
  //         conversion.convertedAmount,
  //         userId
  //       );
  //     } else {
  //       result = { success: false, error: 'Unsupported payment provider' };
  //     }

  //     // Handle successful payment
  //     if (result.success) {
  //       result.transactionId = transactionId;
  //       console.log('PaymentService - Bundle payment successful, enrolling user in bundle', {
  //         userId,
  //         bundle,
  //         result,
  //         provider
  //       });

  //       try {
  //         await enrollmentService.enrollUserInBundle(
  //           userId,
  //           bundle,
  //           result.paymentId || result?.transactionId,
  //           provider
  //         );
  //         console.log('PaymentService - User enrolled in bundle successfully');
  //       } catch (enrollmentError) {
  //         console.error('PaymentService - Bundle enrollment failed after payment:', enrollmentError);
  //       }
  //     }

  //     return result;
  //   } catch (error) {
  //     console.error('PaymentService - Bundle payment processing failed:', error);
  //     return {
  //       success: false,
  //       error: 'Bundle payment processing failed. Please try again.',
  //     };
  //   }
  // }

  // Cohort payment processing
  // async processCohortPayment(
  //   provider: PaymentProvider,
  //   cohort: Cohort,
  //   userEmail: string,
  //   userId: string
  // ): Promise<PaymentResult> {
  //   try {
  //     console.log('PaymentService - Processing cohort payment:', {
  //       provider,
  //       cohortId: cohort.id,
  //       userId,
  //       userEmail
  //     });

  //     const providerOption = this.providers.find(p => p.id === provider);
  //     if (!providerOption) {
  //       return {
  //         success: false,
  //         error: 'Unsupported payment provider',
  //       };
  //     }

  //     // Convert cohort price to provider currency
  //     const conversion = await currencyService.convertAmount(
  //       cohort.price,
  //       cohort.currency,
  //       providerOption.currency
  //     );

  //     // Create transaction record
  //     const transactionId = await transactionService.createTransaction(
  //       userId,
  //       { ID: parseInt(cohort.id), course_price: cohort.price.toString(), post_title: cohort.name } as Course,
  //       provider,
  //       providerOption.currency,
  //       conversion.convertedAmount,
  //       userEmail,
  //       {
  //         userAgent: navigator.userAgent,
  //         paymentAttempts: 1,
  //       }
  //     );

  //     // Process payment
  //     let result: PaymentResult;
  //     if (provider === 'razorpay') {
  //       result = await razorpayProvider.processPayment(
  //         { ID: cohort.id, course_price: conversion.convertedAmount.toString(), post_title: cohort.name } as Course,
  //         userEmail,
  //         transactionId,
  //         conversion.convertedAmount,
  //         userId
  //       );
  //     } else if (provider === 'paypal') {
  //       result = await paypalProvider.processPayment(
  //         { ID: cohort.id, course_price: conversion.convertedAmount.toString(), post_title: cohort.name } as Course,
  //         userEmail,
  //         transactionId,
  //         conversion.convertedAmount,
  //         userId
  //       );
  //     } else {
  //       result = { success: false, error: 'Unsupported payment provider' };
  //     }

  //     // Handle successful payment
  //     if (result.success) {
  //       result.transactionId = transactionId;
  //       console.log('PaymentService - Cohort payment successful, enrolling user in cohort');

  //       try {
  //         await cohortService.enrollUserInCohort(
  //           userId,
  //           cohort.id,
  //           result.paymentId || result.transactionId,
  //           provider
  //         );
  //         console.log('PaymentService - User enrolled in cohort successfully');
  //       } catch (enrollmentError) {
  //         console.error('PaymentService - Cohort enrollment failed after payment:', enrollmentError);
  //       }
  //     }

  //     return result;
  //   } catch (error) {
  //     console.error('PaymentService - Cohort payment processing failed:', error);
  //     return {
  //       success: false,
  //       error: 'Cohort payment processing failed. Please try again.',
  //     };
  //   }
  // }
}

export const paymentService = new PaymentService();
