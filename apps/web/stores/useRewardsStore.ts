import { create } from 'zustand';
import type { DailyRewards, Achievement, UserAchievement } from '@traderpath/types';

interface RewardsState {
  // Daily rewards status
  dailyStatus: DailyRewards | null;
  isLoadingDaily: boolean;

  // Achievements
  achievements: Achievement[];
  userAchievements: UserAchievement[];
  isLoadingAchievements: boolean;

  // Actions
  setDailyStatus: (status: DailyRewards) => void;
  setAchievements: (achievements: Achievement[], userAchievements: UserAchievement[]) => void;
  updateLoginClaimed: (credits: number, streakDays: number) => void;
  updateSpinUsed: (result: number) => void;
  updateQuizCompleted: (correct: boolean, credits: number) => void;
  updateAdsWatched: () => void;
  unlockAchievement: (achievementId: string) => void;
  setLoadingDaily: (loading: boolean) => void;
  setLoadingAchievements: (loading: boolean) => void;
  reset: () => void;
}

const initialState = {
  dailyStatus: null,
  isLoadingDaily: false,
  achievements: [],
  userAchievements: [],
  isLoadingAchievements: false,
};

export const useRewardsStore = create<RewardsState>((set) => ({
  ...initialState,

  setDailyStatus: (status) => set({ dailyStatus: status }),

  setAchievements: (achievements, userAchievements) =>
    set({ achievements, userAchievements }),

  updateLoginClaimed: (credits, streakDays) =>
    set((state) => ({
      dailyStatus: state.dailyStatus
        ? {
            ...state.dailyStatus,
            login: { claimed: true, credits },
            streak: {
              ...state.dailyStatus.streak,
              days: streakDays,
            },
          }
        : null,
    })),

  updateSpinUsed: (result) =>
    set((state) => ({
      dailyStatus: state.dailyStatus
        ? {
            ...state.dailyStatus,
            spin: { used: true, result },
          }
        : null,
    })),

  updateQuizCompleted: (correct, credits) =>
    set((state) => ({
      dailyStatus: state.dailyStatus
        ? {
            ...state.dailyStatus,
            quiz: {
              ...state.dailyStatus.quiz,
              completed: true,
            },
          }
        : null,
    })),

  updateAdsWatched: () =>
    set((state) => ({
      dailyStatus: state.dailyStatus
        ? {
            ...state.dailyStatus,
            ads: {
              ...state.dailyStatus.ads,
              watched: state.dailyStatus.ads.watched + 1,
            },
          }
        : null,
    })),

  unlockAchievement: (achievementId) =>
    set((state) => ({
      userAchievements: state.userAchievements.map((ua) =>
        ua.achievementId === achievementId
          ? { ...ua, isUnlocked: true, unlockedAt: new Date() }
          : ua
      ),
    })),

  setLoadingDaily: (loading) => set({ isLoadingDaily: loading }),

  setLoadingAchievements: (loading) => set({ isLoadingAchievements: loading }),

  reset: () => set(initialState),
}));
