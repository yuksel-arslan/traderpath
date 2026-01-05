'use client';

// ===========================================
// Download Report Button
// Generates, saves, and downloads PDF analysis report
// With optional language translation (costs credits)
// ===========================================

import { useState } from 'react';
import { FileDown, Loader2, Check, Globe, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

// Available languages for PDF reports
const REPORT_LANGUAGES = {
  en: 'English',
  tr: 'Türkçe',
  es: 'Español',
  de: 'Deutsch',
  fr: 'Français',
  pt: 'Português',
  ru: 'Русский',
  zh: '中文',
  ja: '日本語',
  ko: '한국어',
} as const;

const TRANSLATION_CREDIT_COST = 3;

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
  defaultLanguage?: string;
}

// Save report to database
async function saveReportToDatabase(reportData: AnalysisReportData, interval: string = '1h'): Promise<boolean> {
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

// Translate AI commentary using API
async function translateReportContent(
  texts: Record<string, string>,
  targetLanguage: string
): Promise<Record<string, string> | null> {
  try {
    const token = localStorage.getItem('accessToken');
    if (!token) return null;

    const response = await fetch('/api/translation/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ texts, targetLanguage }),
    });

    if (!response.ok) {
      const error = await response.json();
      if (error.error?.code === 'INSUFFICIENT_CREDITS') {
        throw new Error('Insufficient credits for translation');
      }
      return null;
    }

    const data = await response.json();
    return data.data.translations;
  } catch (error) {
    console.error('Translation failed:', error);
    throw error;
  }
}

export function DownloadReportButton({
  analysisData,
  symbol,
  interval = '4h',
  className,
  defaultLanguage = 'en',
}: DownloadReportButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(defaultLanguage);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);

  // Check if translation is needed (not English)
  const needsTranslation = selectedLanguage !== 'en';

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

      // Translate AI commentary if not English
      if (needsTranslation) {
        try {
          // Collect all AI texts to translate
          const textsToTranslate: Record<string, string> = {};
          if (reportData.marketPulse.aiSummary) textsToTranslate.marketPulseAi = reportData.marketPulse.aiSummary;
          if (reportData.assetScan.aiInsight) textsToTranslate.assetScanAi = reportData.assetScan.aiInsight;
          if (reportData.safetyCheck.aiInsight) textsToTranslate.safetyCheckAi = reportData.safetyCheck.aiInsight;
          if (reportData.timing.aiInsight) textsToTranslate.timingAi = reportData.timing.aiInsight;
          if (reportData.tradePlan.aiInsight) textsToTranslate.tradePlanAi = reportData.tradePlan.aiInsight;
          if (reportData.trapCheck.aiInsight) textsToTranslate.trapCheckAi = reportData.trapCheck.aiInsight;
          if (reportData.verdict.aiSummary) textsToTranslate.verdictAi = reportData.verdict.aiSummary;

          if (Object.keys(textsToTranslate).length > 0) {
            const translations = await translateReportContent(textsToTranslate, selectedLanguage);
            if (translations) {
              // Apply translations back to reportData
              if (translations.marketPulseAi) reportData.marketPulse.aiSummary = translations.marketPulseAi;
              if (translations.assetScanAi) reportData.assetScan.aiInsight = translations.assetScanAi;
              if (translations.safetyCheckAi) reportData.safetyCheck.aiInsight = translations.safetyCheckAi;
              if (translations.timingAi) reportData.timing.aiInsight = translations.timingAi;
              if (translations.tradePlanAi) reportData.tradePlan.aiInsight = translations.tradePlanAi;
              if (translations.trapCheckAi) reportData.trapCheck.aiInsight = translations.trapCheckAi;
              if (translations.verdictAi) reportData.verdict.aiSummary = translations.verdictAi;
            }
          }
        } catch (translationError) {
          const errorMsg = translationError instanceof Error ? translationError.message : 'Translation failed';
          if (errorMsg.includes('Insufficient credits')) {
            alert('Insufficient credits for translation. Report will be generated in English.');
          }
          // Continue with English version
        }
      }

      // Wait for chart to be fully rendered before capture
      await new Promise(resolve => setTimeout(resolve, 500));

      // Generate and download PDF (true = capture chart)
      await generateAnalysisReport(reportData, true);

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
    <div className={cn('flex items-center gap-2', className)}>
      {/* Language Selector */}
      <div className="relative">
        <button
          onClick={() => setShowLanguageMenu(!showLanguageMenu)}
          disabled={isGenerating}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all',
            'bg-card border border-border text-foreground',
            'hover:bg-muted',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          <Globe className="w-4 h-4" />
          <span>{REPORT_LANGUAGES[selectedLanguage as keyof typeof REPORT_LANGUAGES] || 'English'}</span>
          <ChevronDown className="w-3 h-3" />
          {needsTranslation && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-amber-500/20 text-amber-500 rounded">
              +{TRANSLATION_CREDIT_COST}
            </span>
          )}
        </button>

        {showLanguageMenu && (
          <div className="absolute top-full left-0 mt-1 w-48 bg-card border border-border rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
            {Object.entries(REPORT_LANGUAGES).map(([code, name]) => (
              <button
                key={code}
                onClick={() => {
                  setSelectedLanguage(code);
                  setShowLanguageMenu(false);
                }}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-muted transition',
                  selectedLanguage === code && 'bg-primary/10 text-primary'
                )}
              >
                <span>{name}</span>
                {code !== 'en' && (
                  <span className="text-xs text-muted-foreground">+{TRANSLATION_CREDIT_COST}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Download Button */}
      <button
        onClick={handleDownload}
        disabled={isGenerating}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all',
          'bg-gradient-to-r from-red-500 via-amber-500 to-green-500 text-white shadow-lg shadow-green-500/25',
          'hover:shadow-lg hover:scale-105',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100'
        )}
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {needsTranslation ? 'Translating...' : 'Generating...'}
          </>
        ) : isSaved ? (
          <>
            <Check className="w-4 h-4" />
            Downloaded
          </>
        ) : (
          <>
            <FileDown className="w-4 h-4" />
            Download PDF
          </>
        )}
      </button>
    </div>
  );
}
