// ===========================================
// Root Layout
// ===========================================

import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

// System font stack - fast loading, no external requests needed
// Inter-like appearance using system fonts for optimal performance
const fontClass = 'font-sans';

export const metadata: Metadata = {
  title: 'TraderPath - 7-Step Trading Analysis',
  description: 'From confusion to conviction in 7 steps. AI-powered trading analysis with manipulation detection.',
  keywords: ['crypto', 'trading', 'analysis', 'bitcoin', 'ethereum', 'whale', 'manipulation'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={fontClass}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
