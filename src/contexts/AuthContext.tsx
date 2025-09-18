import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@/types/user';
import { AuthResponse, authService } from '@/services/authService';
import { db } from '@/firebaseConfig';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; user?: User; error?: string }>;
  signup: (email: string, password: string, name: string) => Promise<AuthResponse>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged(async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        // Try by UID as docId (works only for those two special users)
        const userDocRef = doc(db, "Users", firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        let userData: User | null = null;

        if (userDocSnap.exists()) {
          userData = userDocSnap.data() as User;
        } else {
          // Fallback: search by email
          const usersRef = collection(db, "Users");
          const q = query(usersRef, where("email", "==", firebaseUser.email));
          const querySnap = await getDocs(q);

          if (!querySnap.empty) {
            userData = querySnap.docs[0].data() as User;
          }
        }

        setUser(userData);
      } catch (err) {
        console.error("Error fetching user profile:", err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });


    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    return await authService.signInWithEmailAndPassword(email, password);
  };

  const signup = async (email: string, password: string, name: string) => {
    return await authService.createUserWithEmailAndPassword(email, password, name);
  };

  const loginWithGoogle = async () => {
    await authService.signInWithGoogle();
  };

  const logout = async () => {
    await authService.signOut();
  };

  const resetPassword = async (email: string) => {
    await authService.sendPasswordResetEmail(email);
  };

  const value = {
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
