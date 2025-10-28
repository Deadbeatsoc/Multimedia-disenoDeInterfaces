import { API_BASE_URL, DEFAULT_USER_ID } from '@/constants/config';
import { DashboardResponse, HabitLog, NotificationItem } from '@/types/api';

type RequestOptions = RequestInit & { query?: Record<string, string | number | boolean | undefined> };

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const url = new URL(endpoint, API_BASE_URL + '/');
  if (options.query) {
    Object.entries(options.query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.append(key, String(value));
      }
    });
  }

  const response = await fetch(url.toString(), {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    ...options,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Error en la solicitud al servidor');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function fetchDashboard(date?: string, userId: number = DEFAULT_USER_ID) {
  return request<DashboardResponse>('dashboard', {
    method: 'GET',
    query: {
      userId,
      date,
    },
  });
}

export async function fetchHabitLogs(
  habitId: number,
  { date, limit }: { date?: string; limit?: number } = {}
) {
  return request<HabitLog[]>(`habits/${habitId}/logs`, {
    method: 'GET',
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
  return request<HabitLog>(`habits/${habitId}/logs`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchNotifications(options: {
  userId?: number;
  includeRead?: boolean;
  type?: string;
} = {}) {
  return request<NotificationItem[]>('notifications', {
    method: 'GET',
    query: {
      userId: options.userId ?? DEFAULT_USER_ID,
      includeRead: options.includeRead,
      type: options.type,
    },
  });
}

export async function markNotificationAsRead(notificationId: number) {
  return request<{ id: number; readAt: string }>(`notifications/${notificationId}/read`, {
    method: 'PATCH',
  });
}
