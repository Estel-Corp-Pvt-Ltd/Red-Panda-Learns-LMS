import { db } from "../firebase.js";
import { COLLECTION } from "../constants.js";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";

export const updateUserSchema = {
  userId: z.string().describe("The user ID to update"),
  firstName: z.string().optional().describe("New first name"),
  middleName: z.string().optional().describe("New middle name"),
  lastName: z.string().optional().describe("New last name"),
  role: z
    .enum(["STUDENT", "TEACHER", "INSTRUCTOR", "ADMIN", "ACCOUNTANT"])
    .optional()
    .describe("New role"),
  status: z
    .enum(["ACTIVE", "INACTIVE", "SUSPENDED"])
    .optional()
    .describe("New status"),
  organizationId: z.string().optional().describe("New organization ID"),
};

export async function updateUser(params: {
  userId: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  role?: string;
  status?: string;
  organizationId?: string;
}) {
  const userRef = db.collection(COLLECTION.USERS).doc(params.userId);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    throw new Error(`User not found: ${params.userId}`);
  }

  const updates: Record<string, any> = { updatedAt: FieldValue.serverTimestamp() };

  if (params.firstName !== undefined) updates.firstName = params.firstName;
  if (params.middleName !== undefined) updates.middleName = params.middleName;
  if (params.lastName !== undefined) updates.lastName = params.lastName;
  if (params.role !== undefined) updates.role = params.role;
  if (params.status !== undefined) updates.status = params.status;
  if (params.organizationId !== undefined) updates.organizationId = params.organizationId;

  await userRef.update(updates);

  const updated = { ...userDoc.data(), ...updates };
  return {
    userId: params.userId,
    email: updated.email,
    firstName: updated.firstName,
    lastName: updated.lastName,
    role: updated.role,
    status: updated.status,
    message: `User "${params.userId}" updated successfully`,
  };
}
