'use client';

// ===========================================
// AI Expert Chat Component
// Interactive Q&A with beautiful answer format
// ===========================================

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet,
  LineChart,
  Shield,
  Target,
  AlertTriangle,
  Brain,
  ChevronRight,
  BookOpen,
  Rocket,
  Lightbulb,
  Sparkles,
  ArrowRight,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  AI_EXPERTS,
  AI_EXPERT_QUESTIONS,
  AI_EXPERT_ANSWERS,
  type AIExpertType,
  type AIExpertAnswer,
} from '@tradepath/types';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Wallet,
  LineChart,
  Shield,
  Target,
  AlertTriangle,
  Brain,
};

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; gradient: string }> = {
  emerald: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-500',
    gradient: 'from-emerald-500 to-teal-500',
  },
  blue: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    text: 'text-blue-500',
    gradient: 'from-blue-500 to-cyan-500',
  },
  orange: {
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    text: 'text-orange-500',
    gradient: 'from-orange-500 to-amber-500',
  },
  purple: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    text: 'text-purple-500',
    gradient: 'from-purple-500 to-indigo-500',
  },
  red: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    text: 'text-red-500',
    gradient: 'from-red-500 to-rose-500',
  },
  pink: {
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/30',
    text: 'text-pink-500',
    gradient: 'from-pink-500 to-rose-500',
  },
};

interface AIExpertChatProps {
  className?: string;
}

