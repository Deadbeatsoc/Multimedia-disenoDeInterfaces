export interface Habit {
  id: string;
  type: 'water' | 'sleep' | 'exercise' | 'nutrition';
  target: number;
  current: number;
  unit: string;
  completed: boolean;
  date: Date;
}

export interface HabitLog {
  id: string;
  habitId: string;
  value: number;
  timestamp: Date;
  notes?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  preferences: UserPreferences;
  goals: Goal[];
}

export interface UserPreferences {
  theme: 'light' | 'dark';
  language: 'es' | 'en';
  notifications: boolean;
  accessibility: {
    highContrast: boolean;
    largeText: boolean;
    screenReader: boolean;
  };
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  deadline: Date;
  completed: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: Date;
}

export interface DailyStats {
  date: Date;
  totalHabits: number;
  completedHabits: number;
  percentage: number;
  streak: number;
}