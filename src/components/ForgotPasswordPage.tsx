import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, Send } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";

export const ForgotPasswordPage: React.FC = () => {
  const { resetPassword } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState("");

  const validateEmail = (email: string): boolean => {
    return /\S+@\S+\.\S+/.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setError("Email is required");
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await resetPassword(email);
      setEmailSent(true);
      showToast("success", "Password reset email sent!");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to send reset email";
      setError(message);
      showToast("error", message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (error) {
      setError("");
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <Send className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
              Check your email
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              We've sent a password reset link to{" "}
              <span className="font-medium text-gray-900 dark:text-white">
                {email}
              </span>
            </p>
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              Didn't receive the email? Check your spam folder or{" "}
              <button
                onClick={() => {
                  setEmailSent(false);
                  setEmail("");
                }}
                className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
              >
                try again
              </button>
            </p>
          </div>
          <div className="mt-8">
            <Link
              to="/login"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-800"
            >
              <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                <ArrowLeft className="h-5 w-5" />
              </span>
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
            <Mail className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Reset your password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Enter your email address and we'll send you a link to reset your
            password.
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="sr-only">
              Email address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={`appearance-none relative block w-full px-3 py-2 pl-10 border ${
                  error
                    ? "border-red-300 dark:border-red-600"
                    : "border-gray-300 dark:border-gray-600"
                } placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 focus:z-10 sm:text-sm`}
                placeholder="Email address"
                value={email}
                onChange={handleInputChange}
              />
            </div>
            {error && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            )}
          </div>

          <div className="space-y-4">
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-700 dark:hover:bg-blue-800"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                    <Send className="h-5 w-5 text-blue-500 group-hover:text-blue-400" />
                  </span>
                  Send reset email
                </>
              )}
            </button>

            <Link
              to="/login"
              className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                <ArrowLeft className="h-5 w-5 text-gray-400" />
              </span>
              Back to sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};
