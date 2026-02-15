'use client';

import { useId } from 'react';
import Link from 'next/link';

interface TraderPathLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  showTagline?: boolean;
  href?: string;
  className?: string;
  animated?: boolean;
  mode?: 'light' | 'dark' | 'auto';
}

const sizes = {
  sm: { container: 42, star: 24, text: 'text-xl', tagline: 'text-[11px]' },
  md: { container: 48, star: 28, text: 'text-2xl', tagline: 'text-xs' },
  lg: { container: 60, star: 36, text: 'text-3xl', tagline: 'text-sm' },
  xl: { container: 84, star: 52, text: 'text-4xl', tagline: 'text-base' },
};

// Pure Star SVG without container - for export (Dark mode optimized)
export function StarLogo({
  size,
  uniqueId,
  animated = true
}: {
  size: number;
  uniqueId: string;
  animated?: boolean;
}) {
  const tealGradientId = `teal-grad-${uniqueId}`;
  const tealDarkId = `teal-dark-${uniqueId}`;
  const coralGradientId = `coral-grad-${uniqueId}`;
  const coralDarkId = `coral-dark-${uniqueId}`;
  const glowId = `glow-${uniqueId}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`flex-shrink-0 ${animated ? 'star-logo-animated' : ''}`}
    >
      <defs>
        {/* Teal/Mint gradient - bright */}
        <linearGradient id={tealGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7FFFD4" />
          <stop offset="30%" stopColor="#5EEDC3" />
          <stop offset="70%" stopColor="#2DD4BF" />
          <stop offset="100%" stopColor="#14B8A6" />
        </linearGradient>

        {/* Teal dark - for 3D depth */}
        <linearGradient id={tealDarkId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2DD4BF" />
          <stop offset="50%" stopColor="#14B8A6" />
          <stop offset="100%" stopColor="#0D9488" />
        </linearGradient>

        {/* Coral/Red gradient - bright */}
        <linearGradient id={coralGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FCA5A5" />
          <stop offset="30%" stopColor="#F87171" />
          <stop offset="70%" stopColor="#EF5A6F" />
          <stop offset="100%" stopColor="#DC2626" />
        </linearGradient>

        {/* Coral dark - for 3D depth */}
        <linearGradient id={coralDarkId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#EF5A6F" />
          <stop offset="50%" stopColor="#DC2626" />
          <stop offset="100%" stopColor="#B91C1C" />
        </linearGradient>

        {/* Subtle glow filter */}
        <filter id={glowId} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="0.5" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {/* Star with 3D depth effect - 8 triangles creating overlapping points */}
      <g filter={`url(#${glowId})`}>
        {/* TOP POINT - Teal (bright left face, dark right face) */}
        <path
          d="M100 15 L100 100 L70 75 Z"
          fill={`url(#${tealGradientId})`}
        />
        <path
          d="M100 15 L130 75 L100 100 Z"
          fill={`url(#${tealDarkId})`}
        />

        {/* RIGHT POINT - Coral (bright top face, dark bottom face) */}
        <path
          d="M185 100 L100 100 L125 70 Z"
          fill={`url(#${coralGradientId})`}
        />
        <path
          d="M185 100 L125 130 L100 100 Z"
          fill={`url(#${coralDarkId})`}
        />

        {/* BOTTOM POINT - Coral (bright right face, dark left face) */}
        <path
          d="M100 185 L100 100 L130 125 Z"
          fill={`url(#${coralGradientId})`}
        />
        <path
          d="M100 185 L70 125 L100 100 Z"
          fill={`url(#${coralDarkId})`}
        />

        {/* LEFT POINT - Teal (bright bottom face, dark top face) */}
        <path
          d="M15 100 L100 100 L75 130 Z"
          fill={`url(#${tealGradientId})`}
        />
        <path
          d="M15 100 L75 70 L100 100 Z"
          fill={`url(#${tealDarkId})`}
        />
      </g>
    </svg>
  );
}

