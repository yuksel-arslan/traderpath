'use client';
// Stub component - MarketPulse
import { Globe } from 'lucide-react';
export function MarketPulse({ data }: { data?: unknown }) {
  return (
    <div className="p-4">
      <h3 className="flex items-center gap-2 text-lg font-semibold mb-4">
        <Globe className="w-5 h-5 text-blue-500" />
        Market Pulse
      </h3>
      <p className="text-muted-foreground">Market analysis data will appear here.</p>
    </div>
  );
}
