import React, { useState, useEffect } from "react";
import type { ReactNode } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
} from "firebase/auth";
import type { User } from "firebase/auth";
import { auth } from "../config/firebase";
import { AuthContext } from "./AuthContextDefinition";
import type { AuthUser, AuthContextType } from "../types/auth";
import { convertFirebaseUser } from "../types/auth";

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser: User | null) => {
        if (firebaseUser) {
          setUser(convertFirebaseUser(firebaseUser));
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      throw new Error(getAuthErrorMessage(error.code));
    }
  };

  const register = async (email: string, password: string): Promise<void> => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      throw new Error(getAuthErrorMessage(error.code));
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await signOut(auth);
    } catch (error: any) {
      throw new Error("Failed to log out. Please try again.");
    }
  };

  const resetPassword = async (email: string): Promise<void> => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      throw new Error(getAuthErrorMessage(error.code));
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Helper function to convert Firebase error codes to user-friendly messages
const getAuthErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case "auth/user-not-found":
      return "No account found with this email address.";
    case "auth/wrong-password":
      return "Incorrect password. Please try again.";
    case "auth/email-already-in-use":
      return "An account with this email address already exists.";
    case "auth/weak-password":
      return "Password should be at least 6 characters long.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/user-disabled":
      return "This account has been disabled. Please contact support.";
    case "auth/too-many-requests":
      return "Too many failed attempts. Please try again later.";
    case "auth/network-request-failed":
      return "Network error. Please check your connection and try again.";
    case "auth/invalid-credential":
      return "Invalid email or password. Please check your credentials.";
    default:
      return "An error occurred during authentication. Please try again.";
  }
};
