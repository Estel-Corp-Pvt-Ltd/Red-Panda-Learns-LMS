import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { User } from "@/types/user";
import { authService } from "@/services/authService";
import { db, getFirebaseMessaging } from "@/firebaseConfig";
import { collection, doc, getDoc, getDocs, query, Timestamp, where } from "firebase/firestore";
import { UserRole } from "@/types/general";
import { COLLECTION, PLATFROM_TYPE, USER_ROLE } from "@/constants";
import { userService } from "@/services/userService";
import { getToken } from "firebase/messaging";
import { logError, logWarn } from "@/utils/logger";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginWithGoogle: () => Promise<{
    success: boolean;
    userId?: string;
    error?: string;
    role: UserRole;
  }>;
  logout: () => Promise<void>;
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
  try {
    // First try UID
    const userDocRef = doc(db, COLLECTION.USERS, uid);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      const userData = userDocSnap.data() as User;

      return userData;
    }

    // fallback: lookup by email
    if (email) {
      const usersRef = collection(db, COLLECTION.USERS);
      const q = query(usersRef, where("email", "==", email));
      const querySnap = await getDocs(q);
      if (!querySnap.empty) {
        const userData = querySnap.docs[0].data() as User;

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
    const unsubscribe = authService.onAuthStateChanged(async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      const isOAuthUser = firebaseUser.providerData?.some(
        (p) => p.providerId !== "password"
      );
      if (!firebaseUser.emailVerified && !isOAuthUser) {
        logWarn("[AuthContext] Email not verified, setting user to null", {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          providerId: firebaseUser.providerData?.[0]?.providerId,
        });
        setUser(null);
        setLoading(false);
        return;
      }

      const userData = await fetchUserFromFirestore(firebaseUser.uid, firebaseUser.email);
      setUser(userData);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // 🔹 Google Login
  const loginWithGoogle = useCallback(async (): Promise<{
    success: boolean;
    userId?: string;
    error?: string;
    role: UserRole;
  }> => {
    const response = await authService.signInWithGoogle();

    if (response.success && response.data.userId) {
      const userData = await fetchUserFromFirestore(response.data.userId);
      if (userData) {
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
        role: USER_ROLE.STUDENT as UserRole, // ✅ default role
      };
    }

    // Fallback failure — must still return a role
    logError("[AuthContext] loginWithGoogle failed", response.error);
    return {
      success: false,
      error: response.error.message || "Google login failed",
      role: USER_ROLE.STUDENT as UserRole, // ✅ required prop
    };
  }, []);

  // 🔹 Logout
  const logout = useCallback(async () => {
    await authService.signOut();
    setUser(null);
  }, []);

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

  // 🔹 Refresh user data
  const refreshUser = useCallback(async () => {
    if (!user) {
      return;
    }
    const userData = await fetchUserFromFirestore(user.id, user.email);
    if (userData) {
      setUser(userData);
    } else {
      logWarn("[AuthContext] Failed to refresh user - not found in Firestore");
    }
  }, [user]);

  const value = useMemo<AuthContextType>(() => ({
    user,
    loading,
    loginWithGoogle,
    logout,
    refreshUser,
  }), [user, loading, loginWithGoogle, logout, refreshUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
