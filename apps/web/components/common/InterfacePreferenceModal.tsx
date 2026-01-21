'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bot,
  LayoutDashboard,
  MessageSquare,
  MousePointer,
  Zap,
  ChevronRight,
  Sparkles,
  Check,
} from 'lucide-react';
import { authFetch } from '@/lib/api';

interface InterfacePreferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (preference: 'ui' | 'concierge') => void;
}

export function InterfacePreferenceModal({
  isOpen,
  onClose,
  onSelect,
}: InterfacePreferenceModalProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<'ui' | 'concierge' | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleContinue = async () => {
    if (!selected) return;

    setIsLoading(true);
    try {
      // Save preference to backend
      const response = await authFetch('/api/user/preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferredInterface: selected }),
      });

      if (response.ok) {
        onSelect(selected);

        // Navigate based on selection
        if (selected === 'concierge') {
          router.push('/concierge');
        } else {
          router.push('/analyze');
        }

        onClose();
      }
    } catch (error) {
      console.error('Failed to save preference:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-4xl mx-4 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="relative px-8 pt-8 pb-6 bg-gradient-to-br from-teal-500/10 via-transparent to-coral-500/10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-teal-500/20 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-coral-500/20 to-transparent rounded-full blur-3xl" />

          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-teal-500" />
              <span className="text-sm font-medium text-teal-600 dark:text-teal-400">
                TraderPath&apos;e Hoş Geldin!
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-2">
              Nasıl Analiz Yapmak İstersin?
            </h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-xl">
              İki farklı deneyim sunuyoruz. Dilediğin zaman tercihini
              ayarlardan değiştirebilirsin.
            </p>
          </div>
        </div>

        {/* Options */}
        <div className="px-8 py-6">
          <div className="grid md:grid-cols-2 gap-4">
            {/* AI Concierge Option */}
            <button
              onClick={() => setSelected('concierge')}
              className={`relative group p-6 rounded-2xl border-2 text-left transition-all ${
                selected === 'concierge'
                  ? 'border-teal-500 bg-teal-500/5 ring-4 ring-teal-500/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-teal-500/50 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              {/* Selected indicator */}
              {selected === 'concierge' && (
                <div className="absolute top-4 right-4 w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}

              {/* Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-teal-500 to-teal-600 text-white text-xs font-bold rounded-full mb-4">
                <Zap className="w-3 h-3" />
                YENİ - ÖNERİLEN
              </div>

              {/* Icon */}
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Bot className="w-7 h-7 text-white" />
              </div>

              {/* Title */}
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                AI Concierge
              </h3>

              {/* Description */}
              <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
                Yapay zeka asistanınla sohbet eder gibi analiz yap. Sadece
                &quot;BTC nasıl?&quot; yaz, gerisini biz halledelim.
              </p>

              {/* Features */}
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <MessageSquare className="w-4 h-4 text-teal-500" />
                  Doğal dilde soru sor
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <Zap className="w-4 h-4 text-teal-500" />
                  Tek mesajla analiz tamamla
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <Bot className="w-4 h-4 text-teal-500" />
                  Sesli komut desteği
                </li>
              </ul>

              {/* Example */}
              <div className="mt-4 p-3 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                  Örnek:
                </p>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  &quot;ETH 4 saatlik analiz yap&quot;
                </p>
              </div>
            </button>

            {/* Classic UI Option */}
            <button
              onClick={() => setSelected('ui')}
              className={`relative group p-6 rounded-2xl border-2 text-left transition-all ${
                selected === 'ui'
                  ? 'border-slate-500 bg-slate-500/5 ring-4 ring-slate-500/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-500/50 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              {/* Selected indicator */}
              {selected === 'ui' && (
                <div className="absolute top-4 right-4 w-6 h-6 bg-slate-500 rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}

              {/* Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-full mb-4">
                KLASİK
              </div>

              {/* Icon */}
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <LayoutDashboard className="w-7 h-7 text-white" />
              </div>

              {/* Title */}
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                Klasik Arayüz
              </h3>

              {/* Description */}
              <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
                Adım adım formlar ve detaylı kontrol. Her parametreyi kendin
                ayarla, tüm verileri gör.
              </p>

              {/* Features */}
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <MousePointer className="w-4 h-4 text-slate-500" />
                  Detaylı kontrol paneli
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <LayoutDashboard className="w-4 h-4 text-slate-500" />
                  Tüm grafik ve indikatörler
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <Check className="w-4 h-4 text-slate-500" />
                  7 adımlı detaylı analiz
                </li>
              </ul>

              {/* Example */}
              <div className="mt-4 p-3 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                  Akış:
                </p>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Coin Seç → Timeframe → Analiz Et
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Tercihini ayarlardan her zaman değiştirebilirsin
            </p>
            <button
              onClick={handleContinue}
              disabled={!selected || isLoading}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
                selected
                  ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white hover:from-teal-600 hover:to-teal-700 shadow-lg shadow-teal-500/25'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
              }`}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Kaydediliyor...
                </>
              ) : (
                <>
                  Devam Et
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
