import { HabitSlug } from './api';

export interface UserProfile {
  id: number | null;
  username: string;
  email: string;
  height: number;
  weight: number;
  age: number;
}

export interface WaterHabitSettings {
  type: 'water';
  reminderIntervalMinutes: number;
  useRecommendedTarget: boolean;
  customTarget: number | null;
  recommendedTarget: number;
}

export interface SleepHabitSettings {
  type: 'sleep';
  bedTime: string;
  wakeTime: string;
  reminderEnabled: boolean;
  reminderAdvanceMinutes: number;
}

export interface NutritionMealConfig {
  id: string;
  label: string;
  time: string;
  enabled: boolean;
}

export interface NutritionHabitSettings {
  type: 'nutrition';
  remindersEnabled: boolean;
  meals: NutritionMealConfig[];
}

export interface ExerciseHabitSettings {
  type: 'exercise';
  reminderEnabled: boolean;
  reminderTime: string;
  dailyGoalMinutes: number;
}

export type HabitSettingsMap = {
  water: WaterHabitSettings;
  sleep: SleepHabitSettings;
  nutrition: NutritionHabitSettings;
  exercise: ExerciseHabitSettings;
};

export interface DailySnapshot {
  date: string;
  completionPercentage: number;
  completedHabits: number;
  totalHabits: number;
}

export interface AppPersistedState {
  user: UserProfile | null;
  settings: HabitSettingsMap;
  history: Record<HabitSlug, string>;
}

export type HabitSettings = HabitSettingsMap[HabitSlug];

