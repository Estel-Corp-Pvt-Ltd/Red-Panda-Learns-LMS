import React, { createContext, useContext, useEffect, useState } from "react";
import { User } from "@/types/user";
import { authService } from "@/services/authService";
import { db, getFirebaseMessaging } from "@/firebaseConfig";
import { collection, doc, getDoc, getDocs, query, Timestamp, where } from "firebase/firestore";
import { UserRole } from "@/types/general";
import { UserCredential } from "firebase/auth";
import { Result } from "@/utils/response";
import { COLLECTION, PLATFROM_TYPE } from "@/constants";
import { userService } from "@/services/userService";
import { getToken } from "firebase/messaging";
import { log, logError, logWarn } from "@/utils/logger";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (
    email: string,
    password: string
  ) => Promise<Result<{ user: User; userCredential: UserCredential }>>;
  signup: (email: string, password: string, name: string) => Promise<Result<{ userId: string }>>;
  loginWithGoogle: () => Promise<{
    success: boolean;
    userId?: string;
    error?: string;
    role: UserRole;
  }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

// 🔹 Helper: Fetch Firestore user
const fetchUserFromFirestore = async (uid: string, email?: string | null): Promise<User | null> => {
  log("[AuthContext] fetchUserFromFirestore called", { uid, email });
  try {
    // First try UID
    const userDocRef = doc(db, COLLECTION.USERS, uid);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      const userData = userDocSnap.data() as User;
      log("[AuthContext] User found by UID", { userId: userData.id, role: userData.role });
      return userData;
    }

    log("[AuthContext] User not found by UID, trying email fallback");
    // fallback: lookup by email
    if (email) {
      const usersRef = collection(db, COLLECTION.USERS);
      const q = query(usersRef, where("email", "==", email));
      const querySnap = await getDocs(q);
      if (!querySnap.empty) {
        const userData = querySnap.docs[0].data() as User;
        log("[AuthContext] User found by email", { userId: userData.id, role: userData.role });
        return userData;
      }
    }
    logWarn("[AuthContext] User not found in Firestore", { uid, email });
    return null;
  } catch (err) {
    logError("[AuthContext] fetchUserFromFirestore", err);
    return null;
  }
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 🔹 Keep user in sync with Firebase Auth state
  useEffect(() => {
    log("[AuthContext] Setting up onAuthStateChanged listener");
    const unsubscribe = authService.onAuthStateChanged(async (firebaseUser) => {
      log("[AuthContext] onAuthStateChanged triggered", {
        hasFirebaseUser: !!firebaseUser,
        uid: firebaseUser?.uid,
        email: firebaseUser?.email,
        emailVerified: firebaseUser?.emailVerified,
        providerId: firebaseUser?.providerData?.[0]?.providerId,
      });

      if (!firebaseUser) {
        log("[AuthContext] No firebase user, setting user to null");
        setUser(null);
        setLoading(false);
        return;
      }

      if (!firebaseUser.emailVerified) {
        logWarn("[AuthContext] Email not verified, setting user to null", {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          providerId: firebaseUser.providerData?.[0]?.providerId,
        });
        setUser(null);
        setLoading(false);
        return;
      }

      log("[AuthContext] Email verified, fetching user from Firestore");
      const userData = await fetchUserFromFirestore(firebaseUser.uid, firebaseUser.email);
      log("[AuthContext] Setting user state", {
        userData: userData ? { id: userData.id, role: userData.role } : null,
      });
      setUser(userData);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // 🔹 Email/Password Login
  const login = async (email: string, password: string) => {
    log("[AuthContext] login called", { email });
    const result = await authService.signInWithEmailAndPassword(email, password);
    log("[AuthContext] login result", {
      success: result.success,
      hasUser: !!result.data?.user,
      userId: result.data?.user?.id,
      userRole: result.data?.user?.role,
      emailVerified: result.data?.userCredential?.user?.emailVerified,
      error: result.success ? undefined : result.error,
    });
    if (result.success && result.data) {
      log("[AuthContext] Setting user immediately after login", { userId: result.data.user.id });
      setUser(result.data.user); // ✅ update immediately so Header changes
    }
    return result;
  };

  // 🔹 Signup (Email/Password)
  const signup = async (email: string, password: string, name: string) => {
    const result = await authService.createUserWithEmailAndPassword(email, password, name);
    return result;
  };

  // 🔹 Google Login
  const loginWithGoogle = async (): Promise<{
    success: boolean;
    userId?: string;
    error?: string;
    role: UserRole;
  }> => {
    log("[AuthContext] loginWithGoogle called");
    const response = await authService.signInWithGoogle();
    log("[AuthContext] loginWithGoogle response", {
      success: response.success,
      userId: response.success ? response.data.userId : undefined,
      error: response.success ? undefined : response.error,
    });

    if (response.success && response.data.userId) {
      log("[AuthContext] Google login successful, fetching user from Firestore");
      const userData = await fetchUserFromFirestore(response.data.userId);
      if (userData) {
        log("[AuthContext] Setting user after Google login", {
          userId: userData.id,
          role: userData.role,
        });
        setUser(userData);

        return {
          success: true,
          userId: response.data.userId,
          role: userData.role as UserRole, // ✅ guarantee role exists
        };
      }
      // fallback if user doc missing
      logWarn("[AuthContext] User doc missing after Google login", {
        userId: response.data.userId,
      });
      return {
        success: true,
        userId: response.data.userId,
        role: "student" as UserRole, // ✅ default role
      };
    }

    // Fallback failure — must still return a role
    logError("[AuthContext] loginWithGoogle failed", response.error);
    return {
      success: false,
      error: response.error.message || "Google login failed",
      role: "student" as UserRole, // ✅ required prop
    };
  };

  // 🔹 Logout
  const logout = async () => {
    log("[AuthContext] logout called");
    await authService.signOut();
    log("[AuthContext] User signed out, setting user to null");
    setUser(null);
  };

  useEffect(() => {
    const registerFcmToken = async () => {
      if (!user?.id) return;
      if (!("Notification" in window)) return;
      if (Notification.permission !== "granted") return;

      try {
        const messaging = await getFirebaseMessaging();
        if (!messaging) return;

        const token = await getToken(messaging, {
          vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
        });

        if (!token) return;

        await userService.upsertFcmToken(user.id, {
          token,
          platform: PLATFROM_TYPE.WEB,
          updatedAt: Timestamp.now(),
        });
      } catch (error) {
        console.error("FCM token registration failed:", error);
      }
    };

    registerFcmToken();
  }, [user?.id]);

  // 🔹 Password reset
  const resetPassword = async (email: string) => {
    try {
      await authService.sendPasswordResetEmail(email);
    } catch (error: any) {
      if (error.code === "auth/user-not-found") {
        console.warn("⚠️ No user found with email:", email);
      } else {
        console.error("❌ Error sending password reset email:", error);
      }
      throw error;
    }
  };

  // 🔹 Refresh user data
  const refreshUser = async () => {
    log("[AuthContext] refreshUser called", { currentUserId: user?.id });
    if (!user) {
      log("[AuthContext] No user to refresh");
      return;
    }
    const userData = await fetchUserFromFirestore(user.id, user.email);
    if (userData) {
      log("[AuthContext] User refreshed", { userId: userData.id });
      setUser(userData);
    } else {
      logWarn("[AuthContext] Failed to refresh user - not found in Firestore");
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    signup,
    loginWithGoogle,
    logout,
    resetPassword,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
