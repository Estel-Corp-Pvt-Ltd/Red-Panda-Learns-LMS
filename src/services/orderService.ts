import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc
} from "firebase/firestore";
import { db } from "../firebaseConfig.ts";
import { OrderStatus } from "../types/general.ts";
// import { ORDER_STATUS } from "../constants.ts";
import { Order } from "@/types/order.ts";
import { ORDER_STATUS } from "@/constants.ts";
import { COLLECTION } from "@/constants.ts";

class OrderService {
  private async generateOrderId(): Promise<{ orderId: string }> {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const dateStr = `${yyyy}${mm}${dd}`;

  const counterRef = doc(db, COLLECTION.COUNTERS,`orderCounters_${dateStr}`);

  // Use Firestore transaction to increment safely
  const dailySequence = await runTransaction(db, async (tx) => {
    const snapshot = await tx.get(counterRef);
    let seq = 1;

    if (snapshot.exists()) {
      const data = snapshot.data();
      seq = (data?.seq || 0) + 1;
    }

    tx.set(counterRef, { seq }, { merge: true });
    return seq;
  });

  const paddedSeq = String(dailySequence).padStart(3, "0");
  const orderId = `ORD-${dateStr}-${paddedSeq}`;
  return { orderId };
}


  async createOrder(
    data: Omit<Order, "orderId" | "createdAt" | "completedAt" | "updatedAt">,
    providedOrderId?: string // optional idempotent orderId
  ): Promise<string> {
    try {
      
 const generated = await this.generateOrderId();        // If no orderId provided → create new Firestore doc
        const orderId = generated.orderId

      const order: Order = {
        orderId ,
        userId: data.userId,
        items:data.items,
        status: data.status || ORDER_STATUS.PENDING,
        amount: data.amount,
        currency: data.currency,
        transactionId: data.transactionId || null,
        metadata: data.metadata || {},
        billingAddress:data.billingAddress,
        shippingAddress:data.shippingAddress || null,
        createdAt: serverTimestamp(),
        updatedAt:serverTimestamp(),
      };

      await setDoc(doc(db, COLLECTION.ORDERS, orderId), order);

      console.log("Order created:", orderId);
      return orderId;
    } catch (error) {
      console.error("Error creating order:", error);
      throw new Error("Failed to create order");
    }
  }

  async updateOrder(
    orderId: string,
    status: OrderStatus,
    transactionId?: string, // link to latest transaction if needed
    metadataUpdates?: Record<string, any>
  ): Promise<void> {
    try {
      const orderRef = doc(db, COLLECTION.ORDERS, orderId);
      const snapshot = await getDoc(orderRef);

      if (!snapshot.exists()) {
        throw new Error(`Order ${orderId} not found`);
      }

      const existingData = snapshot.data();
      const updateData: any = {
        status,
        updatedAt: serverTimestamp(),
      };

      // Update transactionId if provided
      if (transactionId) {
        updateData.transactionId = transactionId;
      }

      // Merge metadata if provided
      if (metadataUpdates) {
        updateData.metadata = {
          ...(existingData.metadata || {}),
          ...metadataUpdates,
        };
      }

      // Set completedAt if order is marked SUCCESS
      if (status === ORDER_STATUS.SUCCESS) {
        updateData.completedAt = serverTimestamp();
      }

      await updateDoc(orderRef, updateData);
      console.log("Order updated:", orderId, status);
    } catch (error) {
      console.error("Error updating order:", error);
      throw new Error("Failed to update order");
    }
  }
}

export const orderService = new OrderService();
