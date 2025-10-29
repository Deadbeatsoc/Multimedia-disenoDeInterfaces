import { useCallback, useEffect, useState } from 'react';
import Constants from 'expo-constants';
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

const resolveApiUrl = () => {
  const extra =
    Constants?.expoConfig?.extra ??
    ((Constants as unknown as { manifest?: { extra?: Record<string, unknown> } }).manifest?.extra ?? {});
  return (extra?.apiUrl as string | undefined) ?? process.env.EXPO_PUBLIC_API_URL ?? '';
};

const API_URL = resolveApiUrl();

const parseErrorResponse = async (response: Response) => {
  const fallback = 'No se pudo completar la solicitud. Intenta nuevamente.';
  const text = await response.text();
  if (!text) {
    return fallback;
  }

  try {
    const data = JSON.parse(text);
    if (typeof data?.message === 'string') {
      return data.message;
    }
    if (typeof data?.error === 'string') {
      return data.error;
    }
  } catch {
    return text;
  }

  return fallback;
};

export function useDashboardData(): UseDashboardDataResult {
  const router = useRouter();
  const { token, refreshReminders, signOut } = useAppContext();
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
        const response = await fetch(`${API_URL}/dashboard`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.status === 401) {
          setError('Tu sesión ha expirado. Vuelve a iniciar sesión.');
          setData(null);
          setNotifications([]);
          await signOut();
          router.replace('/');
          return;
        }

        if (!response.ok) {
          const message = await parseErrorResponse(response);
          throw new Error(message);
        }

        const payload = (await response.json()) as DashboardResponse;
        setData(payload);
        setNotifications(payload.notifications ?? []);
        setError(null);
      } catch (err) {
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
    [token, router, signOut]
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