export function AIExpertChat({ className }: AIExpertChatProps) {
  const [selectedExpert, setSelectedExpert] = useState<AIExpertType | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const expert = selectedExpert ? AI_EXPERTS.find((e) => e.id === selectedExpert) : null;
  const questions = selectedExpert
    ? AI_EXPERT_QUESTIONS.filter((q) => q.expertId === selectedExpert)
    : [];
  const answer = selectedQuestion ? AI_EXPERT_ANSWERS[selectedQuestion] : null;

  const handleCopyCommand = (command: string) => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBack = () => {
    if (selectedQuestion) {
      setSelectedQuestion(null);
    } else if (selectedExpert) {
      setSelectedExpert(null);
    }
  };

  return (
    <div className={cn('max-w-4xl mx-auto', className)}>
      <AnimatePresence mode="wait">
        {/* Expert Selection */}
        {!selectedExpert && (
          <motion.div
            key="experts"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">AI Trading Experts</h2>
              <p className="text-muted-foreground">
                Sorularını sor, trading bilgini geliştir
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {AI_EXPERTS.map((exp) => {
                const Icon = ICON_MAP[exp.icon] || Brain;
                const colors = COLOR_MAP[exp.color] || COLOR_MAP.blue;

                return (
                  <motion.button
                    key={exp.id}
                    onClick={() => setSelectedExpert(exp.id)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      'p-6 rounded-xl border-2 text-left transition-all',
                      colors.bg,
                      colors.border,
                      'hover:shadow-lg'
                    )}
                  >
                    <div className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center mb-4',
                      `bg-gradient-to-br ${colors.gradient}`
                    )}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className={cn('font-bold text-lg mb-1', colors.text)}>
                      {exp.nameTr}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {exp.descriptionTr}
                    </p>
                    <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                      <span>10 soru</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Question Selection */}
        {selectedExpert && !selectedQuestion && expert && (
          <motion.div
            key="questions"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
              Geri
            </button>

            <div className={cn(
              'p-6 rounded-xl border-2 mb-6',
              COLOR_MAP[expert.color]?.bg,
              COLOR_MAP[expert.color]?.border
            )}>
              <div className="flex items-center gap-4">
                <div className={cn(
                  'w-14 h-14 rounded-xl flex items-center justify-center',
                  `bg-gradient-to-br ${COLOR_MAP[expert.color]?.gradient}`
                )}>
                  {(() => {
                    const Icon = ICON_MAP[expert.icon] || Brain;
                    return <Icon className="w-7 h-7 text-white" />;
                  })()}
                </div>
                <div>
                  <h2 className={cn('text-xl font-bold', COLOR_MAP[expert.color]?.text)}>
                    {expert.nameTr}
                  </h2>
                  <p className="text-muted-foreground">{expert.descriptionTr}</p>
                </div>
              </div>
            </div>

            <h3 className="font-semibold mb-4">Bir soru seç:</h3>
            <div className="space-y-2">
              {questions.map((q, index) => (
                <motion.button
                  key={q.id}
                  onClick={() => setSelectedQuestion(q.id)}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    'w-full p-4 rounded-lg border text-left transition-all',
                    'hover:border-primary hover:bg-accent',
                    'flex items-center gap-3'
                  )}
                >
                  <span className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0',
                    COLOR_MAP[expert.color]?.bg,
                    COLOR_MAP[expert.color]?.text
                  )}>
                    {index + 1}
                  </span>
                  <span className="flex-1">{q.questionTr}</span>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Answer Display */}
        {selectedQuestion && answer && expert && (
          <motion.div
            key="answer"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
              Sorulara Dön
            </button>

            {/* Question Header */}
            <div className={cn(
              'p-4 rounded-xl border-2 mb-6',
              COLOR_MAP[expert.color]?.bg,
              COLOR_MAP[expert.color]?.border
            )}>
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center',
                  `bg-gradient-to-br ${COLOR_MAP[expert.color]?.gradient}`
                )}>
                  {(() => {
                    const Icon = ICON_MAP[expert.icon] || Brain;
                    return <Icon className="w-5 h-5 text-white" />;
                  })()}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{expert.nameTr}</p>
                  <p className="font-semibold">
                    {AI_EXPERT_QUESTIONS.find((q) => q.id === selectedQuestion)?.questionTr}
                  </p>
                </div>
              </div>
            </div>

            {/* Answer Content */}
            <div className="space-y-6">
              {/* Summary */}
              <div className="bg-card border rounded-xl p-6">
                <h3 className="font-bold text-lg mb-4">{answer.summary}</h3>
                <div className="space-y-3">
                  {answer.details.map((detail, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 text-sm"
                    >
                      <ChevronRight className={cn('w-5 h-5 flex-shrink-0 mt-0.5', COLOR_MAP[expert.color]?.text)} />
                      <p
                        className="text-muted-foreground"
                        dangerouslySetInnerHTML={{ __html: detail.replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground">$1</strong>').replace(/`(.*?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-xs">$1</code>') }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* TradePath Feature */}
              <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <ExternalLink className="w-5 h-5 text-blue-500" />
                  <h4 className="font-semibold">TradePath&apos;te Bul</h4>
                </div>
                <p className="text-muted-foreground text-sm">
                  Bu verileri TradePath&apos;te <strong className="text-foreground">{answer.tradePathStep}</strong> altında bulabilirsin.
                </p>
              </div>

              {/* Learned Summary */}
              <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <BookOpen className="w-5 h-5 text-amber-500" />
                  <h4 className="font-semibold text-amber-600 dark:text-amber-400">
                    📚 Bu bilgiyi öğrendin!
                  </h4>
                </div>
                <p className="text-muted-foreground text-sm">{answer.learnedSummary}</p>
              </div>

              {/* CTA */}
              <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Rocket className="w-5 h-5 text-green-500" />
                  <h4 className="font-semibold text-green-600 dark:text-green-400">
                    🚀 Şimdi gerçek verilerle dene!
                  </h4>
                </div>
                <p className="text-muted-foreground text-sm mb-4">{answer.ctaText}</p>
                <div className="text-xs text-muted-foreground">
                  3 kredi ile seçtiğin coin için bu analizi yapabilirim.
                </div>
              </div>

              {/* Report Tip */}
              <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Lightbulb className="w-5 h-5 text-purple-500" />
                  <h4 className="font-semibold text-purple-600 dark:text-purple-400">
                    💡 Raporuna ekle
                  </h4>
                </div>
                <p className="text-muted-foreground text-sm">
                  Bu analizi seçtiğin coin için yaptığında, sonuçları trading raporuna ekleyebilir ve daha güçlü kararlar alabilirsin!
                </p>
              </div>

              {/* Example Command */}
              <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Sparkles className="w-5 h-5 text-cyan-500" />
                  <h4 className="font-semibold text-cyan-600 dark:text-cyan-400">
                    🚀 Bu bilgiyi gerçek bir coin için uygulamak ister misin?
                  </h4>
                </div>
                <p className="text-muted-foreground text-sm mb-4">
                  Herhangi bir coin sembolü gönder ve gerçek analiz yap. Sonucu raporuna ekleyebilirsin!
                </p>

                <div className="bg-background/50 rounded-lg p-4 border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">Örnek talimat:</span>
                    <button
                      onClick={() => handleCopyCommand(answer.exampleCommand)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3 h-3" />
                          Kopyalandı
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          Kopyala
                        </>
                      )}
                    </button>
                  </div>
                  <code className="text-sm font-medium text-foreground">
                    &quot;{answer.exampleCommand}&quot;
                  </code>
                </div>
              </div>

              {/* Related Topics */}
              {answer.relatedTopics.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <span className="text-sm text-muted-foreground">İlgili konular:</span>
                  {answer.relatedTopics.map((topic) => (
                    <span
                      key={topic}
                      className="px-3 py-1 bg-muted rounded-full text-xs font-medium"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              )}

              {/* Action Button */}
              <button
                className={cn(
                  'w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2',
                  'bg-gradient-to-r text-white',
                  COLOR_MAP[expert.color]?.gradient,
                  'hover:opacity-90 transition'
                )}
              >
                Analyze → {answer.tradePathFeature}
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
