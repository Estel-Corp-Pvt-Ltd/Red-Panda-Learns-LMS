// src/services/orderService.ts

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { COLLECTION, ORDER_STATUS } from "../constants";
import { Order } from "../types/order";
import { fail, ok, Result } from "../utils/response";
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { formatDateTime } from '../utils/date-time';

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// ============================================
// Types for API Responses
// ============================================

/**
 * Serialized order for API responses
 * Timestamps are converted to formatted strings
 */
export interface SerializedOrder {
  orderId: string;
  userId: string;
  userName: string;
  userEmail: string;
  items: any[];
  status: string;
  amount: number;
  exchangeRate: number;
  originalAmount: number;
  promoCode: string;
  couponDiscount: number;
  provider: string;
  providerOrderId: string;
  currency: string;
  metadata?: Record<string, any>;
  billingAddress: any;
  shippingAddress?: any;
  createdAt: string;   // Formatted string, not Timestamp
  updatedAt: string;   // Formatted string, not Timestamp
  completedAt: string; // Formatted string, not Timestamp
}

/**
 * Query options for getOrders
 */
export interface GetOrdersOptions {
  status?: string;
  userId?: string;
  userEmail?: string;
  provider?: string;
  dateRange?: {
    startDate?: Date;
    endDate?: Date;
  };
  limit?: number;
  orderByField?: keyof Order;
  orderDirection?: 'asc' | 'desc';
}

// ============================================
// Utility Functions
// ============================================

/**
 * Transforms Firestore document data to SerializedOrder
 * Uses formatDateTime for all timestamp fields
 */
const serializeOrderFromDoc = (
  docId: string,
  data: FirebaseFirestore.DocumentData
): SerializedOrder => {
  return {
    orderId: data.orderId || docId,
    userId: data.userId || '',
    userName: data.userName || '',
    userEmail: data.userEmail || '',
    items: data.items || [],
    status: data.status || '',
    amount: data.amount || 0,
    exchangeRate: data.exchangeRate || 0,
    originalAmount: data.originalAmount || 0,
    promoCode: data.promoCode || '',
    couponDiscount: data.couponDiscount || 0,
    provider: data.provider || '',
    providerOrderId: data.providerOrderId || '',
    currency: data.currency || '',
    metadata: data.metadata || {},
    billingAddress: data.billingAddress || null,
    shippingAddress: data.shippingAddress || null,
    createdAt: formatDateTime(data.createdAt),
    updatedAt: formatDateTime(data.updatedAt),
    completedAt: formatDateTime(data.completedAt),
  };
};


/**
 * Transforms Firestore document to Order type (with Date objects)
 * Used for internal operations
 */
const documentToOrder = (
  docId: string,
  data: FirebaseFirestore.DocumentData
): Order => {
  return {
    orderId: data.orderId || docId,
    userId: data.userId,
    userName: data.userName,
    userEmail: data.userEmail,
    items: data.items || [],
    status: data.status,
    amount: data.amount,
    exchangeRate: data.exchangeRate,
    originalAmount: data.originalAmount,
    promoCode: data.promoCode || '',
    couponDiscount: data.couponDiscount || 0,
    provider: data.provider,
    providerOrderId: data.providerOrderId,
    currency: data.currency,
    metadata: data.metadata || {},
    billingAddress: data.billingAddress,
    shippingAddress: data.shippingAddress,
    // Keep as Timestamp for internal Order type
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    completedAt: data.completedAt,
  } as Order;
};

// ============================================
// Order Service Class
// ============================================

class OrderService {
  // ============================================
  // Order ID Generation
  // ============================================

  /** Generate unique order ID based on date + incremental counter */
  private async generateOrderId(): Promise<Result<{ orderId: string }>> {
    try {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
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

      const paddedSeq = String(dailySequence).padStart(3, '0');
      const orderId = `ORD-${dateStr}-${paddedSeq}`;
      return ok({ orderId });
    } catch (error: any) {
      functions.logger.error('Error generating order ID:', error);
      return fail('Failed to generate order ID', error.message);
    }
  }

  // ============================================
  // Read Operations - Internal (Returns Order)
  // ============================================

