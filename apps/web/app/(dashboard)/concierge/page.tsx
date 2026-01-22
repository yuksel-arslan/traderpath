'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Bot, Mic, MicOff, Volume2, VolumeX, Loader2, ExternalLink, Mail, Check, RefreshCw } from 'lucide-react';
import { authFetch } from '@/lib/api';
import Link from 'next/link';

// Web Speech API - using 'any' for cross-browser compatibility
// These APIs are not fully typed in standard TypeScript DOM types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionInstance = any;

// Types
interface ConversationStep {
  id: string;
  aiMessage: { tr: string; en: string };
  expectingInput: boolean;
  inputType: 'coin' | 'timeframe' | 'yesno' | 'none';
}

interface AnalysisResult {
  success: boolean;
  analysisId?: string;
  verdict?: string;
  score?: number;
  message?: string;
  error?: string;
}

// Supported coins
const COINS: Record<string, string> = {
  'bitcoin': 'BTC', 'btc': 'BTC', 'bitkoyn': 'BTC',
  'ethereum': 'ETH', 'eth': 'ETH', 'eter': 'ETH', 'etereum': 'ETH',
  'solana': 'SOL', 'sol': 'SOL',
  'bnb': 'BNB', 'binance': 'BNB',
  'ripple': 'XRP', 'xrp': 'XRP',
  'doge': 'DOGE', 'dogecoin': 'DOGE', 'dogekoin': 'DOGE',
  'cardano': 'ADA', 'ada': 'ADA',
  'avalanche': 'AVAX', 'avax': 'AVAX',
  'polkadot': 'DOT', 'dot': 'DOT',
  'polygon': 'MATIC', 'matic': 'MATIC',
};

// Timeframe keywords
const TIMEFRAMES: Record<string, { value: string; label: { tr: string; en: string } }> = {
  'scalping': { value: '15m', label: { tr: 'scalping', en: 'scalping' } },
  'skalping': { value: '15m', label: { tr: 'scalping', en: 'scalping' } },
  'kısa': { value: '15m', label: { tr: 'scalping', en: 'scalping' } },
  'short': { value: '15m', label: { tr: 'scalping', en: 'scalping' } },
  'hızlı': { value: '15m', label: { tr: 'scalping', en: 'scalping' } },
  'quick': { value: '15m', label: { tr: 'scalping', en: 'scalping' } },

  'gün içi': { value: '1h', label: { tr: 'gün içi', en: 'day trade' } },
  'günlük': { value: '1h', label: { tr: 'gün içi', en: 'day trade' } },
  'day trade': { value: '1h', label: { tr: 'gün içi', en: 'day trade' } },
  'daytrade': { value: '1h', label: { tr: 'gün içi', en: 'day trade' } },
  'intraday': { value: '1h', label: { tr: 'gün içi', en: 'day trade' } },

  'swing': { value: '4h', label: { tr: 'swing', en: 'swing' } },
  'orta': { value: '4h', label: { tr: 'swing', en: 'swing' } },
  'medium': { value: '4h', label: { tr: 'swing', en: 'swing' } },

  'uzun': { value: '1d', label: { tr: 'pozisyon', en: 'position' } },
  'pozisyon': { value: '1d', label: { tr: 'pozisyon', en: 'position' } },
  'position': { value: '1d', label: { tr: 'pozisyon', en: 'position' } },
  'long term': { value: '1d', label: { tr: 'pozisyon', en: 'position' } },
  'yatırım': { value: '1d', label: { tr: 'pozisyon', en: 'position' } },
};

// Yes/No keywords
const YES_KEYWORDS = ['evet', 'yes', 'ok', 'tamam', 'olur', 'yap', 'gönder', 'ekle', 'istiyorum', 'lütfen', 'sure', 'yeah', 'yep', 'please', 'do it'];
const NO_KEYWORDS = ['hayır', 'no', 'yok', 'gerek yok', 'istemiyorum', 'nope', 'dont', "don't", 'skip', 'atla', 'geçelim'];

// Detect browser language
function detectBrowserLanguage(): 'tr' | 'en' {
  if (typeof window === 'undefined') return 'en';
  const lang = navigator.language || 'en';
  return lang.startsWith('tr') ? 'tr' : 'en';
}

// Get speech recognition language code
function getSpeechLang(lang: 'tr' | 'en'): string {
  return lang === 'tr' ? 'tr-TR' : 'en-US';
}

