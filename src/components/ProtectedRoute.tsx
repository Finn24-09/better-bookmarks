import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { LoadingState } from "./LoadingSpinner";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingState />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
