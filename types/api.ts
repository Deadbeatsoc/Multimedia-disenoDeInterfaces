export type HabitSlug = 'water' | 'sleep' | 'exercise' | 'nutrition';

export interface HabitSummary {
  id: number;
  slug: HabitSlug;
  name: string;
  icon: string;
  color: string;
  targetValue: number;
  targetUnit: string;
  progressValue: number;
  completionRate: number;
  isComplete: boolean;
  progressText: string;
}

export interface ReminderItem {
  id: number;
  habitId: number | null;
  title: string;
  message: string;
  type: 'reminder' | 'achievement' | 'alert';
  channel?: 'in_app' | 'push' | 'email';
  scheduledFor: string | null;
  read: boolean;
}

export interface NotificationItem extends ReminderItem {
  channel: 'in_app' | 'push' | 'email';
  createdAt: string;
}

export interface DashboardResponse {
  date: string;
  totalHabits: number;
  completedHabits: number;
  completionPercentage: number;
  habits: HabitSummary[];
  reminders: ReminderItem[];
  notifications: NotificationItem[];
}

export interface HabitLog {
  id: number;
  habitId: number;
  value: number;
  notes: string | null;
  loggedAt: string;
  entryDate?: string;
}
