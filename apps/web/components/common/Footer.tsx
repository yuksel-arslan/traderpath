'use client';

// ===========================================
// Footer Component - 2026 Edition
// Common footer for all pages
// ===========================================

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface FooterProps {
  className?: string;
  variant?: 'default' | 'minimal';
}

export function Footer({ className, variant = 'default' }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={cn(
      "border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950",
      className
    )}>
      <div className="container mx-auto px-4 py-12">
        {variant === 'default' && (
          <>
            {/* Main Footer Content */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
              {/* Brand */}
              <div className="md:col-span-1">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl font-bold">
                    <span className="text-emerald-500">Trader</span>
                    <span className="text-red-500">Path</span>
                  </span>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  AI-powered trading analysis platform. Follow the money, make informed decisions.
                </p>
              </div>

              {/* Platform */}
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Platform</h4>
                <ul className="space-y-2">
                  <li>
                    <Link href="/capital-flow" className="text-sm text-slate-500 dark:text-slate-400 hover:text-emerald-500 transition">
                      Capital Flow
                    </Link>
                  </li>
                  <li>
                    <Link href="/analyze" className="text-sm text-slate-500 dark:text-slate-400 hover:text-emerald-500 transition">
                      Analysis Tools
                    </Link>
                  </li>
                  <li>
                    <Link href="/pricing" className="text-sm text-slate-500 dark:text-slate-400 hover:text-emerald-500 transition">
                      Pricing
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Resources */}
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Resources</h4>
                <ul className="space-y-2">
                  <li>
                    <Link href="/#how-it-works" className="text-sm text-slate-500 dark:text-slate-400 hover:text-emerald-500 transition">
                      How It Works
                    </Link>
                  </li>
                  <li>
                    <Link href="/#features" className="text-sm text-slate-500 dark:text-slate-400 hover:text-emerald-500 transition">
                      Features
                    </Link>
                  </li>
                  <li>
                    <Link href="/about" className="text-sm text-slate-500 dark:text-slate-400 hover:text-emerald-500 transition">
                      About Us
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Legal */}
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Legal</h4>
                <ul className="space-y-2">
                  <li>
                    <Link href="/privacy" className="text-sm text-slate-500 dark:text-slate-400 hover:text-emerald-500 transition">
                      Privacy Policy
                    </Link>
                  </li>
                  <li>
                    <Link href="/terms" className="text-sm text-slate-500 dark:text-slate-400 hover:text-emerald-500 transition">
                      Terms of Service
                    </Link>
                  </li>
                  <li>
                    <Link href="/disclaimer" className="text-sm text-slate-500 dark:text-slate-400 hover:text-emerald-500 transition">
                      Risk Disclaimer
                    </Link>
                  </li>
                </ul>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-slate-200 dark:border-slate-800 my-8" />
          </>
        )}

        {/* Disclaimer */}
        <div className="mb-8">
          <div className="bg-slate-100 dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
            <h5 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Risk Disclaimer
            </h5>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Trading cryptocurrencies, stocks, and other financial instruments involves substantial risk of loss and is not suitable for all investors.
              The analysis and recommendations provided by TraderPath are for informational purposes only and should not be considered as financial advice.
              Past performance is not indicative of future results. You should carefully consider your investment objectives, level of experience,
              and risk appetite before making any investment decisions. Never invest money you cannot afford to lose.
              TraderPath does not guarantee the accuracy, completeness, or timeliness of the information provided.
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <span>&copy; {currentYear}</span>
            <span className="font-semibold">
              <span className="text-emerald-500">Trader</span>
              <span className="text-red-500">Path</span>
            </span>
            <span>· All rights reserved</span>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-400 dark:text-slate-500">
            <span>Made with precision for traders worldwide</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
