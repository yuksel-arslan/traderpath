'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { toast } from 'sonner';
import { CelebrationModal, CelebrationReason } from '../components/modals/CelebrationModal';

interface CelebrationData {
  credits: number;
  reason: CelebrationReason;
  title?: string;
  subtitle?: string;
  streakDays?: number;
  achievementName?: string;
  newLevel?: string;
  milestone?: number;
}

interface CreditNotificationContextType {
  // Show credit deduction notification
  notifyCreditDeduction: (amount: number, service: string, remainingBalance: number) => void;
  // Show credit addition notification (without celebration)
  notifyCreditAddition: (amount: number, source: string, remainingBalance: number) => void;
  // Show celebration modal with confetti
  showCelebration: (data: CelebrationData) => void;
  // Show insufficient credits warning
  notifyInsufficientCredits: (required: number, current: number) => void;
}

const CreditNotificationContext = createContext<CreditNotificationContextType | null>(null);

// Service name mapping for user-friendly display
const SERVICE_NAMES: Record<string, string> = {
  analysis: 'Analysis',
  analysis_purchase: 'Analysis',
  ai_expert_question: 'AI Expert Question',
  pdf_download: 'PDF Download',
  email_send: 'Email Report',
  alert_create: 'Price Alert',
  scheduled_analysis: 'Scheduled Analysis',
  contract_security: 'Contract Security Check',
  translation: 'Translation',
  top_coins_scan: 'Top Coins Scan',
};

// Source name mapping
const SOURCE_NAMES: Record<string, string> = {
  daily_login: 'Daily Login',
  daily_spin: 'Lucky Spin',
  daily_quiz: 'Quiz Reward',
  daily_10_analysis_bonus: '10 Analysis Bonus',
  trade_type_bonus: 'Trade Type Bonus',
  referral: 'Referral Bonus',
  achievement: 'Achievement Reward',
  credit_purchase: 'Credit Purchase',
  welcome_bonus: 'Welcome Bonus',
  first_login: 'First Login Bonus',
};

export function CreditNotificationProvider({ children }: { children: ReactNode }) {
  const [celebration, setCelebration] = useState<CelebrationData | null>(null);

  const notifyCreditDeduction = useCallback((amount: number, service: string, remainingBalance: number) => {
    const serviceName = SERVICE_NAMES[service] || service;
    toast.info(
      <div className="flex flex-col gap-0.5">
        <span className="font-medium">-{amount} Credits Used</span>
        <span className="text-sm text-slate-400">{serviceName}</span>
        <span className="text-xs text-slate-500">Remaining: {remainingBalance} credits</span>
      </div>,
      {
        duration: 4000,
        icon: (
          <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        ),
      }
    );
  }, []);

  const notifyCreditAddition = useCallback((amount: number, source: string, remainingBalance: number) => {
    const sourceName = SOURCE_NAMES[source] || source;
    toast.success(
      <div className="flex flex-col gap-0.5">
        <span className="font-medium">+{amount} Credits Earned!</span>
        <span className="text-sm text-slate-400">{sourceName}</span>
        <span className="text-xs text-slate-500">Balance: {remainingBalance} credits</span>
      </div>,
      {
        duration: 4000,
        icon: (
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        ),
      }
    );
  }, []);

  const showCelebration = useCallback((data: CelebrationData) => {
    setCelebration(data);
  }, []);

  const notifyInsufficientCredits = useCallback((required: number, current: number) => {
    const needed = required - current;
    toast.error(
      <div className="flex flex-col gap-0.5">
        <span className="font-medium">Insufficient Credits</span>
        <span className="text-sm text-slate-400">Required: {required} credits</span>
        <span className="text-xs text-slate-500">You need {needed} more credits</span>
      </div>,
      {
        duration: 5000,
        action: {
          label: 'Buy Credits',
          onClick: () => {
            window.location.href = '/pricing';
          },
        },
        icon: (
          <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        ),
      }
    );
  }, []);

  const handleCloseCelebration = useCallback(() => {
    setCelebration(null);
  }, []);

  return (
    <CreditNotificationContext.Provider
      value={{
        notifyCreditDeduction,
        notifyCreditAddition,
        showCelebration,
        notifyInsufficientCredits,
      }}
    >
      {children}
      {celebration && (
        <CelebrationModal
          isOpen={!!celebration}
          onClose={handleCloseCelebration}
          credits={celebration.credits}
          reason={celebration.reason}
          title={celebration.title}
          subtitle={celebration.subtitle}
          streakDays={celebration.streakDays}
          achievementName={celebration.achievementName}
          newLevel={celebration.newLevel}
          milestone={celebration.milestone}
        />
      )}
    </CreditNotificationContext.Provider>
  );
}

export function useCreditNotification() {
  const context = useContext(CreditNotificationContext);
  if (!context) {
    throw new Error('useCreditNotification must be used within a CreditNotificationProvider');
  }
  return context;
}
