'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { TraderPathLogo } from '../common/TraderPathLogo';
import { ThemeToggle } from '../common/ThemeToggle';
import { LanguageSelector } from '../common/LanguageSelector';

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
];

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <header
      className="sticky top-0 z-50 border-b border-white/10 bg-[#041020]/95 backdrop-blur supports-[backdrop-filter]:bg-[#041020]/80"
    >
      <div className="w-full px-4 lg:px-6 py-3 flex items-center justify-between">
        {/* Logo - always visible */}
        <TraderPathLogo
          size="sm"
          showText
          showTagline={false}
          href="/"
          className="flex-shrink-0 sm:hidden"
        />
        <TraderPathLogo
          size="md"
          showText
          showTagline
          href="/"
          className="flex-shrink-0 hidden sm:flex"
        />

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center gap-6" aria-label="Main navigation">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-slate-300 hover:text-[#4dd0e1] transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Desktop-only controls */}
          <div className="hidden sm:flex items-center gap-1">
            <LanguageSelector compact />
            <ThemeToggle />
          </div>

          <Link
            href="/login"
            className="hidden sm:block px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors"
          >
            Sign In
          </Link>

          <Link
            href="/register"
            className="px-3 sm:px-4 py-2 text-sm font-semibold rounded-lg transition-all"
            style={{
              background: 'linear-gradient(135deg, #4dd0e1, #00f5c4)',
              color: '#041020',
            }}
          >
            Get Started
          </Link>

          {/* Hamburger - mobile only */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-300 hover:text-white transition-colors"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu panel */}
      {mobileMenuOpen && (
        <nav
          className="md:hidden border-t border-white/10 bg-[#041020]/95 backdrop-blur"
          aria-label="Mobile navigation"
        >
          <div className="px-4 py-4 flex flex-col gap-4">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={closeMenu}
                className="text-sm text-slate-300 hover:text-[#4dd0e1] transition-colors py-1"
              >
                {link.label}
              </a>
            ))}

            <hr className="border-white/10" />

            <div className="flex items-center justify-between">
              <Link
                href="/login"
                onClick={closeMenu}
                className="text-sm text-slate-300 hover:text-white transition-colors"
              >
                Sign In
              </Link>
              <div className="flex items-center gap-2">
                <LanguageSelector />
                <ThemeToggle />
              </div>
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
