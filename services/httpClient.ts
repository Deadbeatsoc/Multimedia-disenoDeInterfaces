import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL as FALLBACK_API_BASE_URL, resolveApiBaseUrl } from '@/constants/config';

export const AUTH_TOKEN_KEY = 'auth_token';

export type ApiRequestOptions = RequestInit & {
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

const mergeHeaders = (
  base: Record<string, string>,
  extra?: HeadersInit
): Record<string, string> => {
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

const buildApiUrl = (endpoint: string, query?: ApiRequestOptions['query']) => {
  const baseUrl = resolveApiBaseUrl() || FALLBACK_API_BASE_URL;
  if (!baseUrl) {
    throw new Error('No se ha configurado la URL base de la API.');
  }
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const path = endpoint.replace(/^\//, '');
  const url = new URL(path, base);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.append(key, String(value));
      }
    });
  }

  return url;
};

export const getStoredToken = () => AsyncStorage.getItem(AUTH_TOKEN_KEY);
export const setStoredToken = (token: string) => AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
export const clearStoredToken = () => AsyncStorage.removeItem(AUTH_TOKEN_KEY);

// En httpClient.ts, reemplaza la función decodeBase64Url:

const decodeBase64Url = (segment: string): string => {
  // Normalizar el Base64 URL a Base64 estándar
  const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padding = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + '='.repeat(padding);

  try {
    // Intenta usar atob si está disponible (navegador/Expo)
    if (typeof atob !== 'undefined') {
      return atob(padded);
    }
    
    // Fallback para Node.js/entornos sin atob
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(padded, 'base64').toString('utf-8');
    }
    
    throw new Error('No hay decodificador Base64 disponible');
  } catch (error) {
    console.error('Error decodificando Base64:', error);
    throw new Error('No se pudo decodificar el token JWT');
  }
};

export const extractUserIdFromToken = (token: string | null | undefined): number | null => {
  if (!token) {
    return null;
  }

  const parts = token.split('.');
  if (parts.length < 2) {
    return null;
  }

  try {
    const payloadRaw = decodeBase64Url(parts[1]);
    const payload = JSON.parse(payloadRaw) as { userId?: unknown };
    const candidate = payload.userId;

    const parsed =
      typeof candidate === 'number'
        ? candidate
        : typeof candidate === 'string'
          ? Number(candidate)
          : null;

    if (parsed === null || !Number.isFinite(parsed)) {
      return null;
    }

    const normalized = Math.trunc(parsed);
    return normalized > 0 ? normalized : null;
  } catch {
    return null;
  }
};

export const getCurrentUserId = async (): Promise<number | null> => {
  const token = await getStoredToken();
  return extractUserIdFromToken(token);
};

export async function apiFetch<T>(endpoint: string, options: ApiRequestOptions = {}) {
  const { query, skipAuth, headers: customHeaders, ...init } = options;
  const url = buildApiUrl(endpoint, query);

  let token: string | null = null;
  if (!skipAuth) {
    token = await getStoredToken();
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

export const API_BASE_URL = resolveApiBaseUrl();

