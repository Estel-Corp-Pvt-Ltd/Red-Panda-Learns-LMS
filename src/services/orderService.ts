import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from "firebase/firestore";
import { db } from "../firebaseConfig.ts";
import { OrderStatus } from "../types/general.ts";
// import { ORDER_STATUS } from "../constants.ts";
import { COLLECTION, ORDER_STATUS } from "@/constants.ts";
import { Order } from "@/types/order.ts";
import { logError } from "@/utils/logger.ts";
import { fail, ok, Result } from "@/utils/response.ts";

class OrderService {
  private async generateOrderId(): Promise<{ orderId: string }> {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const dateStr = `${yyyy}${mm}${dd}`;

    const counterRef = doc(db, COLLECTION.COUNTERS, `orderCounters_${dateStr}`);

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

  async getOrderById(orderId: string): Promise<Order | null> {
    try {
      const orderRef = doc(db, COLLECTION.ORDERS, orderId);
      const snapshot = await getDoc(orderRef);

      if (!snapshot.exists()) {
        console.warn(`Order ${orderId} not found`);
        return null;
      }

      return snapshot.data() as Order;
    } catch (error) {
      console.error("Error fetching order:", error);
      throw new Error("Failed to fetch order");
    }
  }

  async getOrdersByUser(userId: string): Promise<Order[]> {
    try {
      // Query orders collection directly with user filter
      const ordersRef = collection(db, COLLECTION.ORDERS);
      const q = query(
        ordersRef,
        where('userId', '==', userId),
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.log(`No orders found for user: ${userId}`);
        return [];
      }

      // Map documents to Order objects with proper typing
      const userOrders: Order[] = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          orderId: data.orderId,
          userId: data.userId,
          items: data.items || [],
          status: data.status,
          amount: data.amount,
          currency: data.currency,
          billingAddress: data.billingAddress,
          shippingAddress: data.shippingAddress,
          transactionId: data.transactionId,
          metadata: data.metadata || {},
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          completedAt: data.completedAt
        } as Order;
      });

      console.log(`Found ${userOrders.length} orders for user: ${userId}`);
      return userOrders;

    } catch (error) {
      console.error(`Error fetching orders for user ${userId}:`, error);
      throw new Error('Failed to fetch user orders');
    }
  }

  async createOrder(
    data: Omit<Order, "orderId" | "createdAt" | "completedAt" | "updatedAt">,
  ): Promise<string> {
    try {

      const generated = await this.generateOrderId();        // If no orderId provided → create new Firestore doc
      const orderId = generated.orderId

      const order: Order = {
        orderId,
        userId: data.userId,
        items: data.items,
        status: data.status || ORDER_STATUS.PENDING,
        amount: data.amount,
        currency: data.currency,
        transactionId: data.transactionId || null,
        metadata: data.metadata || {},
        billingAddress: data.billingAddress,
        shippingAddress: data.shippingAddress || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, COLLECTION.ORDERS, orderId), order);

      console.log("Order created:", orderId);
      return orderId;
    } catch (error) {
      console.error("Error creating order:", error);
      throw new Error("Failed to create order");
    }
  }

  async createOrderForFreeCourse(
    data: Omit<Order, "orderId" | "createdAt" | "completedAt" | "updatedAt">
  ): Promise<Result<string>> {
    try {
      if (!data.userId) return fail("Invalid userId");
      if (!data.items || data.items.length === 0)
        return fail("Order must contain at least one item");

      const { orderId } = await this.generateOrderId();
      const timestamp = serverTimestamp();

      const order: Order = {
        orderId,
        userId: data.userId,
        items: data.items,
        status: ORDER_STATUS.COMPLETED,
        amount: data.amount,
        currency: data.currency,
        transactionId: null,
        metadata: data.metadata ?? {},
        billingAddress: data.billingAddress ?? null,
        completedAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      await setDoc(doc(db, COLLECTION.ORDERS, orderId), order);

      return ok(orderId);
    } catch (error: any) {
      logError("OrderService.createOrderForFreeCourse", error);

      return fail(
        "Failed to create order",
        error.code ?? "ORDER_CREATION_ERROR",
        error.stack
      );
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
      if (status === ORDER_STATUS.COMPLETED) {
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
