'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Loader2 } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export function ChatInput({
  onSend,
  isLoading = false,
  placeholder = 'Mesajınızı yazın...',
  disabled = false,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Check for speech recognition support
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as Window & { SpeechRecognition?: typeof window.SpeechRecognition; webkitSpeechRecognition?: typeof window.SpeechRecognition }).SpeechRecognition ||
        (window as Window & { webkitSpeechRecognition?: typeof window.SpeechRecognition }).webkitSpeechRecognition;

      if (SpeechRecognition) {
        setSpeechSupported(true);
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'tr-TR';

        recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
          const transcript = Array.from(event.results)
            .map((result) => result[0].transcript)
            .join('');
          setMessage(transcript);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current.onerror = () => {
          setIsListening(false);
        };
      }
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading && !disabled) {
      onSend(message.trim());
      setMessage('');
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch {
        // Already started or error
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/50 rounded-2xl p-2 border border-slate-200 dark:border-slate-700/50 focus-within:border-teal-500/50 focus-within:ring-2 focus-within:ring-teal-500/20 transition-all">
        <input
          ref={inputRef}
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          className="flex-1 bg-transparent border-none outline-none px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
        />

        {/* Voice input button */}
        {speechSupported && (
          <button
            type="button"
            onClick={toggleListening}
            disabled={disabled || isLoading}
            className={`p-2 rounded-xl transition-all ${
              isListening
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600'
            }`}
            title={isListening ? 'Dinlemeyi durdur' : 'Sesle yazın'}
          >
            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
        )}

        {/* Send button */}
        <button
          type="submit"
          disabled={!message.trim() || isLoading || disabled}
          className={`p-2 rounded-xl transition-all ${
            message.trim() && !isLoading && !disabled
              ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white hover:from-teal-600 hover:to-teal-700 shadow-lg shadow-teal-500/25'
              : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Send size={18} />
          )}
        </button>
      </div>

      {/* Listening indicator */}
      {isListening && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-3 py-1 bg-red-500 text-white text-sm rounded-full animate-pulse">
          🎤 Dinleniyor...
        </div>
      )}
    </form>
  );
}
