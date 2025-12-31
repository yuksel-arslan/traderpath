import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRewardsStore } from '../stores/useRewardsStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('accessToken');
  const res = await fetch(`${API_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error?.message || 'Request failed');
  }

  return res.json();
}

// Get daily rewards status
export function useDailyRewards() {
  const { setDailyStatus, setLoadingDaily } = useRewardsStore();

  return useQuery({
    queryKey: ['rewards', 'daily'],
    queryFn: async () => {
      setLoadingDaily(true);
      try {
        const res = await fetchWithAuth('/api/rewards/daily');
        setDailyStatus(res.data);
        return res.data;
      } finally {
        setLoadingDaily(false);
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Claim daily login reward
export function useClaimLogin() {
  const queryClient = useQueryClient();
  const { updateLoginClaimed } = useRewardsStore();

  return useMutation({
    mutationFn: async () => {
      const res = await fetchWithAuth('/api/rewards/claim-login', {
        method: 'POST',
      });
      return res.data;
    },
    onSuccess: (data) => {
      updateLoginClaimed(data.credits, data.streakDays);
      queryClient.invalidateQueries({ queryKey: ['rewards', 'daily'] });
      queryClient.invalidateQueries({ queryKey: ['credits'] });
    },
  });
}

// Spin the wheel
export function useSpin() {
  const queryClient = useQueryClient();
  const { updateSpinUsed } = useRewardsStore();

  return useMutation({
    mutationFn: async () => {
      const res = await fetchWithAuth('/api/rewards/spin', {
        method: 'POST',
      });
      return res.data;
    },
    onSuccess: (data) => {
      updateSpinUsed(data.result);
      queryClient.invalidateQueries({ queryKey: ['rewards', 'daily'] });
      queryClient.invalidateQueries({ queryKey: ['credits'] });
    },
  });
}

// Answer daily quiz
export function useAnswerQuiz() {
  const queryClient = useQueryClient();
  const { updateQuizCompleted } = useRewardsStore();

  return useMutation({
    mutationFn: async (answerIndex: number) => {
      const res = await fetchWithAuth('/api/rewards/quiz', {
        method: 'POST',
        body: JSON.stringify({ answerIndex }),
      });
      return res.data;
    },
    onSuccess: (data) => {
      updateQuizCompleted(data.correct, data.credits);
      queryClient.invalidateQueries({ queryKey: ['rewards', 'daily'] });
      if (data.correct) {
        queryClient.invalidateQueries({ queryKey: ['credits'] });
      }
    },
  });
}

// Watch ad for credits
export function useWatchAd() {
  const queryClient = useQueryClient();
  const { updateAdsWatched } = useRewardsStore();

  return useMutation({
    mutationFn: async () => {
      const res = await fetchWithAuth('/api/rewards/watch-ad', {
        method: 'POST',
      });
      return res.data;
    },
    onSuccess: () => {
      updateAdsWatched();
      queryClient.invalidateQueries({ queryKey: ['rewards', 'daily'] });
      queryClient.invalidateQueries({ queryKey: ['credits'] });
    },
  });
}

// Get achievements
export function useAchievements() {
  const { setAchievements, setLoadingAchievements } = useRewardsStore();

  return useQuery({
    queryKey: ['rewards', 'achievements'],
    queryFn: async () => {
      setLoadingAchievements(true);
      try {
        const res = await fetchWithAuth('/api/rewards/achievements');
        setAchievements(res.data.achievements, res.data.unlocked);
        return res.data;
      } finally {
        setLoadingAchievements(false);
      }
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

// Get user level info
export function useUserLevel() {
  return useQuery({
    queryKey: ['user', 'level'],
    queryFn: async () => {
      const res = await fetchWithAuth('/api/users/me');
      return res.data;
    },
    staleTime: 1000 * 60 * 5,
  });
}
