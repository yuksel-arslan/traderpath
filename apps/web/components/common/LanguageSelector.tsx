'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Globe, ChevronDown, Loader2 } from 'lucide-react';

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'zh-CN', name: '中文', flag: '🇨🇳' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
];

declare global {
  interface Window {
    google: {
      translate: {
        TranslateElement: new (options: {
          pageLanguage: string;
          includedLanguages: string;
          autoDisplay: boolean;
        }, elementId: string) => void;
      };
    };
    googleTranslateElementInit: () => void;
  }
}

interface LanguageSelectorProps {
  compact?: boolean;
}

export function LanguageSelector({ compact = false }: LanguageSelectorProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load Google Translate script
  useEffect(() => {
    // Check if script already exists
    if (document.getElementById('google-translate-script')) {
      setIsLoaded(true);
      return;
    }

    // Initialize Google Translate
    window.googleTranslateElementInit = () => {
      new window.google.translate.TranslateElement(
        {
          pageLanguage: 'en',
          includedLanguages: LANGUAGES.map(l => l.code).join(','),
          autoDisplay: false,
        },
        'google_translate_element'
      );
      setIsLoaded(true);
    };

    // Add script
    const script = document.createElement('script');
    script.id = 'google-translate-script';
    script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // Cleanup is tricky with Google Translate, leaving script in place
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Read saved language from cookie
  useEffect(() => {
    const match = document.cookie.match(/googtrans=\/[^/]+\/([^;]+)/);
    if (match) {
      const langCode = match[1];
      const found = LANGUAGES.find(l => l.code === langCode);
      if (found) setSelectedLang(found);
    }
  }, []);

  const handleLanguageChange = async (lang: typeof LANGUAGES[0]) => {
    if (isChanging) return;

    setSelectedLang(lang);
    setIsOpen(false);
    setIsChanging(true);

    // Set cookie for Google Translate
    const domain = window.location.hostname;
    document.cookie = `googtrans=/en/${lang.code}; path=/; domain=${domain}`;
    document.cookie = `googtrans=/en/${lang.code}; path=/`;

    // Trigger translation by clicking the hidden Google Translate element
    const frame = document.querySelector('.goog-te-menu-frame') as HTMLIFrameElement;
    if (frame) {
      const frameDoc = frame.contentDocument || frame.contentWindow?.document;
      if (frameDoc) {
        const langLink = frameDoc.querySelector(`a[lang="${lang.code}"]`) as HTMLAnchorElement;
        if (langLink) {
          langLink.click();
          setIsChanging(false);
          return;
        }
      }
    }

    // Fallback: Use Next.js router refresh instead of hard reload
    // This prevents blank page issues during navigation
    try {
      if (lang.code === 'en') {
        // Reset to English - clear cookies first
        document.cookie = 'googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        document.cookie = `googtrans=; path=/; domain=${domain}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      }

      // Small delay to ensure cookies are set before refresh
      await new Promise(resolve => setTimeout(resolve, 100));

      // Use router refresh for smoother transition
      router.refresh();

      // Fallback to reload after a short delay if translation didn't apply
      setTimeout(() => {
        // Check if translation was applied by looking for translated content
        const isTranslated = document.documentElement.classList.contains('translated-ltr') ||
                            document.documentElement.classList.contains('translated-rtl');

        // If changing from English and not yet translated, do a soft reload
        if (lang.code !== 'en' && !isTranslated) {
          window.location.href = window.location.href;
        }
        setIsChanging(false);
      }, 500);
    } catch (error) {
      console.error('Language change error:', error);
      setIsChanging(false);
      // Last resort: hard reload
      window.location.reload();
    }
  };

  return (
    <>
      {/* Hidden Google Translate element */}
      <div id="google_translate_element" className="hidden" />

      {/* Custom dropdown */}
      <div ref={dropdownRef} className="relative">
        <button
          onClick={() => !isChanging && setIsOpen(!isOpen)}
          disabled={isChanging}
          className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition disabled:opacity-50 disabled:cursor-not-allowed ${
            compact ? 'text-sm' : ''
          }`}
          aria-label="Select language"
        >
          {isChanging ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Globe className={compact ? 'w-4 h-4' : 'w-4 h-4'} />
          )}
          <span className={compact ? 'hidden sm:inline' : ''}>{selectedLang.flag}</span>
          <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-40 bg-popover border rounded-lg shadow-lg py-1 z-[100]">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang)}
                className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-accent transition ${
                  selectedLang.code === lang.code ? 'bg-accent/50 font-medium' : ''
                }`}
              >
                <span>{lang.flag}</span>
                <span>{lang.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Hide Google Translate banner */}
      <style jsx global>{`
        .goog-te-banner-frame,
        .skiptranslate,
        #goog-gt-tt,
        .goog-te-balloon-frame {
          display: none !important;
        }
        body {
          top: 0 !important;
        }
        .goog-text-highlight {
          background: none !important;
          box-shadow: none !important;
        }
      `}</style>
    </>
  );
}
