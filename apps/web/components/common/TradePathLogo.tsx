'use client';

import { TrendingUp } from 'lucide-react';
import Link from 'next/link';

interface TradePathLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  showTagline?: boolean;
  href?: string;
  className?: string;
}

const sizes = {
  sm: { wrapper: 'w-7 h-7', icon: 'w-4 h-4', text: 'text-base', tagline: 'text-[8px]' },
  md: { wrapper: 'w-8 h-8', icon: 'w-5 h-5', text: 'text-lg', tagline: 'text-[9px]' },
  lg: { wrapper: 'w-10 h-10', icon: 'w-6 h-6', text: 'text-xl', tagline: 'text-[10px]' },
  xl: { wrapper: 'w-14 h-14', icon: 'w-8 h-8', text: 'text-2xl', tagline: 'text-xs' },
};

export function TradePathLogo({
  size = 'md',
  showText = true,
  showTagline = false,
  href,
  className = '',
}: TradePathLogoProps) {
  const s = sizes[size];

  const LogoContent = (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Logo Icon - Animated Gradient */}
      <div
        className={`${s.wrapper} rounded-lg flex items-center justify-center shadow-lg overflow-hidden`}
        style={{
          boxShadow: '0 4px 14px rgba(245, 158, 11, 0.25)',
          background: 'linear-gradient(135deg, #ef4444, #f87171, #4ade80, #22c55e, #ef4444)',
          backgroundSize: '200% 200%',
          animation: 'gradient-shift-rg 3s ease infinite'
        }}
      >
        <TrendingUp className={`${s.icon} text-white`} strokeWidth={2.5} />
      </div>

      {/* Logo Text */}
      {showText && (
        <div className="flex flex-col">
          <span className={`${s.text} font-bold gradient-text-rg-animate`}>TradePath</span>
          {showTagline && (
            <span className={`${s.tagline} text-muted-foreground -mt-0.5`}>
              From Charts to Clarity
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="flex-shrink-0">
        {LogoContent}
      </Link>
    );
  }

  return LogoContent;
}

export default TradePathLogo;
