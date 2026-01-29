// ===========================================
// Offline Fallback Page
// Shown when user is offline and page is not cached
// ===========================================

'use client';

import { WifiOff, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function OfflinePage() {
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-coral-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center max-w-md mx-auto">
        {/* Icon */}
        <div className="mb-8 relative">
          <div className="w-32 h-32 mx-auto bg-gradient-to-br from-slate-700 to-slate-800 rounded-full flex items-center justify-center shadow-xl">
            <WifiOff className="w-16 h-16 text-slate-400" />
          </div>
          <div className="absolute inset-0 w-32 h-32 mx-auto border-4 border-teal-500/20 rounded-full animate-ping" />
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-white mb-4">
          You&apos;re Offline
        </h1>

        {/* Description */}
        <p className="text-slate-400 mb-8 leading-relaxed">
          It looks like you&apos;ve lost your internet connection. 
          Don&apos;t worry, your analysis data is safely cached. 
          Please check your connection and try again.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handleRefresh}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-teal-600 text-white font-medium rounded-lg hover:from-teal-600 hover:to-teal-700 transition-all shadow-lg shadow-teal-500/25"
          >
            <RefreshCw className="w-5 h-5" />
            Try Again
          </button>
          
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-700 text-white font-medium rounded-lg hover:bg-slate-600 transition-all"
          >
            <Home className="w-5 h-5" />
            Go Home
          </Link>
        </div>

        {/* Tips */}
        <div className="mt-12 p-6 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <h3 className="text-sm font-semibold text-teal-400 mb-3">
            While you&apos;re offline, you can:
          </h3>
          <ul className="text-sm text-slate-400 space-y-2 text-left">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-teal-500 rounded-full" />
              View your cached analyses
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-teal-500 rounded-full" />
              Read saved reports
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-teal-500 rounded-full" />
              Review your trade plans
            </li>
          </ul>
        </div>

        {/* Logo */}
        <div className="mt-8 flex items-center justify-center gap-2 text-slate-500">
          <svg width="24" height="24" viewBox="0 0 200 200" fill="none" className="opacity-50">
            <path d="M100 10 L120 80 L100 100 L80 80 Z" fill="#2DD4BF" />
            <path d="M190 100 L120 120 L100 100 L120 80 Z" fill="#2DD4BF" />
            <path d="M100 190 L80 120 L100 100 L120 120 Z" fill="#F87171" />
            <path d="M10 100 L80 80 L100 100 L80 120 Z" fill="#F87171" />
          </svg>
          <span className="text-sm font-medium">TraderPath</span>
        </div>
      </div>
    </div>
  );
}
