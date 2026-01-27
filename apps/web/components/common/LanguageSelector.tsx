'use client';

import { useState, useEffect, useRef } from 'react';
import { Globe, ChevronDown } from 'lucide-react';

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
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]);
  const [isLoaded, setIsLoaded] = useState(false);
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

  const handleLanguageChange = (lang: typeof LANGUAGES[0]) => {
    setSelectedLang(lang);
    setIsOpen(false);

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
          return;
        }
      }
    }

    // Fallback: reload to apply translation
    if (lang.code !== 'en') {
      window.location.reload();
    } else {
      // Reset to English
      document.cookie = 'googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = `googtrans=; path=/; domain=${domain}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
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
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition ${
            compact ? 'text-sm' : ''
          }`}
          aria-label="Select language"
        >
          <Globe className={compact ? 'w-4 h-4' : 'w-4 h-4'} />
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
