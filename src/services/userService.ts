import {
    doc,
    setDoc,
    getDoc,
    updateDoc,
    collection,
    query,
    where,
    getDocs,
    deleteDoc,
    WhereFilterOp,
    serverTimestamp,
} from "firebase/firestore";

import { db } from "@/firebaseConfig";
import { UserRole, UserStatus } from "@/types/general";
import { User } from "@/types/user";
import { COLLECTION } from "@/constants";
import { Result, ok, fail } from "@/utils/response";
import { logError } from "@/utils/logger";

class UserService {
    /**
     * Generates a new user ID in the format `user_<number>`, starting from 10000000.
     * Uses a random gap between 5 and 20 to avoid easy guessing.
     */


    /**
     * Creates a new user in Firestore.
     */
    async createUser(
        uid: string,
        data: Omit<User, "createdAt" | "updatedAt">
    ): Promise<Result<void>> {
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
                enrollments: [],
                organizationId: data.organizationId || "",
                photoURL: data.photoURL || "",
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            await setDoc(doc(db, COLLECTION.USERS, uid), user);
            console.log("UserService - User created successfully:", uid);
            return ok(null);
        } catch (error) {
            logError("UserService.createUser", error);
            return fail("Failed to create user");
        }
    }

    /**
     * Updates an existing user document.
     */
    async updateUser(uid: string, updates: Partial<User>): Promise<Result<void>> {
        try {
            const userRef = doc(db, COLLECTION.USERS, uid);
            const userDoc = await getDoc(userRef);

            if (!userDoc.exists()) {
                return fail("User not found", "NOT_FOUND");
            }

            const updateData: Partial<User> = {
                updatedAt: serverTimestamp(),
                ...updates,
            };

            await updateDoc(userRef, updateData);
            console.log("UserService - User updated successfully:", uid);
            return ok(null);
        } catch (error) {
            logError("UserService.updateUser", error);
            return fail("Failed to update user");
        }
    }

    /**
     * Retrieves user by username
     */
    async getUserByUsername(username: string): Promise<Result<User | null>> {
        try {
            const usersRef = collection(db, COLLECTION.USERS);
            const q = query(usersRef, where("username", "==", username));
            // Execute query
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                return ok(null);
            }

            const userDoc = querySnapshot.docs[0];
            const data = userDoc.data();

            const user: User = {
                ...data,
                createdAt: data.createdAt?.toDate(),
                updatedAt: data.updatedAt?.toDate(),
            } as User;

            return ok(user);
        } catch (error) {
            logError("UserService.getUserByUsername", error);
            return fail("Failed to fetch user by username");
        }
    }

    /**
     * Retrieves a single user by ID.
     */
    async getUserById(uid: string): Promise<Result<User | null>> {
        try {
            const userDoc = await getDoc(doc(db, COLLECTION.USERS, uid));

            if (!userDoc.exists()) {
                return ok(null);
            }

            const data = userDoc.data();
            const user: User = {
                ...data,
                createdAt: data.createdAt?.toDate(),
                updatedAt: data.updatedAt?.toDate(),
            } as User;

            return ok(user);
        } catch (error) {
            logError("UserService.getUserById", error);
            return fail("Failed to fetch user by ID");
        }
    }

    /**
     * Retrieves all users.
     */
    async getAllUsers(): Promise<Result<User[]>> {
        try {
            const querySnapshot = await getDocs(collection(db, COLLECTION.USERS));

            const users = querySnapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                    ...data,
                    createdAt: data.createdAt?.toDate(),
                    updatedAt: data.updatedAt?.toDate(),
                } as User;
            });

            return ok(users);
        } catch (error) {
            logError("UserService.getAllUsers", error);
            return fail("Failed to fetch users");
        }
    }

    /**
     * Retrieves users with optional filters.
     */
    async getFilteredUsers(
        filters?: { field: keyof User; op: WhereFilterOp; value: any }[]
    ): Promise<Result<User[]>> {
        try {
            const usersRef = collection(db, COLLECTION.USERS);

            let queryRef = query(usersRef);
            if (filters && filters.length > 0) {
                queryRef = query(
                    usersRef,
                    ...filters.map((f) => where(f.field as string, f.op, f.value))
                );
            }

            const querySnapshot = await getDocs(queryRef);
            const users = querySnapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                    ...data,
                    createdAt: data.createdAt?.toDate(),
                    updatedAt: data.updatedAt?.toDate(),
                } as User;
            });

            return ok(users);
        } catch (error) {
            logError("UserService.getFilteredUsers", error);
            return fail("Failed to fetch filtered users");
        }
    }

    /**
     * Deletes a user by ID.
     */
    async deleteUser(uid: string): Promise<Result<void>> {
        try {
            await deleteDoc(doc(db, COLLECTION.USERS, uid));
            console.log("UserService - User deleted successfully:", uid);
            return ok(null);
        } catch (error) {
            logError("UserService.deleteUser", error);
            return fail("Failed to delete user");
        }
    }

    /**
     * Updates only the user"s role.
     */
    async changeUserRole(uid: string, newRole: UserRole): Promise<Result<void>> {
        try {
            const userRef = doc(db, COLLECTION.USERS, uid);
            await updateDoc(userRef, {
                role: newRole,
                updatedAt: serverTimestamp(),
            });
            return ok(null);
        } catch (error) {
            logError("UserService.changeUserRole", error);
            return fail("Failed to change user role");
        }
    }

    /**
     * Updates only the user"s status (ACTIVE, INACTIVE, SUSPENDED).
     */
    async changeUserStatus(
        uid: string,
        newStatus: UserStatus
    ): Promise<Result<void>> {
        try {
            const userRef = doc(db, COLLECTION.USERS, uid);
            await updateDoc(userRef, {
                status: newStatus,
                updatedAt: serverTimestamp(),
            });
            return ok(null);
        } catch (error) {
            logError("UserService.changeUserStatus", error);
            return fail("Failed to change user status");
        }
    }
}

export const userService = new UserService();
