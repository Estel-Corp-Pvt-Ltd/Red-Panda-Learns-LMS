import * as admin from 'firebase-admin';
import { UserRole } from '../types/general';
import { User } from '../types/user';
import { COLLECTION } from '../constants';
import { Result, ok, fail } from '../utils/response';
import { logger } from 'firebase-functions';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const SKIP_DOMAIN = "vizuara.ai";
const SKIP_TEST = "test"
const SKIP_EMAIL = "email"
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
 * Retrieves all user emails in chunks from the Firestore database
 * @param chunkSize - The number of emails to fetch per request
 */
async  getAllUserEmails(chunkSize: number = 100): Promise<string[]> {
  let emails: string[] = [];
  let lastVisible = null;

 
try {
  let query = db
    .collection(COLLECTION.USERS)
    .orderBy("email")
    .limit(chunkSize);

  while (true) {
    const snapshot = await query.get();

    logger.info("Fetched user batch", { size: snapshot.size });

    if (snapshot.empty) break;

    snapshot.docs.forEach(doc => {
      const data = doc.data();

      logger.debug("User doc fields", {
        keys: Object.keys(data),
        email: data.email,
        userEmail: data.userEmail,
      });

      // ⚠️ FIX: use correct field
      const email: string | undefined = data.email ?? data.userEmail;

      if (!email) {
        logger.debug("Skipping user: no email field");
        return;
      }

      const lowerEmail = email.toLowerCase();

      if (lowerEmail.includes(SKIP_DOMAIN)) {
        logger.debug("Skipping email (domain)", email);
        return;
      }

      if (lowerEmail.includes(SKIP_TEST)) {
        logger.debug("Skipping email (test)", email);
        return;
      }

      if (lowerEmail.includes(SKIP_EMAIL)) {
        logger.debug("Skipping email (explicit)", email);
        return;
      }

      emails.push(email);
    });

    lastVisible = snapshot.docs[snapshot.docs.length - 1];

    query = db
      .collection(COLLECTION.USERS)
      .orderBy("email")
      .startAfter(lastVisible)
      .limit(chunkSize);
  }

  logger.info("Final recipient email count", {
    count: emails.length,
  });

  return emails;
} catch (error) {
  logger.error("Failed to fetch all user emails", error);
  return [];
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
