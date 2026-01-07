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
  sm: { wrapper: 'h-7 px-1', letter: 'text-base', text: 'text-base', tagline: 'text-[8px]' },
  md: { wrapper: 'h-8 px-1.5', letter: 'text-lg', text: 'text-lg', tagline: 'text-[9px]' },
  lg: { wrapper: 'h-10 px-2', letter: 'text-xl', text: 'text-xl', tagline: 'text-[10px]' },
  xl: { wrapper: 'h-14 px-2.5', letter: 'text-2xl', text: 'text-2xl', tagline: 'text-xs' },
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
      {/* Logo Icon - T and P side by side */}
      {/* Transparent background with border for visibility */}
      <div
        className={`${s.wrapper} rounded-lg flex items-center justify-center border-2 border-slate-300 dark:border-slate-600 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm`}
      >
        <span className={`${s.letter} font-black gradient-text-rg-animate`}>TP</span>
      </div>

      {/* Logo Text */}
      {showText && (
        <div className="flex flex-col">
          <span className={`${s.text} font-bold text-slate-800 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-amber-400 dark:via-orange-500 dark:to-red-500`}>
            TradePath
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
