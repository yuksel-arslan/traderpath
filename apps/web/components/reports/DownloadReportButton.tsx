'use client';

// ===========================================
// Download Report Button
// Generates, saves, and downloads PDF analysis report
// With optional language translation and email sending
// ===========================================

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FileDown, Loader2, Check, Globe, ChevronDown, Mail, X, Send, FileText, BarChart3 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { getAuthToken } from '../../lib/api';

// Report type selector
type ReportType = 'standard' | 'detailed';

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
  ar: 'العربية',
  hi: 'हिन्दी',
  it: 'Italiano',
  nl: 'Nederlands',
} as const;

const TRANSLATION_CREDIT_COST = 10;

// Detailed Report Data Types (matching DetailedAnalysisReport.tsx)
interface DetailedIndicatorChartData {
  name: string;
  category: 'trend' | 'momentum' | 'volatility' | 'volume' | 'advanced';
  values: number[];
  timestamps: number[];
  currentValue: number;
  signal: 'bullish' | 'bearish' | 'neutral';
  signalStrength: number;
  interpretation: string;
  chartColor: string;
  secondaryValues?: number[];
  secondaryLabel?: string;
  referenceLines?: { value: number; label: string; color: string }[];
  metadata?: Record<string, unknown>;
}

interface DetailedStepData {
  stepNumber: number;
  stepName: string;
  stepDescription: string;
  input: {
    timeframes: {
      timeframe: string;
      candleCount: number;
      priority: 'primary' | 'secondary' | 'confirmation';
      dataRange: { startTime: number; endTime: number };
    }[];
    indicators: {
      name: string;
      category: string;
      params: Record<string, number>;
      weight: number;
    }[];
    tradeType: 'scalping' | 'dayTrade' | 'swing';
    aiPromptFocus: string;
  };
  output: {
    indicators: Record<string, {
      value: number | null;
      signal: 'bullish' | 'bearish' | 'neutral';
      strength: number;
      metadata?: Record<string, unknown>;
    }>;
    signals: {
      bullish: string[];
      bearish: string[];
      neutral: string[];
    };
    stepScore: number;
    stepConfidence: number;
    keyFindings: string[];
  };
  commentary: {
    summary: string;
    signalInterpretation: string;
    riskFactors: string[];
    opportunities: string[];
    recommendation: string;
  };
  indicatorCharts: DetailedIndicatorChartData[];
}

interface DetailedReportData {
  symbol: string;
  tradeType: 'scalping' | 'dayTrade' | 'swing';
  generatedAt: string;
  analysisId: string;
  marketContext: {
    btcPrice: number;
    btcDominance: number;
    fearGreedIndex: number;
    marketTrend: 'bullish' | 'bearish' | 'neutral';
  };
  assetInfo: {
    currentPrice: number;
    priceChange24h: number;
    volume24h: number;
  };
  steps: DetailedStepData[];
  tradePlanSummary: {
    direction: 'long' | 'short';
    entries: { price: number; percentage: number }[];
    averageEntry: number;
    stopLoss: { price: number; percentage: number; reason: string };
    takeProfits: { price: number; percentage: number; reason: string }[];
    riskReward: number;
    winRateEstimate: number;
  };
  verdict: {
    action: 'go' | 'conditional_go' | 'wait' | 'avoid';
    overallScore: number;
    overallConfidence: number;
    direction: 'long' | 'short' | null;
    reasons: string[];
  };
  chartImage?: string;
}

// Define the report data type inline to avoid import issues
interface AnalysisReportData {
  symbol: string;
  generatedAt: string;
  analysisId: string;
  tradeType?: 'scalping' | 'dayTrade' | 'swing';
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
  aiExpertComment?: string; // AI Expert review comment
}

interface DownloadReportButtonProps {
  analysisData: Record<number, unknown>;
  symbol: string;
  interval?: string;
  className?: string;
  defaultLanguage?: string;
  analysisId?: string; // To fetch existing AI Expert comment
  tradeType?: 'scalping' | 'dayTrade' | 'swing'; // Trade type for detailed report
}

