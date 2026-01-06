/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Experimental features for faster navigation
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', '@tanstack/react-query'],
  },

  // Proxy API requests to the backend
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:4000/api/:path*',
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
