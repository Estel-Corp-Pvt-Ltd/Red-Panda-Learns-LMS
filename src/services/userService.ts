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
    Query,
    orderBy,
    endBefore,
    limitToLast,
    limit,
    startAfter,
} from "firebase/firestore";

import { db } from "@/firebaseConfig";
import { UserRole, UserStatus } from "@/types/general";
import { User } from "@/types/user";
import { COLLECTION } from "@/constants";
import { Result, ok, fail } from "@/utils/response";
import { logError } from "@/utils/logger";
import { PaginatedResult, PaginationOptions } from "@/utils/pagination";

class UserService {
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

    async getUsers(
        filters?: {
            field: keyof User;
            op: WhereFilterOp;
            value: any;
        }[],
        options: PaginationOptions<User> = {}
    ): Promise<Result<PaginatedResult<User>>> {
        try {
            const {
                limit: itemsPerPage = 25,
                orderBy: orderByOption = { field: 'createdAt', direction: 'desc' },
                pageDirection = 'next',
                cursor = null
            } = options;

            let q: Query = collection(db, COLLECTION.USERS);

            // Apply filters if provided
            if (filters && filters.length > 0) {
                const whereClauses = filters.map((f) =>
                    where(f.field as string, f.op, f.value)
                );
                q = query(q, ...whereClauses);
            }

            // Apply ordering
            const { field, direction } = orderByOption;

            // For pagination, we need to handle different scenarios
            if (pageDirection === 'previous' && cursor) {
                q = query(
                    q,
                    orderBy(field as string, direction),
                    endBefore(cursor),
                    limitToLast(itemsPerPage)
                );
            } else if (cursor) {
                q = query(
                    q,
                    orderBy(field as string, direction),
                    startAfter(cursor),
                    limit(itemsPerPage)
                );
            } else {
                q = query(
                    q,
                    orderBy(field as string, direction),
                    limit(itemsPerPage)
                );
            }

            const querySnapshot = await getDocs(q);
            const documents = querySnapshot.docs;

            if (pageDirection === 'previous') {
                documents.reverse();
            }

            const users = documents.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    username: data.username,
                    email: data.email,
                    firstName: data.firstName,
                    middleName: data.middleName,
                    lastName: data.lastName,
                    role: data.role,
                    status: data.status,
                    enrollments: data.enrollments || [],
                    organizationId: data.organizationId,
                    photoURL: data.photoURL,
                    createdAt: data.createdAt?.toDate?.() || data.createdAt,
                    updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
                } as User;
            });

            const hasNextPage = querySnapshot.docs.length === itemsPerPage;
            const hasPreviousPage = cursor !== null;
            const nextCursor = hasNextPage ? querySnapshot.docs[querySnapshot.docs.length - 1] : null;
            const previousCursor = hasPreviousPage ? querySnapshot.docs[0] : null;

            return ok({
                data: users,
                hasNextPage,
                hasPreviousPage,
                nextCursor,
                previousCursor
            });
        } catch (error) {
            console.error('UserService - Error fetching users:', error);
            return fail("Error fetching users");
        }
    }

    async getUsersByRole(role: string, options: PaginationOptions<User> = {}): Promise<Result<PaginatedResult<User>>> {
        return this.getUsers(
            [
                { field: 'role', op: '==', value: role }
            ],
            options
        );
    }
}

export const userService = new UserService();