// Light Mode Star Logo - deeper colors for white backgrounds
export function StarLogoLight({
  size,
  uniqueId,
  animated = true
}: {
  size: number;
  uniqueId: string;
  animated?: boolean;
}) {
  const tealGradientId = `teal-light-grad-${uniqueId}`;
  const tealDarkId = `teal-light-dark-${uniqueId}`;
  const coralGradientId = `coral-light-grad-${uniqueId}`;
  const coralDarkId = `coral-light-dark-${uniqueId}`;
  const shadowId = `shadow-light-${uniqueId}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`flex-shrink-0 ${animated ? 'star-logo-animated' : ''}`}
    >
      <defs>
        {/* Light mode teal gradient - deeper/more saturated */}
        <linearGradient id={tealGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#14B8A6" />
          <stop offset="30%" stopColor="#0D9488" />
          <stop offset="70%" stopColor="#0F766E" />
          <stop offset="100%" stopColor="#115E59" />
        </linearGradient>

        {/* Light mode teal dark - for 3D depth */}
        <linearGradient id={tealDarkId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0F766E" />
          <stop offset="50%" stopColor="#115E59" />
          <stop offset="100%" stopColor="#134E4A" />
        </linearGradient>

        {/* Light mode coral gradient - deeper/more saturated */}
        <linearGradient id={coralGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F87171" />
          <stop offset="30%" stopColor="#EF4444" />
          <stop offset="70%" stopColor="#DC2626" />
          <stop offset="100%" stopColor="#B91C1C" />
        </linearGradient>

        {/* Light mode coral dark - for 3D depth */}
        <linearGradient id={coralDarkId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#DC2626" />
          <stop offset="50%" stopColor="#B91C1C" />
          <stop offset="100%" stopColor="#991B1B" />
        </linearGradient>

        {/* Shadow filter for light backgrounds */}
        <filter id={shadowId} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#0D9488" floodOpacity="0.25"/>
        </filter>
      </defs>

      {/* Star with 3D depth effect - 8 triangles creating overlapping points */}
      <g filter={`url(#${shadowId})`}>
        {/* TOP POINT - Teal (bright left face, dark right face) */}
        <path
          d="M100 15 L100 100 L70 75 Z"
          fill={`url(#${tealGradientId})`}
        />
        <path
          d="M100 15 L130 75 L100 100 Z"
          fill={`url(#${tealDarkId})`}
        />

        {/* RIGHT POINT - Coral (bright top face, dark bottom face) */}
        <path
          d="M185 100 L100 100 L125 70 Z"
          fill={`url(#${coralGradientId})`}
        />
        <path
          d="M185 100 L125 130 L100 100 Z"
          fill={`url(#${coralDarkId})`}
        />

        {/* BOTTOM POINT - Coral (bright right face, dark left face) */}
        <path
          d="M100 185 L100 100 L130 125 Z"
          fill={`url(#${coralGradientId})`}
        />
        <path
          d="M100 185 L70 125 L100 100 Z"
          fill={`url(#${coralDarkId})`}
        />

        {/* LEFT POINT - Teal (bright bottom face, dark top face) */}
        <path
          d="M15 100 L100 100 L75 130 Z"
          fill={`url(#${tealGradientId})`}
        />
        <path
          d="M15 100 L75 70 L100 100 Z"
          fill={`url(#${tealDarkId})`}
        />
      </g>
    </svg>
  );
}

// Star with morphing amorphous container - Dark mode version
function StarWithMorphContainer({
  containerSize,
  starSize,
  uniqueId,
  animated = true
}: {
  containerSize: number;
  starSize: number;
  uniqueId: string;
  animated?: boolean;
}) {
  return (
    <div
      className="relative flex-shrink-0"
      style={{ width: containerSize, height: containerSize }}
    >
      {/* Outer morphing glow ring */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, #2DD4BF, #14B8A6, #F87171, #EF5A6F)',
          borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%',
          boxShadow: '0 0 8px rgba(45, 212, 191, 0.3), 0 0 16px rgba(248, 113, 113, 0.15)',
          animation: animated ? 'morph 8s ease-in-out infinite' : 'none',
        }}
      />

      {/* Inner dark background */}
      <div
        className="absolute flex items-center justify-center bg-[#0a0f1a]"
        style={{
          inset: '3px',
          borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%',
          animation: animated ? 'morph 8s ease-in-out infinite' : 'none',
        }}
      >
        {/* Star inside */}
        <StarLogo size={starSize} uniqueId={uniqueId} animated={false} />
      </div>
    </div>
  );
}

