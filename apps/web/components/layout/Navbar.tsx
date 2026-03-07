'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X, Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { TraderPathLogo } from '../common/TraderPathLogo';
import { LanguageSelector } from '../common/LanguageSelector';

const NAV_LINKS: { label: string; href: string }[] = [];

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 dark:border-gray-800 bg-background">
      <div className="max-w-[1200px] mx-auto pl-0 pr-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <TraderPathLogo size="sm" showText href="/" animated={false} />

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6" aria-label="Main navigation">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-[11px] font-medium uppercase tracking-wider text-slate-400 hover:text-black dark:hover:text-white transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Right */}
        <div className="flex items-center gap-2">
          <LanguageSelector compact />

          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-1.5 text-slate-400 hover:text-black dark:hover:text-white transition-colors"
            aria-label="Toggle theme"
          >
            <Sun className="w-3.5 h-3.5 hidden dark:block" />
            <Moon className="w-3.5 h-3.5 dark:hidden" />
          </button>

          <Link
            href="/login"
            className="hidden sm:block px-3 py-1.5 text-[11px] font-medium text-slate-500 hover:text-black dark:hover:text-white transition-colors"
          >
            SIGN IN
          </Link>

          <Link
            href="/register"
            className="px-3 py-1.5 text-[11px] font-semibold bg-gradient-to-r from-teal-500 to-rose-500 text-white rounded-sm hover:opacity-90 transition-opacity shadow-sm shadow-teal-500/20"
          >
            GET STARTED
          </Link>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 text-slate-400 hover:text-black dark:hover:text-white"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile panel */}
      {mobileMenuOpen && (
        <nav className="md:hidden border-t border-black/[0.06] dark:border-white/[0.06] bg-background" aria-label="Mobile navigation">
          <div className="px-4 py-3 flex flex-col gap-3">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={closeMenu}
                className="text-[11px] font-medium uppercase tracking-wider text-slate-400 hover:text-black dark:hover:text-white py-1"
              >
                {link.label}
              </a>
            ))}
            <hr className="border-black/[0.06] dark:border-white/[0.06]" />
            <div className="flex items-center justify-between py-1">
              <span className="text-[11px] text-slate-400">LANGUAGE</span>
              <LanguageSelector />
            </div>
            <hr className="border-black/[0.06] dark:border-white/[0.06]" />
            <Link href="/login" onClick={closeMenu} className="text-[11px] text-slate-400 hover:text-black dark:hover:text-white py-1">
              SIGN IN
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
