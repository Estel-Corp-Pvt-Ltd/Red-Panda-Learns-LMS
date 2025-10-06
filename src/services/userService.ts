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
    runTransaction,
    WhereFilterOp,
    serverTimestamp,
} from 'firebase/firestore';

import { db } from '@/firebaseConfig';
import { UserRole, UserStatus , OrganizationType} from '@/types/general';
import { User } from '@/types/user';

class UserService {
    /**
     * Generates a new user ID in the format `user_<number>`, starting from 10000000.
     * Uses a random gap between 5 and 20 to avoid easy guessing.
     */
    

    /**
     * Creates a new user in Firestore.
     */
    async createUser(
uid:string,
        data: Omit<User,   'createdAt' | 'updatedAt'>
    ): Promise<void> {
        try {
          

            const user: User = {
                
                id: uid,
                email: data.email,
                firstName: data.firstName,
                middleName: data.middleName || '',
                lastName: data.lastName,
                role: data.role,
                status: data.status,
                enrollments: [],
                organizationId: data.organizationId || '',
                photoURL: data.photoURL || '',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            await setDoc(doc(db, 'Users', uid), user);
            console.log('UserService - User created successfully:', uid);

           
        } catch (error) {
            console.error('UserService - Error creating user:', error);
            throw new Error('Failed to create user');
        }
    }

    /**
     * Updates an existing user document.
     */
    async updateUser(uid: string, updates: Partial<User>): Promise<void> {
        try {
            const userRef = doc(db, 'Users', uid);
            const userDoc = await getDoc(userRef);

            if (!userDoc.exists()) {
                throw new Error('User not found');
            }

            const updateData: Partial<User> = {
                updatedAt:serverTimestamp(),    
                ...updates,
            };

            await updateDoc(userRef, updateData);
            console.log('UserService - User updated successfully:', uid);
        } catch (error) {
            console.error('UserService - Error updating user:', error);
            throw new Error('Failed to update user');
        }
    }

    /**
     * Retrieves a single user by ID.
     */
    async getUserById(uid: string): Promise<User | null> {
        try {
            const userDoc = await getDoc(doc(db, 'Users', uid));

            if (!userDoc.exists()) {
                console.log('UserService - User not found:', uid);
                return null;
            }

            const user = {
                ...userDoc.data(),
                createdAt: userDoc.data()?.createdAt.toDate(),
                updatedAt: userDoc.data()?.updatedAt.toDate(),
            
            } as User;

            return user;
        } catch (error) {
            console.error('UserService - Error fetching user:', error);
            return null;
        }
    }

    /**
     * Retrieves all users.
     */
    async getAllUsers(): Promise<User[]> {
        try {
            const querySnapshot = await getDocs(collection(db, 'Users'));

            const users = querySnapshot.docs.map((doc) => ({
                ...doc.data(),
                createdAt: doc.data().createdAt.toDate(),
                updatedAt: doc.data().updatedAt.toDate(),
               
            })) as User[];

            console.log('UserService - Fetched users:', users.length);
            return users;
        } catch (error) {
            console.error('UserService - Error fetching users:', error);
            return [];
        }
    }

    /**
     * Retrieves users with optional filters.
     */
    async getFilteredUsers(
        filters?: { field: keyof User; op: WhereFilterOp; value: any }[]
    ): Promise<User[]> {
        try {
            let q = collection(db, 'Users');

            if (filters && filters.length > 0) {
                let queryRef = query(
                    q,
                    ...filters.map((f) => where(f.field as string, f.op, f.value))
                );
                const querySnapshot = await getDocs(queryRef);

                const users = querySnapshot.docs.map((doc) => ({
                    ...doc.data(),
                    createdAt: doc.data().createdAt?.toDate(),
                    updatedAt: doc.data().updatedAt?.toDate(),
                    
                })) as User[];

                console.log('UserService - Fetched filtered users:', users.length);
                return users;
            } else {
                const querySnapshot = await getDocs(q);
                const users = querySnapshot.docs.map((doc) => ({
                    ...doc.data(),
                    createdAt: doc.data().createdAt?.toDate(),
                    updatedAt: doc.data().updatedAt?.toDate(),
                   
                })) as User[];

                console.log('UserService - Fetched all users:', users.length);
                return users;
            }
        } catch (error) {
            console.error('UserService - Error fetching filtered users:', error);
            return [];
        }
    }

    /**
     * Deletes a user by ID.
     */
    async deleteUser(uid: string): Promise<void> {
        try {
            await deleteDoc(doc(db, 'Users', uid));
            console.log('UserService - User deleted successfully:', uid);
        } catch (error) {
            console.error('UserService - Error deleting user:', error);
            throw new Error('Failed to delete user');
        }
    }

    /**
     * Updates only the user's role.
     */
    async changeUserRole(uid: string, newRole: UserRole): Promise<void> {
        try {
            const userRef = doc(db, 'Users', uid);
            await updateDoc(userRef, { role: newRole, updatedAt: serverTimestamp() });
            console.log('UserService - User role updated successfully:', uid);
        } catch (error) {
            console.error('UserService - Error changing user role:', error);
            throw new Error('Failed to change user role');
        }
    }

    /**
 * Updates only the user's status (ACTIVE, INACTIVE, SUSPENDED).
 */
    async changeUserStatus(
        uid: string,
        newStatus: UserStatus
    ): Promise<void> {
        try {
            const userRef = doc(db, 'Users', uid);
            await updateDoc(userRef, { status: newStatus, updatedAt:serverTimestamp() });
            console.log('UserService - User status updated successfully:', uid, newStatus);
        } catch (error) {
            console.error('UserService - Error changing user status:', error);
            throw new Error('Failed to change user status');
        }
    }
}

export const userService = new UserService();
