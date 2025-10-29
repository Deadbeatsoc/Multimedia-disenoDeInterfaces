import { useCallback, useMemo } from 'react';
import { useAppContext } from '@/context/AppContext';
import { DashboardResponse, NotificationItem } from '@/types/api';

interface UseDashboardDataResult {
  data: DashboardResponse | null;
  notifications: NotificationItem[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useDashboardData(): UseDashboardDataResult {
  const { dashboard, isLoading, refreshReminders } = useAppContext();

  const data = useMemo<DashboardResponse | null>(() => {
    if (!dashboard) {
      return null;
    }

    const summaries = Object.values(dashboard.habits).map((habit) => habit.summary);
    const totalHabits = summaries.length;
    const completedHabits = summaries.filter((habit) => habit.isComplete).length;
    const completionPercentage = totalHabits > 0 ? completedHabits / totalHabits : 0;

    return {
      date: dashboard.date,
      totalHabits,
      completedHabits,
      completionPercentage,
      habits: summaries,
      reminders: dashboard.reminders,
      notifications: dashboard.notifications,
    };
  }, [dashboard]);

  const refresh = useCallback(async () => {
    refreshReminders();
  }, [refreshReminders]);

  return {
    data,
    notifications: dashboard.notifications,
    isLoading,
    isRefreshing: false,
    error: null,
    refresh,
  };
}
