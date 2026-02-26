'use client';

interface FlowArrowProps {
  color?: string;
  className?: string;
}

export function FlowArrow({ color = '#00F5A0', className }: FlowArrowProps) {
  return (
    <div className={`flex items-center justify-center w-8 shrink-0 ${className || ''}`}>
      <svg width="24" height="16" viewBox="0 0 24 16" fill="none">
        <path
          d="M0 8H20M20 8L14 2M20 8L14 14"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.6"
        >
          <animate
            attributeName="opacity"
            values="0.3;0.8;0.3"
            dur="2s"
            repeatCount="indefinite"
          />
        </path>
      </svg>
    </div>
  );
}
