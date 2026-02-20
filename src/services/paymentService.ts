import {
  CURRENCY,
  PAYMENT_PROVIDER
} from "@/constants";
import { Currency, PaymentProvider } from "@/types/general";
import { Address } from "@/types/order";
import { TransactionLineItem } from "@/types/transaction";
import { Result } from "@/utils/response";
import { currencyService } from "./currencyService";
import { razorpayProvider } from "./providers/razorpayProvider";
import { transactionService } from "./transactionService";

export type PaymentProviderOption = {
  id: PaymentProvider;
  name: string;
  displayName: string;
  currency: Currency;
  isAvailable: boolean;
  description: string;
  currencies: Currency[];
  logos: { name: string; src: string; className: string }[];
  icon: string;
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
      currencies: [CURRENCY.INR, CURRENCY.USD, CURRENCY.EUR, CURRENCY.GBP],
      logos: [
        { name: "UPI", src: "/upi.webp", className: "h-[30px] w-[32px]" },
        { name: "Visa", src: "/visa.png", className: "h-[20px] w-[32px]" },
        { name: "Mastercard", src: "/mastercard.svg", className: "h-[20px] w-[32px]" },
        { name: "RuPay", src: "/rupay.png", className: "h-[30px] w-[40px]" },
      ],
      icon: "/razorpay-icon.svg"
    },
  ];

  getAvailableProviders(): PaymentProviderOption[] {
    return this.providers.filter((p) => p.isAvailable);
  }

  async calculatePricing(
    salePrice: number,
    targetCurrency: Currency,
    baseCurrency: Currency = CURRENCY.INR,
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

    return {
      amount: convertedAmount,
      baseAmount: salePrice,
      currency: targetCurrency,
      originalAmount: basePrice,
      originalCurrency: baseCurrency,
      exchangeRate,
      formattedPrice: currencyService.formatCurrency(
        convertedAmount,
        targetCurrency
      ),
      formattedTotal: currencyService.formatCurrency(convertedAmount, targetCurrency),
    };
  }

  async processPayment({
    provider,
    items,
    userEmail,
    selectedCurrency,
    billingAddress,
    promoCode,
    onPaymentSuccess,
    onPaymentFail,
  }: {
    provider: PaymentProvider;
    items: TransactionLineItem[];
    userEmail: string;
    selectedCurrency: Currency;
    billingAddress: Address;
    promoCode?: string;
    onPaymentSuccess?: (orderId: string) => void;
    onPaymentFail?: (message: string) => void;
  }): Promise<Result<{ orderId: string }>> {
    try {
      if (!items || items.length === 0) {
        return fail("No items to purchase");
      }

      // Call provider
      let result: Result<{ orderId: string }>;
      if (provider === PAYMENT_PROVIDER.RAZORPAY) {
        result = await razorpayProvider.processPayment(
          items,
          billingAddress,
          selectedCurrency,
          userEmail,
          promoCode,
          onPaymentSuccess,
          onPaymentFail,
        );
      } else {
        result = fail("Unsupported payment provider");
      }

      return result;
    } catch (error) {
      console.error(error);
      return fail("Payment processing failed. Please try again.");
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
