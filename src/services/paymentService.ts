import { Course } from "@/types/course";
import { currencyService } from "./currencyService";
import { transactionService } from "./transactionService";
import { razorpayProvider } from "./providers/razorpayProvider";
import { paypalProvider } from "./providers/paypalProvider";
import { Currency, PaymentProvider } from "@/types/general";
import { enrollmentService } from './enrollmentService';
import { CURRENCY, ENROLLED_PROGRAM_TYPE, PAYMENT_PROVIDER, TRANSACTION_STATUS, TRANSACTION_TYPE } from '@/constants';

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
      name: "razorpay",
      displayName: "Razorpay",
      currency: "INR",
      isAvailable: !!import.meta.env.VITE_RAZORPAY_KEY_ID,
      description: "Pay with Cards, UPI, Net Banking & Wallets",
    },
    {
      id: PAYMENT_PROVIDER.PAYPAL,
      name: "paypal",
      displayName: "PayPal",
      currency: "USD",
      isAvailable: !!import.meta.env.VITE_PAYPAL_SANDBOX_CLIENT_ID,
      description: "Pay securely with PayPal",
    },
  ];

  getAvailableProviders(): PaymentProviderOption[] {
    return this.providers.filter((p) => p.isAvailable);
  }

  // ✅ Only PayPal adds its service charge. No tax for either.
  async calculatePricing(
    salePrice: number,
    targetCurrency: Currency,
    provider?: PaymentProvider,
    baseCurrency: Currency = CURRENCY.INR
  ) {
    const basePrice = salePrice || 0;

    let convertedAmount = basePrice;
    let exchangeRate = 1;

    // Convert only if needed
    if (baseCurrency !== targetCurrency) {
      const conversion = await currencyService.convertAmount(
        basePrice,
        baseCurrency,
        targetCurrency
      );
      convertedAmount = conversion.convertedAmount;
      exchangeRate = conversion.exchangeRate;
    }

    // For PayPal, adjust so seller receives the base price after fees
    let total = convertedAmount;
    if (provider === PAYMENT_PROVIDER.PAYPAL) {
      const percent = 0.0349; // PayPal ~3.49%
      const fixed = 0.49; // flat fee in selected currency
      total = (convertedAmount + fixed) / (1 - percent);
    }

    return {
      amount: total,
      baseAmount: salePrice,
      currency: targetCurrency,
      originalAmount: basePrice,
      originalCurrency: baseCurrency,
      exchangeRate,
      formattedPrice: currencyService.formatCurrency(convertedAmount, targetCurrency),
      formattedTotal: currencyService.formatCurrency(total, targetCurrency),
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
      const providerOption = this.providers.find((p) => p.id === provider);
      if (!providerOption)
        return { success: false, error: "Unsupported payment provider" };

      const pricing = await this.calculatePricing(
        course.salePrice,
        selectedCurrency,
        provider,
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
        paymentDetails: { orderId: "", paymentId: "" },

metadata: {
  userEmail,
  courseTitle: course.title,
  userAgent: navigator.userAgent,
  paymentAttempts: 1
}
      });

      let result: PaymentResult;
      if (provider === PAYMENT_PROVIDER.RAZORPAY) {
        result = await razorpayProvider.processPayment(
          course,
          userEmail,
          transactionId,
          pricing.amount,
          userId,
          selectedCurrency
        );
      } else if (provider === PAYMENT_PROVIDER.PAYPAL) {
        result = await paypalProvider.processPayment(
          course,
          userEmail,
          transactionId,
          pricing.amount,
          userId,
          selectedCurrency
        );
      } else {
        result = { success: false, error: "Unsupported payment provider" };
      }

      if (result.success) {
        result.transactionId = transactionId;
        try {
          await enrollmentService.enrollUser(
            userId,
            course.id,
            ENROLLED_PROGRAM_TYPE.COURSE
          );
        } catch (err) {
          console.error("Enrollment failed after payment:", err);
        }
      }
      return result;
    } catch (error) {
      console.error(error);
      return {
        success: false,
        error: "Payment processing failed. Please try again.",
      };
    }
  }

  async getTransactionHistory(userId: string) {
    return transactionService.getUserTransactions(userId);
  }

  async getTransactionDetails(id: string) {
    return transactionService.getTransaction(id);
  }
}

export const paymentService = new PaymentService();