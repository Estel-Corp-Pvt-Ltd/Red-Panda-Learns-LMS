import { db } from "../firebase.js";
import { COLLECTION } from "../constants.js";
import { z } from "zod";

export const searchUsersSchema = {
  query: z.string().describe("Search query - matches against email, firstName, lastName"),
  limit: z.number().optional().default(20).describe("Maximum number of results (default 20)"),
};

export async function searchUsers(params: { query: string; limit?: number }) {
  const q = params.query.toLowerCase();
  const limit = params.limit ?? 20;

  // Firestore doesn't support full-text search natively.
  // Strategy: prefix match on email (most common lookup),
  // then fall back to fetching and filtering in memory for name searches.

  // Try email prefix match first
  const emailSnapshot = await db
    .collection(COLLECTION.USERS)
    .where("email", ">=", q)
    .where("email", "<=", q + "\uf8ff")
    .limit(limit)
    .get();

  if (emailSnapshot.size > 0) {
    const users = emailSnapshot.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        email: d.email,
        firstName: d.firstName,
        lastName: d.lastName,
        role: d.role,
        status: d.status,
      };
    });
    return { users, count: users.length, matchType: "email_prefix" };
  }

  // Fall back to in-memory search (limited to 200 docs scanned)
  const allSnapshot = await db.collection(COLLECTION.USERS).limit(200).get();
  const users = allSnapshot.docs
    .map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        email: d.email ?? "",
        firstName: d.firstName ?? "",
        lastName: d.lastName ?? "",
        role: d.role ?? "",
        status: d.status ?? "",
      };
    })
    .filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        u.firstName.toLowerCase().includes(q) ||
        u.lastName.toLowerCase().includes(q)
    )
    .slice(0, limit);

  return { users, count: users.length, matchType: "name_search" };
}
