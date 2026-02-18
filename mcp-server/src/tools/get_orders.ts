import { db } from "../firebase.js";
import { COLLECTION } from "../constants.js";
import { z } from "zod";

export const getOrdersSchema = {
  userId: z.string().optional().describe("Filter by user ID"),
  status: z.string().optional().describe("Filter by status: PENDING, COMPLETED, FAILED"),
  fromDate: z.string().optional().describe("Filter orders from this date (inclusive). ISO string e.g. 2026-02-13T00:00:00Z"),
  toDate: z.string().optional().describe("Filter orders up to this date (inclusive). ISO string e.g. 2026-02-18T23:59:59Z"),
  limit: z.number().optional().default(200).describe("Maximum number of results (default 200, max 500)"),
};

export async function getOrders(params: {
  userId?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
}) {
  const hasDateFilter = params.fromDate || params.toDate;
  const hasEqualityFilter = params.status || params.userId;

  // When combining equality + range filters, do range in Firestore and equality in-memory
  // to avoid requiring composite indexes
  const applyStatusInMemory = hasDateFilter && params.status;
  const applyUserIdInMemory = hasDateFilter && params.userId && params.status;

  let query: FirebaseFirestore.Query = db.collection(COLLECTION.ORDERS);

  if (params.userId && !applyUserIdInMemory) {
    query = query.where("userId", "==", params.userId);
  }
  if (params.status && !applyStatusInMemory) {
    query = query.where("status", "==", params.status);
  }
  if (params.fromDate) {
    query = query.where("createdAt", ">=", new Date(params.fromDate));
  }
  if (params.toDate) {
    query = query.where("createdAt", "<=", new Date(params.toDate));
  }

  // Fetch more if we need to filter in-memory
  const fetchLimit = applyStatusInMemory
    ? Math.min((params.limit ?? 200) * 3, 1500)
    : Math.min(params.limit ?? 200, 500);

  query = query.limit(fetchLimit);
  const snapshot = await query.get();

  let orders = snapshot.docs.map((doc) => {
    const d = doc.data();
    return {
      orderId: d.orderId ?? doc.id,
      userId: d.userId,
      userName: d.userName,
      userEmail: d.userEmail,
      items: (d.items ?? []).map((item: any) => ({
        itemId: item.itemId,
        itemType: item.itemType,
        name: item.name,
        amount: item.amount,
      })),
      status: d.status,
      amount: d.amount,
      currency: d.currency,
      createdAt: d.createdAt?.toDate?.()?.toISOString() ?? "",
    };
  });

  // Apply in-memory filters
  if (applyStatusInMemory) {
    orders = orders.filter((o) => o.status === params.status);
  }
  if (applyUserIdInMemory) {
    orders = orders.filter((o) => o.userId === params.userId);
  }

  // Apply final limit
  const finalLimit = Math.min(params.limit ?? 200, 500);
  orders = orders.slice(0, finalLimit);

  return { orders, count: orders.length };
}
