import { useState, useEffect } from 'react';
import { authFetch } from '../lib/api';

// ===========================================
// Types - Trader Tier & Analysis Points
// ===========================================

export interface DailyRewardsData {
  login: { claimed: boolean; credits: number };
  spin: { used: boolean; result: number | null };
  quiz: {
    completed: boolean;
    question?: string;
    options?: string[];
    correctAnswer?: number;
  };
  streak: { days: number; nextBonus: number };
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  xpReward: number;       // DB field (internally = AP)
  creditReward: number;
  isUnlocked: boolean;
  unlockedAt: Date | null;
}

export interface TierInfo {
  name: string | null;
  analysisPoints: number;
  currentTier: {
    tier: number;
    name: string;
    color: string;
    gradient: string;
    benefits: string[];
  };
  nextTier: {
    tier: number;
    name: string;
    apRequired: number;
    apRemaining: number;
    benefits: string[];
  } | null;
  progress: number;
  streakDays: number;
  referralCode: string | null;
  totalAnalyses: number;
  allTiers: Array<{
    tier: number;
    name: string;
    apRequired: number;
    benefits: string[];
    color: string;
    gradient: string;
  }>;
  earningRules: Array<{
    action: string;
    points: number;
    description: string;
    category: string;
  }>;
}

// ===========================================
// Hooks
// ===========================================

export function useTierInfo() {
  const [data, setData] = useState<TierInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await authFetch('/api/rewards/tier-info');
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to fetch tier info');
      }
      setData(json.data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message || 'Failed to fetch tier info');
      console.error('Tier info fetch error:', err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return { data, loading, error, refetch: fetchData };
}

export function useDailyRewards() {
  const [data, setData] = useState<DailyRewardsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await authFetch('/api/rewards/daily');
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to fetch daily rewards');
      }
      setData(json.data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message || 'Failed to fetch daily rewards');
      console.error('Daily rewards fetch error:', err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const refetch = () => {
    fetchData();
  };

  return { data, loading, error, refetch };
}

export function useClaimLogin() {
  const [loading, setLoading] = useState(false);

  const claim = async () => {
    try {
      setLoading(true);
      const response = await authFetch('/api/rewards/claim-login', {
        method: 'POST',
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to claim login reward');
      }
      return json.data;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('Login claim error:', err instanceof Error ? err.message : String(err));
      throw new Error(message || 'Failed to claim login reward');
    } finally {
      setLoading(false);
    }
  };

  return { claim, loading };
}

export function useSpin() {
  const [loading, setLoading] = useState(false);

  const spin = async () => {
    try {
      setLoading(true);
      const response = await authFetch('/api/rewards/spin', {
        method: 'POST',
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to spin wheel');
      }
      return json.data;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('Spin error:', err instanceof Error ? err.message : String(err));
      throw new Error(message || 'Failed to spin wheel');
    } finally {
      setLoading(false);
    }
  };

  return { spin, loading };
}

export function useAnswerQuiz() {
  const [loading, setLoading] = useState(false);

  const answer = async (answerIndex: number) => {
    try {
      setLoading(true);
      const response = await authFetch('/api/rewards/quiz', {
        method: 'POST',
        body: JSON.stringify({ answerIndex }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to submit quiz answer');
      }
      return json.data;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('Quiz answer error:', err instanceof Error ? err.message : String(err));
      throw new Error(message || 'Failed to submit quiz answer');
    } finally {
      setLoading(false);
    }
  };

  return { answer, loading };
}

export function useAchievements() {
  const [data, setData] = useState<Achievement[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await authFetch('/api/rewards/achievements');
        const json = await response.json();
        if (!response.ok || !json.success) {
          throw new Error(json.error?.message || 'Failed to fetch achievements');
        }
        setData(json.data.achievements);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message || 'Failed to fetch achievements');
        console.error('Achievements fetch error:', err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, loading, error };
}

// Legacy hook - kept for backward compat, now uses tier-info endpoint internally
export function useUserLevel() {
  const [data, setData] = useState<{ xp: number; level: number; streakDays: number; referralCode: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await authFetch('/api/rewards/tier-info');
        const json = await response.json();
        if (!response.ok || !json.success) {
          throw new Error(json.error?.message || 'Failed to fetch user tier info');
        }
        // Map to legacy format
        setData({
          xp: json.data.analysisPoints,
          level: json.data.currentTier.tier,
          streakDays: json.data.streakDays,
          referralCode: json.data.referralCode || '',
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message || 'Failed to fetch user tier info');
        console.error('User tier info fetch error:', err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, loading, error };
}
