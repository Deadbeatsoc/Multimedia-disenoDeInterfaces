import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
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
  const router = useRouter();
  const { token, refreshReminders, signOut, request } = useAppContext();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (!token) {
        setData(null);
        setNotifications([]);
        setError(null);
        if (mode === 'initial') {
          setIsLoading(false);
        } else {
          setIsRefreshing(false);
        }
        return;
      }

      if (mode === 'initial') {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

      try {
        const payload = await request<DashboardResponse>('/dashboard');
        setData(payload);
        setNotifications(payload.notifications ?? []);
        setError(null);
      } catch (err) {
        const status = (err as { status?: number }).status;
        if (status === 401) {
          setError('Tu sesión ha expirado. Vuelve a iniciar sesión.');
          setData(null);
          setNotifications([]);
          await signOut();
          router.replace('/');
          return;
        }

        setError(
          err instanceof Error ? err.message : 'No se pudo cargar la información.'
        );
      } finally {
        if (mode === 'initial') {
          setIsLoading(false);
        } else {
          setIsRefreshing(false);
        }
      }
    },
    [token, router, signOut, request]
  );

  useEffect(() => {
    fetchDashboard('initial');
  }, [fetchDashboard]);

  const refresh = useCallback(async () => {
    await fetchDashboard('refresh');
    refreshReminders();
  }, [fetchDashboard, refreshReminders]);

  return {
    data,
    notifications,
    isLoading,
    isRefreshing,
    error,
    refresh,
  };
}
