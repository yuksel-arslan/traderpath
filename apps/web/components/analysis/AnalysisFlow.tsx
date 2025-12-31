'use client';

// ===========================================
// 7-Step Analysis Flow Component
// ===========================================

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe,
  Target,
  Shield,
  Clock,
  FileText,
  AlertTriangle,
  CheckCircle,
  Lock,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CREDIT_COSTS } from '@tradepath/types';
import { MarketPulse } from './MarketPulse';
import { AssetScanner } from './AssetScanner';
import { SafetyCheck } from './SafetyCheck';
import { TimingAnalysis } from './TimingAnalysis';
import { TradePlan } from './TradePlan';
import { TrapCheck } from './TrapCheck';
import { FinalVerdict } from './FinalVerdict';

interface AnalysisFlowProps {
  symbol: string;
  onComplete?: () => void;
}

const STEPS = [
  {
    id: 1,
    name: 'Market Pulse',
    icon: Globe,
    cost: CREDIT_COSTS.STEP_MARKET_PULSE,
    description: 'Overall market analysis',
  },
  {
    id: 2,
    name: 'Asset Scanner',
    icon: Target,
    cost: CREDIT_COSTS.STEP_ASSET_SCANNER,
    description: 'Coin-specific forecast',
  },
  {
    id: 3,
    name: 'Safety Check',
    icon: Shield,
    cost: CREDIT_COSTS.STEP_SAFETY_CHECK,
    description: 'Manipulation detection',
  },
  {
    id: 4,
    name: 'Timing',
    icon: Clock,
    cost: CREDIT_COSTS.STEP_TIMING,
    description: 'Entry zone calculation',
  },
  {
    id: 5,
    name: 'Trade Plan',
    icon: FileText,
    cost: CREDIT_COSTS.STEP_TRADE_PLAN,
    description: 'Full trading plan',
  },
  {
    id: 6,
    name: 'Trap Check',
    icon: AlertTriangle,
    cost: CREDIT_COSTS.STEP_TRAP_CHECK,
    description: 'Liquidation analysis',
  },
  {
    id: 7,
    name: 'Final Verdict',
    icon: CheckCircle,
    cost: CREDIT_COSTS.STEP_FINAL_VERDICT,
    description: 'Overall recommendation',
  },
];

export function AnalysisFlow({ symbol, onComplete }: AnalysisFlowProps) {
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [loading, setLoading] = useState<number | null>(null);
  const [results, setResults] = useState<Record<number, unknown>>({});

  const handleStepClick = async (stepId: number) => {
    // Check if step is unlocked
    if (stepId > 1 && !completedSteps.includes(stepId - 1)) {
      return; // Previous step not completed
    }

    if (completedSteps.includes(stepId)) {
      // Already completed, just show results
      setActiveStep(stepId);
      return;
    }

    // Run analysis for this step
    setLoading(stepId);
    try {
      // TODO: Call API to run analysis step
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate API call

      setCompletedSteps((prev) => [...prev, stepId]);
      setResults((prev) => ({
        ...prev,
        [stepId]: { /* mock result */ },
      }));
      setActiveStep(stepId);
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setLoading(null);
    }
  };

  const isStepUnlocked = (stepId: number) => {
    if (stepId === 1) return true;
    return completedSteps.includes(stepId - 1);
  };

  const isStepCompleted = (stepId: number) => completedSteps.includes(stepId);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8 px-4">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const unlocked = isStepUnlocked(step.id);
          const completed = isStepCompleted(step.id);
          const isLoading = loading === step.id;
          const isActive = activeStep === step.id;

          return (
            <div key={step.id} className="flex items-center">
              {/* Step Circle */}
              <button
                onClick={() => handleStepClick(step.id)}
                disabled={!unlocked || isLoading}
                className={cn(
                  'relative flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all',
                  completed && 'bg-green-500 border-green-500 text-white',
                  isActive && !completed && 'bg-blue-500 border-blue-500 text-white',
                  !unlocked && 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed',
                  unlocked && !completed && !isActive && 'bg-white border-blue-500 text-blue-500 hover:bg-blue-50',
                  isLoading && 'animate-pulse'
                )}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : !unlocked ? (
                  <Lock className="w-5 h-5" />
                ) : completed ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <Icon className="w-5 h-5" />
                )}

                {/* Credit Cost Badge */}
                {step.cost > 0 && !completed && (
                  <span className="absolute -top-2 -right-2 bg-amber-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                    {step.cost}
                  </span>
                )}
              </button>

              {/* Connector Line */}
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    'w-8 h-0.5 mx-1',
                    isStepCompleted(step.id + 1) ? 'bg-green-500' : 'bg-gray-300'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Labels */}
      <div className="flex items-center justify-between mb-8 px-2">
        {STEPS.map((step) => (
          <div key={step.id} className="text-center w-16">
            <p className="text-xs font-medium truncate">{step.name}</p>
            <p className="text-[10px] text-muted-foreground">
              {step.cost === 0 ? 'FREE' : `${step.cost} credits`}
            </p>
          </div>
        ))}
      </div>

      {/* Active Step Content */}
      <AnimatePresence mode="wait">
        {activeStep && (
          <motion.div
            key={activeStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-card rounded-lg border p-6"
          >
            {activeStep === 1 && <MarketPulse data={results[1]} />}
            {activeStep === 2 && <AssetScanner data={results[2]} symbol={symbol} />}
            {activeStep === 3 && <SafetyCheck data={results[3]} symbol={symbol} />}
            {activeStep === 4 && <TimingAnalysis data={results[4]} symbol={symbol} />}
            {activeStep === 5 && <TradePlan data={results[5]} symbol={symbol} />}
            {activeStep === 6 && <TrapCheck data={results[6]} symbol={symbol} />}
            {activeStep === 7 && <FinalVerdict data={results[7]} symbol={symbol} />}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full Analysis Bundle CTA */}
      {completedSteps.length === 0 && (
        <div className="mt-8 p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-500/20">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Full Analysis Bundle</h3>
              <p className="text-sm text-muted-foreground">
                Get all 7 steps at once and save 25%
              </p>
            </div>
            <button className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium hover:opacity-90 transition">
              Run Full Analysis (15 credits)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
