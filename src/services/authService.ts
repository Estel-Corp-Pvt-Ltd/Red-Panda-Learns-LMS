import {
  signInWithEmailAndPassword as firebaseSignIn,
  createUserWithEmailAndPassword as firebaseCreateUser,
  signOut as firebaseSignOut,
  sendPasswordResetEmail as firebaseSendPasswordReset,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  updateProfile,
} from "firebase/auth";
import { collection, doc, getDoc, getDocs, query, setDoc, where } from "firebase/firestore";
import { auth, db } from "@/firebaseConfig";
import { User } from "@/types/user";
import { USER_ROLE, USER_STATUS , ORGANIZATION } from "@/constants";
import { UserRole, UserStatus ,OrganizationType} from "@/types/general";
import { userService } from "./userService";

export type AuthResponse = {
  success: boolean;
  user?: User;
  userId?: string;
  error?: string;
};

class AuthService {
  /** 🔹 Email/Password Login */
  async signInWithEmailAndPassword(
    email: string,
    password: string
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const userCredential = await firebaseSignIn(auth, email, password);
      const firebaseUser = userCredential.user;

      // First, try to fetch user by Firebase UID
      const userDocRef = doc(db, "Users", firebaseUser.uid);
      const userDocSnap = await getDoc(userDocRef);

      let userData: User | null = null;
      if (userDocSnap.exists()) {
        userData = userDocSnap.data() as User;
      } else {
        // fallback: query by email
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
      return { success: false, error: this.handleAuthError(error).message };
    }
  }

  /** 🔹 Create new Email/Password user & Firestore user doc */
  async createUserWithEmailAndPassword(
    email: string,
    password: string,
    name: string
  ): Promise<AuthResponse> {
    try {
      const userCredential = await firebaseCreateUser(auth, email, password);
      const firebaseUser = userCredential.user;

      // Break down full name
      const parts = name.trim().split(/\s+/);
      const firstName = parts[0] || "";
      const lastName = parts.length > 1 ? parts[parts.length - 1] : "";
      const middleName = parts.length > 2 ? parts.slice(1, -1).join(" ") : null;

      // Update Firebase Auth profile
      await updateProfile(firebaseUser, { displayName: name });

      // Create Firestore user document
      const userId = await userService.createUser({
        email,
        firstName,
        middleName,
        lastName,
        role: USER_ROLE.STUDENT,
        status: USER_STATUS.ACTIVE,
        enrollments: [],
        organizationId: null,
        photoURL: firebaseUser.photoURL || null,
      });

      return { success: true, userId };
    } catch (error: any) {
      return { success: false, error: this.handleAuthError(error).message };
    }
  }

  /**
   * 🔹 Google Sign-In (using popup by default, fallback can use redirect)
   */
  async signInWithGoogle(): Promise<{
    success: boolean;
    userId?: string;
    error?: string;
    role?: UserRole;
  }> {
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);

      const firebaseUser = userCredential.user;
      let firstName = "";
      let middleName: string | null = null;
      let lastName = "";

      if (firebaseUser.displayName) {
        const parts = firebaseUser.displayName.split(" ");
        firstName = parts[0];
        if (parts.length === 2) {
          lastName = parts[1];
        } else if (parts.length > 2) {
          middleName = parts.slice(1, -1).join(" ");
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
        role: existingDoc.exists()
          ? (existingDoc.data().role as UserRole)
          : USER_ROLE.STUDENT,
        status: existingDoc.exists()
          ? (existingDoc.data().status as UserStatus)
          : USER_STATUS.ACTIVE,
        enrollments: [],
        organizationId: existingDoc.exists()
          ? existingDoc.data().organizationId
          : null,
         
        photoURL: firebaseUser.photoURL || null,
      });

      return {
        success: true,
        userId,
        role: existingDoc.exists()
          ? (existingDoc.data().role as UserRole)
          : USER_ROLE.STUDENT,
      };
    } catch (error: any) {
      return {
        success: false,
        error: this.handleAuthError(error).message,
        role: USER_ROLE.STUDENT,
      };
    }
  }

  /** 🔹 Optional: Google Sign-In using redirect (avoids COOP warnings) */
  async signInWithGoogleRedirect() {
    const provider = new GoogleAuthProvider();
    await signInWithRedirect(auth, provider);
  }

  async handleGoogleRedirectResult() {
    try {
      const result = await getRedirectResult(auth);
      if (result) {
        return result.user; // FirebaseUser
      }
      return null;
    } catch (error: any) {
      return null;
    }
  }

  /** 🔹 Logout */
  async signOut(): Promise<{ success: boolean; error?: string }> {
    try {
      await firebaseSignOut(auth);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: this.handleAuthError(error).message };
    }
  }

  /** 🔹 Password Reset */
  async sendPasswordResetEmail(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      await firebaseSendPasswordReset(auth, email);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: this.handleAuthError(error).message };
    }
  }

  /** 🔹 Subscribe to auth state changes */
  onAuthStateChanged(callback: (user: FirebaseUser | null) => void) {
    return firebaseOnAuthStateChanged(auth, callback);
  }

  /** 🔹 Error Mapper */
  private handleAuthError(error: any): { message: string } {
    let message = "An error occurred during authentication.";

    switch (error.code) {
      case "auth/user-not-found":
        message = "No account found with this email address.";
        break;
      case "auth/wrong-password":
        message = "Incorrect password.";
        break;
      case "auth/email-already-in-use":
        message = "An account with this email already exists.";
        break;
      case "auth/weak-password":
        message = "Password should be at least 6 characters.";
        break;
      case "auth/invalid-email":
        message = "Invalid email address.";
        break;
      case "auth/too-many-requests":
        message = "Too many failed attempts. Please try again later.";
        break;
      case "auth/network-request-failed":
        message = "Network error. Please check your connection.";
        break;
      case "auth/popup-closed-by-user":
        message = "Sign-in popup was closed before completion.";
        break;
      default:
        message = error.message || message;
    }

    return { message };
  }
}

export const authService = new AuthService();