  /**
   * Get a single order by ID - Internal use
   * Returns Order type with Timestamp fields
   */
  async getOrderById(orderId: string): Promise<Result<Order | null>> {
    try {
      const orderRef = db.collection(COLLECTION.ORDERS).doc(orderId);
      const snapshot = await orderRef.get();

      if (!snapshot.exists) {
        functions.logger.warn(`Order ${orderId} not found`);
        return ok(null);
      }

      const data = snapshot.data()!;
      const order = documentToOrder(snapshot.id, data);

      return ok(order);
    } catch (error: any) {
      functions.logger.error('Error fetching order:', error);
      return fail('Failed to fetch order', error.message);
    }
  }

  /**
   * Get order by provider order ID - Internal use
   */
  async getOrderByProviderId(providerOrderId: string): Promise<Result<Order | null>> {
    try {
      const ordersRef = db
        .collection(COLLECTION.ORDERS)
        .where('providerOrderId', '==', providerOrderId)
        .limit(1);

      const snapshot = await ordersRef.get();

      if (snapshot.empty) {
        functions.logger.warn(`Order with providerOrderId ${providerOrderId} not found`);
        return fail('Failed to fetch order by provider ID');
      }

      const doc = snapshot.docs[0];
      const order = documentToOrder(doc.id, doc.data());

      return ok(order);
    } catch (error: any) {
      functions.logger.error('Error fetching order by provider ID:', error);
      return fail('Failed to fetch order by provider ID');
    }
  }

  /**
   * Get all orders for a specific user - Internal use
   */
  async getOrdersByUser(userId: string): Promise<Result<Order[]>> {
    try {
      const ordersRef = db.collection(COLLECTION.ORDERS);
      const q = ordersRef.where('userId', '==', userId);

      const querySnapshot = await q.get();

      if (querySnapshot.empty) {
        functions.logger.info(`No orders found for user: ${userId}`);
        return ok([]);
      }

      const userOrders: Order[] = querySnapshot.docs.map((doc) => 
        documentToOrder(doc.id, doc.data())
      );

      functions.logger.info(`Found ${userOrders.length} orders for user: ${userId}`);
      return ok(userOrders);
    } catch (error: any) {
      functions.logger.error(`Error fetching orders for user ${userId}:`, error);
      return fail('Failed to fetch user orders', error.message);
    }
  }

  // ============================================
  // Read Operations - API (Returns SerializedOrder)
  // ============================================

  /**
   * Get a single order by ID - Serialized for API response
   */
  async getOrderByIdSerialized(orderId: string): Promise<Result<SerializedOrder | null>> {
    try {
      if (!orderId || typeof orderId !== 'string') {
        return fail('Invalid order ID provided', 'INVALID_ORDER_ID');
      }

      functions.logger.info(`Fetching order: ${orderId}`);

      const orderRef = db.collection(COLLECTION.ORDERS).doc(orderId);
      const snapshot = await orderRef.get();

      if (!snapshot.exists) {
        functions.logger.warn(`Order ${orderId} not found`);
        return ok(null);
      }

      const serializedOrder = serializeOrderFromDoc(snapshot.id, snapshot.data()!);
      return ok(serializedOrder);
    } catch (error: any) {
      functions.logger.error('Error fetching order:', error);
      return fail('Failed to fetch order', error.message);
    }
  }

  /**
   * Get all orders for a specific user - Serialized for API response
   */
  async getOrdersByUserSerialized(userId: string): Promise<Result<SerializedOrder[]>> {
    try {
      if (!userId || typeof userId !== 'string') {
        return fail('Invalid user ID provided', 'INVALID_USER_ID');
      }

      functions.logger.info(`Fetching orders for user: ${userId}`);

      const ordersRef = db.collection(COLLECTION.ORDERS);
      const q = ordersRef.where('userId', '==', userId).orderBy('createdAt', 'desc');

      const querySnapshot = await q.get();

      if (querySnapshot.empty) {
        functions.logger.info(`No orders found for user: ${userId}`);
        return ok([]);
      }

      const serializedOrders: SerializedOrder[] = querySnapshot.docs.map((doc) =>
        serializeOrderFromDoc(doc.id, doc.data())
      );

      functions.logger.info(`Found ${serializedOrders.length} orders for user: ${userId}`);
      return ok(serializedOrders);
    } catch (error: any) {
      functions.logger.error(`Error fetching orders for user ${userId}:`, error);
      return fail('Failed to fetch user orders', error.message);
    }
  }

