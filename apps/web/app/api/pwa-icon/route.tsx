// ===========================================
// PWA Icon Generator API Route
// Generates PNG icons for PWA manifest
// Supports: 192x192, 512x512
// ===========================================

import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sizeParam = searchParams.get('size') || '192';
  const size = parseInt(sizeParam, 10);
  
  // Validate size
  const validSizes = [192, 512];
  const finalSize = validSizes.includes(size) ? size : 192;
  
  // Scale logo based on icon size
  const logoScale = finalSize === 512 ? 0.7 : 0.72;
  const logoSize = Math.floor(finalSize * logoScale);
  const borderRadius = Math.floor(finalSize * 0.125); // 12.5% of size

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          borderRadius: `${borderRadius}px`,
        }}
      >
        <svg
          width={logoSize}
          height={logoSize}
          viewBox="0 0 200 200"
          fill="none"
        >
          <defs>
            <linearGradient id="tealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#5EEDC3" />
              <stop offset="50%" stopColor="#2DD4A8" />
              <stop offset="100%" stopColor="#14B8A6" />
            </linearGradient>
            <linearGradient id="coralGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FF8A9B" />
              <stop offset="50%" stopColor="#F87171" />
              <stop offset="100%" stopColor="#EF5A6F" />
            </linearGradient>
          </defs>
          {/* Top point (teal) */}
          <path d="M100 10 L120 80 L100 100 L80 80 Z" fill="url(#tealGrad)" />
          {/* Right point (teal) */}
          <path d="M190 100 L120 120 L100 100 L120 80 Z" fill="url(#tealGrad)" />
          {/* Bottom point (coral) */}
          <path d="M100 190 L80 120 L100 100 L120 120 Z" fill="url(#coralGrad)" />
          {/* Left point (coral) */}
          <path d="M10 100 L80 80 L100 100 L80 120 Z" fill="url(#coralGrad)" />
        </svg>
      </div>
    ),
    {
      width: finalSize,
      height: finalSize,
    }
  );
}
