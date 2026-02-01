'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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

// Helper to fire events on elements (for Google Translate combo)
function fireEvent(element: HTMLElement, eventName: string) {
  const event = new Event(eventName, { bubbles: true, cancelable: true });
  element.dispatchEvent(event);
}

export function LanguageSelector({ compact = false }: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Find Google Translate combo box
  const findTranslateCombo = useCallback((): HTMLSelectElement | null => {
    const selects = document.getElementsByTagName('select');
    for (let i = 0; i < selects.length; i++) {
      if (selects[i].className.includes('goog-te-combo')) {
        return selects[i];
      }
    }
    return null;
  }, []);

  // Trigger translation via Google Translate combo box (no page reload)
  const triggerTranslation = useCallback((langCode: string, retries = 0): boolean => {
    const combo = findTranslateCombo();

    if (!combo || combo.innerHTML.length === 0) {
      // Widget not ready yet, retry
      if (retries < 10) {
        setTimeout(() => triggerTranslation(langCode, retries + 1), 200);
      }
      return false;
    }

    // Set value and fire change event
    combo.value = langCode;
    fireEvent(combo, 'change');
    return true;
  }, [findTranslateCombo]);

  // Reset to English (remove translation)
  const resetToEnglish = useCallback(() => {
    // Try to find and click the "Show original" button
    const frame = document.querySelector('.goog-te-banner-frame') as HTMLIFrameElement;
    if (frame?.contentDocument) {
      const showOriginalBtn = frame.contentDocument.querySelector('.goog-te-button button') as HTMLButtonElement;
      if (showOriginalBtn) {
        showOriginalBtn.click();
        return true;
      }
    }

    // Alternative: Set combo to empty (original language)
    const combo = findTranslateCombo();
    if (combo) {
      combo.value = '';
      fireEvent(combo, 'change');
      return true;
    }

    // Fallback: Clear cookies and let page handle it
    const domain = window.location.hostname;
    document.cookie = 'googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = `googtrans=; path=/; domain=${domain}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    document.cookie = `googtrans=; path=/; domain=.${domain}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;

    // Remove translated classes
    document.documentElement.classList.remove('translated-ltr', 'translated-rtl');

    return false;
  }, [findTranslateCombo]);

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

  // Read saved language from cookie on mount
  useEffect(() => {
    const match = document.cookie.match(/googtrans=\/[^/]+\/([^;]+)/);
    if (match) {
      const langCode = match[1];
      const found = LANGUAGES.find(l => l.code === langCode);
      if (found) setSelectedLang(found);
    }
  }, []);

  const handleLanguageChange = async (lang: typeof LANGUAGES[0]) => {
    if (isChanging || lang.code === selectedLang.code) return;

    setSelectedLang(lang);
    setIsOpen(false);
    setIsChanging(true);

    try {
      if (lang.code === 'en') {
        // Reset to English
        resetToEnglish();
        setIsChanging(false);
      } else {
        // Set cookie for persistence
        const domain = window.location.hostname;
        document.cookie = `googtrans=/en/${lang.code}; path=/`;
        document.cookie = `googtrans=/en/${lang.code}; path=/; domain=${domain}`;

        // Trigger translation without page reload
        const success = triggerTranslation(lang.code);

        // Short delay to allow translation to apply
        setTimeout(() => {
          setIsChanging(false);
        }, success ? 300 : 1000);
      }
    } catch (error) {
      console.error('Language change error:', error);
      setIsChanging(false);
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
