/**
 * Auth Service - API calls for authentication
 */

import { apiPost } from '@/lib/api';

export interface RegisterData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  password: string;
  confirm_password: string;
  role: 'farmer' | 'buyer';
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    user: {
      id: string;
      first_name: string;
      last_name: string;
      email: string;
      phone: string;
      role_name: string;
      is_active: boolean;
    };
  };
}

/**
 * Register new user
 */
export const register = async (data: RegisterData) => {
  return apiPost<AuthResponse>('/auth/register.php', data);
};

/**
 * Login user
 */
export const login = async (data: LoginData) => {
  return apiPost<AuthResponse>('/auth/login.php', data);
};

/**
 * Logout user
 */
export const logout = async () => {
  return apiPost<{
    success: boolean;
    message: string;
  }>('/auth/logout.php', {});
};

/**
 * Request password reset
 */
export const requestPasswordReset = async (email: string) => {
  return apiPost<{
    success: boolean;
    message: string;
  }>('/auth/password_reset.php', {
    action: 'request',
    email,
  });
};

/**
 * Reset password with token
 */
export const resetPassword = async (token: string, newPassword: string) => {
  return apiPost<{
    success: boolean;
    message: string;
  }>('/auth/password_reset.php', {
    action: 'reset',
    token,
    new_password: newPassword,
    confirm_password: newPassword,
  });
};

/**
 * Verify email with token
 */
export const verifyEmail = async (token: string) => {
  return apiPost<{
    success: boolean;
    message: string;
  }>('/auth/register.php', {
    action: 'verify_email',
    token,
  });
};
