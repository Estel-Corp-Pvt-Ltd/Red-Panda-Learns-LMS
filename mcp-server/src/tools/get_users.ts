import { db } from "../firebase.js";
import { COLLECTION } from "../constants.js";
import { z } from "zod";

export const getUsersSchema = {
  role: z.string().optional().describe("Filter by role: STUDENT, TEACHER, INSTRUCTOR, ADMIN, ACCOUNTANT"),
  status: z.string().optional().describe("Filter by status: ACTIVE, INACTIVE, SUSPENDED"),
  email: z.string().optional().describe("Filter by exact email address"),
  fromDate: z.string().optional().describe("Filter users created from this date (inclusive). ISO string e.g. 2026-02-13T00:00:00Z"),
  toDate: z.string().optional().describe("Filter users created up to this date (inclusive). ISO string e.g. 2026-02-18T23:59:59Z"),
  limit: z.number().optional().default(200).describe("Maximum number of results (default 200, max 500)"),
};

export async function getUsers(params: {
  role?: string;
  status?: string;
  email?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
}) {
  const hasDateFilter = params.fromDate || params.toDate;

  const memFilters: Record<string, string> = {};
  let query: FirebaseFirestore.Query = db.collection(COLLECTION.USERS);

  if (hasDateFilter) {
    if (params.role) memFilters.role = params.role;
    if (params.status) memFilters.status = params.status;
    if (params.email) memFilters.email = params.email;
    if (params.fromDate) query = query.where("createdAt", ">=", new Date(params.fromDate));
    if (params.toDate) query = query.where("createdAt", "<=", new Date(params.toDate));
  } else {
    if (params.role) query = query.where("role", "==", params.role);
    if (params.status) query = query.where("status", "==", params.status);
    if (params.email) query = query.where("email", "==", params.email);
  }

  const fetchLimit = Object.keys(memFilters).length > 0
    ? Math.min((params.limit ?? 200) * 3, 1500)
    : Math.min(params.limit ?? 200, 500);

  query = query.limit(fetchLimit);
  const snapshot = await query.get();

  let users = snapshot.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      email: d.email,
      firstName: d.firstName,
      lastName: d.lastName,
      role: d.role,
      status: d.status,
      organizationId: d.organizationId,
      createdAt: d.createdAt?.toDate?.()?.toISOString() ?? "",
    };
  });

  if (memFilters.role) users = users.filter((u) => u.role === memFilters.role);
  if (memFilters.status) users = users.filter((u) => u.status === memFilters.status);
  if (memFilters.email) users = users.filter((u) => u.email === memFilters.email);

  const finalLimit = Math.min(params.limit ?? 200, 500);
  users = users.slice(0, finalLimit);

  return { users, count: users.length };
}
