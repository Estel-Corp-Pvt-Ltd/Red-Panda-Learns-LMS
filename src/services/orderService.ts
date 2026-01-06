import {
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  collection,
  Query,
  endBefore,
  limitToLast,
  startAfter,
  limit,
} from "firebase/firestore";
import { db } from "../firebaseConfig.ts";
import { OrderStatus } from "../types/general.ts";
import { COLLECTION, ORDER_STATUS } from "@/constants.ts";
import { Order } from "@/types/order.ts";
import { logError } from "@/utils/logger.ts";
import { fail, ok, Result } from "@/utils/response.ts";
import { WhereFilterOp } from "firebase-admin/firestore";
import { PaginatedResult, PaginationOptions } from "@/utils/pagination.ts";

export interface DateRange {
  startDate?: Date;
  endDate?: Date;
}

export interface SearchCriteria {
  name?: string;
  email?: string;
}

export interface OrderFilterOptions extends PaginationOptions<Order> {
  dateRange?: DateRange;
  search?: SearchCriteria;
}

class OrderService {
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

      const userOrders: Order[] = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          userName: data.userName,
          userEmail: data.userEmail,
          orderId: data.orderId,
          userId: data.userId,
          items: data.items || [],
          status: data.status,
          amount: data.amount,
          currency: data.currency,
          exchangeRate: data.exchangeRate,
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

  async getAllOrders(): Promise<Result<Order[]>> {
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTION.ORDERS));
      const orders = querySnapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          ...data,
          createdAt: data.createdAt?.toDate?.() ?? null,
          updatedAt: data.updatedAt?.toDate?.() ?? null,
        } as Order;
      });

      console.log("OrderService - Fetched:", orders.length);
      return ok(orders);
    } catch (error) {
      logError("OrderService.getAllOrders", error);
      return fail("Failed to fetch orders");
    }
  }

  async getOrders(
    filters?: {
      field: keyof Order;
      op: WhereFilterOp;
      value: any;
    }[],
    options: PaginationOptions<Order> = {}
  ): Promise<Result<PaginatedResult<Order>>> {
    try {
      const {
        limit: itemsPerPage = 25,
        orderBy: orderByOption = { field: 'createdAt', direction: 'desc' },
        pageDirection = 'next',
        cursor = null
      } = options;

      let q: Query = collection(db, COLLECTION.ORDERS);

      if (filters && filters.length > 0) {
        const whereClauses = filters.map((f) =>
          where(f.field as string, f.op, f.value)
        );
        q = query(q, ...whereClauses);
      }

      const { field, direction } = orderByOption;

      if (pageDirection === 'previous' && cursor) {
        q = query(
          q,
          orderBy(field as string, direction),
          endBefore(cursor),
          limitToLast(itemsPerPage)
        );
      } else if (cursor) {
        q = query(
          q,
          orderBy(field as string, direction),
          startAfter(cursor),
          limit(itemsPerPage)
        );
      } else {
        q = query(
          q,
          orderBy(field as string, direction),
          limit(itemsPerPage)
        );
      }

      const querySnapshot = await getDocs(q);
      const documents = querySnapshot.docs;

      if (pageDirection === 'previous') {
        documents.reverse();
      }

      const orders = documents.map(doc => {
        const data = doc.data();
        return {
          orderId: data.orderId,
          userId: data.userId,
          userName: data.userName,
          userEmail: data.userEmail,
          items: data.items || [],
          status: data.status,
          amount: data.amount,
          completedAt: data.completedAt,
          transactionId: data.transactionId,
          currency: data.currency,
          metadata: data.metadata || {},
          billingAddress: data.billingAddress,
          shippingAddress: data.shippingAddress,
          createdAt: data.createdAt?.toDate?.() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
        } as Order;
      });

      const hasNextPage = querySnapshot.docs.length === itemsPerPage;
      const hasPreviousPage = cursor !== null;
      const nextCursor = hasNextPage ? querySnapshot.docs[querySnapshot.docs.length - 1] : null;
      const previousCursor = hasPreviousPage ? querySnapshot.docs[0] : null;

      return ok({
        data: orders,
        hasNextPage,
        hasPreviousPage,
        nextCursor,
        previousCursor,
        totalCount: querySnapshot.size
      });
    } catch (error) {
      console.error('OrderService - Error fetching orders:', error);
      return fail("Error fetching orders");
    }
  }

  async getOrdersByStatus(
    status: OrderStatus, 
    options: OrderFilterOptions = {}
  ): Promise<Result<PaginatedResult<Order>>> {
    const filters: { field: keyof Order; op: WhereFilterOp; value: any }[] = [
      { field: 'status', op: '==', value: status }
    ];

    if (options.dateRange?.startDate) {
      filters.push({
        field: 'createdAt',
        op: '>=',
        value: options.dateRange.startDate
      });
    }

    if (options.dateRange?.endDate) {
      const endOfDay = new Date(options.dateRange.endDate);
      endOfDay.setHours(23, 59, 59, 999);
      filters.push({
        field: 'createdAt',
        op: '<=',
        value: endOfDay
      });
    }

    return this.getOrders(filters, options);
  }

  /**
   * Fetch all orders by status for search/export purposes
   * This bypasses pagination for client-side filtering
   */
  async getAllOrdersByStatus(
    status: OrderStatus,
    dateRange?: DateRange
  ): Promise<Result<Order[]>> {
    try {
      let q: Query = collection(db, COLLECTION.ORDERS);
      
      // Build filters
      const constraints = [where('status', '==', status)];
      
      if (dateRange?.startDate) {
        constraints.push(where('createdAt', '>=', dateRange.startDate));
      }
      
      if (dateRange?.endDate) {
        const endOfDay = new Date(dateRange.endDate);
        endOfDay.setHours(23, 59, 59, 999);
        constraints.push(where('createdAt', '<=', endOfDay));
      }
      
      q = query(q, ...constraints, orderBy('createdAt', 'desc'));
      
      const querySnapshot = await getDocs(q);
      
      const orders = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          orderId: data.orderId,
          userId: data.userId,
          userName: data.userName,
          userEmail: data.userEmail,
          items: data.items || [],
          status: data.status,
          amount: data.amount,
          completedAt: data.completedAt,
          transactionId: data.transactionId,
          currency: data.currency,
          metadata: data.metadata || {},
          billingAddress: data.billingAddress,
          shippingAddress: data.shippingAddress,
          createdAt: data.createdAt?.toDate?.() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
        } as Order;
      });

      return ok(orders);
    } catch (error) {
      console.error('OrderService - Error fetching all orders by status:', error);
      return fail("Error fetching orders");
    }
  }
}

export const orderService = new OrderService();