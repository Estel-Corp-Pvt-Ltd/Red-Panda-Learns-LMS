import { OrderItem, PaymentRequest } from "./validators";
import { orderService } from "../services/orderService";
import { courseService } from "../services/courseService";
import { bundleService } from "../services/bundleService";
import { transactionService } from "../services/transactionService";
import { Address } from "../types/order";
import { CURRENCY, TRANSACTION_STATUS, TRANSACTION_TYPE } from "../constants";

interface ItemsDetails {
  itemId: string;
  itemType: "COURSE" | "BUNDLE";
  name: string;
  amount: number;
}

export const getItemsDetails = async (items: OrderItem[]) => {
  const itemsDetails: ItemsDetails[] = [];

  await Promise.all(items.map(async (item) => {
    if (item.itemType === "COURSE") {
      const result = await courseService.getCourseById(item.itemId);
      if (result.success && result.data) {
        itemsDetails.push({
          name: result.data.title,
          amount: result.data.salePrice,
          itemType: "COURSE",
          itemId: item.itemId,
        });
      }
    } else if (item.itemType === "BUNDLE") {
      const result = await bundleService.getBundleById(item.itemId);
      if (result.success && result.data) {
        itemsDetails.push({
          name: result.data.title,
          amount: result.data.salePrice,
          itemType: "BUNDLE",
          itemId: item.itemId,
        });
      }
    }
  }));

  const originalAmount = itemsDetails.reduce((sum, item) => sum + item.amount, 0);

  return { itemsDetails, originalAmount };
};


export const initiateOrder = async (userId: string, providerOrderId: string, paymentData: PaymentRequest, originalAmount: number, payAmount: number, itemsDetails: ItemsDetails[], exchangedRate: number) => {
  const { provider, selectedCurrency, billingAddress } = paymentData;

  const order = await orderService.createOrder({
    userId: userId,
    items: itemsDetails,
    status: "PENDING",
    providerOrderId: providerOrderId,
    amount: payAmount,
    currency: selectedCurrency,
    metadata: {},
    billingAddress: billingAddress as Address,
  });



  if (!order.success || !order.data) {
    return;
  }

  // Fix: Add the missing required fields
  const transactionResult = await transactionService.createTransaction({
    orderId: order.data,
    userId: userId,
    items: itemsDetails,
    type: TRANSACTION_TYPE.PAYMENT,
    amount: payAmount,
    currency: selectedCurrency,
    originalAmount: originalAmount,
    originalCurrency: CURRENCY.INR,
    exchangeRate: exchangedRate,
    metadata: {},
    paymentProvider: provider,
    status: TRANSACTION_STATUS.PENDING,
    paymentDetails: {},
  });

  if (!transactionResult.success) {
    return;
  }
};
