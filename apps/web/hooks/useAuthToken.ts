// ===========================================
// Auth Token Hook
// Provides the Auth.js JWT for API calls
// ===========================================

import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useState } from 'react';

let cachedToken: string | null = null;
let tokenFetchPromise: Promise<string | null> | null = null;

/**
 * Hook to get the Auth.js JWT token for API calls
 */
export function useAuthToken() {
  const { data: session, status } = useSession();
  const [token, setToken] = useState<string | null>(cachedToken);

  const fetchToken = useCallback(async () => {
    // If already fetching, wait for that promise
    if (tokenFetchPromise) {
      return tokenFetchPromise;
    }

    // If we have a cached token, use it
    if (cachedToken) {
      return cachedToken;
    }

    // Fetch new token
    tokenFetchPromise = fetch('/api/token')
      .then(async (res) => {
        if (!res.ok) {
          cachedToken = null;
          return null;
        }
        const data = await res.json();
        if (data.success && data.data?.token) {
          cachedToken = data.data.token;
          return cachedToken;
        }
        return null;
      })
      .catch(() => null)
      .finally(() => {
        tokenFetchPromise = null;
      });

    return tokenFetchPromise;
  }, []);

  useEffect(() => {
    if (status === 'authenticated' && session && !token) {
      fetchToken().then(setToken);
    } else if (status === 'unauthenticated') {
      cachedToken = null;
      setToken(null);
    }
  }, [status, session, token, fetchToken]);

  // Return a function that gets the token (refreshing if needed)
  const getToken = useCallback(async (): Promise<string | null> => {
    if (cachedToken) return cachedToken;
    return fetchToken();
  }, [fetchToken]);

  return {
    token,
    getToken,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
  };
}

/**
 * Clear the cached token (call on logout)
 */
export function clearAuthToken() {
  cachedToken = null;
}
