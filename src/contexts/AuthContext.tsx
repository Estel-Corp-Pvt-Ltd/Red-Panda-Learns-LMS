import React, { createContext, useContext, useEffect, useState } from "react";
import { User } from "@/types/user";
import { authService } from "@/services/authService";
import { db } from "@/firebaseConfig";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { UserRole } from "@/types/general";
import { UserCredential } from "firebase/auth";
import { Result } from "@/utils/response";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<Result<{ user: User; userCredential: UserCredential }>>;
  signup: (email: string, password: string, name: string) => Promise<Result<{ userId: string }>>;
  loginWithGoogle: () => Promise<{ success: boolean; userId?: string; error?: string; role: UserRole }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
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
    const userDocRef = doc(db, "Users", uid);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) return userDocSnap.data() as User;

    // fallback: lookup by email
    if (email) {
      const usersRef = collection(db, "Users");
      const q = query(usersRef, where("email", "==", email));
      const querySnap = await getDocs(q);
      if (!querySnap.empty) {
        return querySnap.docs[0].data() as User;
      }
    }
    return null;
  } catch (err) {
    console.error("Error fetching user profile:", err);
    return null;
  }
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 🔹 Keep user in sync with Firebase Auth state
  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged(async (firebaseUser) => {
      if (!firebaseUser || !firebaseUser.emailVerified) {
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

  // 🔹 Email/Password Login
  const login = async (email: string, password: string) => {
    const result = await authService.signInWithEmailAndPassword(email, password);
    if (result.success && result.data) {
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
    role: UserRole
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
      return {
        success: true,
        userId: response.data.userId,
        role: "student" as UserRole, // ✅ default role
      };
    }

    // Fallback failure — must still return a role
    return {
      success: false,
      error: response.error.message || "Google login failed",
      role: "student" as UserRole,  // ✅ required prop
    };
  };

  // 🔹 Logout
  const logout = async () => {
    await authService.signOut();
    setUser(null);
  };

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

  const value: AuthContextType = {
    user,
    loading,
    login,
    signup,
    loginWithGoogle,
    logout,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