  /**
   * Fetch all orders - Serialized for API response
   */
  async getAllOrders(): Promise<Result<SerializedOrder[]>> {
    try {
      functions.logger.info('Fetching all orders');

      const querySnapshot = await db
        .collection(COLLECTION.ORDERS)
        .orderBy('createdAt', 'desc')
        .get();

      const orders: SerializedOrder[] = querySnapshot.docs.map((docSnap) =>
        serializeOrderFromDoc(docSnap.id, docSnap.data())
      );

      functions.logger.info(`OrderService - Fetched: ${orders.length} orders`);
      return ok(orders);
    } catch (error: any) {
      functions.logger.error('OrderService.getAllOrders error:', error);
      return fail('Failed to fetch orders', error.message);
    }
  }

  /**
   * Get orders with optional filters - Serialized for API response
   */
 async getOrders(options: GetOrdersOptions = {}): Promise<Result<SerializedOrder[]>> {
  try {
    const {
      status,
      userId,
      userEmail,
      provider,
      dateRange,
      limit,
      orderByField = 'createdAt',
      orderDirection = 'desc',
    } = options;

    // Convert limit to number if provided
    const queryLimit = limit !== undefined ? Number(limit) : undefined;

    functions.logger.info('Fetching orders with options:', {
      status,
      userId,
      userEmail,
      provider,
      dateRange,
      limit: queryLimit,
    });

    let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> =
      db.collection(COLLECTION.ORDERS);

    if (status) query = query.where('status', '==', status);
    if (userId) query = query.where('userId', '==', userId);
    if (userEmail) query = query.where('userEmail', '==', userEmail);
    if (provider) query = query.where('provider', '==', provider);

    if (dateRange?.startDate)
      query = query.where('createdAt', '>=', Timestamp.fromDate(dateRange.startDate));
    if (dateRange?.endDate) {
      const endOfDay = new Date(dateRange.endDate);
      endOfDay.setHours(23, 59, 59, 999);
      query = query.where('createdAt', '<=', Timestamp.fromDate(endOfDay));
    }

    // Apply ordering
    if (dateRange) {
      query = query.orderBy('createdAt', orderDirection);
      if (orderByField !== 'createdAt') {
        query = query.orderBy(orderByField, orderDirection);
      }
    } else {
      query = query.orderBy(orderByField, orderDirection);
    }

    // Apply limit only if provided
    if (queryLimit && queryLimit > 0) {
      query = query.limit(queryLimit);
    }

    const querySnapshot = await query.get();

    const orders: SerializedOrder[] = querySnapshot.docs.map((docSnap) =>
      serializeOrderFromDoc(docSnap.id, docSnap.data())
    );

    functions.logger.info(`OrderService.getOrders - Fetched: ${orders.length} orders`);
    return ok(orders);
  } catch (error: any) {
    functions.logger.error('OrderService.getOrders error:', error);
    return fail('Failed to fetch orders', error.message);
  }
}


  /**
   * Get orders by status - Serialized
   */
  async getOrdersByStatus(status: string): Promise<Result<SerializedOrder[]>> {
    return this.getOrders({ status });
  }

