'use client';

// ===========================================
// Capacitor Native Initializer
// - Hides splash screen after React mounts
// - Syncs StatusBar color with dark/light theme
// - Handles Android hardware back button
// - Pauses/resumes data refresh on app lifecycle
// ===========================================

import { useEffect } from 'react';
import { useTheme } from 'next-themes';

export function CapacitorInit() {
  const { resolvedTheme } = useTheme();

  // One-time native initialization on mount
  useEffect(() => {
    const init = async () => {
      if (typeof window === 'undefined') return;

      let Capacitor: typeof import('@capacitor/core').Capacitor;
      try {
        ({ Capacitor } = await import('@capacitor/core'));
      } catch {
        return; // Not in Capacitor environment
      }

      if (!Capacitor.isNativePlatform()) return;

      // Hide splash screen — launchAutoHide is false so we must do this manually.
      // The splash stays visible until this is called, preventing white flash.
      try {
        const { SplashScreen } = await import('@capacitor/splash-screen');
        await SplashScreen.hide({ fadeOutDuration: 250 });
      } catch {
        // SplashScreen plugin not available
      }

      // Android: handle hardware back button
      if (Capacitor.getPlatform() === 'android') {
        try {
          const { App } = await import('@capacitor/app');
          App.addListener('backButton', ({ canGoBack }) => {
            if (canGoBack) {
              window.history.back();
            } else {
              App.exitApp();
            }
          });
        } catch {
          // App plugin not available
        }
      }

      // App lifecycle: pause/resume hints
      try {
        const { App } = await import('@capacitor/app');
        App.addListener('appStateChange', ({ isActive }) => {
          // Emit a custom event so React Query or other data layers can respond
          window.dispatchEvent(new CustomEvent('capacitor:appstate', { detail: { isActive } }));
        });
      } catch {
        // App plugin not available
      }
    };

    init();
  }, []);

  // Sync StatusBar color whenever theme changes (dark ↔ light)
  useEffect(() => {
    const syncStatusBar = async () => {
      if (typeof window === 'undefined') return;

      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return;

        const { StatusBar, Style } = await import('@capacitor/status-bar');

        const isDark = resolvedTheme === 'dark';
        await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
        await StatusBar.setBackgroundColor({
          color: isDark ? '#0A0A0A' : '#ffffff',
        });
      } catch {
        // StatusBar plugin not available or not native
      }
    };

    syncStatusBar();
  }, [resolvedTheme]);

  return null; // No DOM output — purely native side effects
}
