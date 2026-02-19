import { db } from "../firebase.js";
import { COLLECTION } from "../constants.js";
import type { OrderSnapshot, OrderLineItem, OrdersState } from "./types.js";
import { writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";

const STATE_PATH = resolve(import.meta.dirname, "../../state/orders.json");

function toISOString(ts: any): string {
  if (!ts) return "";
  if (ts.toDate) return ts.toDate().toISOString();
  if (ts._seconds) return new Date(ts._seconds * 1000).toISOString();
  return String(ts);
}

export async function generateOrdersState(): Promise<OrdersState> {
  const snapshot = await db.collection(COLLECTION.ORDERS).get();

  const orders: OrderSnapshot[] = snapshot.docs.map((doc) => {
    const d = doc.data();
    const items: OrderLineItem[] = (d.items ?? []).map((item: any) => ({
      itemId: item.itemId ?? "",
      itemType: item.itemType ?? "",
      name: item.name ?? "",
      amount: item.amount ?? 0,
      originalAmount: item.originalAmount,
    }));

    return {
      orderId: d.orderId ?? doc.id,
      userId: d.userId ?? "",
      userName: d.userName ?? "",
      userEmail: d.userEmail ?? "",
      items,
      status: d.status ?? "",
      amount: d.amount ?? 0,
      currency: d.currency ?? "",
      transactionId: d.transactionId ?? null,
      createdAt: toISOString(d.createdAt),
      updatedAt: toISOString(d.updatedAt),
    };
  });

  const byStatus: Record<string, number> = {};
  const totalRevenue: Record<string, number> = {};
  for (const o of orders) {
    byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;
    if (o.status === "COMPLETED") {
      const curr = o.currency || "UNKNOWN";
      totalRevenue[curr] = (totalRevenue[curr] ?? 0) + o.amount;
    }
  }

  const state: OrdersState = {
    orders,
    totalCount: orders.length,
    byStatus,
    totalRevenue,
    generatedAt: new Date().toISOString(),
  };

  mkdirSync(dirname(STATE_PATH), { recursive: true });
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
  return state;
}
