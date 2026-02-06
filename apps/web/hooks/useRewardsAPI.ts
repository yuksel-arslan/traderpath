import { useState, useEffect } from 'react';
import { authFetch } from '../lib/api';

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
  xpReward: number;
  creditReward: number;
  isUnlocked: boolean;
  unlockedAt: Date | null;
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
      setData(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch daily rewards');
      console.error('Daily rewards fetch error:', err);
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
      return response.data;
    } catch (err: any) {
      console.error('Login claim error:', err);
      throw new Error(err.message || 'Failed to claim login reward');
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
      return response.data;
    } catch (err: any) {
      console.error('Spin error:', err);
      throw new Error(err.message || 'Failed to spin wheel');
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
      return response.data;
    } catch (err: any) {
      console.error('Quiz answer error:', err);
      throw new Error(err.message || 'Failed to submit quiz answer');
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
        setData(response.data.achievements);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch achievements');
        console.error('Achievements fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, loading, error };
}

export function useUserLevel() {
  const [data, setData] = useState<{ xp: number; level: number; streakDays: number; referralCode: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await authFetch('/api/user/me');
        setData(response.data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch user level');
        console.error('User level fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, loading, error };
}
