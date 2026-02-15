'use client';

/**
 * Maintenance Page (Next.js Route)
 *
 * Hyper-minimalist. Self-contained — no API calls, no auth, no external dependencies.
 */

import { useEffect, useState } from 'react';

export default function MaintenancePage() {
  const [dotVisible, setDotVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setDotVisible(prev => !prev);
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-6">
      <div className="w-full max-w-[400px] text-center">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-12">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <defs>
              <linearGradient id="tG" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#5EEAD4" />
                <stop offset="100%" stopColor="#14B8A6" />
              </linearGradient>
              <linearGradient id="cG" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#F59E6F" />
                <stop offset="100%" stopColor="#EF5A6F" />
              </linearGradient>
            </defs>
            <circle cx="16" cy="8" r="4" fill="url(#tG)" />
            <circle cx="24" cy="16" r="4" fill="url(#cG)" />
            <circle cx="16" cy="24" r="4" fill="url(#tG)" />
            <circle cx="8" cy="16" r="4" fill="url(#cG)" />
          </svg>
          <span
            className="text-lg font-extrabold tracking-tight"
            style={{
              background: 'linear-gradient(90deg, #40E0D0, #FF5A5A)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            TraderPath
          </span>
        </div>

        {/* Status indicator */}
        <div className="inline-flex items-center gap-2 mb-6">
          <span
            className="block w-1.5 h-1.5 rounded-full bg-teal-400 transition-opacity duration-500"
            style={{ opacity: dotVisible ? 1 : 0.2 }}
          />
          <span className="text-[10px] font-extrabold tracking-[.18em] uppercase text-neutral-600">
            Upgrading
          </span>
        </div>

        {/* Message */}
        <h1 className="text-[32px] font-light tracking-tight leading-tight mb-3 text-white">
          Back shortly.
        </h1>
        <p className="text-neutral-500 text-sm leading-relaxed">
          Systems are being upgraded. Your data is safe.
        </p>

        {/* Divider */}
        <div className="w-8 h-px bg-teal-500/30 mx-auto my-7" />

        {/* Footer */}
        <p className="text-neutral-800 text-[10px] tracking-[.12em] uppercase">
          &copy; {new Date().getFullYear()} TraderPath
        </p>
      </div>
    </div>
  );
}