// Fetch existing AI Expert comment from report
async function fetchAiExpertComment(analysisId: string): Promise<string | null> {
  try {
    const token = await getAuthToken();
    if (!token) return null;

    const response = await fetch(`/api/reports/by-analysis/${analysisId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data.data?.aiExpertComment || null;
  } catch (error) {
    console.error('Failed to fetch AI Expert comment:', error);
    return null;
  }
}

// Save report to database
async function saveReportToDatabase(reportData: AnalysisReportData, interval: string = '1h'): Promise<boolean> {
  try {
    const token = await getAuthToken();
    if (!token) return false;

    // Extract tradeType from reportData if available
    const tradeType = reportData.tradeType;

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
        tradeType: tradeType || null, // Include tradeType if available
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
    const token = await getAuthToken();
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

// Send PDF report via email
async function sendReportEmail(
  reportData: AnalysisReportData,
  pdfBase64: string,
  fileName: string
): Promise<{ success: boolean; email?: string; error?: string }> {
  try {
    const token = await getAuthToken();
    if (!token) return { success: false, error: 'Not authenticated' };

    const response = await fetch('/api/reports/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        symbol: reportData.symbol,
        verdict: reportData.verdict.action,
        score: reportData.verdict.overallScore,
        direction: reportData.tradePlan.direction,
        generatedAt: reportData.generatedAt,
        pdfBase64,
        fileName,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error?.message || 'Failed to send email' };
    }

    return { success: true, email: data.data?.email };
  } catch (error) {
    console.error('Failed to send email:', error);
    return { success: false, error: 'Network error' };
  }
}

export function DownloadReportButton({
  analysisData,
  symbol,
  interval = '4h',
  className,
  defaultLanguage = 'en',
  analysisId,
  tradeType = 'dayTrade',
}: DownloadReportButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(defaultLanguage);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);

  // Report type selection
  const [selectedReportType, setSelectedReportType] = useState<ReportType>('standard');
  const [showReportTypeMenu, setShowReportTypeMenu] = useState(false);

  // Email modal state
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [lastPdfData, setLastPdfData] = useState<{ base64: string; fileName: string; reportData: AnalysisReportData } | null>(null);

  // Client-side mounting state for portal
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.report-type-dropdown') && !target.closest('.language-dropdown')) {
        setShowReportTypeMenu(false);
        setShowLanguageMenu(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Check if translation is needed (not English)
  const needsTranslation = selectedLanguage !== 'en';

  const handleDownload = async () => {
    if (isGenerating) return;

    setIsGenerating(true);
    setIsSaved(false);
    setEmailSent(false);
    setEmailError(null);

    try {
      // Dynamic imports based on report type
      const isDetailed = selectedReportType === 'detailed';

      // Transform analysis data to report format
      // Use existing analysisId if provided (from saved report), otherwise generate UUID
      const reportAnalysisId = analysisId || crypto.randomUUID();

      const reportData: AnalysisReportData = {
        symbol,
        generatedAt: new Date().toLocaleString('tr-TR'),
        analysisId: reportAnalysisId,
        tradeType,
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

      // Fetch existing AI Expert comment if we have an analysisId
      if (analysisId) {
        const aiExpertComment = await fetchAiExpertComment(analysisId);
        if (aiExpertComment) {
          reportData.aiExpertComment = aiExpertComment;
        }
      }

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

      // Wait for chart to be rendered before capture
      await new Promise(resolve => setTimeout(resolve, 500));

      let pdfResult: { base64: string; fileName: string } | void;

      if (isDetailed) {
        // Generate Detailed Report with all step data and indicator charts
        const { generateDetailedReport } = await import('./DetailedAnalysisReport');

        // Transform to detailed report format
        const detailedReportData: DetailedReportData = {
          symbol: reportData.symbol,
          tradeType: tradeType,
          generatedAt: reportData.generatedAt,
          analysisId: reportData.analysisId,
          marketContext: {
            btcPrice: 0,
            btcDominance: reportData.marketPulse.btcDominance,
            fearGreedIndex: reportData.marketPulse.fearGreedIndex,
            marketTrend: reportData.marketPulse.trend.direction as 'bullish' | 'bearish' | 'neutral',
          },
          assetInfo: {
            currentPrice: reportData.assetScan.currentPrice,
            priceChange24h: reportData.assetScan.priceChange24h,
            volume24h: 0,
          },
          steps: [
            {
              stepNumber: 1,
              stepName: 'Market Pulse',
              stepDescription: 'Overall market sentiment and conditions analysis',
              input: {
                timeframes: [{ timeframe: '4h', candleCount: 50, priority: 'primary' as const, dataRange: { startTime: 0, endTime: 0 } }],
                indicators: [
                  { name: 'Fear & Greed', category: 'sentiment', params: {}, weight: 1 },
                  { name: 'BTC Dominance', category: 'market', params: {}, weight: 1 },
                ],
                tradeType: tradeType,
                aiPromptFocus: 'Analyze market conditions and sentiment',
              },
              output: {
                indicators: {
                  'Fear & Greed': { value: reportData.marketPulse.fearGreedIndex, signal: reportData.marketPulse.fearGreedIndex > 50 ? 'bullish' : reportData.marketPulse.fearGreedIndex < 50 ? 'bearish' : 'neutral' as const, strength: 70 },
                  'BTC Dominance': { value: reportData.marketPulse.btcDominance, signal: 'neutral' as const, strength: 50 },
                },
                signals: {
                  bullish: reportData.marketPulse.trend.direction === 'bullish' ? ['Market trend bullish'] : [],
                  bearish: reportData.marketPulse.trend.direction === 'bearish' ? ['Market trend bearish'] : [],
                  neutral: reportData.marketPulse.trend.direction === 'neutral' ? ['Market sideways'] : [],
                },
                stepScore: reportData.marketPulse.trend.strength / 10,
                stepConfidence: reportData.marketPulse.trend.strength,
                keyFindings: [
                  `Fear & Greed Index: ${reportData.marketPulse.fearGreedIndex} (${reportData.marketPulse.fearGreedLabel})`,
                  `Market Regime: ${reportData.marketPulse.marketRegime}`,
                ],
              },
              commentary: {
                summary: reportData.marketPulse.aiSummary || 'Market conditions analyzed.',
                signalInterpretation: `Market showing ${reportData.marketPulse.trend.direction} bias.`,
                riskFactors: reportData.marketPulse.marketRegime === 'risk_off' ? ['Risk-off environment'] : [],
                opportunities: reportData.marketPulse.marketRegime === 'risk_on' ? ['Risk-on environment favorable'] : [],
                recommendation: reportData.marketPulse.trend.direction === 'bullish' ? 'Market conditions favorable' : 'Use caution',
              },
              indicatorCharts: [],
            },
            {
              stepNumber: 2,
              stepName: 'Asset Scanner',
              stepDescription: 'Technical analysis of the asset across timeframes',
              input: {
                timeframes: [{ timeframe: '4h', candleCount: 100, priority: 'primary' as const, dataRange: { startTime: 0, endTime: 0 } }],
                indicators: [
                  { name: 'RSI', category: 'momentum', params: { period: 14 }, weight: 1 },
                  { name: 'MACD', category: 'trend', params: {}, weight: 1 },
                ],
                tradeType: tradeType,
                aiPromptFocus: 'Analyze asset technical structure',
              },
              output: {
                indicators: {
                  'RSI': { value: reportData.assetScan.indicators.rsi, signal: reportData.assetScan.indicators.rsi > 70 ? 'bearish' : reportData.assetScan.indicators.rsi < 30 ? 'bullish' : 'neutral' as const, strength: 70 },
                  'MACD': { value: reportData.assetScan.indicators.macd.histogram, signal: reportData.assetScan.indicators.macd.histogram > 0 ? 'bullish' : 'bearish' as const, strength: 60 },
                },
                signals: {
                  bullish: reportData.assetScan.timeframes.filter(t => t.trend === 'bullish').map(t => `${t.tf} bullish`),
                  bearish: reportData.assetScan.timeframes.filter(t => t.trend === 'bearish').map(t => `${t.tf} bearish`),
                  neutral: reportData.assetScan.timeframes.filter(t => t.trend === 'neutral').map(t => `${t.tf} neutral`),
                },
                stepScore: 6,
                stepConfidence: 70,
                keyFindings: [
                  `RSI at ${reportData.assetScan.indicators.rsi.toFixed(0)}`,
                  `Price change 24h: ${reportData.assetScan.priceChange24h.toFixed(2)}%`,
                ],
              },
              commentary: {
                summary: reportData.assetScan.aiInsight || 'Asset technical analysis completed.',
                signalInterpretation: `Multi-timeframe analysis shows ${reportData.assetScan.timeframes.filter(t => t.trend === 'bullish').length > reportData.assetScan.timeframes.filter(t => t.trend === 'bearish').length ? 'bullish' : 'bearish'} bias.`,
                riskFactors: reportData.assetScan.indicators.rsi > 70 ? ['RSI overbought'] : reportData.assetScan.indicators.rsi < 30 ? ['RSI oversold'] : [],
                opportunities: [],
                recommendation: 'Review support and resistance levels',
              },
              indicatorCharts: [],
            },
            {
              stepNumber: 3,
              stepName: 'Safety Check',
              stepDescription: 'Risk assessment and manipulation detection',
              input: {
                timeframes: [{ timeframe: '1h', candleCount: 50, priority: 'primary' as const, dataRange: { startTime: 0, endTime: 0 } }],
                indicators: [{ name: 'Whale Activity', category: 'advanced', params: {}, weight: 1 }],
                tradeType: tradeType,
                aiPromptFocus: 'Detect manipulation and assess risk',
              },
              output: {
                indicators: {
                  'Whale Activity': { value: null, signal: reportData.safetyCheck.whaleActivity.bias === 'accumulation' ? 'bullish' : reportData.safetyCheck.whaleActivity.bias === 'distribution' ? 'bearish' : 'neutral' as const, strength: 50 },
                },
                signals: {
                  bullish: reportData.safetyCheck.whaleActivity.bias === 'accumulation' ? ['Whale accumulation detected'] : [],
                  bearish: reportData.safetyCheck.whaleActivity.bias === 'distribution' ? ['Whale distribution detected'] : [],
                  neutral: [],
                },
                stepScore: reportData.safetyCheck.riskLevel === 'low' ? 8 : reportData.safetyCheck.riskLevel === 'medium' ? 5 : 3,
                stepConfidence: 60,
                keyFindings: [
                  `Risk Level: ${reportData.safetyCheck.riskLevel}`,
                  ...reportData.safetyCheck.warnings.slice(0, 2),
                ],
              },
              commentary: {
                summary: reportData.safetyCheck.aiInsight || 'Safety analysis completed.',
                signalInterpretation: `${reportData.safetyCheck.riskLevel} risk environment.`,
                riskFactors: reportData.safetyCheck.warnings,
                opportunities: reportData.safetyCheck.smartMoney.positioning === 'long' ? ['Smart money long'] : [],
                recommendation: reportData.safetyCheck.riskLevel === 'high' ? 'Exercise extreme caution' : 'Proceed with normal risk management',
              },
              indicatorCharts: [],
            },
            {
              stepNumber: 4,
              stepName: 'Timing Analysis',
              stepDescription: 'Entry timing and conditions evaluation',
              input: {
                timeframes: [{ timeframe: '1h', candleCount: 50, priority: 'primary' as const, dataRange: { startTime: 0, endTime: 0 } }],
                indicators: [{ name: 'Momentum', category: 'momentum', params: {}, weight: 1 }],
                tradeType: tradeType,
                aiPromptFocus: 'Determine optimal entry timing',
              },
              output: {
                indicators: {},
                signals: {
                  bullish: reportData.timing.tradeNow ? ['Entry conditions met'] : [],
                  bearish: [],
                  neutral: !reportData.timing.tradeNow ? ['Waiting for conditions'] : [],
                },
                stepScore: reportData.timing.tradeNow ? 8 : 4,
                stepConfidence: 70,
                keyFindings: [
                  reportData.timing.tradeNow ? 'Trade now recommended' : 'Wait for better entry',
                  reportData.timing.reason,
                ],
              },
              commentary: {
                summary: reportData.timing.aiInsight || 'Timing analysis completed.',
                signalInterpretation: reportData.timing.reason,
                riskFactors: !reportData.timing.tradeNow ? ['Entry conditions not fully met'] : [],
                opportunities: reportData.timing.entryZones.map(ez => `Entry zone: ${ez.priceLow.toFixed(2)} - ${ez.priceHigh.toFixed(2)}`),
                recommendation: reportData.timing.tradeNow ? 'Good entry timing' : 'Wait for better conditions',
              },
              indicatorCharts: [],
            },
            {
              stepNumber: 5,
              stepName: 'Trade Plan',
              stepDescription: 'Entry, stop-loss, and take-profit calculations',
              input: {
                timeframes: [{ timeframe: '4h', candleCount: 50, priority: 'primary' as const, dataRange: { startTime: 0, endTime: 0 } }],
                indicators: [{ name: 'ATR', category: 'volatility', params: { period: 14 }, weight: 1 }],
                tradeType: tradeType,
                aiPromptFocus: 'Calculate optimal trade parameters',
              },
              output: {
                indicators: {},
                signals: {
                  bullish: reportData.tradePlan.direction === 'long' ? ['Long setup'] : [],
                  bearish: reportData.tradePlan.direction === 'short' ? ['Short setup'] : [],
                  neutral: [],
                },
                stepScore: reportData.tradePlan.riskReward >= 2 ? 8 : reportData.tradePlan.riskReward >= 1.5 ? 6 : 4,
                stepConfidence: 80,
                keyFindings: [
                  `Direction: ${reportData.tradePlan.direction}`,
                  `R:R Ratio: ${reportData.tradePlan.riskReward.toFixed(2)}:1`,
                  `Win Rate Est: ${reportData.tradePlan.winRateEstimate}%`,
                ],
              },
              commentary: {
                summary: reportData.tradePlan.aiInsight || 'Trade plan calculated.',
                signalInterpretation: `${reportData.tradePlan.direction.toUpperCase()} trade with ${reportData.tradePlan.riskReward.toFixed(1)}:1 risk-reward.`,
                riskFactors: reportData.tradePlan.riskReward < 1.5 ? ['Low risk-reward ratio'] : [],
                opportunities: [`${reportData.tradePlan.takeProfits.length} take-profit levels defined`],
                recommendation: 'Follow position sizing rules strictly',
              },
              indicatorCharts: [],
            },
            {
              stepNumber: 6,
              stepName: 'Trap Check',
              stepDescription: 'Bull/bear trap and false breakout detection',
              input: {
                timeframes: [{ timeframe: '1h', candleCount: 50, priority: 'primary' as const, dataRange: { startTime: 0, endTime: 0 } }],
                indicators: [{ name: 'Divergence', category: 'advanced', params: {}, weight: 1 }],
                tradeType: tradeType,
                aiPromptFocus: 'Detect potential traps and false signals',
              },
              output: {
                indicators: {},
                signals: {
                  bullish: !reportData.trapCheck.traps.bullTrap && !reportData.trapCheck.traps.bearTrap ? ['No traps detected'] : [],
                  bearish: reportData.trapCheck.traps.bullTrap || reportData.trapCheck.traps.bearTrap ? ['Trap risk detected'] : [],
                  neutral: [],
                },
                stepScore: !reportData.trapCheck.traps.bullTrap && !reportData.trapCheck.traps.bearTrap ? 8 : 4,
                stepConfidence: 65,
                keyFindings: [
                  `Bull Trap: ${reportData.trapCheck.traps.bullTrap ? 'Detected' : 'Clear'}`,
                  `Bear Trap: ${reportData.trapCheck.traps.bearTrap ? 'Detected' : 'Clear'}`,
                  `Fakeout Risk: ${reportData.trapCheck.traps.fakeoutRisk}`,
                ],
              },
              commentary: {
                summary: reportData.trapCheck.aiInsight || 'Trap analysis completed.',
                signalInterpretation: reportData.trapCheck.traps.fakeoutRisk === 'high' ? 'High fakeout risk detected' : 'Low trap probability',
                riskFactors: reportData.trapCheck.traps.bullTrap ? ['Bull trap risk'] : reportData.trapCheck.traps.bearTrap ? ['Bear trap risk'] : [],
                opportunities: reportData.trapCheck.counterStrategy,
                recommendation: reportData.trapCheck.traps.fakeoutRisk === 'high' ? 'Be cautious of false breakouts' : 'Low trap probability',
              },
              indicatorCharts: [],
            },
            {
              stepNumber: 7,
              stepName: 'Final Verdict',
              stepDescription: 'Aggregated decision and recommendation',
              input: {
                timeframes: [],
                indicators: [],
                tradeType: tradeType,
                aiPromptFocus: 'Provide final trading decision',
              },
              output: {
                indicators: {},
                signals: {
                  bullish: reportData.verdict.action === 'GO' ? ['Strong buy signal'] : [],
                  bearish: reportData.verdict.action === 'AVOID' ? ['Avoid trade'] : [],
                  neutral: reportData.verdict.action === 'WAIT' ? ['Wait for confirmation'] : [],
                },
                stepScore: reportData.verdict.overallScore / 10,
                stepConfidence: reportData.verdict.confidenceFactors.filter(c => c.positive).length / reportData.verdict.confidenceFactors.length * 100 || 50,
                keyFindings: [
                  `Final Decision: ${reportData.verdict.action}`,
                  `Overall Score: ${reportData.verdict.overallScore}/100`,
                ],
              },
              commentary: {
                summary: reportData.verdict.aiSummary || 'Final verdict delivered.',
                signalInterpretation: `${reportData.verdict.action} recommendation based on comprehensive analysis.`,
                riskFactors: reportData.verdict.confidenceFactors.filter(c => !c.positive).map(c => c.factor),
                opportunities: reportData.verdict.confidenceFactors.filter(c => c.positive).map(c => c.factor),
                recommendation: reportData.verdict.action === 'GO' ? 'Execute trade plan' : reportData.verdict.action === 'WAIT' ? 'Wait for better conditions' : 'Avoid this trade',
              },
              indicatorCharts: [],
            },
          ],
          tradePlanSummary: {
            direction: reportData.tradePlan.direction as 'long' | 'short',
            entries: reportData.tradePlan.entries.map(e => ({ price: e.price, percentage: e.percentage })),
            averageEntry: reportData.tradePlan.averageEntry,
            stopLoss: reportData.tradePlan.stopLoss,
            takeProfits: reportData.tradePlan.takeProfits,
            riskReward: reportData.tradePlan.riskReward,
            winRateEstimate: reportData.tradePlan.winRateEstimate,
          },
          verdict: {
            action: (reportData.verdict.action.toLowerCase().replace(' ', '_') as 'go' | 'conditional_go' | 'wait' | 'avoid'),
            overallScore: reportData.verdict.overallScore / 10,
            overallConfidence: reportData.verdict.confidenceFactors.filter(c => c.positive).length / reportData.verdict.confidenceFactors.length * 100 || 50,
            direction: reportData.tradePlan.direction as 'long' | 'short',
            reasons: reportData.verdict.confidenceFactors.map(c => `${c.positive ? '+' : '-'} ${c.factor}`),
          },
        };

        pdfResult = await generateDetailedReport(detailedReportData);
      } else {
        // Generate Standard Report
        const { generateAnalysisReport } = await import('./AnalysisReport');
        pdfResult = await generateAnalysisReport(reportData, true);
      }

      // Save to database with interval for expiration calculation
      const saved = await saveReportToDatabase(reportData, interval);
      setIsSaved(saved);

      // Store PDF data for potential email sending
      if (pdfResult && pdfResult.base64 && pdfResult.fileName) {
        setLastPdfData({
          base64: pdfResult.base64,
          fileName: pdfResult.fileName,
          reportData,
        });
        // Show email modal after successful download
        setShowEmailModal(true);
      }

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

  const handleSendEmail = async () => {
    if (!lastPdfData || isSendingEmail) return;

    setIsSendingEmail(true);
    setEmailError(null);

    const result = await sendReportEmail(
      lastPdfData.reportData,
      lastPdfData.base64,
      lastPdfData.fileName
    );

    setIsSendingEmail(false);

    if (result.success) {
      setEmailSent(true);
      // Close modal after 2 seconds
      setTimeout(() => {
        setShowEmailModal(false);
        setEmailSent(false);
      }, 2000);
    } else {
      setEmailError(result.error || 'Failed to send email');
    }
  };

  const handleCloseModal = () => {
    setShowEmailModal(false);
    setEmailSent(false);
    setEmailError(null);
  };

  // Only show button if we have analysis data
  const hasData = Object.keys(analysisData).length >= 7;

  if (!hasData) {
    return null;
  }

  return (
    <>
      <div className={cn('flex flex-col items-center gap-3', className)}>
        {/* Dropdowns Row */}
        <div className="flex items-center gap-2">
        {/* Report Type Selector */}
        <div className="relative report-type-dropdown">
          <button
            onClick={() => {
              setShowReportTypeMenu(!showReportTypeMenu);
              setShowLanguageMenu(false);
            }}
            disabled={isGenerating}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all',
              'bg-card border border-border text-foreground',
              'hover:bg-muted',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {selectedReportType === 'detailed' ? (
              <BarChart3 className="w-4 h-4 text-purple-500" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            <span>{selectedReportType === 'detailed' ? 'Detailed' : 'Standard'}</span>
            <ChevronDown className="w-3 h-3" />
          </button>

          {showReportTypeMenu && (
            <div className="absolute bottom-full left-0 mb-1 w-56 bg-card border border-border rounded-lg shadow-xl overflow-hidden" style={{ zIndex: 9999 }}>
              <button
                onClick={() => {
                  setSelectedReportType('standard');
                  setShowReportTypeMenu(false);
                }}
                className={cn(
                  'w-full flex items-start gap-3 px-3 py-3 text-left hover:bg-muted transition',
                  selectedReportType === 'standard' && 'bg-primary/10'
                )}
              >
                <FileText className="w-5 h-5 mt-0.5 text-muted-foreground" />
                <div>
                  <div className="font-medium text-sm">Standard Report</div>
                  <div className="text-xs text-muted-foreground">3-page summary with key insights</div>
                </div>
              </button>
              <button
                onClick={() => {
                  setSelectedReportType('detailed');
                  setShowReportTypeMenu(false);
                }}
                className={cn(
                  'w-full flex items-start gap-3 px-3 py-3 text-left hover:bg-muted transition border-t border-border',
                  selectedReportType === 'detailed' && 'bg-primary/10'
                )}
              >
                <BarChart3 className="w-5 h-5 mt-0.5 text-purple-500" />
                <div>
                  <div className="font-medium text-sm flex items-center gap-2">
                    Detailed Report
                    <span className="px-1.5 py-0.5 text-xs bg-purple-500/20 text-purple-500 rounded">NEW</span>
                  </div>
                  <div className="text-xs text-muted-foreground">Full analysis with indicator charts</div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Language Selector */}
        <div className="relative language-dropdown">
          <button
            onClick={() => {
              setShowLanguageMenu(!showLanguageMenu);
              setShowReportTypeMenu(false);
            }}
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
            <div className="absolute bottom-full left-0 mb-1 w-48 bg-card border border-border rounded-lg shadow-xl max-h-64 overflow-y-auto" style={{ zIndex: 9999 }}>
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
        </div>

        {/* Download Button */}
        <button
          onClick={handleDownload}
          disabled={isGenerating}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all',
            selectedReportType === 'detailed'
              ? 'bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 text-white shadow-lg shadow-purple-500/25'
              : 'bg-gradient-to-r from-red-500 via-amber-500 to-green-500 text-white shadow-lg shadow-green-500/25',
            'hover:shadow-lg hover:scale-105',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100'
          )}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {needsTranslation ? 'Translating...' : selectedReportType === 'detailed' ? 'Generating Detailed...' : 'Generating...'}
            </>
          ) : isSaved ? (
            <>
              <Check className="w-4 h-4" />
              Downloaded
            </>
          ) : (
            <>
              {selectedReportType === 'detailed' ? <BarChart3 className="w-4 h-4" /> : <FileDown className="w-4 h-4" />}
              {selectedReportType === 'detailed' ? 'Download Detailed PDF' : 'Download PDF'}
              <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded">+5</span>
            </>
          )}
        </button>
      </div>

      {/* Email Modal - Rendered via Portal to avoid hydration issues */}
      {mounted && showEmailModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-red-500 via-amber-500 to-green-500 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <Mail className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Send Report via Email</h3>
                    <p className="text-sm text-white/80">Your PDF report is ready!</p>
                  </div>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="p-1 hover:bg-white/20 rounded-full transition"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {emailSent ? (
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                  <h4 className="text-lg font-semibold text-foreground mb-2">Email Sent!</h4>
                  <p className="text-sm text-muted-foreground">
                    Your {symbol}/USDT analysis report has been successfully sent to your email.
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-6">
                    <p className="text-muted-foreground mb-4">
                      Your <span className="font-semibold text-foreground">{symbol}/USDT</span> analysis report has been downloaded.
                      Would you like to send this report to your registered email address?
                    </p>

                    {/* Report Summary */}
                    <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">File:</span>
                        <span className="font-medium text-foreground">{lastPdfData?.fileName}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Decision:</span>
                        <span className={cn(
                          "font-medium px-2 py-0.5 rounded",
                          lastPdfData?.reportData.verdict.action === 'GO' ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400' :
                          lastPdfData?.reportData.verdict.action === 'WAIT' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400' :
                          'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'
                        )}>
                          {lastPdfData?.reportData.verdict.action}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Score:</span>
                        <span className="font-medium text-foreground">{lastPdfData?.reportData.verdict.overallScore}/100</span>
                      </div>
                    </div>

                    {emailError && (
                      <div className="mt-4 p-3 bg-red-100 dark:bg-red-500/20 border border-red-200 dark:border-red-500/30 rounded-lg">
                        <p className="text-sm text-red-600 dark:text-red-400">{emailError}</p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={handleCloseModal}
                      className="flex-1 px-4 py-2.5 border border-border rounded-lg font-medium text-foreground hover:bg-muted transition"
                    >
                      No, Thanks
                    </button>
                    <button
                      onClick={handleSendEmail}
                      disabled={isSendingEmail}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition",
                        "bg-gradient-to-r from-blue-500 to-indigo-500 text-white",
                        "hover:from-blue-600 hover:to-indigo-600",
                        "disabled:opacity-50 disabled:cursor-not-allowed"
                      )}
                    >
                      {isSendingEmail ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Send
                          <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded">+5</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
