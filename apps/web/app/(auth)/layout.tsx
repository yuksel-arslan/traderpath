'use client';

import Link from 'next/link';
import { TraderPathLogo } from '../../components/common/TraderPathLogo';
import { ThemeToggle } from '../../components/common/ThemeToggle';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-background relative overflow-hidden">
      {/* Light Mode Background Pattern */}
      <div className="absolute inset-0 dark:hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-white to-slate-100" />
        <div
          className="absolute inset-0 opacity-[0.4]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #cbd5e1 1px, transparent 0)`,
            backgroundSize: '20px 20px',
          }}
        />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-teal-500/[0.07] rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-500/[0.05] rounded-full blur-[80px]" />
      </div>

      {/* Dark Mode Animated Gradient Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none hidden dark:block">
        <div
          className="absolute w-[600px] h-[600px] sm:w-[800px] sm:h-[800px] rounded-full opacity-[0.15]"
          style={{
            background:
              'radial-gradient(ellipse at center, #14B8A6 0%, #14B8A6 20%, transparent 70%)',
            top: '-20%',
            left: '-10%',
            animation: 'wave1 12s ease-in-out infinite',
            filter: 'blur(60px)',
          }}
        />
        <div
          className="absolute w-[500px] h-[500px] sm:w-[700px] sm:h-[700px] rounded-full opacity-[0.12]"
          style={{
            background:
              'radial-gradient(ellipse at center, #F87171 0%, #EF5A6F 30%, transparent 70%)',
            bottom: '-30%',
            right: '-20%',
            animation: 'wave2 14s ease-in-out infinite',
            filter: 'blur(60px)',
          }}
        />
      </div>

      {/* Theme Toggle - Top Right */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      {/* Centered Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-8 relative z-10">
        {/* Logo Above Form */}
        <Link href="/" className="mb-6 transform hover:scale-105 transition-transform">
          <TraderPathLogo size="sm" showText={true} />
        </Link>

        {/* Form Content */}
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
