// ===========================================
// Safe API Utility
// Handles fetch requests with proper error handling
// ===========================================

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

interface ApiError extends Error {
  code?: string;
  status?: number;
}

/**
 * Safe fetch wrapper that handles non-JSON responses
 * and provides consistent error handling
 */
export async function safeFetch<T = unknown>(
  url: string,
  options?: RequestInit
): Promise<{ response: Response; data: ApiResponse<T> }> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  // Check if response is JSON
  const contentType = response.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    const error = new Error('Sunucu hatası. Lütfen tekrar deneyin.') as ApiError;
    error.code = 'SERVER_ERROR';
    error.status = response.status;
    throw error;
  }

  const data = await response.json();
  return { response, data };
}

/**
 * API client with authentication support
 */
export const api = {
  async get<T>(url: string, token?: string): Promise<T> {
    const headers: HeadersInit = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const { response, data } = await safeFetch<T>(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok || !data.success) {
      const error = new Error(data.error?.message || 'Request failed') as ApiError;
      error.code = data.error?.code;
      error.status = response.status;
      throw error;
    }

    return data.data as T;
  },

  async post<T>(url: string, body: unknown, token?: string): Promise<T> {
    const headers: HeadersInit = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const { response, data } = await safeFetch<T>(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok || !data.success) {
      const error = new Error(data.error?.message || 'Request failed') as ApiError;
      error.code = data.error?.code;
      error.status = response.status;
      throw error;
    }

    return data.data as T;
  },

  async put<T>(url: string, body: unknown, token?: string): Promise<T> {
    const headers: HeadersInit = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const { response, data } = await safeFetch<T>(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok || !data.success) {
      const error = new Error(data.error?.message || 'Request failed') as ApiError;
      error.code = data.error?.code;
      error.status = response.status;
      throw error;
    }

    return data.data as T;
  },

  async delete<T>(url: string, token?: string): Promise<T> {
    const headers: HeadersInit = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const { response, data } = await safeFetch<T>(url, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok || !data.success) {
      const error = new Error(data.error?.message || 'Request failed') as ApiError;
      error.code = data.error?.code;
      error.status = response.status;
      throw error;
    }

    return data.data as T;
  },
};
