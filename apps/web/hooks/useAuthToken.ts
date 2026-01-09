// ===========================================
// Auth Token Hook
// Provides the JWT token for API calls
// ===========================================

import { useCallback, useEffect, useState } from 'react';

let cachedToken: string | null = null;
let tokenFetchPromise: Promise<string | null> | null = null;

/**
 * Hook to get the JWT token for API calls
 */
export function useAuthToken() {
  const [token, setToken] = useState<string | null>(cachedToken);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

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
    // Check if user has auth-session cookie
    const hasSession = document.cookie.includes('auth-session=true');

    if (hasSession && !token) {
      fetchToken().then((t) => {
        setToken(t);
        setIsAuthenticated(!!t);
        setIsLoading(false);
      });
    } else if (!hasSession) {
      cachedToken = null;
      setToken(null);
      setIsAuthenticated(false);
      setIsLoading(false);
    } else {
      setIsAuthenticated(!!token);
      setIsLoading(false);
    }
  }, [token, fetchToken]);

  // Return a function that gets the token (refreshing if needed)
  const getToken = useCallback(async (): Promise<string | null> => {
    if (cachedToken) return cachedToken;
    return fetchToken();
  }, [fetchToken]);

  return {
    token,
    getToken,
    isLoading,
    isAuthenticated,
  };
}

/**
 * Clear the cached token (call on logout)
 */
export function clearAuthToken() {
  cachedToken = null;
}
