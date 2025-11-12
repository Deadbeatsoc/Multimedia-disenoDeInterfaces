// constants/config.ts
import Constants from 'expo-constants';

export const API_BASE_URL = 
  Constants.expoConfig?.extra?.apiUrl ?? 
  'http://192.168.0.107:3000/api';

export function resolveApiBaseUrl(): string {
  return API_BASE_URL;
}