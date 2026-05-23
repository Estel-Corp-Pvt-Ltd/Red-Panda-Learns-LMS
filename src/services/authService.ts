import {
  signInWithEmailAndPassword as firebaseSignIn,
  createUserWithEmailAndPassword as firebaseCreateUser,
  signOut as firebaseSignOut,
  sendPasswordResetEmail as firebaseSendPasswordReset,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  sendEmailVerification,
  User as FirebaseUser,
  UserCredential,
  getAuth,
} from "firebase/auth";

import { doc, getDoc } from "firebase/firestore";

import { auth, db } from "@/firebaseConfig";
import { COLLECTION, USER_ROLE, USER_STATUS } from "@/constants";
import { fail, ok, Result } from "@/utils/response";
import { logError, logWarn } from "@/utils/logger";

import { userService } from "./userService";

import { User } from "@/types/user";
import { UserRole } from "@/types/general";

const USERNAME_EMAIL_DOMAIN = "redpandalearns.com";

class AuthService {
  private clearClientAuthStorage() {
    if (typeof window === "undefined") return;

    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (!key) continue;

        if (key === "cart" || key === "vizuara_roadmap_redirected" || key.startsWith("firebase:")) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach((key) => localStorage.removeItem(key));
    } catch (error) {
      logError("AuthService.clearClientAuthStorage", error);
    }
  }

  /**
   * Signs in a user using Firebase email and password authentication.
   * Fetches the corresponding user profile from Firestore by UID.
   *
   * @param email - The user's email address.
   * @param password - The user's password.
   * @returns A Result object containing the User and Firebase UserCredential on success, or an error on failure.
   */
  async signInWithEmailAndPassword(
    email: string,
    password: string
  ): Promise<Result<{ user: User; userCredential: UserCredential }>> {
    let firebaseSignInSucceeded = false;
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const userCredential = await firebaseSignIn(auth, normalizedEmail, password);
      firebaseSignInSucceeded = true;
      const firebaseUser = userCredential.user;

      if (!firebaseUser.emailVerified) {
        await firebaseSignOut(auth);
        this.clearClientAuthStorage();
        return fail("Please verify your email address before signing in.");
      }

      const userDocRef = doc(db, COLLECTION.USERS, firebaseUser.uid);
      const userDocSnap = await getDoc(userDocRef);

      let userData: User | null = null;

      if (userDocSnap.exists()) {
        userData = userDocSnap.data() as User;
      }

      if (!userData) {
        await firebaseSignOut(auth);
        this.clearClientAuthStorage();
        return fail("User profile not found. Please contact support.");
      }

      return ok({ user: userData, userCredential });
    } catch (error: any) {
      if (firebaseSignInSucceeded) {
        await firebaseSignOut(auth).catch((signOutError) => {
          logError("AuthService.signInWithEmailAndPassword.signOutAfterPartialLogin", signOutError);
        });
        this.clearClientAuthStorage();
      }
      logError("AuthService.signInWithEmailAndPassword", error);
      return fail(this.handleAuthError(error).message, error.code);
    }
  }

  /**
   * Signs in a user using their username and password.
   * Resolves the username to a Firebase email pattern (`username@redpandalearns.com`),
   * authenticates the user with Firebase, and fetches the corresponding
   * Firestore user profile by UID.
   *
   * @param username - The user's unique username.
   * @param password - The user's password.
   * @returns A Result object containing the User and Firebase UserCredential on success, or an error on failure.
   */
  async signInWithUsernameAndPassword(
    username: string,
    password: string
  ): Promise<Result<{ user: User; userCredential: UserCredential }>> {
    let firebaseSignInSucceeded = false;
    try {
      const normalizedUsername = username.trim().toLowerCase();
      // Resolve username
      const response = await userService.getUserByUsername(normalizedUsername);
      if (!response.success || !response.data) {
        return fail("Username does not exist.");
      }

      // Authenticate with Firebase using pseudo-email
      const email = `${normalizedUsername}@${USERNAME_EMAIL_DOMAIN}`;
      const userCredential = await firebaseSignIn(auth, email, password);
      firebaseSignInSucceeded = true;
      const firebaseUser = userCredential.user;

      const userDocRef = doc(db, COLLECTION.USERS, firebaseUser.uid);
      const userDocSnap = await getDoc(userDocRef);

      let userData: User | null = null;

      if (userDocSnap.exists()) {
        userData = userDocSnap.data() as User;
      }

      if (!userData) {
        await firebaseSignOut(auth);
        this.clearClientAuthStorage();
        return fail("User profile not found in Firestore.");
      }

      return ok({ user: userData, userCredential });
    } catch (error: any) {
      if (firebaseSignInSucceeded) {
        await firebaseSignOut(auth).catch((signOutError) => {
          logError("AuthService.signInWithUsernameAndPassword.signOutAfterPartialLogin", signOutError);
        });
        this.clearClientAuthStorage();
      }
      logError("AuthService.signInWithUsernameAndPassword", error);
      return fail(this.handleAuthError(error).message, error.code);
    }
  }

  /**
   * Creates a new user with email and password using Firebase Authentication,
   * updates the user's profile with their full name, and creates a corresponding
   * Firestore user document with default role and status.
   *
   * Also sends an email verification to the newly created user.
   *
   * @param email - The user's email address.
   * @param password - The user's password.
   * @param name - The user's full name (used to derive first, middle, and last names).
   * @returns A Result object containing the created user's UID on success, or an error on failure.
   */
  async createUserWithEmailAndPassword(
    email: string,
    password: string,
    name: string,
    continueUrl?: string
  ): Promise<Result<{ userId: string }>> {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const userCredential = await firebaseCreateUser(auth, normalizedEmail, password);
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
        email: normalizedEmail,
        firstName,
        middleName,
        lastName,
        role: USER_ROLE.STUDENT,
        status: USER_STATUS.ACTIVE,
        organizationId: null,
        photoURL: firebaseUser.photoURL || null,
      });

      // Send email verification
      await sendEmailVerification(firebaseUser, continueUrl ? { url: continueUrl } : undefined);

      return ok({ userId: firebaseUser.uid });
    } catch (error: any) {
      logError("AuthService.createUserWithEmailAndPassword", error);
      return fail(this.handleAuthError(error).message, error.code);
    }
  }

  /**
   * Creates a new user account using a username and password.
   * A corresponding Firebase Auth user is created with a generated email
   * (`<username>@redpandalearns.com`) and a Firestore user document is initialized
   * with default role and status.
   *
   * @param username - The unique username chosen by the user.
   * @param password - The user's password for authentication.
   * @param name - The user's full name (used to extract first, middle, and last names).
   * @returns A Result object containing the created user's UID on success, or an error on failure.
   */
  async createUserWithUsernameAndPassword(
    username: string,
    password: string,
    name: string
  ): Promise<Result<{ userId: string }>> {
    try {
      const normalizedUsername = username.trim().toLowerCase();
      const existing = await userService.getUserByUsername(normalizedUsername);
      if (existing.success && existing.data) return fail("Username already exists.");

      const email = `${normalizedUsername}@${USERNAME_EMAIL_DOMAIN}`;
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
        username: normalizedUsername,
        email,
        firstName,
        middleName,
        lastName,
        role: USER_ROLE.STUDENT,
        status: USER_STATUS.ACTIVE,
        organizationId: null,
        photoURL: firebaseUser.photoURL || null,
      });

      return ok({ userId: firebaseUser.uid });
    } catch (error: any) {
      logError("AuthService.createUserWithUsernameAndPassword", error);
      return fail(this.handleAuthError(error).message, error.code);
    }
  }

  /**
   * Signs in a user using Google Sign-In (Popup) via Firebase Auth.
   * If the user does not already exist in Firestore, a new user document
   * is created with default role and status.
   *
   * @returns A Result object containing the user's UID and role on success,
   *          or an error on failure.
   */
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
      const userRef = doc(db, COLLECTION.USERS, uid);
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
          organizationId: null,
          photoURL: firebaseUser.photoURL || null,
        });
      }

      const role = existingDoc.exists() ? (existingDoc.data().role as UserRole) : USER_ROLE.STUDENT;

      return ok({ userId: uid, role });
    } catch (error: any) {
      logError("AuthService.signInWithGoogle", error);
      return fail(this.handleAuthError(error).message, error.code);
    }
  }

  /**
   * Signs out the currently authenticated Firebase user.
   *
   * @returns A Result object indicating success or containing an error if the sign-out fails.
   */
  async signOut(): Promise<Result<void>> {
    try {
      await firebaseSignOut(auth);
      this.clearClientAuthStorage();

      return ok(null);
    } catch (error: any) {
      logError("AuthService.signOut", error);
      return fail(this.handleAuthError(error).message, error.code);
    }
  }

  /**
   * Sends a password reset email to the specified user using Firebase Authentication.
   *
   * @param email - The email address of the user requesting the password reset.
   * @returns A Result object indicating success or containing an error if sending fails.
   */
  async sendPasswordResetEmail(email: string): Promise<Result<void>> {
    try {
      await firebaseSendPasswordReset(auth, email);

      return ok(null);
    } catch (error: any) {
      logError("AuthService.sendPasswordResetEmail", error);

      return fail(this.handleAuthError(error).message, error.code);
    }
  }

  /**
   * Registers a callback function that is triggered whenever the Firebase
   * Authentication state changes (e.g., user signs in or out).
   *
   * @param callback - Function to be called with the current FirebaseUser or null.
   * @returns An unsubscribe function to stop listening to auth state changes.
   */
  onAuthStateChanged(callback: (user: FirebaseUser | null) => void) {
    return firebaseOnAuthStateChanged(auth, callback);
  }

  async getToken(): Promise<string | null> {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      logWarn("AuthService.getToken", "No user is logged in");
      return null;
    }

    try {
      const token = await user.getIdToken(false);
      return token;
    } catch (error) {
      logError("AuthService.getToken", error);
      return null;
    }
  }

  /** Map Firebase auth errors to user-friendly messages */
  private handleAuthError(error: any): { message: string } {
    let message = "An error occurred during authentication.";

    switch (error.code) {
      case "auth/user-not-found":
        message = "No account found with this email address.";
        break;
      case "auth/wrong-password":
        message = "Incorrect password.";
        break;
      case "auth/invalid-credential":
      case "auth/invalid-login-credentials":
        message = "Invalid credentials.";
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
      case "auth/unauthorized-domain":
        message =
          "This sign-in domain is not authorized. Please use an approved app URL or contact support.";
        break;
      case "auth/app-not-authorized":
        message = "This app is not authorized for sign-in. Please contact support.";
        break;
      case "auth/operation-not-allowed":
        message = "This sign-in method is not enabled. Please contact support.";
        break;
      case "auth/popup-closed-by-user":
        message = "Sign-in popup was closed before completion.";
        break;
      case "auth/popup-blocked":
        message = "The sign-in popup was blocked by your browser. Please allow popups and try again.";
        break;
      default:
        message =
          typeof error.code === "string" && error.code.startsWith("auth/")
            ? "Authentication failed. Please try again."
            : error.message || message;
    }

    return { message };
  }
}

export const authService = new AuthService();
