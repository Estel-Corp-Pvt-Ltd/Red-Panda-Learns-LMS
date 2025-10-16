import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  serverTimestamp,
  runTransaction,
} from "firebase/firestore";
import { db } from "../firebaseConfig.ts";
import { OrderStatus } from "../types/general.ts";
// import { ORDER_STATUS } from "../constants.ts";
import { Order } from "@/types/order.ts";


class OrderService {
  private async generateOrderId(): Promise<{ orderId: string }> {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const dateStr = `${yyyy}${mm}${dd}`;

  const counterRef = doc(db, 'counters','orderCounters');

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
    data: Omit<Order, "orderId" | "createdAt" | "completedAt">,
    providedOrderId?: string // optional idempotent orderId
  ): Promise<string> {
    try {
      let orderId = providedOrderId;

      if (orderId) {
        // 🔎 If caller gave an orderId, check DB first
        const existing = await getDoc(doc(db, "Orders", orderId));
        if (existing.exists()) {
          console.log("♻️ Returning existing order:", orderId);
          return orderId; // idempotent return
        }
      } else {
 const generated = await this.generateOrderId();        // If no orderId provided → create new Firestore doc
        orderId = generated.orderId
      }
      
      const order: Order = {
        orderId ,
        userId: data.userId,
        courseIds: data.courseIds,
        bundleId: data.bundleId || null,
        status: data.status || "PENDING",
        amount: data.amount,
        currency: data.currency,
        transactionId: data.transactionId || null,
        metadata: data.metadata || {},
        billingAddress:data.billingAddress,
        shippingAddress:data.shippingAddress || null,
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, "Orders", orderId), order);

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
      const orderRef = doc(db, "Orders", orderId);
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
      if (status === "SUCCESS") {
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
