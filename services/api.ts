import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { DashboardResponse, HabitLog, NotificationItem } from '@/types/api';

const AUTH_TOKEN_KEY = 'auth_token';

const resolveApiUrl = () => {
  const extra =
    Constants?.expoConfig?.extra ??
    ((Constants as unknown as { manifest?: { extra?: Record<string, unknown> } }).manifest?.extra ?? {});
  return (extra?.apiUrl as string | undefined) ?? process.env.EXPO_PUBLIC_API_URL ?? '';
};

const API_BASE_URL = resolveApiUrl();

type RequestOptions = RequestInit & {
  query?: Record<string, string | number | boolean | undefined>;
  skipAuth?: boolean;
};

const parseApiPayload = (text: string) => {
  if (!text) {
    return undefined;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const mergeHeaders = (base: Record<string, string>, extra?: HeadersInit): Record<string, string> => {
  if (!extra) {
    return base;
  }

  if (extra instanceof Headers) {
    extra.forEach((value, key) => {
      base[key] = value;
    });
    return base;
  }

  return { ...base, ...(extra as Record<string, string>) };
};

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { query, skipAuth, headers: customHeaders, ...init } = options;
  const base = API_BASE_URL.endsWith('/') ? API_BASE_URL : `${API_BASE_URL}/`;
  const path = endpoint.replace(/^\//, '');
  const url = new URL(path, base);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.append(key, String(value));
      }
    });
  }

  let token: string | null = null;
  if (!skipAuth) {
    token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  }

  const headers = mergeHeaders(
    {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    customHeaders
  );

  const response = await fetch(url.toString(), {
    ...init,
    headers,
  });

  const text = await response.text();
  const payload = parseApiPayload(text);

  if (!response.ok) {
    const message =
      (payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string'
        ? payload.message
        : undefined) || (typeof payload === 'string' && payload) ||
      'Error en la solicitud al servidor';
    const error = new Error(message) as Error & { status?: number; payload?: unknown };
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload as T;
}

export async function fetchDashboard(date?: string) {
  return request<DashboardResponse>('/dashboard', {
    method: 'GET',
    query: {
      date,
    },
  });
}

export async function fetchHabitLogs(
  habitId: number,
  { date, limit }: { date?: string; limit?: number } = {}
) {
  return request<HabitLog[]>(`/habits/${habitId}/logs`, {
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
  return request<HabitLog>(`/habits/${habitId}/logs`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchNotifications(options: {
  includeRead?: boolean;
  type?: string;
} = {}) {
  return request<NotificationItem[]>('/notifications', {
    method: 'GET',
    query: {
      includeRead: options.includeRead,
      type: options.type,
    },
  });
}

export async function markNotificationAsRead(notificationId: number) {
  return request<{ id: number; readAt: string }>(`/notifications/${notificationId}/read`, {
    method: 'PATCH',
  });
}
