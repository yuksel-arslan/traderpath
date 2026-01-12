'use client';

// ===========================================
// TraderPath Brand Logo Component
// Logo + Brand Text + Motto
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

  // Stylized T Logo as SVG
  const LogoIcon = () => (
    <svg
      width={s.icon}
      height={s.icon}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Gold gradient for the logo */}
        <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#D4A574" />
          <stop offset="30%" stopColor="#C9956C" />
          <stop offset="60%" stopColor="#B8834F" />
          <stop offset="100%" stopColor="#8B6914" />
        </linearGradient>
        {/* Highlight gradient */}
        <linearGradient id="highlightGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#E8C599" />
          <stop offset="50%" stopColor="#D4A574" />
          <stop offset="100%" stopColor="#A67C3D" />
        </linearGradient>
      </defs>

      {/* Main T shape with flowing design */}
      <path
        d="M15 20
           C15 15, 20 12, 28 12
           L72 12
           C80 12, 85 15, 85 20
           C85 28, 78 32, 70 32
           L58 32
           L58 35
           C58 45, 62 55, 70 65
           C78 75, 82 82, 75 88
           C68 94, 55 90, 48 82
           C42 75, 42 65, 42 55
           L42 32
           L30 32
           C22 32, 15 28, 15 20
           Z"
        fill="url(#goldGradient)"
      />

      {/* Inner highlight on the T top */}
      <path
        d="M20 20
           C20 17, 24 15, 30 15
           L70 15
           C76 15, 80 17, 80 20
           C80 25, 75 28, 68 28
           L32 28
           C25 28, 20 25, 20 20
           Z"
        fill="url(#highlightGradient)"
        opacity="0.3"
      />

      {/* Flowing tail accent */}
      <ellipse
        cx="72"
        cy="78"
        rx="8"
        ry="6"
        fill="url(#goldGradient)"
        opacity="0.8"
      />
    </svg>
  );

  // Brand text "TraderPath"
  const BrandText = () => (
    <div className="flex flex-col">
      <span
        className={cn(
          s.text,
          'font-serif font-medium tracking-wide'
        )}
        style={{
          background: 'linear-gradient(135deg, #E8C599 0%, #D4A574 30%, #C9956C 60%, #A67C3D 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        TraderPath
      </span>
      {showMotto && (
        <span
          className={cn(
            s.motto,
            'tracking-[0.3em] uppercase font-light'
          )}
          style={{ color: '#E8D5C4' }}
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
    <span className={cn('font-serif font-medium', className)}>
      <span style={{ color: '#D4A574' }}>Trade</span>
      <span style={{ color: '#E8C599' }}>Path</span>
    </span>
  );
}

// Export for PDF reports (static HTML/CSS version)
export const TRADEPATH_LOGO_SVG = `
<svg width="48" height="48" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#D4A574" />
      <stop offset="30%" stop-color="#C9956C" />
      <stop offset="60%" stop-color="#B8834F" />
      <stop offset="100%" stop-color="#8B6914" />
    </linearGradient>
  </defs>
  <path
    d="M15 20 C15 15, 20 12, 28 12 L72 12 C80 12, 85 15, 85 20 C85 28, 78 32, 70 32 L58 32 L58 35 C58 45, 62 55, 70 65 C78 75, 82 82, 75 88 C68 94, 55 90, 48 82 C42 75, 42 65, 42 55 L42 32 L30 32 C22 32, 15 28, 15 20 Z"
    fill="url(#goldGradient)"
  />
</svg>
`;

export const TRADEPATH_BRAND_COLORS = {
  gold: {
    light: '#E8C599',
    base: '#D4A574',
    medium: '#C9956C',
    dark: '#A67C3D',
    darker: '#8B6914',
  },
  cream: '#E8D5C4',
  motto: '#E8D5C4',
};
