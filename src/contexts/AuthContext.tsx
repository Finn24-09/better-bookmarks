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
import { handleError } from "../utils/errorHandler";

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
      const userMessage = handleError(error, "login");
      throw new Error(userMessage);
    }
  };

  const register = async (email: string, password: string): Promise<void> => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      const userMessage = handleError(error, "register");
      throw new Error(userMessage);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await signOut(auth);
    } catch (error: any) {
      const userMessage = handleError(error, "logout");
      throw new Error(userMessage);
    }
  };

  const resetPassword = async (email: string): Promise<void> => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      const userMessage = handleError(error, "resetPassword");
      throw new Error(userMessage);
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