  /**
   * Get orders by status with date range - Serialized
   */
  async getOrdersByStatusWithDateRange(
    status: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<Result<SerializedOrder[]>> {
    return this.getOrders({
      status,
      dateRange: { startDate, endDate },
    });
  }

  /**
   * Get orders by date range - Serialized
   */
  async getOrdersByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<Result<SerializedOrder[]>> {
    return this.getOrders({
      dateRange: { startDate, endDate },
    });
  }

  /**
   * Get orders by provider - Serialized
   */
  async getOrdersByProvider(provider: string): Promise<Result<SerializedOrder[]>> {
    return this.getOrders({ provider });
  }

  /**
   * Search orders by email - Serialized
   */
  async searchOrdersByEmail(email: string): Promise<Result<SerializedOrder[]>> {
    if (!email || typeof email !== 'string') {
      return fail('Invalid email provided', 'INVALID_EMAIL');
    }
    return this.getOrders({ userEmail: email.toLowerCase() });
  }

  /**
   * Get order count by status (for analytics/dashboard)
   */
  async getOrderCountByStatus(): Promise<Result<Record<string, number>>> {
    try {
      functions.logger.info('Fetching order counts by status');

      const querySnapshot = await db.collection(COLLECTION.ORDERS).get();

      const counts: Record<string, number> = {};

      querySnapshot.docs.forEach((doc) => {
        const status = doc.data().status as string;
        counts[status] = (counts[status] || 0) + 1;
      });

      functions.logger.info('Order counts by status:', counts);
      return ok(counts);
    } catch (error: any) {
      functions.logger.error('OrderService.getOrderCountByStatus error:', error);
      return fail('Error fetching order counts', error.message);
    }
  }

  // ============================================
  // Create Operations
  // ============================================

  /**
   * Create a new order
   */
  async createOrder(
    data: Omit<Order, 'orderId' | 'createdAt' | 'completedAt' | 'updatedAt'>
  ): Promise<Result<string>> {
    try {
      const generated = await this.generateOrderId();
      if (!generated.success || !generated.data) return fail('Failed to generate order ID');

      const { orderId } = generated.data;
      const timestamp = FieldValue.serverTimestamp();

      const order: Order = {
        orderId,
        userId: data.userId,
        userName: data.userName,
        userEmail: data.userEmail,
        items: data.items,
        status: data.status || ORDER_STATUS.PENDING,
        amount: data.amount,
        exchangeRate: data.exchangeRate,
        originalAmount: data.originalAmount,
        provider: data.provider,
        promoCode: data.promoCode || '',
        couponDiscount: data.couponDiscount || 0,
        providerOrderId: data.providerOrderId,
        currency: data.currency,
        metadata: data.metadata || {},
        billingAddress: data.billingAddress,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      await db.collection(COLLECTION.ORDERS).doc(orderId).set(order);
      functions.logger.info(`Order created: ${orderId}`);

      return ok(orderId);
    } catch (error: any) {
      functions.logger.error('Error creating order:', error);
      return fail('Failed to create order', error.message);
    }
  }

  /**
   * Create order for free course — auto-completes instantly
   */
  async createOrderForFreeCourse(
    data: Omit<Order, 'orderId' | 'createdAt' | 'completedAt' | 'updatedAt'>
  ): Promise<Result<string>> {
    try {
      if (!data.userId) return fail('Invalid userId');
      if (!data.items || data.items.length === 0) {
        return fail('Order must contain at least one item');
      }

      const generated = await this.generateOrderId();
      if (!generated.success || !generated.data) return fail('Failed to generate order ID');

      const { orderId } = generated.data;
      const timestamp = FieldValue.serverTimestamp();

      const order: Order = {
        orderId,
        userId: data.userId,
        userName: data.userName,
        userEmail: data.userEmail,
        items: data.items,
        status: ORDER_STATUS.COMPLETED,
        provider: data.provider,
        couponDiscount: 0,
        promoCode: '',
        exchangeRate: 0,
        providerOrderId: '',
        originalAmount: 0,
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
      return fail('Failed to create order for free course', error.message);
    }
  }

  // ============================================
  // Update Operations
  // ============================================

  /**
   * Update existing order
   */
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
      const updateData: Record<string, any> = {
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
      return fail('Failed to update order', error.message);
    }
  }

  /**
   * Update order status only
   */
  async updateOrderStatus(orderId: string, status: string): Promise<Result<void>> {
    try {
      const updateData: Record<string, any> = {
        status,
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (status === ORDER_STATUS.COMPLETED) {
        updateData.completedAt = FieldValue.serverTimestamp();
      }

      await db.collection(COLLECTION.ORDERS).doc(orderId).update(updateData);
      return ok(undefined);
    } catch (error: any) {
      return fail('Failed to update order status', error.message);
    }
  }

  /**
   * Update order provider order ID
   */
  async updateOrderProviderOrderId(orderId: string, providerOrderId: string): Promise<Result<void>> {
    try {
      await db.collection(COLLECTION.ORDERS).doc(orderId).update({
        providerOrderId,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return ok(undefined);
    } catch (error: any) {
      return fail('Failed to update order providerOrderId', error.message);
    }
  }
}

export const orderService = new OrderService();