'use client';

import Link from 'next/link';

interface TradePathLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  showTagline?: boolean;
  href?: string;
  className?: string;
}

const sizes = {
  sm: { wrapper: 'w-7 h-7', letter: 'text-xl', text: 'text-base', tagline: 'text-[8px]' },
  md: { wrapper: 'w-8 h-8', letter: 'text-2xl', text: 'text-lg', tagline: 'text-[9px]' },
  lg: { wrapper: 'w-10 h-10', letter: 'text-3xl', text: 'text-xl', tagline: 'text-[10px]' },
  xl: { wrapper: 'w-14 h-14', letter: 'text-4xl', text: 'text-2xl', tagline: 'text-xs' },
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
      {/* Logo Icon - Overlapping T and P */}
      <div
        className={`${s.wrapper} rounded-lg flex items-center justify-center shadow-lg overflow-hidden relative`}
        style={{
          boxShadow: '0 4px 14px rgba(245, 158, 11, 0.25)',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.95))',
        }}
      >
        {/* T letter - Red to Green */}
        <span className={`${s.letter} font-black absolute gradient-text-rg-animate`}>
          T
        </span>
        {/* P letter - Green to Red, aligned with T's vertical stem */}
        <span
          className={`${s.letter} font-black absolute gradient-text-gr-animate`}
          style={{ transform: 'translateX(-18%)' }}
        >
          P
        </span>
      </div>

      {/* Logo Text */}
      {showText && (
        <div className="flex flex-col">
          <span className={`${s.text} font-bold`}>
            <span className="gradient-text-rg-animate">Trade</span>
            <span className="gradient-text-gr-animate">Path</span>
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

export default TradePathLogo;
