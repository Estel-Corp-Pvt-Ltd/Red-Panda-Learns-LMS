import {
  signInWithEmailAndPassword as firebaseSignIn,
  createUserWithEmailAndPassword as firebaseCreateUser,
  signOut as firebaseSignOut,
  sendPasswordResetEmail as firebaseSendPasswordReset,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile
} from 'firebase/auth';
import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { auth, db } from '@/firebaseConfig';
import { User } from '@/types/user';
import { USER_ROLE, USER_STATUS } from '@/constants';
import { UserRole, UserStatus } from '@/types/general';
import { userService } from './userService';

export type AuthResponse = {
  success: boolean;
  user?: User;
  userId?: string;
  error?: string
};

class AuthService {
  /**
   * Signs in a user with email and password using Firebase Authentication.
   * 
   * @param email - The user's email address.
   * @param password - The user's password.
   * @returns A promise resolving to an object containing:
   *  - `success`: Whether the operation succeeded.
   *  - `user`: The signed-in user (if successful).
   *  - `error`: A user-friendly error message (if failed).
   */

  async signInWithEmailAndPassword(
    email: string,
    password: string
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const userCredential = await firebaseSignIn(auth, email, password);
      const firebaseUser = userCredential.user;

      // First, try to fetch by docId = firebaseUID
      const userDocRef = doc(db, "Users", firebaseUser.uid);
      const userDocSnap = await getDoc(userDocRef);

      let userData: User | null = null;

      if (userDocSnap.exists()) {
        // Case 1: Found by UID as docId
        userData = userDocSnap.data() as User;
      } else {
        // Case 2: Search for user by firebaseUID field inside Users collection
        const usersRef = collection(db, "Users");
        const q = query(usersRef, where("email", "==", email));
        const querySnap = await getDocs(q);

        if (!querySnap.empty) {
          userData = querySnap.docs[0].data() as User;
        }
      }

      if (!userData) {
        return { success: false, error: "User profile not found in Firestore." };
      }

      return { success: true, user: userData };
    } catch (error: any) {
      const handledError = this.handleAuthError(error);
      return { success: false, error: handledError.message };
    }
  }


  /**
 * Creates a new user with email, password, and name.
 * Also updates the user's profile and creates a Firestore user document.
 * 
 * @param email - The user's email address.
 * @param password - The user's chosen password.
 * @param name - The user's display name.
 * @returns A promise resolving to an object containing:
 *  - `success`: Whether the operation succeeded.
 *  - `user`: The created user (if successful).
 *  - `error`: A user-friendly error message (if failed).
 */
  async createUserWithEmailAndPassword(
    email: string,
    password: string,
    name: string
  ): Promise<AuthResponse> {
    try {
      const userCredential = await firebaseCreateUser(auth, email, password);
      const firebaseUser = userCredential.user;

      // Break down full name into firstName, middleName, lastName
      const nameParts = name.trim().split(/\s+/);
      const firstName = nameParts[0] || "";
      const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";
      const middleName =
        nameParts.length > 2 ? nameParts.slice(1, -1).join(" ") : "";

      // Update Firebase Auth profile with full display name
      await updateProfile(firebaseUser, { displayName: name });

      // Build Firestore User object
      const userId = await userService.createUser({
        email,
        firstName,
        middleName: middleName || null,
        lastName,
        role: USER_ROLE.STUDENT,
        status: USER_STATUS.ACTIVE,
        organizationId: null,
        photoURL: firebaseUser.photoURL || null,
      });

      return { success: true, userId };
    } catch (error: any) {
      const handledError = this.handleAuthError(error);
      return { success: false, error: handledError.message };
    }
  }

  /**
 * Signs in a user using Google authentication popup.
 * Creates or updates the user document in Firestore with Google profile data.
 * 
 * @returns A promise resolving to an object containing:
 *  - `success`: Whether the operation succeeded.
 *  - `user`: The signed-in user (if successful).
 *  - `error`: A user-friendly error message (if failed).
 */
  async signInWithGoogle(): Promise<{ success: boolean; userId?: string; error?: string }> {
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const firebaseUser = userCredential.user;

      // Split displayName into first/middle/last
      let firstName = "";
      let middleName: string | null;
      let lastName = "";

      if (firebaseUser.displayName) {
        const parts = firebaseUser.displayName.split(" ");
        firstName = parts[0];
        if (parts.length === 2) {
          lastName = parts[1];
        } else if (parts.length > 2) {
          middleName = parts.slice(1, parts.length - 1).join(" ");
          lastName = parts[parts.length - 1];
        }
      }

      const userRef = doc(db, "Users", firebaseUser.uid);
      const existingDoc = await getDoc(userRef);

      const userId = await userService.createUser({
        email: firebaseUser.email || "",
        firstName,
        middleName,
        lastName,
        role: existingDoc.exists() ? (existingDoc.data().role as UserRole) : USER_ROLE.STUDENT,
        status: existingDoc.exists() ? (existingDoc.data().status as UserStatus) : USER_STATUS.ACTIVE,
        organizationId: existingDoc.exists() ? existingDoc.data().organizationId : null,
        photoURL: firebaseUser.photoURL || null,
      });

      return { success: true, userId };
    } catch (error: any) {
      const handledError = this.handleAuthError(error);
      return { success: false, error: handledError.message };
    }
  }

  /**
   * Signs out the currently authenticated user.
   * 
   * @returns A promise resolving to an object containing:
   *  - `success`: Whether the operation succeeded.
   *  - `error`: A user-friendly error message (if failed).
   */
  async signOut(): Promise<{ success: boolean; error?: string }> {
    try {
      await firebaseSignOut(auth);
      return { success: true };
    } catch (error: any) {
      const handledError = this.handleAuthError(error);
      return { success: false, error: handledError.message };
    }
  }

  /**
   * Sends a password reset email to the given email address.
   * 
   * @param email - The email of the account requesting reset.
   * @returns A promise resolving to an object containing:
   *  - `success`: Whether the operation succeeded.
   *  - `error`: A user-friendly error message (if failed).
   */
  async sendPasswordResetEmail(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      await firebaseSendPasswordReset(auth, email);
      return { success: true };
    } catch (error: any) {
      const handledError = this.handleAuthError(error);
      return { success: false, error: handledError.message };
    }
  }

  /**
  * Subscribes to authentication state changes.
  * 
  * @param callback - A function that receives the current user or null.
  * @returns An unsubscribe function to stop listening for auth changes.
  */
  onAuthStateChanged(callback: (user: FirebaseUser | null) => void) {
    return firebaseOnAuthStateChanged(auth, callback);
  }

  /**
   * Handles Firebase authentication errors and maps them to user-friendly messages.
   * 
   * @param error - The raw Firebase error object.
   * @returns An object containing a human-readable error message.
   */
  private handleAuthError(error: any): { message: string } {
    let message = 'An error occurred during authentication.';

    switch (error.code) {
      case 'auth/user-not-found':
        message = 'No account found with this email address.';
        break;
      case 'auth/wrong-password':
        message = 'Incorrect password.';
        break;
      case 'auth/email-already-in-use':
        message = 'An account with this email already exists.';
        break;
      case 'auth/weak-password':
        message = 'Password should be at least 6 characters.';
        break;
      case 'auth/invalid-email':
        message = 'Invalid email address.';
        break;
      case 'auth/too-many-requests':
        message = 'Too many failed attempts. Please try again later.';
        break;
      case 'auth/network-request-failed':
        message = 'Network error. Please check your connection.';
        break;
      case 'auth/popup-closed-by-user':
        message = 'Sign-in popup was closed before completion.';
        break;
      default:
        message = error.message || message;
    }

    const handledError = { message };
    return handledError;
  }
};

export const authService = new AuthService();
