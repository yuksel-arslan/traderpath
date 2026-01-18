import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
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
          borderRadius: '6px',
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 200 200"
          fill="none"
        >
          {/* Top point (teal) */}
          <path d="M100 10 L120 80 L100 100 L80 80 Z" fill="#2DD4A8" />
          {/* Right point (teal) */}
          <path d="M190 100 L120 120 L100 100 L120 80 Z" fill="#14B8A6" />
          {/* Bottom point (coral) */}
          <path d="M100 190 L80 120 L100 100 L120 120 Z" fill="#F87171" />
          {/* Left point (coral) */}
          <path d="M10 100 L80 80 L100 100 L80 120 Z" fill="#EF5A6F" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
