'use client';

// ===========================================
// TraderPath Brand Logo Component
// 4-Pointed Star Logo + Brand Text + Motto
// ===========================================

import { cn } from '../../lib/utils';

interface TradepathLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showMotto?: boolean;
  variant?: 'full' | 'icon' | 'text';
}

export function TradepathLogo({
  className,
  size = 'md',
  showMotto = true,
  variant = 'full',
}: TradepathLogoProps) {
  const sizes = {
    sm: { icon: 32, text: 'text-xl', motto: 'text-[8px]', gap: 'gap-2' },
    md: { icon: 48, text: 'text-2xl', motto: 'text-[10px]', gap: 'gap-3' },
    lg: { icon: 64, text: 'text-3xl', motto: 'text-xs', gap: 'gap-4' },
    xl: { icon: 80, text: 'text-4xl', motto: 'text-sm', gap: 'gap-5' },
  };

  const s = sizes[size];

  // 4-Pointed Star Logo as SVG
  const LogoIcon = () => (
    <svg
      width={s.icon}
      height={s.icon}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Teal gradient for top and right points */}
        <linearGradient id="tealGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#5EEDC3" />
          <stop offset="50%" stopColor="#2DD4A8" />
          <stop offset="100%" stopColor="#14B8A6" />
        </linearGradient>

        {/* Coral gradient for left and bottom points */}
        <linearGradient id="coralGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF8A9B" />
          <stop offset="50%" stopColor="#F87171" />
          <stop offset="100%" stopColor="#EF5A6F" />
        </linearGradient>
      </defs>

      {/* Top point (teal) */}
      <path d="M100 10 L120 80 L100 100 L80 80 Z" fill="url(#tealGradient)" />

      {/* Right point (teal) */}
      <path d="M190 100 L120 120 L100 100 L120 80 Z" fill="url(#tealGradient)" />

      {/* Bottom point (coral) */}
      <path d="M100 190 L80 120 L100 100 L120 120 Z" fill="url(#coralGradient)" />

      {/* Left point (coral) */}
      <path d="M10 100 L80 80 L100 100 L80 120 Z" fill="url(#coralGradient)" />
    </svg>
  );

  // Brand text "TraderPath"
  const BrandText = () => (
    <div className="flex flex-col">
      <span
        className={cn(
          s.text,
          'font-semibold tracking-wide'
        )}
      >
        <span className="text-teal-400">Trader</span>
        <span className="text-coral-400" style={{ color: '#F87171' }}>Path</span>
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
export function TradepathLogoInline({ className }: { className?: string }) {
  return (
    <span className={cn('font-semibold', className)}>
      <span className="text-teal-400">Trader</span>
      <span style={{ color: '#F87171' }}>Path</span>
    </span>
  );
}

// Export for PDF reports (static HTML/CSS version)
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
