'use client';

import { useParams } from 'next/navigation';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { AnalysisFlow } from '../../../../components/analysis/AnalysisFlow';

export default function AnalyzePage() {
  const params = useParams();
  const symbol = params.symbol as string;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="p-2 hover:bg-accent rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{symbol}/USDT Analysis</h1>
            <p className="text-muted-foreground">7-Step Trading Analysis</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Current Price</p>
            <p className="text-xl font-bold">$0.00</p>
          </div>
          <button className="p-2 hover:bg-accent rounded-lg transition">
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Analysis Flow */}
      <AnalysisFlow symbol={symbol} />
    </div>
  );
}
