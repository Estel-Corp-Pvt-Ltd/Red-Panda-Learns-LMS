import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { COLLECTION, ORDER_STATUS } from "../constants";
import { Order } from "../types/order";
import { fail, ok, Result } from "../utils/response";
import { FieldValue } from 'firebase-admin/firestore';

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

class OrderService {
  /** Generate unique order ID based on date + incremental counter */
  private async generateOrderId(): Promise<Result<{ orderId: string }>> {
    try {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");
      const dateStr = `${yyyy}${mm}${dd}`;

      const counterRef = db.collection(COLLECTION.COUNTERS).doc(`orderCounters_${dateStr}`);

      const dailySequence = await db.runTransaction(async (tx) => {
        const snapshot = await tx.get(counterRef);
        let seq = 1;

        if (snapshot.exists) {
          const data = snapshot.data();
          seq = (data?.seq || 0) + 1;
        }

        tx.set(counterRef, { seq }, { merge: true });
        return seq;
      });

      const paddedSeq = String(dailySequence).padStart(3, "0");
      const orderId = `ORD-${dateStr}-${paddedSeq}`;
      return ok({ orderId });
    } catch (error: any) {
      functions.logger.error('Error generating order ID:', error);
      return fail("Failed to generate order ID", error.message);
    }
  }

  async getOrderById(orderId: string): Promise<Result<Order | null>> {
    try {
      const orderRef = db.collection(COLLECTION.ORDERS).doc(orderId);
      const snapshot = await orderRef.get();

      if (!snapshot.exists) {
        functions.logger.warn(`Order ${orderId} not found`);
        return ok(null);
      }

      const data = snapshot.data();
      const order: Order = {
        ...data,
        orderId: snapshot.id,
        createdAt: data?.createdAt?.toDate(),
        updatedAt: data?.updatedAt?.toDate(),
        completedAt: data?.completedAt?.toDate(),
      } as Order;

      return ok(order);
    } catch (error: any) {
      functions.logger.error('Error fetching order:', error);
      return fail("Failed to fetch order", error.message);
    }
  }

  async getOrderByProviderId(providerOrderId: string): Promise<Result<Order | null>> {
    try {
      const ordersRef = db
        .collection(COLLECTION.ORDERS)
        .where("providerOrderId", "==", providerOrderId)
        .limit(1);

      const snapshot = await ordersRef.get();

      if (snapshot.empty) {
        functions.logger.warn(`Order with providerOrderId ${providerOrderId} not found`);
        return fail("Failed to fetch order by provider ID");
      }

      const doc = snapshot.docs[0];
      const data = doc.data();
      const order: Order = {
        ...data,
        orderId: doc.id,
        createdAt: data?.createdAt?.toDate(),
        updatedAt: data?.updatedAt?.toDate(),
        completedAt: data?.completedAt?.toDate(),
      } as Order;

      return ok(order);
    } catch (error: any) {
      functions.logger.error('Error fetching order by provider ID:', error);
      return fail("Failed to fetch order by provider ID");
    }
  }

