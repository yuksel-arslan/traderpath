'use client';

import { useState, useEffect } from 'react';
import { Bot, Send, Loader2, Check, Mail, ExternalLink, TrendingUp, TrendingDown, Minus, ChevronRight } from 'lucide-react';
import { authFetch } from '@/lib/api';
import Link from 'next/link';

// Types
interface AnalysisResult {
  success: boolean;
  analysisId?: string;
  verdict?: string;
  score?: number;
  message?: string;
  error?: string;
}

// Supported coins with display names
const COINS = [
  { symbol: 'BTC', name: 'Bitcoin', icon: '₿', color: 'from-orange-500 to-amber-500' },
  { symbol: 'ETH', name: 'Ethereum', icon: 'Ξ', color: 'from-indigo-500 to-purple-500' },
  { symbol: 'SOL', name: 'Solana', icon: '◎', color: 'from-emerald-500 to-teal-500' },
  { symbol: 'BNB', name: 'BNB', icon: '⬡', color: 'from-yellow-500 to-amber-500' },
  { symbol: 'XRP', name: 'Ripple', icon: '✕', color: 'from-blue-500 to-cyan-500' },
  { symbol: 'DOGE', name: 'Dogecoin', icon: 'Ð', color: 'from-amber-400 to-yellow-500' },
  { symbol: 'ADA', name: 'Cardano', icon: '₳', color: 'from-blue-600 to-indigo-600' },
  { symbol: 'AVAX', name: 'Avalanche', icon: '▲', color: 'from-red-500 to-rose-500' },
];

// Timeframes
const TIMEFRAMES = [
  { value: '15m', label: 'Scalping', labelTr: 'Scalping', desc: '15 min', descTr: '15 dakika' },
  { value: '1h', label: 'Day Trade', labelTr: 'Gün İçi', desc: '1 hour', descTr: '1 saat' },
  { value: '4h', label: 'Swing', labelTr: 'Swing', desc: '4 hours', descTr: '4 saat' },
  { value: '1d', label: 'Position', labelTr: 'Pozisyon', desc: 'Daily', descTr: 'Günlük' },
];

// Wizard steps
type WizardStep = 'welcome' | 'select-coin' | 'select-timeframe' | 'confirm' | 'analyzing' | 'result' | 'email-confirm';

// Language detection
function detectBrowserLanguage(): 'tr' | 'en' {
  if (typeof window === 'undefined') return 'en';
  const lang = navigator.language || 'en';
  return lang.startsWith('tr') ? 'tr' : 'en';
}

// Verdict styling
function getVerdictStyle(verdict?: string) {
  switch (verdict?.toUpperCase()) {
    case 'GO':
      return { bg: 'from-emerald-500 to-green-600', text: 'text-white', icon: TrendingUp, label: 'GO', labelTr: 'GİT' };
    case 'CONDITIONAL_GO':
    case 'COND':
      return { bg: 'from-amber-500 to-yellow-600', text: 'text-white', icon: TrendingUp, label: 'CONDITIONAL', labelTr: 'ŞARTLI' };
    case 'WAIT':
      return { bg: 'from-slate-500 to-gray-600', text: 'text-white', icon: Minus, label: 'WAIT', labelTr: 'BEKLE' };
    case 'AVOID':
      return { bg: 'from-red-500 to-rose-600', text: 'text-white', icon: TrendingDown, label: 'AVOID', labelTr: 'KAÇIN' };
    default:
      return { bg: 'from-slate-500 to-gray-600', text: 'text-white', icon: Minus, label: 'N/A', labelTr: 'N/A' };
  }
}

