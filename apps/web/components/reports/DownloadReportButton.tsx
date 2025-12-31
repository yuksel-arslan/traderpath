'use client';

// ===========================================
// Download Report Button
// Generates and downloads PDF analysis report
// ===========================================

import { useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { generateAnalysisReport, type AnalysisReportData } from './AnalysisReport';
import { cn } from '../../lib/utils';

interface DownloadReportButtonProps {
  analysisData: Record<number, unknown>;
  symbol: string;
  className?: string;
}

export function DownloadReportButton({
  analysisData,
  symbol,
  className,
}: DownloadReportButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    if (isGenerating) return;

    setIsGenerating(true);

    try {
      // Transform analysis data to report format
      const reportData: AnalysisReportData = {
        symbol,
        generatedAt: new Date().toLocaleString(),
        analysisId: `analysis_${Date.now()}_${symbol}`,
        marketPulse: (analysisData[1] as AnalysisReportData['marketPulse']) || {
          btcDominance: 0,
          fearGreedIndex: 0,
          fearGreedLabel: 'N/A',
          marketRegime: 'N/A',
          trend: { direction: 'neutral', strength: 0 },
        },
        assetScan: (analysisData[2] as AnalysisReportData['assetScan']) || {
          currentPrice: 0,
          priceChange24h: 0,
          timeframes: [],
          levels: { support: [], resistance: [] },
          indicators: { rsi: 0, macd: { histogram: 0 } },
        },
        safetyCheck: (analysisData[3] as AnalysisReportData['safetyCheck']) || {
          riskLevel: 'N/A',
          manipulation: { pumpDumpRisk: 'N/A' },
          whaleActivity: { bias: 'N/A' },
          smartMoney: { positioning: 'N/A' },
          warnings: [],
        },
        timing: (analysisData[4] as AnalysisReportData['timing']) || {
          tradeNow: false,
          reason: '',
          entryZones: [],
          conditions: [],
        },
        tradePlan: (analysisData[5] as AnalysisReportData['tradePlan']) || {
          direction: 'N/A',
          entries: [],
          averageEntry: 0,
          stopLoss: { price: 0, percentage: 0, reason: '' },
          takeProfits: [],
          riskReward: 0,
          winRateEstimate: 0,
          positionSizePercent: 0,
        },
        trapCheck: (analysisData[6] as AnalysisReportData['trapCheck']) || {
          traps: { bullTrap: false, bearTrap: false, fakeoutRisk: 'low' },
          liquidityGrab: { zones: [] },
          counterStrategy: [],
        },
        verdict: (analysisData[7] as AnalysisReportData['verdict']) || {
          action: 'N/A',
          overallScore: 0,
          confidenceFactors: [],
        },
      };

      await generateAnalysisReport(reportData);
    } catch (error) {
      console.error('Failed to generate report:', error);
      alert('Failed to generate PDF report. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Only show button if we have analysis data
  const hasData = Object.keys(analysisData).length >= 7;

  if (!hasData) {
    return null;
  }

  return (
    <button
      onClick={handleDownload}
      disabled={isGenerating}
      className={cn(
        'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all',
        'bg-gradient-to-r from-blue-500 to-purple-600 text-white',
        'hover:shadow-lg hover:scale-105',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
        className
      )}
    >
      {isGenerating ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Generating PDF...
        </>
      ) : (
        <>
          <FileDown className="w-4 h-4" />
          Download Report
        </>
      )}
    </button>
  );
}
