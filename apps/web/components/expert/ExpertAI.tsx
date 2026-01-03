'use client';

// ===========================================
// Expert AI Component
// Interactive AI chat with real TradePath examples
// ===========================================

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Send,
  Loader2,
  Coins,
  Lightbulb,
  BookOpen,
  TrendingUp,
  Shield,
  AlertTriangle,
  ChevronRight,
  X,
  Sparkles,
  GraduationCap,
  Target,
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface Example {
  type: 'analysis' | 'quiz' | 'pattern';
  title: string;
  description: string;
  details: Record<string, unknown>;
}

interface ExpertResponse {
  answer: string;
  examples: Example[];
  relatedTopics: string[];
}

interface SuggestedCategory {
  category: string;
  questions: string[];
}

interface ExpertAIProps {
  isOpen: boolean;
  onClose: () => void;
  onCreditsUpdate?: (remaining: number) => void;
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  'Teknik Analiz': TrendingUp,
  'Risk Yönetimi': Shield,
  'Balina Davranışları': Target,
  'Piyasa Yapısı': Brain,
  'Manipülasyon': AlertTriangle,
  'Trading Psikolojisi': Lightbulb,
};

export function ExpertAI({ isOpen, onClose, onCreditsUpdate }: ExpertAIProps) {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<ExpertResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [suggestedQuestions, setSuggestedQuestions] = useState<SuggestedCategory[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch suggested questions on mount
  useEffect(() => {
    if (isOpen) {
      fetchSuggestedQuestions();
    }
  }, [isOpen]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [question]);

  const getAuthHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const fetchSuggestedQuestions = async () => {
    try {
      const res = await fetch('/api/expert/suggested-questions', {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setSuggestedQuestions(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch suggestions:', err);
    }
  };

  const handleAsk = async () => {
    if (!question.trim() || loading) return;

    setLoading(true);
    setError(null);
    setShowSuggestions(false);

    try {
      const res = await fetch('/api/expert/ask', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ question: question.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 402) {
          setError('Yetersiz kredi. Uzman AI için 3 kredi gereklidir.');
        } else {
          setError(data.error?.message || 'Bir hata oluştu');
        }
        return;
      }

      setResponse(data.data);
      if (data.remainingCredits !== undefined && onCreditsUpdate) {
        onCreditsUpdate(data.remainingCredits);
      }
    } catch (err) {
      console.error('Expert AI error:', err);
      setError('Bağlantı hatası. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestedClick = (q: string) => {
    setQuestion(q);
    setShowSuggestions(false);
  };

  const handleNewQuestion = () => {
    setQuestion('');
    setResponse(null);
    setError(null);
    setShowSuggestions(true);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-background border border-border rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-cyan-500/10 p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-500 flex items-center justify-center">
                  <Brain className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 text-transparent bg-clip-text">
                    Uzman AI
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    TradePath örnekleriyle zenginleştirilmiş cevaplar
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 rounded-lg border border-amber-500/20">
                  <Coins className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium text-amber-500">3 Kredi</span>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-muted rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Error Display */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive flex items-center gap-2"
              >
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            {/* Response Display */}
            {response && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Answer */}
                <div className="bg-gradient-to-r from-purple-500/5 via-blue-500/5 to-cyan-500/5 rounded-xl p-6 border border-purple-500/10">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-purple-500 mb-3">Uzman Yanıtı</h3>
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        {response.answer.split('\n').map((paragraph, i) => (
                          <p key={i} className="mb-3 last:mb-0 leading-relaxed">
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Examples */}
                {response.examples.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-4 flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-amber-500" />
                      TradePath Örnekleri
                    </h4>
                    <div className="grid gap-4">
                      {response.examples.map((example, i) => (
                        <div
                          key={i}
                          className={cn(
                            'p-4 rounded-xl border',
                            example.type === 'analysis' && 'bg-green-500/5 border-green-500/20',
                            example.type === 'quiz' && 'bg-amber-500/5 border-amber-500/20',
                            example.type === 'pattern' && 'bg-blue-500/5 border-blue-500/20'
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={cn(
                                'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                                example.type === 'analysis' && 'bg-green-500/10',
                                example.type === 'quiz' && 'bg-amber-500/10',
                                example.type === 'pattern' && 'bg-blue-500/10'
                              )}
                            >
                              {example.type === 'analysis' && <TrendingUp className="w-4 h-4 text-green-500" />}
                              {example.type === 'quiz' && <GraduationCap className="w-4 h-4 text-amber-500" />}
                              {example.type === 'pattern' && <Target className="w-4 h-4 text-blue-500" />}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span
                                  className={cn(
                                    'text-xs px-2 py-0.5 rounded',
                                    example.type === 'analysis' && 'bg-green-500/10 text-green-500',
                                    example.type === 'quiz' && 'bg-amber-500/10 text-amber-500',
                                    example.type === 'pattern' && 'bg-blue-500/10 text-blue-500'
                                  )}
                                >
                                  {example.type === 'analysis' && 'Gerçek Analiz'}
                                  {example.type === 'quiz' && 'Eğitim'}
                                  {example.type === 'pattern' && 'Pattern'}
                                </span>
                                <span className="font-medium text-sm">{example.title}</span>
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                {example.description}
                              </p>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                {Object.entries(example.details).slice(0, 4).map(([key, value]) => (
                                  <div key={key} className="flex items-center gap-1">
                                    <span className="text-muted-foreground">{key}:</span>
                                    <span className="font-medium">
                                      {typeof value === 'string' || typeof value === 'number'
                                        ? String(value)
                                        : JSON.stringify(value)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Related Topics */}
                {response.relatedTopics.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3 text-sm text-muted-foreground">
                      İlgili Konular
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {response.relatedTopics.map((topic, i) => (
                        <button
                          key={i}
                          onClick={() => setQuestion(topic)}
                          className="px-3 py-1.5 bg-muted rounded-full text-sm hover:bg-muted/80 transition flex items-center gap-1"
                        >
                          <span>{topic}</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* New Question Button */}
                <div className="flex justify-center pt-4 border-t">
                  <button
                    onClick={handleNewQuestion}
                    className="px-6 py-3 bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 text-white rounded-xl font-semibold hover:opacity-90 transition flex items-center gap-2"
                  >
                    <Sparkles className="w-5 h-5" />
                    Yeni Soru Sor
                  </button>
                </div>
              </motion.div>
            )}

            {/* Suggested Questions */}
            {showSuggestions && !response && !loading && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold mb-2">Uzman AI'ye Ne Sormak İstersiniz?</h3>
                  <p className="text-sm text-muted-foreground">
                    Aşağıdaki önerilerden seçin veya kendi sorunuzu yazın
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {suggestedQuestions.map((category, catIndex) => {
                    const Icon = CATEGORY_ICONS[category.category] || Brain;
                    return (
                      <div key={catIndex} className="bg-muted/30 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Icon className="w-5 h-5 text-primary" />
                          <h4 className="font-medium">{category.category}</h4>
                        </div>
                        <div className="space-y-2">
                          {category.questions.map((q, qIndex) => (
                            <button
                              key={qIndex}
                              onClick={() => handleSuggestedClick(q)}
                              className="w-full text-left text-sm p-2 rounded-lg hover:bg-muted transition flex items-center gap-2 group"
                            >
                              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition" />
                              <span>{q}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 flex items-center justify-center mb-4 animate-pulse">
                  <Brain className="w-8 h-8 text-white animate-bounce" />
                </div>
                <p className="text-lg font-medium">Uzman yanıt hazırlıyor...</p>
                <p className="text-sm text-muted-foreground mt-2">
                  TradePath örnekleri araştırılıyor
                </p>
              </div>
            )}
          </div>

          {/* Input Area */}
          {!response && (
            <div className="p-4 border-t border-border bg-muted/30">
              <div className="flex gap-3">
                <textarea
                  ref={textareaRef}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAsk();
                    }
                  }}
                  placeholder="Sorunuzu yazın... (En az 10 karakter)"
                  className="flex-1 bg-background border border-border rounded-xl px-4 py-3 resize-none max-h-32 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  rows={1}
                  disabled={loading}
                />
                <button
                  onClick={handleAsk}
                  disabled={loading || question.trim().length < 10}
                  className={cn(
                    'px-6 rounded-xl font-semibold transition flex items-center gap-2',
                    question.trim().length >= 10
                      ? 'bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 text-white hover:opacity-90'
                      : 'bg-muted text-muted-foreground cursor-not-allowed'
                  )}
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      <span className="hidden sm:inline">Sor (3 Kredi)</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Shift+Enter ile yeni satır ekleyebilirsiniz
              </p>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Export a trigger button component
interface ExpertAITriggerProps {
  onClick: () => void;
  className?: string;
}

export function ExpertAITrigger({ onClick, className }: ExpertAITriggerProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition',
        'bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-cyan-500/10',
        'border border-purple-500/20 hover:border-purple-500/40',
        'hover:shadow-lg hover:shadow-purple-500/10',
        className
      )}
    >
      <Brain className="w-5 h-5 text-purple-500" />
      <span className="bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 text-transparent bg-clip-text">
        Uzman AI
      </span>
      <span className="text-xs px-1.5 py-0.5 bg-amber-500/10 text-amber-500 rounded ml-1">
        3 Kredi
      </span>
    </button>
  );
}