export default function ConciergePage() {
  const [step, setStep] = useState<WizardStep>('welcome');
  const [lang, setLang] = useState<'tr' | 'en'>('en');
  const [selectedCoin, setSelectedCoin] = useState<typeof COINS[0] | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<typeof TIMEFRAMES[0] | null>(null);
  const [includeExpert, setIncludeExpert] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Detect language on mount
  useEffect(() => {
    setLang(detectBrowserLanguage());
    fetchCredits();
  }, []);

  // Fetch credits
  const fetchCredits = async () => {
    try {
      const res = await authFetch('/api/credits/balance');
      const data = await res.json();
      if (data.success) {
        setCredits(data.data.balance);
      }
    } catch {
      console.error('Failed to fetch credits');
    }
  };

  // Run analysis
  const runAnalysis = async () => {
    if (!selectedCoin || !selectedTimeframe) return;

    setStep('analyzing');
    setIsLoading(true);

    try {
      const res = await authFetch('/api/concierge/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Analyze ${selectedCoin.symbol} ${selectedTimeframe.value}`,
          language: lang,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setResult({
          success: true,
          analysisId: data.analysisId,
          verdict: data.verdict,
          score: data.score,
          message: data.message,
        });
        setCredits(data.creditsRemaining);
        setStep('result');
      } else {
        setResult({
          success: false,
          error: data.error || data.message || 'Analysis failed',
        });
        setStep('result');
      }
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Connection error',
      });
      setStep('result');
    } finally {
      setIsLoading(false);
    }
  };

  // Send email
  const sendEmail = async () => {
    if (!result?.analysisId) return;

    setEmailSending(true);
    try {
      const res = await authFetch('/api/reports/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisId: result.analysisId,
          language: lang,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setEmailSent(true);
      }
    } catch {
      console.error('Failed to send email');
    } finally {
      setEmailSending(false);
    }
  };

  // Reset wizard
  const reset = () => {
    setStep('welcome');
    setSelectedCoin(null);
    setSelectedTimeframe(null);
    setResult(null);
    setEmailSent(false);
    fetchCredits();
  };

  // Texts
  const texts = {
    welcome: {
      title: { en: 'AI Concierge', tr: 'AI Concierge' },
      subtitle: { en: 'Your intelligent crypto assistant', tr: 'Akıllı kripto asistanınız' },
      greeting: { en: 'Hello! Which coin would you like to analyze?', tr: 'Merhaba! Hangi coini analiz etmemi istersiniz?' },
    },
    selectCoin: {
      title: { en: 'Select a Coin', tr: 'Coin Seçin' },
      subtitle: { en: 'Choose the cryptocurrency to analyze', tr: 'Analiz edilecek kripto parayı seçin' },
    },
    selectTimeframe: {
      title: { en: 'Select Timeframe', tr: 'Zaman Dilimi Seçin' },
      subtitle: { en: 'What type of trade are you planning?', tr: 'Nasıl bir işlem planlıyorsunuz?' },
    },
    confirm: {
      title: { en: 'Confirm Analysis', tr: 'Analizi Onaylayın' },
      expertQuestion: { en: 'Include AI Expert commentary?', tr: 'AI Uzman yorumları eklensin mi?' },
      cost: { en: 'Cost: 25 credits', tr: 'Maliyet: 25 kredi' },
      start: { en: 'Start Analysis', tr: 'Analizi Başlat' },
    },
    analyzing: {
      title: { en: 'Analyzing...', tr: 'Analiz Ediliyor...' },
      subtitle: { en: 'Running 7-step analysis with 40+ indicators', tr: '40+ indikatör ile 7 adımlı analiz yapılıyor' },
    },
    result: {
      title: { en: 'Analysis Complete', tr: 'Analiz Tamamlandı' },
      emailQuestion: { en: 'Would you like to receive the report via email?', tr: 'Raporu e-posta ile almak ister misiniz?' },
      sendEmail: { en: 'Send Email', tr: 'E-posta Gönder' },
      viewDetails: { en: 'View Details', tr: 'Detayları Gör' },
      newAnalysis: { en: 'New Analysis', tr: 'Yeni Analiz' },
      emailSent: { en: 'Email sent!', tr: 'E-posta gönderildi!' },
    },
  };

  const t = (key: keyof typeof texts, subkey: string) => {
    const section = texts[key] as Record<string, { en: string; tr: string }>;
    return section[subkey]?.[lang] || section[subkey]?.['en'] || '';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="max-w-2xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 shadow-lg shadow-teal-500/20">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{t('welcome', 'title')}</h1>
              <p className="text-sm text-slate-400">{t('welcome', 'subtitle')}</p>
            </div>
          </div>
          {credits !== null && (
            <div className="px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20">
              <span className="text-amber-400 font-medium">💰 {credits.toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Card */}
      <div className="max-w-2xl mx-auto">
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden">

          {/* Step: Welcome */}
          {step === 'welcome' && (
            <div className="p-8 text-center">
              <div className="mb-6">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/30">
                  <Bot className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">{t('welcome', 'greeting')}</h2>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {COINS.map((coin) => (
                  <button
                    key={coin.symbol}
                    onClick={() => {
                      setSelectedCoin(coin);
                      setStep('select-timeframe');
                    }}
                    className={`p-4 rounded-xl bg-gradient-to-br ${coin.color} hover:scale-105 transition-all duration-200 shadow-lg group`}
                  >
                    <span className="text-2xl mb-1 block">{coin.icon}</span>
                    <span className="text-white font-bold">{coin.symbol}</span>
                    <span className="text-white/70 text-xs block">{coin.name}</span>
                  </button>
                ))}
              </div>

              {/* Language toggle */}
              <div className="mt-6 flex justify-center gap-2">
                <button
                  onClick={() => setLang('en')}
                  className={`px-3 py-1 rounded-full text-sm ${lang === 'en' ? 'bg-teal-500 text-white' : 'bg-slate-700 text-slate-400'}`}
                >
                  🇬🇧 English
                </button>
                <button
                  onClick={() => setLang('tr')}
                  className={`px-3 py-1 rounded-full text-sm ${lang === 'tr' ? 'bg-teal-500 text-white' : 'bg-slate-700 text-slate-400'}`}
                >
                  🇹🇷 Türkçe
                </button>
              </div>
            </div>
          )}

          {/* Step: Select Timeframe */}
          {step === 'select-timeframe' && selectedCoin && (
            <div className="p-8">
              <div className="text-center mb-6">
                <div className={`w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br ${selectedCoin.color} flex items-center justify-center shadow-lg`}>
                  <span className="text-2xl text-white">{selectedCoin.icon}</span>
                </div>
                <h2 className="text-xl font-bold text-white">{selectedCoin.symbol} - {t('selectTimeframe', 'title')}</h2>
                <p className="text-slate-400 text-sm mt-1">{t('selectTimeframe', 'subtitle')}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {TIMEFRAMES.map((tf) => (
                  <button
                    key={tf.value}
                    onClick={() => {
                      setSelectedTimeframe(tf);
                      setStep('confirm');
                    }}
                    className="p-4 rounded-xl bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 hover:border-teal-500/50 transition-all duration-200 text-left group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-white font-bold block">{lang === 'tr' ? tf.labelTr : tf.label}</span>
                        <span className="text-slate-400 text-sm">{lang === 'tr' ? tf.descTr : tf.desc}</span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-teal-400 transition-colors" />
                    </div>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setStep('welcome')}
                className="mt-4 w-full py-2 text-slate-400 hover:text-white transition-colors"
              >
                ← {lang === 'tr' ? 'Geri' : 'Back'}
              </button>
            </div>
          )}

          {/* Step: Confirm */}
          {step === 'confirm' && selectedCoin && selectedTimeframe && (
            <div className="p-8">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-white mb-4">{t('confirm', 'title')}</h2>

                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-700/50 border border-slate-600/50 mb-6">
                  <span className={`w-8 h-8 rounded-full bg-gradient-to-br ${selectedCoin.color} flex items-center justify-center text-white`}>
                    {selectedCoin.icon}
                  </span>
                  <span className="text-white font-bold">{selectedCoin.symbol}</span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-300">{lang === 'tr' ? selectedTimeframe.labelTr : selectedTimeframe.label}</span>
                </div>
              </div>

              {/* Expert toggle */}
              <div className="mb-6 p-4 rounded-xl bg-slate-700/30 border border-slate-600/30">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-white">{t('confirm', 'expertQuestion')}</span>
                  <div
                    onClick={() => setIncludeExpert(!includeExpert)}
                    className={`w-12 h-6 rounded-full transition-colors ${includeExpert ? 'bg-teal-500' : 'bg-slate-600'} relative`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${includeExpert ? 'left-7' : 'left-1'}`} />
                  </div>
                </label>
              </div>

              {/* Cost info */}
              <div className="mb-6 text-center">
                <span className="text-amber-400">{t('confirm', 'cost')}</span>
                {credits !== null && credits < 25 && (
                  <p className="text-red-400 text-sm mt-1">
                    {lang === 'tr' ? 'Yetersiz kredi!' : 'Insufficient credits!'}
                  </p>
                )}
              </div>

              {/* Start button */}
              <button
                onClick={runAnalysis}
                disabled={credits !== null && credits < 25}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-bold text-lg shadow-lg shadow-teal-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Send className="w-5 h-5" />
                {t('confirm', 'start')}
              </button>

              <button
                onClick={() => setStep('select-timeframe')}
                className="mt-4 w-full py-2 text-slate-400 hover:text-white transition-colors"
              >
                ← {lang === 'tr' ? 'Geri' : 'Back'}
              </button>
            </div>
          )}

          {/* Step: Analyzing */}
          {step === 'analyzing' && (
            <div className="p-8 text-center">
              <div className="mb-6">
                <Loader2 className="w-16 h-16 mx-auto text-teal-400 animate-spin" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">{t('analyzing', 'title')}</h2>
              <p className="text-slate-400">{t('analyzing', 'subtitle')}</p>

              {selectedCoin && selectedTimeframe && (
                <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-700/50">
                  <span className="text-white font-medium">{selectedCoin.symbol}</span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-300">{selectedTimeframe.value}</span>
                </div>
              )}
            </div>
          )}

          {/* Step: Result */}
          {step === 'result' && result && (
            <div className="p-8">
              {result.success ? (
                <>
                  {/* Verdict card */}
                  {result.verdict && (
                    <div className={`mb-6 p-6 rounded-xl bg-gradient-to-r ${getVerdictStyle(result.verdict).bg} shadow-lg`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {(() => {
                            const Icon = getVerdictStyle(result.verdict).icon;
                            return <Icon className="w-8 h-8 text-white" />;
                          })()}
                          <div>
                            <span className="text-white/80 text-sm block">{selectedCoin?.symbol} {selectedTimeframe?.value.toUpperCase()}</span>
                            <span className="text-white font-bold text-xl">
                              {lang === 'tr' ? getVerdictStyle(result.verdict).labelTr : getVerdictStyle(result.verdict).label}
                            </span>
                          </div>
                        </div>
                        {result.score && (
                          <div className="text-right">
                            <span className="text-white/80 text-sm block">{lang === 'tr' ? 'Skor' : 'Score'}</span>
                            <span className="text-white font-bold text-2xl">{result.score}/10</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Message */}
                  {result.message && (
                    <div className="mb-6 p-4 rounded-xl bg-slate-700/30 border border-slate-600/30">
                      <p className="text-slate-300 whitespace-pre-wrap">{result.message}</p>
                    </div>
                  )}

                  {/* Email question */}
                  {!emailSent ? (
                    <div className="mb-6 p-4 rounded-xl bg-teal-500/10 border border-teal-500/30">
                      <p className="text-white mb-3">{t('result', 'emailQuestion')}</p>
                      <button
                        onClick={sendEmail}
                        disabled={emailSending}
                        className="px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-600 text-white font-medium transition-colors flex items-center gap-2"
                      >
                        {emailSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                        {t('result', 'sendEmail')}
                      </button>
                    </div>
                  ) : (
                    <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 text-emerald-400">
                      <Check className="w-5 h-5" />
                      {t('result', 'emailSent')}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-3">
                    {result.analysisId && (
                      <Link
                        href={`/analyze/details/${result.analysisId}`}
                        className="py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <ExternalLink className="w-4 h-4" />
                        {t('result', 'viewDetails')}
                      </Link>
                    )}
                    <button
                      onClick={reset}
                      className="py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-medium transition-colors"
                    >
                      {t('result', 'newAnalysis')}
                    </button>
                  </div>
                </>
              ) : (
                // Error state
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                    <span className="text-3xl">❌</span>
                  </div>
                  <h2 className="text-xl font-bold text-white mb-2">{lang === 'tr' ? 'Hata Oluştu' : 'Error Occurred'}</h2>
                  <p className="text-red-400 mb-6">{result.error}</p>
                  <button
                    onClick={reset}
                    className="px-6 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-medium transition-colors"
                  >
                    {lang === 'tr' ? 'Tekrar Dene' : 'Try Again'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
