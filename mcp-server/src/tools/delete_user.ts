import { db, auth } from "../firebase.js";
import { COLLECTION } from "../constants.js";
import { z } from "zod";

export const deleteUserSchema = {
  userId: z.string().describe("The user ID to delete"),
  deleteAuthAccount: z
    .boolean()
    .optional()
    .default(true)
    .describe("Also delete the Firebase Auth account (default true)"),
};

export async function deleteUser(params: {
  userId: string;
  deleteAuthAccount?: boolean;
}) {
  const userRef = db.collection(COLLECTION.USERS).doc(params.userId);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    throw new Error(`User not found: ${params.userId}`);
  }

  const userData = userDoc.data()!;
  const userName = [userData.firstName, userData.lastName].filter(Boolean).join(" ");

  // Delete Firestore document
  await userRef.delete();

  // Optionally delete Firebase Auth account
  if (params.deleteAuthAccount !== false) {
    try {
      await auth.deleteUser(params.userId);
    } catch (err: any) {
      // Auth user might not exist — that's fine
      if (err.code !== "auth/user-not-found") {
        throw err;
      }
    }
  }

  return {
    userId: params.userId,
    email: userData.email,
    name: userName,
    authDeleted: params.deleteAuthAccount !== false,
    message: `User "${userName}" (${userData.email}) deleted successfully`,
  };
}
