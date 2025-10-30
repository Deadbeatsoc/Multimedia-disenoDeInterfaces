import Constants from 'expo-constants';

type ExpoExtra = { apiUrl?: string };

type ExpoConfig = typeof Constants & {
  expoConfig?: { extra?: ExpoExtra };
  manifest?: { extra?: ExpoExtra };
};

export const resolveApiBaseUrl = () => {
  const extra =
    (Constants as ExpoConfig)?.expoConfig?.extra ?? (Constants as ExpoConfig)?.manifest?.extra ?? {};

  return (extra?.apiUrl as string | undefined) ?? process.env.EXPO_PUBLIC_API_URL ?? '';
};

export const API_BASE_URL = resolveApiBaseUrl();

