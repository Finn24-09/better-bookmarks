import type { User } from 'firebase/auth';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
}

export interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
}

export const convertFirebaseUser = (user: User): AuthUser => ({
  uid: user.uid,
  email: user.email,
  displayName: user.displayName,
  emailVerified: user.emailVerified,
});
