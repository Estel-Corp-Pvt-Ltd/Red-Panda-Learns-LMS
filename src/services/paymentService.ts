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

  async calculatePricing(
    salePrice: number,
    targetCurrency: Currency,
    baseCurrency: Currency = CURRENCY.INR
  ) {
    const basePrice = salePrice || 0;

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

    const conversion = await currencyService.convertAmount(
      basePrice,
      baseCurrency,
      targetCurrency
    );

    return {
      amount: conversion.convertedAmount,
      currency: targetCurrency,
      originalAmount: basePrice,
      originalCurrency: baseCurrency,
      exchangeRate: conversion.exchangeRate,
      formattedPrice: currencyService.formatCurrency(conversion.convertedAmount, targetCurrency),
    };
  }

  async processPayment(
    provider: PaymentProvider,
    course: Course,
    userEmail: string,
    userId: string,
    selectedCurrency: Currency,
    baseCurrency: Currency 
  ): Promise<PaymentResult> {
    try {
      console.log('PaymentService - Processing payment:', {
        provider,
        courseId: course.id,
        userId,
        userEmail,
        course,
        selectedCurrency,
        baseCurrency
      });

      const providerOption = this.providers.find(p => p.id === provider);
      if (!providerOption) {
        return {
          success: false,
          error: 'Unsupported payment provider',
        };
      }

      // Pricing in selected currency (based on user’s choice)
      const pricing = await this.calculatePricing(
        course.salePrice,
        selectedCurrency,
        baseCurrency
      );

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
          paymentAttempts: 1
        }
      });

      console.log('PaymentService - Transaction created:', transactionId);

      // Call provider
      let result: PaymentResult;

      if (provider === PAYMENT_PROVIDER.RAZORPAY) {
        result = await razorpayProvider.processPayment(
          course,
          userEmail,
          transactionId,
          pricing.amount,
          userId,

        );
      } else if (provider === PAYMENT_PROVIDER.PAYPAL) {
        result = await paypalProvider.processPayment(
          course,
          userEmail,
          transactionId,
          pricing.amount,
          userId,
          
        );
      } else {
        result = {
          success: false,
          error: 'Unsupported payment provider',
        };
      }

      if (result.success) {
        result.transactionId = transactionId;
        console.log('PaymentService - Payment successful, enrolling user:', {
          transactionId,
          paymentId: result.paymentId,
          courseId: course.id,
          userId
        });

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
        }
      } else {
        console.log('PaymentService - Payment failed:', result.error);
      }

      return result;
    } catch (error) {
      console.log('PaymentService - Payment processing failed:', error);
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
}

export const paymentService = new PaymentService();