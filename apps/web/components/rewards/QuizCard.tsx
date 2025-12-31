'use client';

// ===========================================
// Quiz Card Component
// Daily trading quiz for earning credits
// ===========================================

import { useState } from 'react';
import { Brain, CheckCircle, XCircle, Gem, Loader2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  category: string;
  difficulty: number;
}

interface QuizCardProps {
  question?: QuizQuestion;
  onAnswer?: (correct: boolean) => void;
  disabled?: boolean;
  className?: string;
}

// Default question for demo
const DEFAULT_QUESTION: QuizQuestion = {
  id: 'demo-1',
  question: 'What does RSI stand for in trading?',
  options: [
    'Relative Strength Index',
    'Real Stock Indicator',
    'Rate of Stock Investment',
    'Return on Stock Index',
  ],
  correctIndex: 0,
  explanation:
    'RSI (Relative Strength Index) is a momentum oscillator that measures the speed and magnitude of price movements. It ranges from 0 to 100, with readings above 70 indicating overbought conditions and below 30 indicating oversold conditions.',
  category: 'Technical Analysis',
  difficulty: 1,
};

export function QuizCard({
  question = DEFAULT_QUESTION,
  onAnswer,
  disabled = false,
  className,
}: QuizCardProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<'correct' | 'incorrect' | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  const handleSelect = (index: number) => {
    if (result !== null || disabled) return;
    setSelectedIndex(index);
  };

  const handleSubmit = async () => {
    if (selectedIndex === null || result !== null || disabled) return;

    setIsSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));

    const isCorrect = selectedIndex === question.correctIndex;
    setResult(isCorrect ? 'correct' : 'incorrect');
    setShowExplanation(true);
    setIsSubmitting(false);
    onAnswer?.(isCorrect);
  };

  const getDifficultyLabel = (difficulty: number) => {
    switch (difficulty) {
      case 1:
        return { label: 'Easy', color: 'text-green-500 bg-green-500/20' };
      case 2:
        return { label: 'Medium', color: 'text-yellow-500 bg-yellow-500/20' };
      case 3:
        return { label: 'Hard', color: 'text-red-500 bg-red-500/20' };
      default:
        return { label: 'Unknown', color: 'text-gray-500 bg-gray-500/20' };
    }
  };

  const difficulty = getDifficultyLabel(question.difficulty);

  return (
    <div className={cn('bg-card rounded-lg border overflow-hidden', className)}>
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-500" />
            <span className="font-semibold">Daily Quiz</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn('text-xs px-2 py-1 rounded-full', difficulty.color)}>
              {difficulty.label}
            </span>
            <span className="text-xs text-muted-foreground">{question.category}</span>
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="p-4">
        <p className="text-lg font-medium mb-4">{question.question}</p>

        {/* Options */}
        <div className="space-y-2">
          {question.options.map((option, index) => {
            const isSelected = selectedIndex === index;
            const isCorrectAnswer = question.correctIndex === index;
            const showCorrect = result !== null && isCorrectAnswer;
            const showIncorrect = result === 'incorrect' && isSelected;

            return (
              <motion.button
                key={index}
                onClick={() => handleSelect(index)}
                disabled={result !== null || disabled}
                whileHover={{ scale: result === null && !disabled ? 1.01 : 1 }}
                whileTap={{ scale: result === null && !disabled ? 0.99 : 1 }}
                className={cn(
                  'w-full p-3 rounded-lg border text-left transition-all flex items-center gap-3',
                  result === null && !disabled && 'hover:border-primary hover:bg-accent',
                  isSelected && result === null && 'border-primary bg-primary/10',
                  showCorrect && 'border-green-500 bg-green-500/10',
                  showIncorrect && 'border-red-500 bg-red-500/10',
                  (result !== null || disabled) && 'cursor-default'
                )}
              >
                <span
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0',
                    result === null
                      ? isSelected
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                      : showCorrect
                      ? 'bg-green-500 text-white'
                      : showIncorrect
                      ? 'bg-red-500 text-white'
                      : 'bg-muted'
                  )}
                >
                  {result !== null ? (
                    showCorrect ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : showIncorrect ? (
                      <XCircle className="w-5 h-5" />
                    ) : (
                      String.fromCharCode(65 + index)
                    )
                  ) : (
                    String.fromCharCode(65 + index)
                  )}
                </span>
                <span className="flex-1">{option}</span>
              </motion.button>
            );
          })}
        </div>

        {/* Explanation */}
        <AnimatePresence>
          {showExplanation && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 overflow-hidden"
            >
              <div
                className={cn(
                  'p-4 rounded-lg border',
                  result === 'correct'
                    ? 'bg-green-500/10 border-green-500/20'
                    : 'bg-red-500/10 border-red-500/20'
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  {result === 'correct' ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="font-semibold text-green-500">Correct!</span>
                      <span className="ml-auto flex items-center gap-1 text-amber-500">
                        <Gem className="w-4 h-4" />
                        +5 credits
                      </span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-red-500" />
                      <span className="font-semibold text-red-500">Incorrect</span>
                    </>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{question.explanation}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="p-4 border-t bg-muted/30">
        {result === null ? (
          <button
            onClick={handleSubmit}
            disabled={selectedIndex === null || isSubmitting || disabled}
            className={cn(
              'w-full py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition',
              selectedIndex === null || disabled
                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            )}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Checking...
              </>
            ) : disabled ? (
              'Already Answered Today'
            ) : (
              <>
                Submit Answer
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        ) : (
          <div className="text-center text-sm text-muted-foreground">
            Come back tomorrow for a new quiz!
          </div>
        )}
      </div>
    </div>
  );
}
