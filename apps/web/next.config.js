// ===========================================
// Next.js Configuration with PWA Support
// ===========================================

const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  customWorkerDir: 'worker',
  runtimeCaching: [
    {
      // Cache API responses
      urlPattern: /^https:\/\/api\.traderpath\.io\/api\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 5, // 5 minutes
        },
        networkTimeoutSeconds: 10,
      },
    },
    {
      // Cache Binance API for price data
      urlPattern: /^https:\/\/api\.binance\.com\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'binance-cache',
        expiration: {
          maxEntries: 30,
          maxAgeSeconds: 60, // 1 minute
        },
        networkTimeoutSeconds: 5,
      },
    },
    {
      // Cache static assets
      urlPattern: /\.(?:js|css|woff2?|ttf|otf|eot)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-assets',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
        },
      },
    },
    {
      // Cache images
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
        },
      },
    },
    {
      // Cache Google Fonts
      urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts',
        expiration: {
          maxEntries: 20,
          maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
        },
      },
    },
    {
      // Cache coin icons
      urlPattern: /^https:\/\/(?:coin-images\.coingecko\.com|assets\.coingecko\.com|assets\.coincap\.io|cryptofonts\.com|raw\.githubusercontent\.com|www\.cryptocompare\.com|logo\.clearbit\.com)\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'coin-icons',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
        },
      },
    },
  ],
  fallbacks: {
    document: '/offline',
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  productionBrowserSourceMaps: true,

  // Environment variables exposed to the browser
  // IMPORTANT: Production fallback must be the real API URL, not localhost.
  // next.config.js `env` values are inlined at build time via DefinePlugin,
  // so any fallback here overrides fallbacks in API route files (e.g. route.ts).
  // NOTE: Trailing slashes are stripped to prevent double-slash URL issues.
  env: {
    NEXT_PUBLIC_API_URL: (process.env.NEXT_PUBLIC_API_URL
      || (process.env.NODE_ENV === 'production'
        ? 'https://api.traderpath.io'
        : 'http://localhost:4000')).replace(/\/+$/, ''),
  },

  // Experimental features for faster navigation
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', '@tanstack/react-query'],
  },

  // Proxy API requests to the backend (development only)
  // In production, frontend calls API directly via NEXT_PUBLIC_API_URL
  async rewrites() {
    const faviconRewrite = {
      source: '/favicon.ico',
      destination: '/favicon.svg',
    };
    // Skip API rewrites in production - frontend will call API directly
    if (process.env.NODE_ENV === 'production') {
      return [faviconRewrite];
    }
    return [
      faviconRewrite,
      // Token endpoint - handled by Next.js
      // Auth login/logout/register/oauth - handled by Next.js
      // Everything else goes to backend
      {
        source: '/api/auth/me',
        destination: 'http://127.0.0.1:4000/api/auth/me',
      },
      {
        source: '/api/auth/google',
        destination: 'http://127.0.0.1:4000/api/auth/google',
      },
      {
        source: '/api/user/:path*',
        destination: 'http://127.0.0.1:4000/api/user/:path*',
      },
      {
        source: '/api/analysis/:path*',
        destination: 'http://127.0.0.1:4000/api/analysis/:path*',
      },
      {
        source: '/api/reports',
        destination: 'http://127.0.0.1:4000/api/reports',
      },
      {
        source: '/api/reports/:path*',
        destination: 'http://127.0.0.1:4000/api/reports/:path*',
      },
      {
        source: '/api/analysis/:path*',
        destination: 'http://127.0.0.1:4000/api/analysis/:path*',
      },
      {
        source: '/api/credits/:path*',
        destination: 'http://127.0.0.1:4000/api/credits/:path*',
      },
      {
        source: '/api/alerts',
        destination: 'http://127.0.0.1:4000/api/alerts',
      },
      {
        source: '/api/alerts/:path*',
        destination: 'http://127.0.0.1:4000/api/alerts/:path*',
      },
      {
        source: '/api/rewards/:path*',
        destination: 'http://127.0.0.1:4000/api/rewards/:path*',
      },
      {
        source: '/api/payments/:path*',
        destination: 'http://127.0.0.1:4000/api/payments/:path*',
      },
      {
        source: '/api/admin/:path*',
        destination: 'http://127.0.0.1:4000/api/admin/:path*',
      },
      {
        source: '/api/binance/:path*',
        destination: 'http://127.0.0.1:4000/api/binance/:path*',
      },
      {
        source: '/api/expert/:path*',
        destination: 'http://127.0.0.1:4000/api/expert/:path*',
      },
      {
        source: '/api/ai-expert/:path*',
        destination: 'http://127.0.0.1:4000/api/ai-expert/:path*',
      },
      {
        source: '/api/translation/:path*',
        destination: 'http://127.0.0.1:4000/api/translation/:path*',
      },
      {
        source: '/api/costs/:path*',
        destination: 'http://127.0.0.1:4000/api/costs/:path*',
      },
      {
        source: '/api/security/:path*',
        destination: 'http://127.0.0.1:4000/api/security/:path*',
      },
      {
        source: '/api/concierge/:path*',
        destination: 'http://127.0.0.1:4000/api/concierge/:path*',
      },
      {
        source: '/api/capital-flow/:path*',
        destination: 'http://127.0.0.1:4000/api/capital-flow/:path*',
      },
      {
        source: '/api/passes/:path*',
        destination: 'http://127.0.0.1:4000/api/passes/:path*',
      },
      {
        source: '/api/scheduled/:path*',
        destination: 'http://127.0.0.1:4000/api/scheduled/:path*',
      },
    ];
  },

  // Allow images from external sources (using remotePatterns instead of deprecated domains)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'raw.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'assets.coingecko.com',
      },
      {
        protocol: 'https',
        hostname: 'coin-images.coingecko.com',
      },
      {
        protocol: 'https',
        hostname: 'logo.clearbit.com',
      },
      {
        protocol: 'https',
        hostname: 'www.cryptocompare.com',
      },
      {
        protocol: 'https',
        hostname: 'assets.coincap.io',
      },
      {
        protocol: 'https',
        hostname: 'cryptofonts.com',
      },
    ],
  },

  // Webpack configuration for @react-pdf/renderer
  webpack: (config, { isServer }) => {
    // Fix for @react-pdf/renderer in Next.js
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        stream: false,
        zlib: false,
      };
    }

    // Handle canvas module (used by react-pdf)
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    };

    return config;
  },

  // Transpile @react-pdf packages
  transpilePackages: ['@react-pdf/renderer', '@react-pdf/layout', '@react-pdf/pdfkit'],
};

module.exports = withPWA(nextConfig);
