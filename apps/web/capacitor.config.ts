// ===========================================
// Capacitor Native App Configuration
// TraderPath iOS & Android
//
// Approach: Remote URL (Live Web)
//   - WebView loads the Vercel deployment
//   - Backend stays on Railway
//   - App Store updates don't require re-submission
//
// BEFORE RUNNING:
//   1. Place source images in capacitor-assets/:
//      - icon-only.png        (1024×1024, no background)
//      - icon-background.png  (1024×1024, solid bg for adaptive icon)
//      - icon-foreground.png  (1024×1024, transparent bg)
//      - splash.png           (2732×2732, centered logo on dark bg)
//      - splash-dark.png      (2732×2732, centered logo on dark bg)
//   2. Run: npx @capacitor/assets generate
//   3. Run: npx cap add ios && npx cap add android
//   4. Run: npx cap sync
// ===========================================

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // App identity — must match App Store Connect & Google Play Console
  appId: 'io.traderpath.app',
  appName: 'TraderPath',

  // webDir: used by `cap add` scaffolding only; runtime uses server.url
  webDir: 'public',

  server: {
    // Remote URL: the live Vercel deployment
    // TODO: Update if your Vercel URL differs (e.g. https://app.traderpath.io)
    url: 'https://traderpath.io',
    cleartext: false,         // Force HTTPS
    androidScheme: 'https',
  },

  ios: {
    // Extend content under status bar; CSS env(safe-area-inset-*) handles padding
    contentInset: 'always',
    backgroundColor: '#0A0A0A',
    // Prevent navigation outside traderpath.io (security)
    limitsNavigationsToAppBoundDomains: true,
    allowsLinkPreview: false,
    scrollEnabled: true,
  },

  android: {
    backgroundColor: '#0A0A0A',
    allowMixedContent: false,
    captureInput: true,
    // Enable during development; MUST be false for production builds
    webContentsDebuggingEnabled: false,
  },

  plugins: {
    SplashScreen: {
      // launchAutoHide: false → we manually hide after React mounts
      // This prevents white flash before dark UI renders
      launchShowDuration: 0,
      launchAutoHide: false,
      backgroundColor: '#0A0A0A',
      androidSplashResourceName: 'splash',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
      useDialog: false,
    },

    StatusBar: {
      // false → status bar has its own background, WebView starts below
      overlaysWebView: false,
      // Will be updated dynamically by CapacitorInit based on theme
      style: 'DARK',
      backgroundColor: '#0A0A0A',
    },

    Keyboard: {
      // 'body' → body element resizes when keyboard appears
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
