// ===========================================
// PWA Install Prompt Component
// Shows install banner for eligible users
// ===========================================

'use client';

import { useState, useEffect } from 'react';
import { X, Download, Smartphone, Share } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';

export function InstallPrompt() {
  const { canShow, isIOS, install, dismiss } = usePWAInstall();
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Delay showing the banner for better UX
    const timer = setTimeout(() => {
      if (canShow || isIOS) {
        setShowBanner(true);
      }
    }, 5000); // Show after 5 seconds

    return () => clearTimeout(timer);
  }, [canShow, isIOS]);

  if (!showBanner) return null;

  const handleInstall = async () => {
    if (isIOS) {
      // iOS doesn't support beforeinstallprompt, show instructions
      return;
    }
    const result = await install();
    if (result.success) {
      setShowBanner(false);
    }
  };

  const handleDismiss = () => {
    dismiss();
    setShowBanner(false);
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-slide-up sm:left-auto sm:right-4 sm:max-w-sm">
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Install TraderPath</h3>
              <p className="text-xs text-slate-400">Add to your home screen</p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {isIOS ? (
            // iOS Installation Instructions
            <div className="space-y-3">
              <p className="text-sm text-slate-300">
                Install this app on your iPhone:
              </p>
              <ol className="text-sm text-slate-400 space-y-2">
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 bg-slate-700 rounded-full flex items-center justify-center text-xs text-teal-400">1</span>
                  Tap the <Share className="w-4 h-4 inline mx-1" /> Share button
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 bg-slate-700 rounded-full flex items-center justify-center text-xs text-teal-400">2</span>
                  Scroll and tap &quot;Add to Home Screen&quot;
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 bg-slate-700 rounded-full flex items-center justify-center text-xs text-teal-400">3</span>
                  Tap &quot;Add&quot; to confirm
                </li>
              </ol>
            </div>
          ) : (
            // Android/Desktop Installation
            <div className="space-y-3">
              <p className="text-sm text-slate-300">
                Get quick access to your trading analysis anytime, even offline.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleInstall}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-teal-500 to-teal-600 text-white font-medium rounded-lg hover:from-teal-600 hover:to-teal-700 transition-all"
                >
                  <Download className="w-4 h-4" />
                  Install App
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-4 py-2.5 text-slate-400 hover:text-white transition-colors"
                >
                  Not Now
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Features */}
        <div className="px-4 pb-4">
          <div className="flex gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-teal-500 rounded-full" />
              Works offline
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-teal-500 rounded-full" />
              Push notifications
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-teal-500 rounded-full" />
              Fast access
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
