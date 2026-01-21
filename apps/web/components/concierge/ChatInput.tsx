'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Loader2 } from 'lucide-react';

// Web Speech API type declarations
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: Event) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => ISpeechRecognition;
    webkitSpeechRecognition?: new () => ISpeechRecognition;
  }
}

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export function ChatInput({
  onSend,
  isLoading = false,
  placeholder = 'Type your message...',
  disabled = false,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);

  // Check for speech recognition support
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;

      if (SpeechRecognitionClass) {
        setSpeechSupported(true);
        const recognition = new SpeechRecognitionClass();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let transcript = '';
          for (let i = 0; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          setMessage(transcript);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognition.onerror = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
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
      {/* Listening indicator - more prominent */}
      {isListening && (
        <div className="absolute -top-12 left-0 right-0 flex items-center justify-center gap-2">
          <div className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-full shadow-lg shadow-red-500/50">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
            </span>
            🎤 Listening... Speak now
          </div>
        </div>
      )}

      <div className={`flex items-center gap-2 rounded-2xl p-2 border transition-all ${
        isListening
          ? 'bg-red-50 dark:bg-red-900/20 border-red-500 ring-2 ring-red-500/30'
          : 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50 focus-within:border-teal-500/50 focus-within:ring-2 focus-within:ring-teal-500/20'
      }`}>
        <input
          ref={inputRef}
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={isListening ? '🎤 Speak now...' : placeholder}
          disabled={disabled || isLoading}
          className="flex-1 bg-transparent border-none outline-none px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
        />

        {/* Voice input button */}
        {speechSupported && (
          <button
            type="button"
            onClick={toggleListening}
            disabled={disabled || isLoading}
            className={`relative p-2.5 rounded-xl transition-all ${
              isListening
                ? 'bg-red-500 text-white shadow-lg shadow-red-500/50'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600'
            }`}
            title={isListening ? 'Stop listening' : 'Voice input'}
          >
            {isListening && (
              <span className="absolute inset-0 rounded-xl animate-ping bg-red-500 opacity-50"></span>
            )}
            {isListening ? <MicOff size={20} className="relative z-10" /> : <Mic size={20} />}
          </button>
        )}

        {/* Send button */}
        <button
          type="submit"
          disabled={!message.trim() || isLoading || disabled}
          className={`p-2.5 rounded-xl transition-all ${
            message.trim() && !isLoading && !disabled
              ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white hover:from-teal-600 hover:to-teal-700 shadow-lg shadow-teal-500/25'
              : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <Send size={20} />
          )}
        </button>
      </div>

      {/* Speech not supported message */}
      {!speechSupported && (
        <p className="text-xs text-slate-500 mt-1 text-center">
          Voice input requires HTTPS and a supported browser
        </p>
      )}
    </form>
  );
}
