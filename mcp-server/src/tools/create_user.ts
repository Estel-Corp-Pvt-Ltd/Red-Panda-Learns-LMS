import { db, auth } from "../firebase.js";
import { COLLECTION } from "../constants.js";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";

export const createUserSchema = {
  email: z.string().describe("User email address (required)"),
  firstName: z.string().describe("First name (required)"),
  lastName: z.string().optional().default("").describe("Last name"),
  middleName: z.string().optional().default("").describe("Middle name"),
  role: z
    .enum(["STUDENT", "TEACHER", "INSTRUCTOR", "ADMIN", "ACCOUNTANT"])
    .optional()
    .default("STUDENT")
    .describe("User role"),
  status: z
    .enum(["ACTIVE", "INACTIVE", "SUSPENDED"])
    .optional()
    .default("ACTIVE")
    .describe("User status"),
  organizationId: z.string().optional().describe("Organization ID"),
  password: z.string().optional().describe("Initial password. If not provided, a random one is generated."),
};

export async function createUser(params: {
  email: string;
  firstName: string;
  lastName?: string;
  middleName?: string;
  role?: string;
  status?: string;
  organizationId?: string;
  password?: string;
}) {
  // Check if email already exists in Firestore
  const existing = await db
    .collection(COLLECTION.USERS)
    .where("email", "==", params.email)
    .limit(1)
    .get();

  if (!existing.empty) {
    throw new Error(`A user with email "${params.email}" already exists`);
  }

  // Create Firebase Auth user
  const password = params.password || generateRandomPassword();
  let firebaseUser;
  try {
    firebaseUser = await auth.createUser({
      email: params.email,
      password,
      displayName: [params.firstName, params.lastName].filter(Boolean).join(" "),
      emailVerified: true,
    });
  } catch (err: any) {
    if (err.code === "auth/email-already-exists") {
      // User exists in Auth but not in Firestore — get their UID
      firebaseUser = await auth.getUserByEmail(params.email);
    } else {
      throw err;
    }
  }

  const uid = firebaseUser.uid;

  const userData = {
    id: uid,
    email: params.email,
    firstName: params.firstName,
    middleName: params.middleName ?? "",
    lastName: params.lastName ?? "",
    role: params.role ?? "STUDENT",
    status: params.status ?? "ACTIVE",
    organizationId: params.organizationId ?? null,
    photoURL: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await db.collection(COLLECTION.USERS).doc(uid).set(userData);

  return {
    userId: uid,
    email: params.email,
    firstName: params.firstName,
    lastName: params.lastName ?? "",
    role: userData.role,
    status: userData.status,
    message: `User "${params.firstName} ${params.lastName ?? ""}" created successfully`,
  };
}

function generateRandomPassword(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
  let password = "";
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}
