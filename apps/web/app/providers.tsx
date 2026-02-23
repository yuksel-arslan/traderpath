'use client';

// ===========================================
// App Providers
// ===========================================

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { useState } from 'react';
import { Toaster } from 'sonner';
import { CreditNotificationProvider } from '../contexts/CreditNotificationContext';
import { InstallPrompt } from '../components/pwa/InstallPrompt';
import { CapacitorInit } from '../components/mobile/CapacitorInit';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute - data is fresh for 1 minute
            gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
            refetchOnWindowFocus: false,
            refetchOnMount: true, // Refetch stale data on navigation
            refetchOnReconnect: true, // Refetch when connection is restored
          },
        },
      })
  );

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        <CreditNotificationProvider>
          {children}
          <InstallPrompt />
          <CapacitorInit />
        </CreditNotificationProvider>
        <Toaster position="top-right" richColors />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
