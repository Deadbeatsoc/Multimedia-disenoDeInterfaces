import { apiFetch } from '@/services/httpClient';
import type { ApiRequestOptions } from '@/services/httpClient';
import { DashboardResponse, HabitLog, NotificationItem } from '@/types/api';

const authenticatedGet = <T>(endpoint: string, options: ApiRequestOptions = {}) =>
  apiFetch<T>(endpoint, { ...options, method: options.method ?? 'GET' });

export async function fetchDashboard(date?: string) {
  return authenticatedGet<DashboardResponse>('/dashboard', {
    query: {
      date,
    },
  });
}

export async function fetchHabitLogs(
  habitId: number,
  { date, limit }: { date?: string; limit?: number } = {}
) {
  return authenticatedGet<HabitLog[]>(`/habits/${habitId}/logs`, {
    query: {
      date,
      limit,
    },
  });
}

export async function logHabitEntry(
  habitId: number,
  payload: { value: number; notes?: string; loggedAt?: string }
) {
  return apiFetch<HabitLog>(`/habits/${habitId}/logs`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchNotifications(options: {
  includeRead?: boolean;
  type?: string;
} = {}) {
  return authenticatedGet<NotificationItem[]>('/notifications', {
    query: {
      includeRead: options.includeRead,
      type: options.type,
    },
  });
}

export async function markNotificationAsRead(notificationId: number) {
  return apiFetch<{ id: number; readAt: string }>(`/notifications/${notificationId}/read`, {
    method: 'PATCH',
  });
}

