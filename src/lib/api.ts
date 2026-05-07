/**
 * API Service - Base configuration and utilities for backend communication
 */

// Get API base URL from environment or default to localhost PHP backend
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost/PHP_BACKEND';

// Headers for API requests
const getHeaders = (includeAuth = true): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (includeAuth) {
    const token = localStorage.getItem('auth_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  return headers;
};

// Generic API request handler
export const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit & { method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' } = {}
): Promise<T> => {
  const { method = 'GET', body, ...restOptions } = options;

  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      method,
      headers: getHeaders(true),
      body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
      ...restOptions,
    });

    // Parse response
    let data;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    // Handle errors
    if (!response.ok) {
      const error = new Error(
        data?.error || data?.message || `HTTP ${response.status}: ${response.statusText}`
      );
      (error as any).status = response.status;
      (error as any).data = data;
      throw error;
    }

    return data as T;
  } catch (error) {
    console.error(`API request failed: ${method} ${endpoint}`, error);
    throw error;
  }
};

// Helper for GET requests
export const apiGet = <T>(endpoint: string) =>
  apiRequest<T>(endpoint, { method: 'GET' });

// Helper for POST requests
export const apiPost = <T>(endpoint: string, body: any) =>
  apiRequest<T>(endpoint, { method: 'POST', body });

// Helper for PUT requests
export const apiPut = <T>(endpoint: string, body: any) =>
  apiRequest<T>(endpoint, { method: 'PUT', body });

// Helper for DELETE requests
export const apiDelete = <T>(endpoint: string) =>
  apiRequest<T>(endpoint, { method: 'DELETE' });

/**
 * Build query string from object
 */
export const buildQueryString = (params: Record<string, any>): string => {
  const filtered = Object.entries(params)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');

  return filtered ? `?${filtered}` : '';
};
