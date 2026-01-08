'use client';

// ===========================================
// Download Report Button
// Generates, saves, and downloads PDF analysis report
// With optional language translation and email sending
// ===========================================

import { useState } from 'react';
import { FileDown, Loader2, Check, Globe, ChevronDown, Mail, X, Send } from 'lucide-react';
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
  ar: 'العربية',
  hi: 'हिन्दी',
  it: 'Italiano',
  nl: 'Nederlands',
} as const;

const TRANSLATION_CREDIT_COST = 10;

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
  aiExpertComment?: string; // AI Expert review comment
}

interface DownloadReportButtonProps {
  analysisData: Record<number, unknown>;
  symbol: string;
  interval?: string;
  className?: string;
  defaultLanguage?: string;
  analysisId?: string; // To fetch existing AI Expert comment
}

// Fetch existing AI Expert comment from report
async function fetchAiExpertComment(analysisId: string): Promise<string | null> {
  try {
    const token = localStorage.getItem('accessToken');
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

// Send PDF report via email
async function sendReportEmail(
  reportData: AnalysisReportData,
  pdfBase64: string,
  fileName: string
): Promise<{ success: boolean; email?: string; error?: string }> {
  try {
    const token = localStorage.getItem('accessToken');
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
}: DownloadReportButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(defaultLanguage);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);

  // Email modal state
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [lastPdfData, setLastPdfData] = useState<{ base64: string; fileName: string; reportData: AnalysisReportData } | null>(null);

  // Check if translation is needed (not English)
  const needsTranslation = selectedLanguage !== 'en';

  const handleDownload = async () => {
    if (isGenerating) return;

    setIsGenerating(true);
    setIsSaved(false);
    setEmailSent(false);
    setEmailError(null);

    try {
      // Dynamic import to ensure client-side only loading
      const { generateAnalysisReport } = await import('./AnalysisReport');

      // Transform analysis data to report format
      // Use existing analysisId if provided (from saved report), otherwise generate UUID
      const reportAnalysisId = analysisId || crypto.randomUUID();

      const reportData: AnalysisReportData = {
        symbol,
        generatedAt: new Date().toLocaleString('tr-TR'),
        analysisId: reportAnalysisId,
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

      // Generate and download PDF with chart capture - now returns PDF data
      const pdfResult = await generateAnalysisReport(reportData, true);

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

      {/* Email Modal */}
      {showEmailModal && (
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
                    <h3 className="text-lg font-bold text-white">Raporu E-posta ile Gönder</h3>
                    <p className="text-sm text-white/80">PDF raporunuz hazır!</p>
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
                  <h4 className="text-lg font-semibold text-foreground mb-2">E-posta Gönderildi!</h4>
                  <p className="text-sm text-muted-foreground">
                    {symbol}/USDT analiz raporunuz e-posta adresinize başarıyla gönderildi.
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-6">
                    <p className="text-muted-foreground mb-4">
                      <span className="font-semibold text-foreground">{symbol}/USDT</span> analiz raporunuz indirildi.
                      Bu raporu kayıtlı e-posta adresinize de göndermek ister misiniz?
                    </p>

                    {/* Report Summary */}
                    <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Dosya:</span>
                        <span className="font-medium text-foreground">{lastPdfData?.fileName}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Karar:</span>
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
                        <span className="text-muted-foreground">Skor:</span>
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
                      Hayır, Teşekkürler
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
                          Gönderiliyor...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Gönder
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
