import * as admin from 'firebase-admin';
import { UserRole } from '../types/general';
import { User } from '../types/user';
import { COLLECTION } from '../constants';
import { Result, ok, fail } from '../utils/response';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

class UserService {
  /**
   * Creates a new user in Firestore.
   */
  async createUser(
    uid: string,
    data: Omit<User, "id" | "createdAt" | "updatedAt">
  ): Promise<Result<null>> {
    const userRef = db.collection(COLLECTION.USERS).doc(uid);
    const userDoc = await userRef.get();

    if (userDoc.exists) {
      console.warn("UserService - User already exists:", uid);
      return fail("User already exists", "ALREADY_EXISTS");
    }

    try {
      const user: User = {
        id: uid,
        username: data.username || "",
        email: data.email,
        firstName: data.firstName,
        middleName: data.middleName || "",
        lastName: data.lastName,
        role: data.role,
        status: data.status,
        organizationId: data.organizationId || "",
        photoURL: data.photoURL || "",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await userRef.set(user);
      console.log("UserService - User created successfully:", uid);
      return ok(null);
    } catch (error) {
      return fail("Failed to create user");
    }
  }

  /**
   * Updates an existing user document.
   */
  async updateUser(uid: string, updates: Partial<User>): Promise<Result<null>> {
    try {
      const userRef = db.collection(COLLECTION.USERS).doc(uid);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        return fail("User not found", "NOT_FOUND");
      }

      const updateData: Partial<User> = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        ...updates,
      };

      await userRef.update(updateData);
      console.log("UserService - User updated successfully:", uid);
      return ok(null);
    } catch (error) {
      return fail("Failed to update user");
    }
  }

  /**
   * Retrieves user by email
   */
  async getUserByEmail(email: string): Promise<Result<User | null>> {
    try {
      const usersRef = db.collection(COLLECTION.USERS);
      const querySnapshot = await usersRef.where("email", "==", email).get();

      if (querySnapshot.empty) {
        return ok(null);
      }

      const userDoc = querySnapshot.docs[0];
      const data = userDoc.data();

      const user: User = {
        ...data,
        id: userDoc.id,
        createdAt: data?.createdAt?.toDate?.(),
        updatedAt: data?.updatedAt?.toDate?.(),
      } as User;

      return ok(user);
    } catch (error) {
      return fail("Failed to fetch user by email");
    }
  }

  /**
   * Retrieves a single user by ID.
   */
  async getUserById(uid: string): Promise<Result<User | null>> {
    try {
      const userDoc = await db.collection(COLLECTION.USERS).doc(uid).get();

      if (!userDoc.exists) {
        return ok(null);
      }

      const data = userDoc.data();
      const user: User = {
        ...data,
        id: userDoc.id,
        createdAt: data?.createdAt?.toDate?.(),
        updatedAt: data?.updatedAt?.toDate?.(),
      } as User;

      return ok(user);
    } catch (error) {
      return fail("Failed to fetch user by ID");
    }
  }

  /**
   * Updates only the user's role.
   */
  async changeUserRole(uid: string, newRole: UserRole): Promise<Result<null>> {
    try {
      const userRef = db.collection(COLLECTION.USERS).doc(uid);
      await userRef.update({
        role: newRole,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return ok(null);
    } catch (error) {
      return fail("Failed to change user role");
    }
  }
}

export const userService = new UserService();
