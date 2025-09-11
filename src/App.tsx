import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ToastProvider } from "./contexts/ToastContext";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { BookmarkApp } from "./components/BookmarkApp";
import { LoginPage } from "./components/LoginPage";
import { RegisterPage } from "./components/RegisterPage";
import { ForgotPasswordPage } from "./components/ForgotPasswordPage";
import ConfigurationError from "./components/ConfigurationError";
import { isFirebaseConfigured } from "./config/firebase";

const App: React.FC = () => {
  // Check if Firebase is configured
  if (!isFirebaseConfigured) {
    return (
      <ThemeProvider>
        <ConfigurationError />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <Router>
            <Routes>
              {/* Protected main app route */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <BookmarkApp />
                  </ProtectedRoute>
                }
              />

              {/* Authentication routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />

              {/* Catch all route - redirect to home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
};

export default App;
