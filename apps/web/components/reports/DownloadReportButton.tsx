'use client';

// ===========================================
// Download Report Button
// Generates, saves, and downloads PDF analysis report
// ===========================================

import { useState } from 'react';
import { FileDown, Loader2, Check } from 'lucide-react';
import { cn } from '../../lib/utils';

// Define the report data type inline to avoid import issues
interface AnalysisReportData {
  symbol: string;
  generatedAt: string;
  analysisId: string;
  marketPulse: {
    btcDominance: number;
    fearGreedIndex: number;
    fearGreedLabel: string;
    marketRegime: string;
    trend: { direction: string; strength: number };
    aiSummary?: string;
  };
  assetScan: {
    currentPrice: number;
    priceChange24h: number;
    timeframes: Array<{ tf: string; trend: string; strength: number }>;
    levels: { support: number[]; resistance: number[] };
    indicators: {
      rsi: number;
      macd: { histogram: number };
    };
    aiInsight?: string;
  };
  safetyCheck: {
    riskLevel: string;
    manipulation: { pumpDumpRisk: string };
    whaleActivity: { bias: string };
    smartMoney: { positioning: string };
    warnings: string[];
    aiInsight?: string;
  };
  timing: {
    tradeNow: boolean;
    reason: string;
    entryZones: Array<{ priceLow: number; priceHigh: number; probability: number; eta: string }>;
    conditions: Array<{ name: string; met: boolean }>;
    aiInsight?: string;
  };
  tradePlan: {
    direction: string;
    entries: Array<{ price: number; percentage: number; type: string }>;
    averageEntry: number;
    stopLoss: { price: number; percentage: number; reason: string };
    takeProfits: Array<{ price: number; percentage: number; reason: string }>;
    riskReward: number;
    winRateEstimate: number;
    positionSizePercent: number;
    aiInsight?: string;
  };
  trapCheck: {
    traps: {
      bullTrap: boolean;
      bearTrap: boolean;
      fakeoutRisk: string;
    };
    liquidityGrab: { zones: number[] };
    counterStrategy: string[];
    aiInsight?: string;
  };
  verdict: {
    action: string;
    overallScore: number;
    confidenceFactors: Array<{ factor: string; positive: boolean }>;
    aiSummary?: string;
  };
}

interface DownloadReportButtonProps {
  analysisData: Record<number, unknown>;
  symbol: string;
  interval?: string;
  className?: string;
}

// Save report to database
async function saveReportToDatabase(reportData: AnalysisReportData, interval: string = '4h'): Promise<boolean> {
  try {
    const token = localStorage.getItem('accessToken');
    if (!token) return false;

    const response = await fetch('/api/reports', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        symbol: reportData.symbol,
        analysisId: reportData.analysisId,
        reportData: reportData,
        verdict: reportData.verdict.action,
        score: reportData.verdict.overallScore,
        direction: reportData.tradePlan.direction,
        interval: interval,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to save report:', error);
    return false;
  }
}

export function DownloadReportButton({
  analysisData,
  symbol,
  interval = '4h',
  className,
}: DownloadReportButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleDownload = async () => {
    if (isGenerating) return;

    setIsGenerating(true);
    setIsSaved(false);

    try {
      // Dynamic import to ensure client-side only loading
      const { generateAnalysisReport } = await import('./AnalysisReport');

      // Transform analysis data to report format
      const reportData: AnalysisReportData = {
        symbol,
        generatedAt: new Date().toLocaleString('tr-TR'),
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

      // Generate and download PDF
      await generateAnalysisReport(reportData);

      // Save to database with interval for expiration calculation
      const saved = await saveReportToDatabase(reportData, interval);
      setIsSaved(saved);

      // Reset saved indicator after a few seconds
      if (saved) {
        setTimeout(() => setIsSaved(false), 3000);
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to generate PDF report: ${errorMessage}`);
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
      ) : isSaved ? (
        <>
          <Check className="w-4 h-4" />
          Saved & Downloaded
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
