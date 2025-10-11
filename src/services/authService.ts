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
  sendEmailVerification,
  UserCredential,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "@/firebaseConfig";
import { User } from "@/types/user";
import { USER_ROLE, USER_STATUS } from "@/constants";
import { UserRole } from "@/types/general";
import { userService } from "./userService";
import { fail, ok, Result } from "@/utils/response";
import { logError } from "@/utils/logger";



class AuthService {
  /** 🔹 Email/Password Login */
  async signInWithEmailAndPassword(
    email: string,
    password: string
  ): Promise<Result<{ user: User; userCredential: UserCredential }>> {
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

      if (!userData) return fail("User profile not found in Firestore.");

      return ok({ user: userData, userCredential });
    } catch (error: any) {
      logError("AuthService.signInWithEmailAndPassword", error);
      return fail(this.handleAuthError(error).message, error.code);
    }
  }

  /** 🔹 Username + Password Login */
  async signInWithUsernameAndPassword(
    username: string,
    password: string
  ): Promise<Result<User>> {
    try {
      const response = await userService.getUserByUsername(username);

      if (!response.success || !response.data) {
        return fail("Username does not exist.");
      }

      const email = username + "@vizuara.ai";
      const userCredential = await firebaseSignIn(auth, email, password);
      const firebaseUser = userCredential.user;

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
        return fail("User profile not found in Firestore.");
      }

      return ok(userData);
    } catch (error: any) {
      logError("AuthService.signInWithUsernameAndPassword", error);
      return fail(this.handleAuthError(error).message, error.code);
    }
  }

  /** 🔹 Create new Email/Password user & Firestore user doc */
  async createUserWithEmailAndPassword(
    email: string,
    password: string,
    name: string
  ): Promise<Result<{ userId: string }>> {
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
      await userService.createUser(firebaseUser.uid, {
        id: firebaseUser.uid,
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

      await sendEmailVerification(firebaseUser);

      return ok({ userId: firebaseUser.uid });
    } catch (error: any) {
      logError("AuthService.createUserWithEmailAndPassword", error);
      return fail(this.handleAuthError(error).message, error.code);
    }
  }

  /** 🔹 Create new Email/Password user & Firestore user doc */
  async createUserWithUsernameAndPassword(
    username: string,
    password: string,
    name: string
  ): Promise<Result<{ userId: string }>> {
    try {
      const existing = await userService.getUserByUsername(username);
      if (existing.success && existing.data)
        return fail("Username already exists.");

      const email = username + "@vizuara.ai";
      const userCredential = await firebaseCreateUser(auth, email, password);
      const firebaseUser = userCredential.user;

      // Break down full name
      const parts = name.trim().split(/\s+/);
      const firstName = parts[0] || "";
      const lastName = parts.length > 1 ? parts[parts.length - 1] : "";
      const middleName = parts.length > 2 ? parts.slice(1, -1).join(" ") : null;

      // Update Firebase Auth profile
      await updateProfile(firebaseUser, { displayName: name });

      await userService.createUser(firebaseUser.uid, {
        id: firebaseUser.uid,
        username,
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

      return ok({ userId: firebaseUser.uid });
    } catch (error: any) {
      logError("AuthService.createUserWithUsernameAndPassword", error);
      return fail(this.handleAuthError(error).message, error.code);
    }
  }

  /** 🔹 Google Sign-In (Popup) */
  async signInWithGoogle(): Promise<Result<{ userId: string; role: UserRole }>> {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;

      // Parse name
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

      const uid = firebaseUser.uid;
      const userRef = doc(db, "Users", uid);
      const existingDoc = await getDoc(userRef);

      if (!existingDoc.exists()) {
        await userService.createUser(uid, {
          id: uid,
          email: firebaseUser.email || "",
          firstName,
          middleName,
          lastName,
          role: USER_ROLE.STUDENT,
          status: USER_STATUS.ACTIVE,
          enrollments: [],
          organizationId: null,
          photoURL: firebaseUser.photoURL || null,
        });
      }

      const role = existingDoc.exists()
        ? (existingDoc.data().role as UserRole)
        : USER_ROLE.STUDENT;

      return ok({ userId: uid, role });
    } catch (error: any) {
      logError("AuthService.signInWithGoogle", error);
      return fail(this.handleAuthError(error).message, error.code);
    }
  }

  /** 🔹 Optional: Google Sign-In using redirect (avoids COOP warnings) */
  async signInWithGoogleRedirect(): Promise<Result<void>> {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithRedirect(auth, provider);
      return ok(undefined);
    } catch (error: any) {
      logError("AuthService.signInWithGoogleRedirect", error);
      return fail(this.handleAuthError(error).message, error.code);
    }
  }

  async handleGoogleRedirectResult(): Promise<Result<FirebaseUser | null>> {
    try {
      const result = await getRedirectResult(auth);
      return ok(result ? result.user : null);
    } catch (error: any) {
      logError("AuthService.handleGoogleRedirectResult", error);
      return fail(this.handleAuthError(error).message, error.code);
    }
  }

  /** 🔹 Logout */
  async signOut(): Promise<Result<void>> {
    try {
      await firebaseSignOut(auth);
      return ok(undefined);
    } catch (error: any) {
      logError("AuthService.signOut", error);
      return fail(this.handleAuthError(error).message, error.code);
    }
  }

  /** 🔹 Password Reset */
  async sendPasswordResetEmail(email: string): Promise<Result<void>> {
    try {
      await firebaseSendPasswordReset(auth, email);
      return ok(undefined);
    } catch (error: any) {
      logError("AuthService.sendPasswordResetEmail", error);
      return fail(this.handleAuthError(error).message, error.code);
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
