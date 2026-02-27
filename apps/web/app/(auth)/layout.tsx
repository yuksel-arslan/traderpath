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
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
      {/* Animated Gradient Background - Light Mode */}
      <div className="absolute inset-0 dark:hidden">
        {/* Base mesh gradient */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at 20% 50%, rgba(94, 237, 195, 0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(20, 184, 166, 0.12) 0%, transparent 50%), radial-gradient(ellipse at 60% 80%, rgba(248, 113, 113, 0.08) 0%, transparent 50%)',
          }}
        />
        {/* Animated teal orb - top left */}
        <div
          className="absolute w-[500px] h-[500px] sm:w-[700px] sm:h-[700px] rounded-full opacity-[0.12]"
          style={{
            background:
              'radial-gradient(ellipse at center, #14B8A6 0%, #5EEDC3 30%, transparent 70%)',
            top: '-15%',
            left: '-10%',
            animation: 'authGradient1 16s ease-in-out infinite',
            filter: 'blur(80px)',
          }}
        />
        {/* Animated coral orb - bottom right */}
        <div
          className="absolute w-[450px] h-[450px] sm:w-[600px] sm:h-[600px] rounded-full opacity-[0.10]"
          style={{
            background:
              'radial-gradient(ellipse at center, #F87171 0%, #EF5A6F 30%, transparent 70%)',
            bottom: '-20%',
            right: '-15%',
            animation: 'authGradient2 18s ease-in-out infinite',
            filter: 'blur(70px)',
          }}
        />
        {/* Animated teal accent orb - center right */}
        <div
          className="absolute w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] rounded-full opacity-[0.08]"
          style={{
            background:
              'radial-gradient(ellipse at center, #2DD4A8 0%, transparent 70%)',
            top: '40%',
            right: '5%',
            animation: 'authGradient3 20s ease-in-out infinite',
            filter: 'blur(60px)',
          }}
        />
      </div>

      {/* Animated Gradient Background - Dark Mode */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none hidden dark:block">
        {/* Base subtle mesh */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at 30% 20%, rgba(20, 184, 166, 0.08) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(239, 90, 111, 0.06) 0%, transparent 50%)',
          }}
        />
        {/* Large teal orb - top left */}
        <div
          className="absolute w-[600px] h-[600px] sm:w-[900px] sm:h-[900px] rounded-full opacity-[0.15]"
          style={{
            background:
              'radial-gradient(ellipse at center, #14B8A6 0%, #14B8A6 15%, transparent 65%)',
            top: '-25%',
            left: '-15%',
            animation: 'authGradient1 16s ease-in-out infinite',
            filter: 'blur(80px)',
          }}
        />
        {/* Large coral orb - bottom right */}
        <div
          className="absolute w-[500px] h-[500px] sm:w-[750px] sm:h-[750px] rounded-full opacity-[0.12]"
          style={{
            background:
              'radial-gradient(ellipse at center, #F87171 0%, #EF5A6F 25%, transparent 65%)',
            bottom: '-30%',
            right: '-20%',
            animation: 'authGradient2 18s ease-in-out infinite',
            filter: 'blur(80px)',
          }}
        />
        {/* Teal accent orb - mid right */}
        <div
          className="absolute w-[350px] h-[350px] sm:w-[500px] sm:h-[500px] rounded-full opacity-[0.10]"
          style={{
            background:
              'radial-gradient(ellipse at center, #2DD4A8 0%, #5EEDC3 20%, transparent 65%)',
            top: '35%',
            right: '0%',
            animation: 'authGradient3 20s ease-in-out infinite',
            filter: 'blur(70px)',
          }}
        />
        {/* Small coral accent - top right */}
        <div
          className="absolute w-[250px] h-[250px] sm:w-[350px] sm:h-[350px] rounded-full opacity-[0.08]"
          style={{
            background:
              'radial-gradient(ellipse at center, #FF8A9B 0%, transparent 65%)',
            top: '5%',
            right: '10%',
            animation: 'authGradient4 14s ease-in-out infinite',
            filter: 'blur(50px)',
          }}
        />
      </div>

      {/* Grain texture overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.04]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '128px 128px',
        }}
      />

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
