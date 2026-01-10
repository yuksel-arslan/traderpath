/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',

  // Environment variables exposed to the browser
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
  },

  // Experimental features for faster navigation
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', '@tanstack/react-query'],
  },

  // Proxy API requests to the backend (development only)
  // In production, frontend calls API directly via NEXT_PUBLIC_API_URL
  async rewrites() {
    // Skip rewrites in production - frontend will call API directly
    if (process.env.NODE_ENV === 'production') {
      return [];
    }
    return [
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
        source: '/api/translation/:path*',
        destination: 'http://127.0.0.1:4000/api/translation/:path*',
      },
    ];
  },

  // Allow images from external sources
  images: {
    domains: [
      'lh3.googleusercontent.com',
      'avatars.githubusercontent.com',
      'raw.githubusercontent.com', // For cryptocurrency icons
      'assets.coingecko.com',
      'www.cryptocompare.com',
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

module.exports = nextConfig;
