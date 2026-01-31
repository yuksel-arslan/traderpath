'use client';

// ===========================================
// TraderPath Brand Logo Component
// 4-Pointed Star Logo + Brand Text + Motto
// Supports Light/Dark mode
// ===========================================

import { cn } from '../../lib/utils';
import { useId } from 'react';

interface TradepathLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showMotto?: boolean;
  variant?: 'full' | 'icon' | 'text';
  mode?: 'light' | 'dark' | 'auto';
}

export function TradepathLogo({
  className,
  size = 'md',
  showMotto = true,
  variant = 'full',
  mode = 'auto',
}: TradepathLogoProps) {
  const uniqueId = useId();
  const sizes = {
    sm: { icon: 32, text: 'text-xl', motto: 'text-[8px]', gap: 'gap-2' },
    md: { icon: 48, text: 'text-2xl', motto: 'text-[10px]', gap: 'gap-3' },
    lg: { icon: 64, text: 'text-3xl', motto: 'text-xs', gap: 'gap-4' },
    xl: { icon: 80, text: 'text-4xl', motto: 'text-sm', gap: 'gap-5' },
  };

  const s = sizes[size];

  // 4-Pointed Star Logo as SVG - Dark mode (bright colors)
  const LogoIconDark = () => {
    const tealId = `teal-dark-${uniqueId}`;
    const coralId = `coral-dark-${uniqueId}`;

    return (
      <svg
        width={s.icon}
        height={s.icon}
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Teal gradient for top and right points */}
          <linearGradient id={tealId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#5EEDC3" />
            <stop offset="50%" stopColor="#2DD4A8" />
            <stop offset="100%" stopColor="#14B8A6" />
          </linearGradient>

          {/* Coral gradient for left and bottom points */}
          <linearGradient id={coralId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF8A9B" />
            <stop offset="50%" stopColor="#F87171" />
            <stop offset="100%" stopColor="#EF5A6F" />
          </linearGradient>
        </defs>

        {/* Top point (teal) */}
        <path d="M100 10 L120 80 L100 100 L80 80 Z" fill={`url(#${tealId})`} />

        {/* Right point (teal) */}
        <path d="M190 100 L120 120 L100 100 L120 80 Z" fill={`url(#${tealId})`} />

        {/* Bottom point (coral) */}
        <path d="M100 190 L80 120 L100 100 L120 120 Z" fill={`url(#${coralId})`} />

        {/* Left point (coral) */}
        <path d="M10 100 L80 80 L100 100 L80 120 Z" fill={`url(#${coralId})`} />
      </svg>
    );
  };

  // 4-Pointed Star Logo as SVG - Light mode (deeper colors for white bg)
  const LogoIconLight = () => {
    const tealId = `teal-light-${uniqueId}`;
    const coralId = `coral-light-${uniqueId}`;
    const shadowId = `shadow-${uniqueId}`;

    return (
      <svg
        width={s.icon}
        height={s.icon}
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Deeper teal gradient for light backgrounds */}
          <linearGradient id={tealId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#14B8A6" />
            <stop offset="50%" stopColor="#0D9488" />
            <stop offset="100%" stopColor="#0F766E" />
          </linearGradient>

          {/* Deeper coral gradient for light backgrounds */}
          <linearGradient id={coralId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F87171" />
            <stop offset="50%" stopColor="#EF4444" />
            <stop offset="100%" stopColor="#DC2626" />
          </linearGradient>

          {/* Subtle shadow for depth */}
          <filter id={shadowId} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#0D9488" floodOpacity="0.2"/>
          </filter>
        </defs>

        <g filter={`url(#${shadowId})`}>
          {/* Top point (teal) */}
          <path d="M100 10 L120 80 L100 100 L80 80 Z" fill={`url(#${tealId})`} />

          {/* Right point (teal) */}
          <path d="M190 100 L120 120 L100 100 L120 80 Z" fill={`url(#${tealId})`} />

          {/* Bottom point (coral) */}
          <path d="M100 190 L80 120 L100 100 L120 120 Z" fill={`url(#${coralId})`} />

          {/* Left point (coral) */}
          <path d="M10 100 L80 80 L100 100 L80 120 Z" fill={`url(#${coralId})`} />
        </g>
      </svg>
    );
  };

  // Render appropriate logo based on mode
  const LogoIcon = () => {
    if (mode === 'auto') {
      return (
        <>
          <div className="hidden dark:block"><LogoIconDark /></div>
          <div className="block dark:hidden"><LogoIconLight /></div>
        </>
      );
    }
    return mode === 'light' ? <LogoIconLight /> : <LogoIconDark />;
  };

  // Brand text "TraderPath"
  const BrandText = () => (
    <div className="flex flex-col">
      <span
        className={cn(
          s.text,
          'font-bold tracking-wide'
        )}
      >
        {mode === 'auto' ? (
          <>
            {/* Dark mode - bright colors */}
            <span className="hidden dark:inline">
              <span className="text-teal-400">Trader</span>
              <span style={{ color: '#F87171' }}>Path</span>
            </span>
            {/* Light mode - deeper colors */}
            <span className="inline dark:hidden">
              <span className="text-teal-700">Trader</span>
              <span className="text-red-600">Path</span>
            </span>
          </>
        ) : mode === 'light' ? (
          <>
            <span className="text-teal-700">Trader</span>
            <span className="text-red-600">Path</span>
          </>
        ) : (
          <>
            <span className="text-teal-400">Trader</span>
            <span style={{ color: '#F87171' }}>Path</span>
          </>
        )}
      </span>
      {showMotto && (
        <span
          className={cn(
            s.motto,
            'tracking-[0.3em] uppercase font-light text-muted-foreground'
          )}
        >
          FROM CHARTS TO CLARITY
        </span>
      )}
    </div>
  );

  if (variant === 'icon') {
    return (
      <div className={cn('flex items-center', className)}>
        <LogoIcon />
      </div>
    );
  }

  if (variant === 'text') {
    return (
      <div className={cn('flex items-center', className)}>
        <BrandText />
      </div>
    );
  }

  return (
    <div className={cn('flex items-center', s.gap, className)}>
      <LogoIcon />
      <BrandText />
    </div>
  );
}

// Alternative: Simple inline logo for headers
export function TradepathLogoInline({
  className,
  mode = 'auto'
}: {
  className?: string;
  mode?: 'light' | 'dark' | 'auto';
}) {
  if (mode === 'auto') {
    return (
      <span className={cn('font-bold', className)}>
        {/* Dark mode */}
        <span className="hidden dark:inline">
          <span className="text-teal-400">Trader</span>
          <span style={{ color: '#F87171' }}>Path</span>
        </span>
        {/* Light mode */}
        <span className="inline dark:hidden">
          <span className="text-teal-700">Trader</span>
          <span className="text-red-600">Path</span>
        </span>
      </span>
    );
  }

  return (
    <span className={cn('font-bold', className)}>
      <span className={mode === 'light' ? 'text-teal-700' : 'text-teal-400'}>Trader</span>
      <span className={mode === 'light' ? 'text-red-600' : ''} style={mode === 'dark' ? { color: '#F87171' } : undefined}>Path</span>
    </span>
  );
}

// Export for PDF reports (static HTML/CSS version) - Dark mode
export const TRADEPATH_LOGO_SVG = `
<svg width="48" height="48" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="tealGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#5EEDC3" />
      <stop offset="50%" stop-color="#2DD4A8" />
      <stop offset="100%" stop-color="#14B8A6" />
    </linearGradient>
    <linearGradient id="coralGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FF8A9B" />
      <stop offset="50%" stop-color="#F87171" />
      <stop offset="100%" stop-color="#EF5A6F" />
    </linearGradient>
  </defs>
  <path d="M100 10 L120 80 L100 100 L80 80 Z" fill="url(#tealGradient)" />
  <path d="M190 100 L120 120 L100 100 L120 80 Z" fill="url(#tealGradient)" />
  <path d="M100 190 L80 120 L100 100 L120 120 Z" fill="url(#coralGradient)" />
  <path d="M10 100 L80 80 L100 100 L80 120 Z" fill="url(#coralGradient)" />
</svg>
`;

// Export for PDF reports (static HTML/CSS version) - Light mode
export const TRADEPATH_LOGO_SVG_LIGHT = `
<svg width="48" height="48" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="tealGradientLight" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#14B8A6" />
      <stop offset="50%" stop-color="#0D9488" />
      <stop offset="100%" stop-color="#0F766E" />
    </linearGradient>
    <linearGradient id="coralGradientLight" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F87171" />
      <stop offset="50%" stop-color="#EF4444" />
      <stop offset="100%" stop-color="#DC2626" />
    </linearGradient>
    <filter id="shadowLight" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#0D9488" flood-opacity="0.2"/>
    </filter>
  </defs>
  <g filter="url(#shadowLight)">
    <path d="M100 10 L120 80 L100 100 L80 80 Z" fill="url(#tealGradientLight)" />
    <path d="M190 100 L120 120 L100 100 L120 80 Z" fill="url(#tealGradientLight)" />
    <path d="M100 190 L80 120 L100 100 L120 120 Z" fill="url(#coralGradientLight)" />
    <path d="M10 100 L80 80 L100 100 L80 120 Z" fill="url(#coralGradientLight)" />
  </g>
</svg>
`;

// Brand colors - Dark mode (for dark backgrounds)
export const TRADEPATH_BRAND_COLORS = {
  teal: {
    light: '#5EEDC3',
    base: '#2DD4A8',
    dark: '#14B8A6',
  },
  coral: {
    light: '#FF8A9B',
    base: '#F87171',
    dark: '#EF5A6F',
  },
};

// Brand colors - Light mode (for light/white backgrounds)
export const TRADEPATH_BRAND_COLORS_LIGHT = {
  teal: {
    light: '#14B8A6',
    base: '#0D9488',
    dark: '#0F766E',
  },
  coral: {
    light: '#F87171',
    base: '#EF4444',
    dark: '#DC2626',
  },
};
