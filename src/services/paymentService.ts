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
import { paypalProvider } from "./providers/paypalProvider";

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
    {
      id: PAYMENT_PROVIDER.PAYPAL,
      name: "paypal",
      displayName: "PayPal",
      currency: "USD",
      isAvailable: true, // Disable PayPal for now
      description: "Pay securely with PayPal",
      currencies: [CURRENCY.USD, CURRENCY.EUR, CURRENCY.GBP],
      logos: [
        { name: "Visa", src: "/visa.png", className: "h-[20px] w-[32px]" },
        { name: "Mastercard", src: "/mastercard.svg", className: "h-[20px] w-[32px]" },
        { name: "Venmo (US)", src: "/venmo.png", className: "h-[20px] w-[28px]" },
      ],
      icon: "/paypal-icon.svg"
    },
  ];

  getAvailableProviders(): PaymentProviderOption[] {
    return this.providers.filter((p) => p.isAvailable);
  }

  // ✅ Only PayPal adds its service charge. No tax for either.
  async calculatePricing(
    salePrice: number,
    targetCurrency: Currency,
    baseCurrency: Currency = CURRENCY.INR,
    provider?: PaymentProvider
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

    let total = convertedAmount;

    // TODO: Document this step properly
    // For PayPal, adjust so seller receives the base price after fees
    // Buyer pays total amount
    // We receive convertedAmount
    // PayPal keeps 3.49% of total + 0.49$ (fixed amount, will change based on currency)
    // total = convertedAmount + 3.49% of total + 0.49$ (fixed amount, will change based on currency)
    // total = convertedAmount + percent * total + fixed
    // total - percent * total = convertedAmount + fixed
    // total * (1 - percent) = convertedAmount + fixed
    // total = (convertedAmount + fixed) / (1 - percent)
    if (provider === PAYMENT_PROVIDER.PAYPAL) {
      const percent = 0.0349;
      const fixed = 0.49;
      total = (convertedAmount + fixed) / (1 - percent);
    }

    return {
      amount: total,
      baseAmount: salePrice,
      currency: targetCurrency,
      originalAmount: basePrice,
      originalCurrency: baseCurrency,
      exchangeRate,
      formattedPrice: currencyService.formatCurrency(
        convertedAmount,
        targetCurrency
      ),
      formattedTotal: currencyService.formatCurrency(total, targetCurrency),
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
        // Suggested new provider input signature
        result = await razorpayProvider.processPayment(
          items,
          billingAddress,
          selectedCurrency,
          userEmail,
          promoCode,
          onPaymentSuccess,
          onPaymentFail,
        );
      } else if (provider === PAYMENT_PROVIDER.PAYPAL) {
        result = await paypalProvider.processPayment(
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