  async getOrdersByUser(userId: string): Promise<Result<Order[]>> {
    try {
      const ordersRef = db.collection(COLLECTION.ORDERS);
      const q = ordersRef.where('userId', '==', userId);

      const querySnapshot = await q.get();

      if (querySnapshot.empty) {
        functions.logger.info(`No orders found for user: ${userId}`);
        return ok([]);
      }

      const userOrders: Order[] = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          orderId: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
          completedAt: data.completedAt?.toDate(),
        } as Order;
      });

      functions.logger.info(`Found ${userOrders.length} orders for user: ${userId}`);
      return ok(userOrders);

    } catch (error: any) {
      functions.logger.error(`Error fetching orders for user ${userId}:`, error);
      return fail("Failed to fetch user orders", error.message);
    }
  }

  async createOrder(
    data: Omit<Order, "orderId" | "createdAt" | "completedAt" | "updatedAt">
  ): Promise<Result<string>> {
    try {
      const generated = await this.generateOrderId();
      if (!generated.success || !generated.data) return fail("Failed to generate order ID");

      const { orderId } = generated.data;
      const timestamp = FieldValue.serverTimestamp();

      const order: Order = {
        orderId,
        userId: data.userId,
        items: data.items,
        status: data.status || ORDER_STATUS.PENDING,
        amount: data.amount,
        providerOrderId: data.providerOrderId,
        currency: data.currency,
        metadata: data.metadata || {},
        billingAddress: data.billingAddress,
        // shippingAddress: data.shippingAddress as Address,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      await db.collection(COLLECTION.ORDERS).doc(orderId).set(order);
      functions.logger.info(`Order created: ${orderId}`);

      return ok(orderId);
    } catch (error: any) {
      functions.logger.error('Error creating order:', error);
      return fail("Failed to create order", error.message);
    }
  }

  /** Create order for free course — auto-completes instantly */
  async createOrderForFreeCourse(
    data: Omit<Order, "orderId" | "createdAt" | "completedAt" | "updatedAt">
  ): Promise<Result<string>> {
    try {
      if (!data.userId) return fail("Invalid userId");
      if (!data.items || data.items.length === 0) {
        return fail("Order must contain at least one item");
      }

      const generated = await this.generateOrderId();
      if (!generated.success || !generated.data) return fail("Failed to generate order ID");

      const { orderId } = generated.data;
      const timestamp = FieldValue.serverTimestamp();

      const order: Order = {
        orderId,
        userId: data.userId,
        items: data.items,
        status: ORDER_STATUS.COMPLETED,
        providerOrderId: data.providerOrderId,
        amount: data.amount,
        currency: data.currency,
        metadata: data.metadata ?? {},
        billingAddress: data.billingAddress,
        shippingAddress: data.shippingAddress,
        completedAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      await db.collection(COLLECTION.ORDERS).doc(orderId).set(order);
      functions.logger.info(`Free course order created: ${orderId}`);

      return ok(orderId);
    } catch (error: any) {
      functions.logger.error('Error creating free course order:', error);
      return fail("Failed to create order for free course", error.message);
    }
  }

  /** Update existing order */
  async updateOrder(
    orderId: string,
    status: string,
    transactionId?: string,
    metadataUpdates?: Record<string, any>
  ): Promise<Result<void>> {
    try {
      const orderRef = db.collection(COLLECTION.ORDERS).doc(orderId);
      const snapshot = await orderRef.get();

      if (!snapshot.exists) {
        return fail(`Order ${orderId} not found`);
      }

      const existingData = snapshot.data();
      const updateData: any = {
        status,
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (transactionId) {
        updateData.transactionId = transactionId;
      }

      if (metadataUpdates) {
        updateData.metadata = {
          ...(existingData?.metadata || {}),
          ...metadataUpdates,
        };
      }

      if (status === ORDER_STATUS.COMPLETED) {
        updateData.completedAt = FieldValue.serverTimestamp();
      }

      await orderRef.update(updateData);
      functions.logger.info(`Order updated: ${orderId}, status: ${status}`);

      return ok(undefined);
    } catch (error: any) {
      functions.logger.error('Error updating order:', error);
      return fail("Failed to update order", error.message);
    }
  }

  async updateOrderStatus(orderId: string, status: string): Promise<Result<void>> {
    try {
      await db.collection(COLLECTION.ORDERS).doc(orderId).update({
        status,
        updatedAt: FieldValue.serverTimestamp(),
        ...(status === ORDER_STATUS.COMPLETED && { completedAt: FieldValue.serverTimestamp() }),
      });
      return ok(undefined);
    } catch (error: any) {
      return fail("Failed to update order status", error.message);
    }
  }
}

export const orderService = new OrderService();
