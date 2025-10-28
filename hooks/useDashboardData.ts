import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchDashboard, fetchNotifications } from '@/services/api';
import { DashboardResponse, NotificationItem } from '@/types/api';

const fallbackDashboard: DashboardResponse = {
  date: new Date().toISOString().slice(0, 10),
  totalHabits: 4,
  completedHabits: 2,
  completionPercentage: 0.5,
  habits: [
    {
      id: 1,
      slug: 'water',
      name: 'Consumo de Agua',
      icon: 'Droplets',
      color: '#2563eb',
      targetValue: 2000,
      targetUnit: 'ml',
      progressValue: 1500,
      completionRate: 0.75,
      isComplete: false,
      progressText: '1.5L de 2.0L',
    },
    {
      id: 2,
      slug: 'sleep',
      name: 'Sueño',
      icon: 'Moon',
      color: '#7c3aed',
      targetValue: 8,
      targetUnit: 'horas',
      progressValue: 8,
      completionRate: 1,
      isComplete: true,
      progressText: '8 horas de 8 horas',
    },
    {
      id: 3,
      slug: 'exercise',
      name: 'Ejercicio',
      icon: 'Dumbbell',
      color: '#16a34a',
      targetValue: 30,
      targetUnit: 'minutos',
      progressValue: 30,
      completionRate: 1,
      isComplete: true,
      progressText: '30 minutos de 30 minutos',
    },
    {
      id: 4,
      slug: 'nutrition',
      name: 'Alimentación',
      icon: 'Apple',
      color: '#f97316',
      targetValue: 3,
      targetUnit: 'comidas',
      progressValue: 2,
      completionRate: 0.67,
      isComplete: false,
      progressText: '2 comidas de 3 comidas',
    },
  ],
  reminders: [
    {
      id: 1,
      habitId: 1,
      title: '💧 ¡Es hora de beber agua!',
      message: 'Te quedan 500ml para cumplir tu meta diaria.',
      type: 'reminder',
      scheduledFor: null,
      read: false,
    },
  ],
  notifications: [],
};

const fallbackNotifications: NotificationItem[] = [
  {
    id: 1,
    habitId: 1,
    title: '💧 ¡Es hora de beber agua!',
    message: 'Te quedan 500ml para cumplir tu meta diaria.',
    type: 'reminder',
    scheduledFor: null,
    read: false,
    createdAt: new Date().toISOString(),
  },
];

interface UseDashboardDataResult {
  data: DashboardResponse | null;
  notifications: NotificationItem[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useDashboardData(date?: string): UseDashboardDataResult {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (refresh = false) => {
      setError(null);
      setIsLoading((prev) => (refresh ? prev : true));
      setIsRefreshing(refresh);

      try {
        const [dashboardData, notificationsData] = await Promise.all([
          fetchDashboard(date),
          fetchNotifications({ includeRead: true }),
        ]);

        setData(dashboardData);
        setNotifications(notificationsData);
      } catch (err) {
        console.warn('[useDashboardData] Falling back to local data', err);
        if (!data) {
          setData(fallbackDashboard);
        }
        if (!notifications.length) {
          setNotifications(fallbackNotifications);
        }
        setError(err instanceof Error ? err.message : 'No se pudo cargar la información');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [date, data, notifications.length]
  );

  useEffect(() => {
    load();
  }, [load]);

  const refresh = useCallback(async () => {
    await load(true);
  }, [load]);

  const sortedNotifications = useMemo(
    () =>
      [...notifications].sort((a, b) => {
        const timeA = a.scheduledFor ?? a.createdAt;
        const timeB = b.scheduledFor ?? b.createdAt;
        return timeA.localeCompare(timeB);
      }),
    [notifications]
  );

  return {
    data,
    notifications: sortedNotifications,
    isLoading,
    isRefreshing,
    error,
    refresh,
  };
}
