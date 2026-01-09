// ===========================================
// Safe API Utility
// Handles fetch requests with proper error handling
// ===========================================

// API base URL - uses environment variable in production
// In development, leave empty to use Next.js proxy rewrites
const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? (process.env.NEXT_PUBLIC_API_URL || '')
  : '';

// Token cache for API calls
let authTokenCache: string | null = null;
let tokenFetchPromise: Promise<string | null> | null = null;

/**
 * Get the Auth.js JWT token for API calls
 */
export async function getAuthToken(): Promise<string | null> {
  // Return cached token if available
  if (authTokenCache) return authTokenCache;

  // If already fetching, wait for that
  if (tokenFetchPromise) return tokenFetchPromise;

  // Fetch new token
  tokenFetchPromise = fetch('/api/token')
    .then(async (res) => {
      if (!res.ok) return null;
      const data = await res.json();
      if (data.success && data.data?.token) {
        authTokenCache = data.data.token;
        return authTokenCache;
      }
      return null;
    })
    .catch(() => null)
    .finally(() => {
      tokenFetchPromise = null;
    });

  return tokenFetchPromise;
}

/**
 * Clear the auth token cache (call on logout)
 */
export function clearAuthToken() {
  authTokenCache = null;
}

/**
 * Authenticated fetch wrapper - automatically adds Auth.js token
 */
export async function authFetch(url: string, options?: RequestInit): Promise<Response> {
  const token = await getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options?.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  return fetch(getApiUrl(url), {
    ...options,
    headers,
  });
}

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
 * Get full API URL - prepends base URL for production only
 * In development, returns the URL as-is to use Next.js proxy rewrites
 */
export function getApiUrl(url: string): string {
  // If URL is already absolute, return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  // In production, prepend the API base URL for /api routes
  if (API_BASE_URL && url.startsWith('/api')) {
    return `${API_BASE_URL}${url}`;
  }
  return url;
}

/**
 * Safe fetch wrapper that handles non-JSON responses
 * and provides consistent error handling
 */
export async function safeFetch<T = unknown>(
  url: string,
  options?: RequestInit
): Promise<{ response: Response; data: ApiResponse<T> }> {
  const fullUrl = getApiUrl(url);
  const response = await fetch(fullUrl, {
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
