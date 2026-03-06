'use client';

interface PulseDotProps {
  color?: string;
  size?: number;
  className?: string;
}

export function PulseDot({ color = '#00F5A0', size = 8, className }: PulseDotProps) {
  return (
    <span
      className={`relative inline-flex shrink-0 ${className || ''}`}
      style={{ width: size, height: size }}
    >
      <span
        className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
        style={{ backgroundColor: color }}
      />
      <span
        className="relative inline-flex rounded-full h-full w-full"
        style={{ backgroundColor: color }}
      />
    </span>
  );
}
