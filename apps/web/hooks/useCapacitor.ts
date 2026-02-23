'use client';

// ===========================================
// Capacitor Platform Detection Hook
// Returns platform info for conditional native UI
// ===========================================

import { useEffect, useState } from 'react';

type Platform = 'ios' | 'android' | 'web';

interface CapacitorState {
  isNative: boolean;    // true when running inside iOS/Android app
  platform: Platform;  // 'ios' | 'android' | 'web'
  isReady: boolean;    // false during SSR / initial hydration
}

export function useCapacitor(): CapacitorState {
  const [state, setState] = useState<CapacitorState>({
    isNative: false,
    platform: 'web',
    isReady: false,
  });

  useEffect(() => {
    const detect = async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        setState({
          isNative: Capacitor.isNativePlatform(),
          platform: Capacitor.getPlatform() as Platform,
          isReady: true,
        });
      } catch {
        // @capacitor/core not available (browser-only build)
        setState({ isNative: false, platform: 'web', isReady: true });
      }
    };

    detect();
  }, []);

  return state;
}