// Star with morphing amorphous container - Light mode version
function StarWithMorphContainerLight({
  containerSize,
  starSize,
  uniqueId,
  animated = true
}: {
  containerSize: number;
  starSize: number;
  uniqueId: string;
  animated?: boolean;
}) {
  return (
    <div
      className="relative flex-shrink-0"
      style={{ width: containerSize, height: containerSize }}
    >
      {/* Outer morphing ring - deeper colors for light backgrounds */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, #0D9488, #0F766E, #DC2626, #B91C1C)',
          borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%',
          boxShadow: '0 4px 20px rgba(13, 148, 136, 0.3), 0 2px 10px rgba(220, 38, 38, 0.2)',
          animation: animated ? 'morph 8s ease-in-out infinite' : 'none',
        }}
      />

      {/* Inner white/light background */}
      <div
        className="absolute flex items-center justify-center bg-white"
        style={{
          inset: '3px',
          borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%',
          animation: animated ? 'morph 8s ease-in-out infinite' : 'none',
        }}
      >
        {/* Star inside - light mode version */}
        <StarLogoLight size={starSize} uniqueId={uniqueId} animated={false} />
      </div>
    </div>
  );
}

export function TraderPathLogo({
  size = 'md',
  showText = true,
  showTagline = false,
  href,
  className = '',
  animated = true,
  mode = 'auto',
}: TraderPathLogoProps) {
  const uniqueId = useId();
  const s = sizes[size];

  // For 'auto' mode, we render both and use CSS to show/hide
  // For explicit modes, we render only the specified version
  const renderLightLogo = mode === 'light' || mode === 'auto';
  const renderDarkLogo = mode === 'dark' || mode === 'auto';

  const LogoContent = (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Logo Icon - Star with morphing container */}
      {mode === 'auto' ? (
        <>
          {/* Dark mode version - hidden in light mode */}
          <div className="hidden dark:block">
            <StarWithMorphContainer
              containerSize={s.container}
              starSize={s.star}
              uniqueId={`dark-${uniqueId}`}
              animated={animated}
            />
          </div>
          {/* Light mode version - hidden in dark mode */}
          <div className="block dark:hidden">
            <StarWithMorphContainerLight
              containerSize={s.container}
              starSize={s.star}
              uniqueId={`light-${uniqueId}`}
              animated={animated}
            />
          </div>
        </>
      ) : mode === 'light' ? (
        <StarWithMorphContainerLight
          containerSize={s.container}
          starSize={s.star}
          uniqueId={uniqueId}
          animated={animated}
        />
      ) : (
        <StarWithMorphContainer
          containerSize={s.container}
          starSize={s.star}
          uniqueId={uniqueId}
          animated={animated}
        />
      )}

      {/* Logo Text */}
      {showText && (
        <div className="flex flex-col">
          {mode === 'auto' ? (
            <>
              {/* Dark mode text */}
              <span className={`${s.text} font-bold gradient-text-brand hidden dark:inline`}>
                TraderPath
              </span>
              {/* Light mode text - deeper colors */}
              <span className={`${s.text} font-bold inline dark:hidden`}>
                <span className="text-teal-700">Trader</span>
                <span className="text-red-600">Path</span>
              </span>
            </>
          ) : mode === 'light' ? (
            <span className={`${s.text} font-bold`}>
              <span className="text-teal-700">Trader</span>
              <span className="text-red-600">Path</span>
            </span>
          ) : (
            <span className={`${s.text} font-bold gradient-text-brand`}>
              TraderPath
            </span>
          )}
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
