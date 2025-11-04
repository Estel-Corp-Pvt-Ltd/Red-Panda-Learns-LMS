import { onRequest } from "firebase-functions/v2/https";
import { Request, Response } from "express";
import { withMiddleware } from "../middlewares";
import { corsMiddleware } from "../middlewares/cors";
import { authMiddleware } from "../middlewares/auth";
import { PaymentRequestSchema } from "../utils/validators";
import { orderService } from "../services/orderService";
import { courseService } from "../services/courseService";
import { Course } from "../types/course";
import { bundleService } from "../services/bundleService";
import { Bundle } from "../types/bundle";
import { transactionService } from "../services/transactionService";
import { TransactionLineItem } from "../types/transaction";
import { Address } from "../types/order";
import { CURRENCY, TRANSACTION_STATUS, TRANSACTION_TYPE } from "../constants";

const paymentIntentHandler = async (req: Request, res: Response) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const user = (req as any).user;
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const result = PaymentRequestSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: "Invalid request", details: result.error });
      return;
    }

    const { provider, items, selectedCurrency, billingAddress } = result.data;

    const courses: Course[] = [];
    const bundles: Bundle[] = [];

    await Promise.all(items.map(async (item) => {
      if (item.type === "COURSE") {
        const result = await courseService.getCourseById(item.refId);
        if (result.success && result.data) {
          courses.push(result.data);
        }
      } else if (item.type === "BUNDLE") {
        const result = await bundleService.getBundleById(item.refId);
        if (result.success && result.data) {
          bundles.push(result.data);
        }
      }
    }));

    const originalAmount = courses.reduce((sum, course) => sum + course.salePrice, 0) +
      bundles.reduce((sum, bundle) => sum + bundle.salePrice, 0);

    let convertedAmount = originalAmount;
    let exchangedRate = 1;
    if (selectedCurrency !== CURRENCY.INR) {
      exchangedRate = 0.8; // Example exchange rate
      convertedAmount = originalAmount * exchangedRate;
    }

    const order = await orderService.createOrder({
      userId: user.uid,
      items: items.map(item => ({
        itemId: item.refId,
        itemType: item.type,
        name: item.type === "COURSE"
          ? courses.find(c => c.id === item.refId)?.title || "Unknown Course"
          : bundles.find(b => b.id === item.refId)?.title || "Unknown Bundle",
        amount: item.type === "COURSE"
          ? courses.find(c => c.id === item.refId)?.salePrice || 0
          : bundles.find(b => b.id === item.refId)?.salePrice || 0,
      })) as TransactionLineItem[],
      status: "PENDING",
      amount: convertedAmount,
      currency: selectedCurrency,
      metadata: {},
      billingAddress: billingAddress as Address,
    });



    if (!order.success || !order.data) {
      res.status(500).json({ success: false, error: "Failed to create order" });
      return;
    }

    // Fix: Add the missing required fields
    const transactionResult = await transactionService.createTransaction({
      orderNumber: order.data,
      userId: user.uid,
      items: items.map(item => ({
        itemId: item.refId,
        itemType: item.type,
        name: item.type === "COURSE"
          ? courses.find(c => c.id === item.refId)?.title || "Unknown Course"
          : bundles.find(b => b.id === item.refId)?.title || "Unknown Bundle",
        amount: item.type === "COURSE"
          ? courses.find(c => c.id === item.refId)?.salePrice || 0
          : bundles.find(b => b.id === item.refId)?.salePrice || 0,
      })) as TransactionLineItem[],
      type: TRANSACTION_TYPE.PAYMENT,
      amount: convertedAmount,
      currency: selectedCurrency,
      originalAmount: originalAmount,
      originalCurrency: CURRENCY.INR,
      exchangeRate: exchangedRate,
      metadata: undefined,
      paymentProvider: provider,
      status: TRANSACTION_STATUS.PENDING,
      paymentDetails: undefined,
    });

    if (!transactionResult.success) {
      res.status(500).json({ success: false, error: "Failed to create transaction" });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        orderId: order.data,
        transactionId: '',
        items,
        userEmail: user.email,
        userId: user.uid,
        amount: originalAmount,
        selectedCurrency: selectedCurrency,
      }
    });

  } catch (err: any) {
    console.error("❌ Payment intent creation failed:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

export const paymentIntent = onRequest(
  { region: "us-central1", secrets: [] },
  withMiddleware(corsMiddleware, authMiddleware, paymentIntentHandler)
);
