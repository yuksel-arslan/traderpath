// ===========================================
// Root Layout with SEO Optimization
// ===========================================

import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

// 2026 Financial Terminal Typography
// Inter — clean geometric sans for UI chrome
// JetBrains Mono — precision monospace for prices, data, indicators
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
});

const siteUrl = 'https://traderpath.io';

export const metadata: Metadata = {
  // Basic Meta
  title: {
    default: 'TraderPath - AI-Powered Crypto Trading Analysis',
    template: '%s | TraderPath',
  },
  description: 'Professional crypto trading analysis with AI. 7-step methodology detects whale manipulation, analyzes market trends, and provides actionable trade plans. BTC, ETH, SOL analysis.',
  keywords: [
    'crypto trading analysis',
    'bitcoin analysis',
    'ethereum analysis',
    'whale detection',
    'trading signals',
    'crypto AI',
    'technical analysis',
    'market manipulation detection',
    'trade plan',
    'crypto trading tools',
    'BTC analysis',
    'ETH analysis',
    'SOL analysis',
    'altcoin analysis',
    'crypto trading bot',
  ],
  authors: [{ name: 'TraderPath' }],
  creator: 'TraderPath',
  publisher: 'TraderPath',

  // Canonical URL
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: '/',
  },

  // Open Graph (Facebook, LinkedIn, etc.)
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: 'TraderPath',
    title: 'TraderPath - AI-Powered Crypto Trading Analysis',
    description: 'Professional crypto trading analysis with AI. Detect whale manipulation, analyze market trends, get actionable trade plans.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'TraderPath - From Charts to Clarity',
      },
    ],
  },

  // Twitter Card
  twitter: {
    card: 'summary_large_image',
    title: 'TraderPath - AI-Powered Crypto Trading Analysis',
    description: 'Professional crypto trading analysis with AI. Detect whale manipulation, analyze trends, get trade plans.',
    images: ['/og-image.png'],
    creator: '@traderpath',
    site: '@traderpath',
  },

  // Robots
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  // Icons - Next.js auto-detects icon.tsx and apple-icon.tsx in app folder
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192x192.svg', sizes: '192x192', type: 'image/svg+xml' },
      { url: '/icons/icon-512x512.svg', sizes: '512x512', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
  },

  // Apple PWA Meta Tags
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'TraderPath',
  },

  // Modern PWA Meta Tags
  other: {
    'mobile-web-app-capable': 'yes',
  },

  // Manifest
  manifest: '/site.webmanifest',

  // Verification
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },

  // Category
  category: 'finance',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
};

// JSON-LD Structured Data
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'TraderPath',
  description: 'AI-powered crypto trading analysis platform with 7-step methodology for detecting whale manipulation and generating trade plans.',
  url: siteUrl,
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    ratingCount: '150',
  },
  featureList: [
    'AI-powered market analysis',
    'Whale manipulation detection',
    'Real-time trading signals',
    '7-step analysis methodology',
    'Multi-timeframe analysis',
    'Risk management tools',
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