export default function ConciergePage() {
  // State
  const [lang, setLang] = useState<'tr' | 'en'>('en');
  const [step, setStep] = useState<'idle' | 'welcome' | 'ask-coin' | 'ask-timeframe' | 'ask-expert' | 'analyzing' | 'result' | 'ask-email'>('idle');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiMessage, setAiMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [micError, setMicError] = useState<string | null>(null);

  // Conversation data
  const [selectedCoin, setSelectedCoin] = useState<string | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<string | null>(null);
  const [includeExpert, setIncludeExpert] = useState(true);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  // Refs
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isSpeakingRef = useRef(false);
  const isListeningRef = useRef(false);

  // Conversation history for display
  const [history, setHistory] = useState<Array<{ role: 'ai' | 'user'; text: string }>>([]);

  // Initialize speech APIs
  useEffect(() => {
    const detectedLang = detectBrowserLanguage();
    setLang(detectedLang);

    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;

      // Check HTTPS requirement
      const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
      if (!isSecure) {
        setVoiceSupported(false);
        setMicError(detectedLang === 'tr'
          ? 'Ses tanıma HTTPS gerektirir. Lütfen yazarak devam edin.'
          : 'Voice recognition requires HTTPS. Please type your responses.');
      }

      // Initialize speech recognition (with browser compatibility)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognitionAPI && isSecure) {
        const recognition = new SpeechRecognitionAPI();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = getSpeechLang(detectedLang);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = (event: any) => {
          console.log('Speech recognition result:', event.results[0][0].transcript);
          const text = event.results[0][0].transcript.toLowerCase().trim();
          setTranscript(text);
          isListeningRef.current = false;
          setIsListening(false);
          setMicError(null);
          handleUserInput(text);
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          isListeningRef.current = false;
          setIsListening(false);

          // Handle specific errors
          if (event.error === 'not-allowed') {
            setMicError(detectedLang === 'tr'
              ? 'Mikrofon izni reddedildi. Tarayıcı ayarlarından izin verin veya yazarak devam edin.'
              : 'Microphone permission denied. Allow in browser settings or type your response.');
            setVoiceSupported(false);
          } else if (event.error === 'no-speech') {
            // Don't retry automatically - let user click mic again
            console.log('No speech detected');
          } else if (event.error === 'audio-capture') {
            setMicError(detectedLang === 'tr'
              ? 'Mikrofon bulunamadı. Lütfen yazarak devam edin.'
              : 'No microphone found. Please type your response.');
            setVoiceSupported(false);
          } else if (event.error === 'network') {
            setMicError(detectedLang === 'tr'
              ? 'Ağ hatası. Lütfen tekrar deneyin veya yazarak devam edin.'
              : 'Network error. Please try again or type your response.');
          }
        };

        recognition.onend = () => {
          console.log('Speech recognition ended');
          isListeningRef.current = false;
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      } else if (!SpeechRecognitionAPI) {
        setVoiceSupported(false);
        setMicError(detectedLang === 'tr'
          ? 'Tarayıcınız ses tanımayı desteklemiyor. Chrome veya Edge kullanın, ya da yazarak devam edin.'
          : 'Your browser does not support voice recognition. Use Chrome/Edge or type your responses.');
      }
    }

    fetchCredits();

    // Start conversation after a short delay
    setTimeout(() => {
      startConversation();
    }, 1000);

    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
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

  // Speak function
  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (!synthRef.current) {
      onEnd?.();
      return;
    }

    synthRef.current.cancel();
    isSpeakingRef.current = true;
    setIsSpeaking(true);
    setAiMessage(text);
    setHistory(prev => [...prev, { role: 'ai', text }]);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = getSpeechLang(lang);
    utterance.rate = 1.1;
    utterance.pitch = 1.0;

    // Try to find a good voice
    const voices = synthRef.current.getVoices();
    const langVoices = voices.filter(v => v.lang.toLowerCase().startsWith(lang));
    if (langVoices.length > 0) {
      // Prefer Google or Microsoft voices
      const preferredVoice = langVoices.find(v =>
        v.name.toLowerCase().includes('google') ||
        v.name.toLowerCase().includes('microsoft')
      ) || langVoices[0];
      utterance.voice = preferredVoice;
    }

    utterance.onend = () => {
      isSpeakingRef.current = false;
      setIsSpeaking(false);
      // Small delay to ensure state updates before callback
      if (onEnd) {
        setTimeout(onEnd, 100);
      }
    };

    utterance.onerror = () => {
      isSpeakingRef.current = false;
      setIsSpeaking(false);
      // Small delay to ensure state updates before callback
      if (onEnd) {
        setTimeout(onEnd, 100);
      }
    };

    utteranceRef.current = utterance;
    synthRef.current.speak(utterance);
  }, [lang]);

  // Start listening
  const startListening = useCallback(() => {
    // Use refs to check current state (avoids stale closure issues)
    if (!recognitionRef.current || isListeningRef.current || isSpeakingRef.current) {
      console.log('Cannot start listening:', {
        hasRecognition: !!recognitionRef.current,
        isListening: isListeningRef.current,
        isSpeaking: isSpeakingRef.current
      });
      return;
    }

    try {
      recognitionRef.current.lang = getSpeechLang(lang);
      recognitionRef.current.start();
      isListeningRef.current = true;
      setIsListening(true);
      setTranscript('');
      console.log('Started listening');
    } catch (e) {
      console.error('Failed to start recognition:', e);
      isListeningRef.current = false;
      setIsListening(false);
    }
  }, [lang]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListeningRef.current) {
      recognitionRef.current.stop();
      isListeningRef.current = false;
      setIsListening(false);
    }
  }, []);

  // Handle user input based on current step
  const handleUserInput = useCallback((text: string) => {
    setHistory(prev => [...prev, { role: 'user', text }]);

    switch (step) {
      case 'ask-coin':
        handleCoinInput(text);
        break;
      case 'ask-timeframe':
        handleTimeframeInput(text);
        break;
      case 'ask-expert':
        handleExpertInput(text);
        break;
      case 'ask-email':
        handleEmailInput(text);
        break;
      default:
        // If not in a specific step, try to understand
        if (Object.keys(COINS).some(k => text.includes(k))) {
          handleCoinInput(text);
        }
    }
  }, [step]);

  // Start conversation
  const startConversation = useCallback(() => {
    setStep('welcome');
    const welcomeMsg = lang === 'tr'
      ? 'Merhaba! Ben TraderPath AI asistanınızım. Hangi coini analiz etmemi istersiniz?'
      : "Hello! I'm your TraderPath AI assistant. Which coin would you like me to analyze?";

    speak(welcomeMsg, () => {
      setStep('ask-coin');
      startListening();
    });
  }, [lang, speak, startListening]);

  // Handle coin input
  const handleCoinInput = useCallback((text: string) => {
    const lowerText = text.toLowerCase();
    let foundCoin: string | null = null;

    for (const [keyword, symbol] of Object.entries(COINS)) {
      if (lowerText.includes(keyword)) {
        foundCoin = symbol;
        break;
      }
    }

    if (foundCoin) {
      setSelectedCoin(foundCoin);
      setStep('ask-timeframe');

      const timeframeMsg = lang === 'tr'
        ? `Tamam, ${foundCoin}. Nasıl bir işlem düşünüyorsunuz? Scalping, gün içi, swing veya uzun vadeli?`
        : `Got it, ${foundCoin}. What type of trade are you planning? Scalping, day trade, swing, or position?`;

      speak(timeframeMsg, () => {
        startListening();
      });
    } else {
      // Coin not understood
      const retryMsg = lang === 'tr'
        ? 'Anlayamadım. Bitcoin, Ethereum, Solana gibi bir coin söyleyebilir misiniz?'
        : "I didn't catch that. Could you say a coin like Bitcoin, Ethereum, or Solana?";

      speak(retryMsg, () => {
        startListening();
      });
    }
  }, [lang, speak, startListening]);

  // Handle timeframe input
  const handleTimeframeInput = useCallback((text: string) => {
    const lowerText = text.toLowerCase();
    let foundTimeframe: { value: string; label: { tr: string; en: string } } | null = null;

    for (const [keyword, tf] of Object.entries(TIMEFRAMES)) {
      if (lowerText.includes(keyword)) {
        foundTimeframe = tf;
        break;
      }
    }

    if (foundTimeframe) {
      setSelectedTimeframe(foundTimeframe.value);
      setStep('ask-expert');

      const tfLabel = lang === 'tr' ? foundTimeframe.label.tr : foundTimeframe.label.en;
      const expertMsg = lang === 'tr'
        ? `${selectedCoin} için ${tfLabel} analizi yapacağım. AI uzman yorumları da ekleyeyim mi?`
        : `I'll analyze ${selectedCoin} for ${tfLabel}. Should I include AI expert commentary?`;

      speak(expertMsg, () => {
        startListening();
      });
    } else {
      // Timeframe not understood
      const retryMsg = lang === 'tr'
        ? 'Anlayamadım. Scalping, gün içi, swing veya uzun vadeli diyebilirsiniz.'
        : "I didn't catch that. You can say scalping, day trade, swing, or position.";

      speak(retryMsg, () => {
        startListening();
      });
    }
  }, [lang, selectedCoin, speak, startListening]);

  // Handle expert input
  const handleExpertInput = useCallback((text: string) => {
    const lowerText = text.toLowerCase();
    const isYes = YES_KEYWORDS.some(k => lowerText.includes(k));
    const isNo = NO_KEYWORDS.some(k => lowerText.includes(k));

    if (isYes || isNo) {
      setIncludeExpert(isYes);
      runAnalysis(isYes);
    } else {
      // Not understood
      const retryMsg = lang === 'tr'
        ? 'Evet veya hayır diyebilir misiniz?'
        : 'Could you say yes or no?';

      speak(retryMsg, () => {
        startListening();
      });
    }
  }, [lang, speak, startListening]);

  // Run analysis
  const runAnalysis = useCallback(async (withExpert: boolean) => {
    if (!selectedCoin || !selectedTimeframe) return;

    setStep('analyzing');

    const analyzingMsg = lang === 'tr'
      ? `${selectedCoin} analizi başlıyor. Bu yaklaşık 60 saniye sürecek...`
      : `Starting ${selectedCoin} analysis. This will take about 60 seconds...`;

    speak(analyzingMsg);

    try {
      const res = await authFetch('/api/concierge/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Analyze ${selectedCoin} ${selectedTimeframe}`,
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

        // Announce result
        const verdictText = getVerdictText(data.verdict, lang);
        const resultMsg = lang === 'tr'
          ? `Analiz tamamlandı! ${selectedCoin} için ${verdictText}, skor ${data.score} üzerinden 10. Raporu e-posta ile göndermemi ister misiniz?`
          : `Analysis complete! ${selectedCoin} shows ${verdictText}, score ${data.score} out of 10. Would you like me to email you the report?`;

        speak(resultMsg, () => {
          setStep('ask-email');
          startListening();
        });
      } else {
        setResult({
          success: false,
          error: data.error || data.message,
        });

        const errorMsg = lang === 'tr'
          ? `Üzgünüm, bir hata oluştu: ${data.error || 'Bilinmeyen hata'}. Tekrar denemek ister misiniz?`
          : `Sorry, an error occurred: ${data.error || 'Unknown error'}. Would you like to try again?`;

        speak(errorMsg);
        setStep('idle');
      }
    } catch (error) {
      const errorMsg = lang === 'tr'
        ? 'Bağlantı hatası oluştu. Lütfen tekrar deneyin.'
        : 'Connection error occurred. Please try again.';

      speak(errorMsg);
      setStep('idle');
    }
  }, [selectedCoin, selectedTimeframe, lang, speak, startListening]);

  // Handle email input
  const handleEmailInput = useCallback(async (text: string) => {
    const lowerText = text.toLowerCase();
    const isYes = YES_KEYWORDS.some(k => lowerText.includes(k));

    if (isYes && result?.analysisId) {
      const sendingMsg = lang === 'tr' ? 'E-posta gönderiliyor...' : 'Sending email...';
      speak(sendingMsg);

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
          const successMsg = lang === 'tr'
            ? 'E-posta gönderildi! Başka bir analiz yapmak ister misiniz?'
            : 'Email sent! Would you like to do another analysis?';
          speak(successMsg, () => {
            setStep('idle');
          });
        } else {
          const failMsg = lang === 'tr'
            ? 'E-posta gönderilemedi. Başka bir analiz yapmak ister misiniz?'
            : 'Failed to send email. Would you like to do another analysis?';
          speak(failMsg, () => {
            setStep('idle');
          });
        }
      } catch {
        const failMsg = lang === 'tr'
          ? 'E-posta gönderilemedi. Başka bir analiz yapmak ister misiniz?'
          : 'Failed to send email. Would you like to do another analysis?';
        speak(failMsg, () => {
          setStep('idle');
        });
      }
    } else {
      const noEmailMsg = lang === 'tr'
        ? 'Tamam, e-posta göndermiyorum. Detayları ekranda görebilirsiniz. Başka bir analiz ister misiniz?'
        : "Okay, I won't send an email. You can see the details on screen. Would you like another analysis?";
      speak(noEmailMsg, () => {
        setStep('idle');
      });
    }
  }, [lang, result, speak]);

  // Get verdict text
  const getVerdictText = (verdict: string | undefined, lang: 'tr' | 'en'): string => {
    switch (verdict?.toUpperCase()) {
      case 'GO':
        return lang === 'tr' ? 'giriş önerisi' : 'a go signal';
      case 'CONDITIONAL_GO':
      case 'COND':
        return lang === 'tr' ? 'şartlı giriş' : 'a conditional entry';
      case 'WAIT':
        return lang === 'tr' ? 'bekleme önerisi' : 'a wait signal';
      case 'AVOID':
        return lang === 'tr' ? 'kaçınma önerisi' : 'an avoid signal';
      default:
        return lang === 'tr' ? 'sonuç' : 'a result';
    }
  };

  // Get verdict color
  const getVerdictColor = (verdict?: string): string => {
    switch (verdict?.toUpperCase()) {
      case 'GO': return 'from-emerald-500 to-green-600';
      case 'CONDITIONAL_GO':
      case 'COND': return 'from-amber-500 to-yellow-600';
      case 'WAIT': return 'from-slate-500 to-gray-600';
      case 'AVOID': return 'from-red-500 to-rose-600';
      default: return 'from-slate-500 to-gray-600';
    }
  };

  // Reset and start over
  const resetConversation = () => {
    setSelectedCoin(null);
    setSelectedTimeframe(null);
    setResult(null);
    setEmailSent(false);
    setHistory([]);
    setTranscript('');
    setError(null);
    startConversation();
  };

  // Manual text input as fallback
  const [textInput, setTextInput] = useState('');
  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (textInput.trim()) {
      handleUserInput(textInput.trim().toLowerCase());
      setTextInput('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl ${isSpeaking ? 'bg-gradient-to-br from-teal-400 to-emerald-500 animate-pulse' : 'bg-gradient-to-br from-teal-500 to-emerald-600'} shadow-lg`}>
              <Bot className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">AI Concierge</h1>
              <p className="text-sm text-slate-400">
                {lang === 'tr' ? 'Sesli asistanınız' : 'Your voice assistant'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Language toggle */}
            <button
              onClick={() => setLang(lang === 'tr' ? 'en' : 'tr')}
              className="px-3 py-1.5 rounded-lg bg-slate-700 text-slate-300 text-sm hover:bg-slate-600 transition-colors"
            >
              {lang === 'tr' ? '🇹🇷 TR' : '🇬🇧 EN'}
            </button>

            {/* Credits */}
            {credits !== null && (
              <div className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <span className="text-amber-400 font-medium text-sm">💰 {credits.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Main conversation area */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden">
          {/* Conversation history */}
          <div className="h-[400px] overflow-y-auto p-6 space-y-4">
            {history.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                    msg.role === 'user'
                      ? 'bg-teal-500 text-white rounded-br-md'
                      : 'bg-slate-700 text-slate-200 rounded-bl-md'
                  }`}
                >
                  {msg.role === 'ai' && (
                    <div className="flex items-center gap-2 mb-1">
                      <Bot className="w-4 h-4 text-teal-400" />
                      <span className="text-xs text-teal-400 font-medium">AI</span>
                    </div>
                  )}
                  <p className="text-sm leading-relaxed">{msg.text}</p>
                </div>
              </div>
            ))}

            {/* Listening indicator */}
            {isListening && (
              <div className="flex justify-center">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/20 border border-red-500/30">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-red-400 text-sm">
                    {lang === 'tr' ? 'Dinliyorum...' : 'Listening...'}
                  </span>
                </div>
              </div>
            )}

            {/* Speaking indicator */}
            {isSpeaking && (
              <div className="flex justify-center">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-teal-500/20 border border-teal-500/30">
                  <Volume2 className="w-4 h-4 text-teal-400 animate-pulse" />
                  <span className="text-teal-400 text-sm">
                    {lang === 'tr' ? 'Konuşuyor...' : 'Speaking...'}
                  </span>
                </div>
              </div>
            )}

            {/* Analyzing indicator */}
            {step === 'analyzing' && (
              <div className="flex justify-center">
                <div className="flex items-center gap-3 px-6 py-3 rounded-xl bg-slate-700/50 border border-slate-600/50">
                  <Loader2 className="w-5 h-5 text-teal-400 animate-spin" />
                  <span className="text-slate-300">
                    {lang === 'tr' ? 'Analiz yapılıyor...' : 'Analyzing...'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Result card (if analysis complete) */}
          {result?.success && result.verdict && step !== 'analyzing' && (
            <div className={`mx-6 mb-4 p-4 rounded-xl bg-gradient-to-r ${getVerdictColor(result.verdict)} shadow-lg`}>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-white/80 text-sm">{selectedCoin} {selectedTimeframe?.toUpperCase()}</span>
                  <p className="text-white font-bold text-lg">{result.verdict}</p>
                </div>
                <div className="text-right">
                  <span className="text-white/80 text-sm">{lang === 'tr' ? 'Skor' : 'Score'}</span>
                  <p className="text-white font-bold text-2xl">{result.score}/10</p>
                </div>
              </div>

              {result.analysisId && (
                <Link
                  href={`/analyze/details/${result.analysisId}`}
                  className="mt-3 flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-white/20 hover:bg-white/30 text-white font-medium transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  {lang === 'tr' ? 'Detayları Gör' : 'View Details'}
                </Link>
              )}
            </div>
          )}

          {/* Input area */}
          <div className="p-4 border-t border-slate-700/50 bg-slate-800/30">
            {/* Mic error message */}
            {micError && (
              <div className="mb-3 p-3 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 text-sm">
                ⚠️ {micError}
              </div>
            )}

            <div className="flex items-center gap-3">
              {/* Mic button */}
              <button
                onClick={isListening ? stopListening : startListening}
                disabled={isSpeaking || step === 'analyzing' || !voiceSupported}
                className={`p-4 rounded-xl transition-all duration-200 ${
                  !voiceSupported
                    ? 'bg-slate-800 cursor-not-allowed opacity-50'
                    : isListening
                      ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30'
                      : 'bg-slate-700 hover:bg-slate-600'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                title={!voiceSupported
                  ? (lang === 'tr' ? 'Ses tanıma kullanılamıyor' : 'Voice not available')
                  : (isListening
                      ? (lang === 'tr' ? 'Dinlemeyi durdur' : 'Stop listening')
                      : (lang === 'tr' ? 'Konuşmak için tıkla' : 'Click to speak'))}
              >
                {isListening ? (
                  <MicOff className="w-6 h-6 text-white" />
                ) : (
                  <Mic className={`w-6 h-6 ${voiceSupported ? 'text-white' : 'text-slate-500'}`} />
                )}
              </button>

              {/* Text input fallback */}
              <form onSubmit={handleTextSubmit} className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder={lang === 'tr' ? 'Yazarak yanıtlayın...' : 'Type your response...'}
                  className="flex-1 px-4 py-3 rounded-xl bg-slate-700/50 border border-slate-600/50 text-white placeholder-slate-400 focus:outline-none focus:border-teal-500/50"
                  disabled={isSpeaking || step === 'analyzing'}
                />
                <button
                  type="submit"
                  disabled={!textInput.trim() || isSpeaking || step === 'analyzing'}
                  className="px-4 py-3 rounded-xl bg-teal-500 hover:bg-teal-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="sr-only">Send</span>
                  →
                </button>
              </form>

              {/* Reset button */}
              <button
                onClick={resetConversation}
                className="p-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
                title={lang === 'tr' ? 'Yeniden Başla' : 'Start Over'}
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>

            {/* Hint */}
            <p className="mt-3 text-center text-xs text-slate-500">
              {voiceSupported
                ? (lang === 'tr'
                    ? '🎤 Mikrofona tıklayın ve konuşun, veya yazarak yanıtlayın'
                    : '🎤 Click the microphone and speak, or type your response')
                : (lang === 'tr'
                    ? '⌨️ Yazarak yanıtlayın'
                    : '⌨️ Type your response')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
