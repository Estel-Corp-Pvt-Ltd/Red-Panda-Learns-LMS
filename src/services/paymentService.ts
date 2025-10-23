import { Bundle } from "@/types/bundle";
import { TransactionLineItem } from "@/types/transaction";
import {
  CURRENCY,
  ENROLLED_PROGRAM_TYPE,
  ORDER_STATUS,
  PAYMENT_PROVIDER,
  TRANSACTION_STATUS,
  TRANSACTION_TYPE,
} from "@/constants";
import { Course } from "@/types/course";
import { Currency, PaymentProvider } from "@/types/general";
import { Address } from "@/types/order";
import { currencyService } from "./currencyService";
import { enrollmentService } from "./enrollmentService";
import { orderService } from "./orderService";
import { paypalProvider } from "./providers/paypalProvider";
import { razorpayProvider } from "./providers/razorpayProvider";
import { transactionService } from "./transactionService";


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
  finalPrice,
  userEmail,
  userId,
  selectedCurrency,
  baseCurrency,
  billingAddress,

}: {
    provider: PaymentProvider;
  items: TransactionLineItem[];
  finalPrice?: number;          
  userEmail: string;
  userId: string;
  selectedCurrency: Currency;
  baseCurrency: Currency;
  billingAddress: Address;
 
})
: Promise<PaymentResult> {
    try {
    if (!items || items.length === 0) {
      return { success: false, error: "No items to purchase" };
    }

    // Compute subtotal from items if not provided
    const subtotal = items.reduce((sum, li) => sum + (li.amount ?? 0), 0);
    const toCharge = typeof finalPrice === "number" ? finalPrice : subtotal;

    // Price and currency conversion, fees, etc.
    const pricing = await this.calculatePricing(
      toCharge,
      selectedCurrency,
      baseCurrency,
      provider,
    );
    // pricing: { amount, currency, originalAmount?, originalCurrency?, exchangeRate? }

    // Extract IDs by type for Order
    const courseIds = items
      .filter((it) => it.itemType === ENROLLED_PROGRAM_TYPE.COURSE)
      .map((it) => it.itemId);

    const bundleIds = items
      .filter((it) => it.itemType === ENROLLED_PROGRAM_TYPE.BUNDLE)
      .map((it) => it.itemId);

    // Build a compact description for the provider/receipt
    const itemNames = items.map((i) => i.name || i.itemId);
    const displayTitle =
      itemNames.length === 1
        ? itemNames[0]
        : `${itemNames[0]} + ${itemNames.length - 1} more`;

    // Create Order
    const orderId = await orderService.createOrder({
      userId,
      courseIds,
      bundleIds,
      amount: pricing.amount,
      currency: pricing.currency,
      billingAddress,
  
      metadata: {
        userEmail,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
        itemsSnapshot: items.map(({ itemId, itemType, name, amount, originalAmount }) => ({
          itemId,
          itemType,
          name,
          amount,
          originalAmount,
        })),
        subtotal,
        displayTitle,
      },
      status: ORDER_STATUS.PENDING,
    });

    // Create Transaction (now uses items[])
    const transactionId = await transactionService.createTransaction({
      orderNumber: orderId,
      userId,
      items, // <-- pass the line items
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
        orderId,
        userEmail,
        itemTitles: itemNames,
        displayTitle,
        paymentAttempts: 1,
        subtotal,
      },
    });

    // Call provider
    let result: PaymentResult;
    if (provider === PAYMENT_PROVIDER.RAZORPAY) {
      // Suggested new provider input signature
      result = await razorpayProvider.processPayment(
        items,
        userEmail,
        transactionId,
        pricing.amount,
        userId,
        selectedCurrency,
        orderId,
      );

      console.log("checking what is being passed in items",items)
     
    } else if (provider === PAYMENT_PROVIDER.PAYPAL) {
      result = await paypalProvider.processPayment(
        items,
        userEmail,
        transactionId,
        pricing.amount,
        userId,
        selectedCurrency,
       
      );
    } else {
      result = { success: false, error: "Unsupported payment provider" };
    }

    // Post-payment updates
    if (result.success) {
      result.transactionId = transactionId;

      await orderService.updateOrder(
        orderId,
        result.success ? ORDER_STATUS.SUCCESS : ORDER_STATUS.FAILED,
        transactionId
      );

      // Enroll for each item
      for (const item of items) {
        try {
          // If your enrollmentService can handle both types via itemType:
          await enrollmentService.enrollUser(userId, item.itemId, item.itemType);

          // If you need special handling for bundles, do this instead:
          // if (item.itemType === ENROLLED_PROGRAM_TYPE.COURSE) {
          //   await enrollmentService.enrollUser(userId, item.itemId, ENROLLED_PROGRAM_TYPE.COURSE);
          // } else if (item.itemType === ENROLLED_PROGRAM_TYPE.BUNDLE) {
          //   await enrollmentService.enrollBundle(userId, item.itemId);
          // }
        } catch (err) {
          console.error("Enrollment failed for item:", item, err);
        }
      }
    } else {
      // Mark order as failed so it doesn’t linger in PENDING
      await orderService.updateOrder(orderId, ORDER_STATUS.FAILED, transactionId);
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
