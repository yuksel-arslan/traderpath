'use client';

import { useId } from 'react';
import Link from 'next/link';

interface TraderPathLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  showTagline?: boolean;
  href?: string;
  className?: string;
}

const sizes = {
  sm: { icon: 42, text: 'text-xl', tagline: 'text-[11px]' },
  md: { icon: 48, text: 'text-2xl', tagline: 'text-xs' },
  lg: { icon: 60, text: 'text-3xl', tagline: 'text-sm' },
  xl: { icon: 84, text: 'text-4xl', tagline: 'text-base' },
};

// 4-Pointed Star Logo Icon
function StarLogo({ size, uniqueId }: { size: number; uniqueId: string }) {
  const tealId = `teal-${uniqueId}`;
  const coralId = `coral-${uniqueId}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="flex-shrink-0 star-logo-animated"
    >
      <defs>
        <linearGradient id={tealId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#5EEDC3" />
          <stop offset="50%" stopColor="#2DD4A8" />
          <stop offset="100%" stopColor="#14B8A6" />
        </linearGradient>
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
}

export function TraderPathLogo({
  size = 'md',
  showText = true,
  showTagline = false,
  href,
  className = '',
}: TraderPathLogoProps) {
  const uniqueId = useId();
  const s = sizes[size];

  const LogoContent = (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Logo Icon - 4-Pointed Star */}
      <StarLogo size={s.icon} uniqueId={uniqueId} />

      {/* Logo Text */}
      {showText && (
        <div className="flex flex-col">
          <span className={`${s.text} font-bold gradient-text-brand`}>
            TraderPath
          </span>
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

export default TraderPathLogo;
