'use client';

/**
 * Maintenance Page
 *
 * Shown when NEXT_PUBLIC_MAINTENANCE_MODE=true.
 * Self-contained — no API calls, no auth, no external dependencies.
 */

import { useEffect, useState } from 'react';

export default function MaintenancePage() {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
    }, 600);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Gradient orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-500/8 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="relative z-10 max-w-lg w-full text-center">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <svg width="40" height="40" viewBox="0 0 32 32" fill="none">
            <defs>
              <linearGradient id="tealG" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#5EEAD4" />
                <stop offset="100%" stopColor="#14B8A6" />
              </linearGradient>
              <linearGradient id="coralG" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#F59E6F" />
                <stop offset="100%" stopColor="#EF5A6F" />
              </linearGradient>
            </defs>
            <circle cx="16" cy="8" r="4" fill="url(#tealG)" />
            <circle cx="24" cy="16" r="4" fill="url(#coralG)" />
            <circle cx="16" cy="24" r="4" fill="url(#tealG)" />
            <circle cx="8" cy="16" r="4" fill="url(#coralG)" />
          </svg>
          <span className="text-2xl font-bold">
            <span className="text-teal-400">Trader</span>
            <span className="text-orange-400">Path</span>
          </span>
        </div>

        {/* Maintenance card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 md:p-12">
          {/* Icon */}
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-teal-500/10 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-teal-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.42 15.17l-4.655-5.163A2.625 2.625 0 118.508 7.67l3.91 4.338 3.91-4.338a2.627 2.627 0 113.742 2.337l-4.655 5.163a2.625 2.625 0 01-3.995 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
              />
            </svg>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">
            Scheduled Maintenance
          </h1>

          <p className="text-gray-400 text-base md:text-lg mb-6 leading-relaxed">
            We&apos;re upgrading our systems to bring you a better trading experience.
            This won&apos;t take long.
          </p>

          {/* Status indicator */}
          <div className="inline-flex items-center gap-2 bg-teal-500/10 border border-teal-500/20 rounded-full px-4 py-2 mb-8">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-500" />
            </span>
            <span className="text-teal-300 text-sm font-medium">
              Working on it{dots}
            </span>
          </div>

          {/* Info */}
          <div className="text-gray-500 text-sm space-y-1">
            <p>Your data is safe. All trades and analyses are preserved.</p>
            <p className="mt-3">
              Questions?{' '}
              <a
                href="mailto:support@traderpath.io"
                className="text-teal-400 hover:text-teal-300 transition-colors"
              >
                support@traderpath.io
              </a>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-gray-600 text-xs">
          &copy; {new Date().getFullYear()} TraderPath. All rights reserved.
        </p>
      </div>
    </div>
  );
}
