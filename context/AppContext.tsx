import React, {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ApiRequestOptions,
  apiFetch,
  clearStoredToken,
  extractUserIdFromToken,
  getStoredToken,
  setStoredToken,
} from '@/services/httpClient';
import { fetchDashboard, logHabitEntry as logHabitEntryRequest } from '@/services/api';
import {
  DashboardResponse,
  HabitLog,
  HabitSlug,
  HabitSummary,
  NotificationItem,
  ReminderItem,
} from '@/types/api';
import {
  DailySnapshot,
  ExerciseHabitSettings,
  HabitSettingsMap,
  NutritionHabitSettings,
  NutritionMealConfig,
  SleepHabitSettings,
  UserProfile,
  WaterHabitSettings,
} from '@/types/app';
import {
  addMinutes,
  setTimeOfDay,
  subtractMinutes,
  toDateKey,
} from '@/utils/date';

interface HabitState {
  summary: HabitSummary;
  history: HabitLog[];
  settings: HabitSettingsMap[HabitSlug];
}

interface DashboardState {
  date: string;
  habits: Record<HabitSlug, HabitState>;
  reminders: ReminderItem[];
  notifications: NotificationItem[];
  dailySnapshots: Record<string, DailySnapshot>;
}

interface SignInPayload {
  username: string;
  email: string;
  password: string;
  height: number;
  weight: number;
  age: number;
}

interface SignInCredentials {
  email: string;
  password: string;
}

interface AppContextValue {
  user: UserProfile | null;
  token: string | null;
  dashboard: DashboardState;
  isLoading: boolean;
  signIn: (payload: SignInPayload) => Promise<void>;
  authenticate: (credentials: SignInCredentials) => Promise<void>;
  signOut: () => Promise<void>;
  loadSession: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<UserProfile>;
  logHabitEntry: (slug: HabitSlug, value: number, notes?: string) => Promise<HabitLog>;
  getHabitHistory: (slug: HabitSlug) => HabitLog[];
  updateWaterSettings: (updates: Partial<WaterHabitSettings>) => Promise<void>;
  updateSleepSettings: (updates: Partial<SleepHabitSettings>) => Promise<void>;
  updateNutritionSettings: (updates: Partial<NutritionHabitSettings>) => Promise<void>;
  updateMealTime: (mealId: string, updates: Partial<NutritionMealConfig>) => void;
  updateExerciseSettings: (updates: Partial<ExerciseHabitSettings>) => Promise<void>;
  markNotificationAsRead: (notificationId: number) => Promise<void>;
  refreshReminders: () => void;
  request: <T>(endpoint: string, options?: ApiRequestOptions) => Promise<T>;
}

const HABIT_UNITS: Record<HabitSlug, string> = {
  water: 'ml',
  sleep: 'horas',
  exercise: 'minutos',
  nutrition: 'comidas',
};

const HABIT_NAMES: Record<HabitSlug, string> = {
  water: 'Consumo de Agua',
  sleep: 'Sueño',
  exercise: 'Ejercicio',
  nutrition: 'Alimentación',
};

const HABIT_ICONS: Record<HabitSlug, string> = {
  water: 'Droplets',
  sleep: 'Moon',
  exercise: 'Dumbbell',
  nutrition: 'Apple',
};

const HABIT_COLORS: Record<HabitSlug, string> = {
  water: '#2563eb',
  sleep: '#7c3aed',
  exercise: '#16a34a',
  nutrition: '#f97316',
};

const defaultMeals: NutritionMealConfig[] = [
  { id: 'breakfast', label: 'Desayuno', time: '08:00', enabled: true },
  { id: 'lunch', label: 'Almuerzo', time: '13:00', enabled: true },
  { id: 'dinner', label: 'Cena', time: '20:00', enabled: true },
];

const AUTH_USER_KEY = 'auth_user';
const DEFAULT_WATER_TARGET = 2000;

const normalizeNumber = (value: unknown, fallback: number) => {
  const parsed = typeof value === 'string' ? Number(value) : value;
  return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : fallback;
};

const DEFAULT_PROFILE_METRICS: Pick<UserProfile, 'height' | 'weight' | 'age'> = {
  height: 170,
  weight: 65,
  age: 28,
};

const buildUserProfile = (apiUser: any, fallback: Partial<UserProfile> = {}): UserProfile => {
  const idCandidate = (() => {
    const idValue = apiUser?.id ?? apiUser?.userId;
    if (typeof idValue === 'number' && Number.isFinite(idValue)) {
      const normalized = Math.trunc(idValue);
      return normalized > 0 ? normalized : null;
    }

    if (typeof idValue === 'string') {
      const parsed = Number(idValue);
      if (Number.isFinite(parsed)) {
        const normalized = Math.trunc(parsed);
        return normalized > 0 ? normalized : null;
      }
    }

    if (typeof fallback.id === 'number' && Number.isFinite(fallback.id)) {
      const normalized = Math.trunc(fallback.id);
      return normalized > 0 ? normalized : null;
    }

    return fallback.id ?? null;
  })();

  const emailCandidate =
    (typeof apiUser?.email === 'string' && apiUser.email) ?? fallback.email ?? '';
  const usernameCandidate =
    (typeof apiUser?.name === 'string' && apiUser.name) ||
    (typeof apiUser?.username === 'string' && apiUser.username) ||
    fallback.username ||
    emailCandidate ||
    'Usuario';

  return {
    id: idCandidate ?? null,
    username: usernameCandidate,
    email: emailCandidate,
    height: normalizeNumber(
      apiUser?.height,
      fallback.height ?? DEFAULT_PROFILE_METRICS.height
    ),
    weight: normalizeNumber(
      apiUser?.weight,
      fallback.weight ?? DEFAULT_PROFILE_METRICS.weight
    ),
    age: normalizeNumber(apiUser?.age, fallback.age ?? DEFAULT_PROFILE_METRICS.age),
  };
};

const buildHabitStates = (
  habitSettings: HabitSettingsMap
): Record<HabitSlug, HabitState> => ({
  water: {
    summary: createHabitSummary('water', resolveTargetFromSettings('water', habitSettings)),
    history: [],
    settings: habitSettings.water,
  },
  sleep: {
    summary: createHabitSummary('sleep', resolveTargetFromSettings('sleep', habitSettings)),
    history: [],
    settings: habitSettings.sleep,
  },
  exercise: {
    summary: createHabitSummary('exercise', resolveTargetFromSettings('exercise', habitSettings)),
    history: [],
    settings: habitSettings.exercise,
  },
  nutrition: {
    summary: createHabitSummary('nutrition', resolveTargetFromSettings('nutrition', habitSettings)),
    history: [],
    settings: habitSettings.nutrition,
  },
});

const getHabitIdFromMap = (
  habitMap: Record<HabitSlug, HabitState>,
  slug: HabitSlug
): number | null => {
  const identifier = habitMap[slug]?.summary.id;
  return isValidHabitId(identifier) ? identifier : null;
};

const formatProgressText = (value: number, target: number, unit: string) => {
  if (unit === 'ml') {
    if (target >= 1000) {
      const litersValue = (value / 1000).toFixed(1);
      const litersTarget = (target / 1000).toFixed(1);
      return `${litersValue}L de ${litersTarget}L`;
    }
    return `${value}ml de ${target}ml`;
  }

  return `${value} ${unit} de ${target} ${unit}`;
};

const createHabitSummary = (slug: HabitSlug, targetValue: number): HabitSummary => ({
  id: 0,
  slug,
  name: HABIT_NAMES[slug],
  icon: HABIT_ICONS[slug],
  color: HABIT_COLORS[slug],
  targetValue,
  targetUnit: HABIT_UNITS[slug],
  progressValue: 0,
  completionRate: 0,
  isComplete: false,
  progressText: formatProgressText(0, targetValue, HABIT_UNITS[slug]),
});

const isValidHabitId = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

const computeRecommendedWater = (height: number, weight: number) => {
  const base = weight * 35; // ml por kilo
  const heightAdjustment = Math.max(0, height - 150) * 5;
  return Math.round(base + heightAdjustment);
};

const createDefaultSettings = (recommendedWater: number): HabitSettingsMap => ({
  water: {
    type: 'water',
    reminderIntervalMinutes: 120,
    useRecommendedTarget: true,
    customTarget: null,
    recommendedTarget: recommendedWater,
  },
  sleep: {
    type: 'sleep',
    bedTime: '22:30',
    wakeTime: '06:30',
    reminderEnabled: true,
    reminderAdvanceMinutes: 30,
  },
  nutrition: {
    type: 'nutrition',
    remindersEnabled: true,
    meals: defaultMeals,
  },
  exercise: {
    type: 'exercise',
    reminderEnabled: true,
    reminderTime: '18:00',
    dailyGoalMinutes: 30,
  },
});

const resolveTargetFromSettings = (slug: HabitSlug, settings: HabitSettingsMap): number => {
  switch (slug) {
    case 'water': {
      const waterSettings = settings.water;
      return waterSettings.useRecommendedTarget
        ? waterSettings.recommendedTarget
        : waterSettings.customTarget ?? waterSettings.recommendedTarget;
    }
    case 'sleep':
      return 8;
    case 'exercise':
      return settings.exercise.dailyGoalMinutes;
    case 'nutrition':
      return settings.nutrition.meals.filter((meal) => meal.enabled).length || 3;
    default:
      return 0;
  }
};

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: PropsWithChildren) {
  const initialSettingsRef = useRef(createDefaultSettings(DEFAULT_WATER_TARGET));
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [settings, setSettings] = useState<HabitSettingsMap>(initialSettingsRef.current);
  const [habits, setHabits] = useState<Record<HabitSlug, HabitState>>(() =>
    buildHabitStates(initialSettingsRef.current)
  );
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [dailySnapshots, setDailySnapshots] = useState<Record<string, DailySnapshot>>({});
  const [isLoading, setIsLoading] = useState(false);

  const nextNotificationId = useRef(1);

  const recomputeDailySnapshot = useCallback(
    (nextHabits: Record<HabitSlug, HabitState>) => {
      const today = toDateKey(new Date());
      const summaries = Object.values(nextHabits).map((habit) => habit.summary);
      const totalHabits = summaries.length;
      const completedHabits = summaries.filter((habit) => habit.isComplete).length;
      const completionPercentage = totalHabits > 0 ? completedHabits / totalHabits : 0;

      setDailySnapshots((snapshot) => ({
        ...snapshot,
        [today]: {
          date: today,
          completedHabits,
          totalHabits,
          completionPercentage,
        },
      }));
    },
    []
  );

  const rebuildReminders = useCallback(
    (nextHabits: Record<HabitSlug, HabitState>, localSettings: HabitSettingsMap) => {
      const now = new Date();
      const items: ReminderItem[] = [];

      const pushReminder = (
        slug: HabitSlug,
        title: string,
        message: string,
        scheduled: Date
      ) => {
        items.push({
          id: nextNotificationId.current++,
          habitId: getHabitIdFromMap(nextHabits, slug),
          title,
          message,
          type: 'reminder',
          channel: 'in_app',
          scheduledFor: scheduled.toISOString(),
          read: false,
        });
      };

      const waterSettings = localSettings.water;
      if (waterSettings.reminderIntervalMinutes > 0) {
        const target = resolveTargetFromSettings('water', localSettings);
        const nextTime = addMinutes(now, waterSettings.reminderIntervalMinutes);
        pushReminder('water', '💧 Recordatorio de hidratación', `Bebe agua para acercarte a tu meta diaria de ${Math.round(target / 1000)}L.`, nextTime);
      }

      const sleepSettings = localSettings.sleep;
      if (sleepSettings.reminderEnabled) {
        const [hour, minute] = sleepSettings.bedTime.split(':').map(Number);
        const bedtime = setTimeOfDay(new Date(), hour, minute);
        const reminderTime = subtractMinutes(bedtime, sleepSettings.reminderAdvanceMinutes);
        pushReminder('sleep', '🌙 Hora de prepararte para dormir', `Ve cerrando tu día para descansar a las ${sleepSettings.bedTime}.`, reminderTime);
      }

      const nutritionSettings = localSettings.nutrition;
      if (nutritionSettings.remindersEnabled) {
        nutritionSettings.meals
          .filter((meal) => meal.enabled)
          .forEach((meal) => {
            const [hour, minute] = meal.time.split(':').map(Number);
            const reminderTime = setTimeOfDay(new Date(), hour, minute);
            pushReminder('nutrition', `🍽️ ${meal.label}`, `Es momento de tu ${meal.label.toLowerCase()}.`, reminderTime);
          });
      }

      const exerciseSettings = localSettings.exercise;
      if (exerciseSettings.reminderEnabled) {
        const [hour, minute] = exerciseSettings.reminderTime.split(':').map(Number);
        const reminderTime = setTimeOfDay(new Date(), hour, minute);
        pushReminder('exercise', '🏃 Hora de moverte', `Reserva ${exerciseSettings.dailyGoalMinutes} minutos para tu ejercicio de hoy.`, reminderTime);
      }

      setReminders(items);
    },
    []
  );

  const syncHabitSummaries = useCallback(
    (summaries: HabitSummary[] | null | undefined) => {
      if (!summaries || summaries.length === 0) {
        return;
      }

      let computedHabits: Record<HabitSlug, HabitState> | null = null;

      setHabits((prev) => {
        const next = { ...prev } as Record<HabitSlug, HabitState>;
        let hasUpdates = false;

        summaries.forEach((summary) => {
          const slug = summary?.slug as HabitSlug | undefined;
          if (!slug || !(slug in next)) {
            return;
          }

          const current = next[slug];
          const nextTargetUnit =
            summary.targetUnit ?? current.summary.targetUnit ?? HABIT_UNITS[slug];

          const updatedSummary: HabitSummary = {
            ...current.summary,
            ...summary,
            slug,
            name: summary.name ?? current.summary.name ?? HABIT_NAMES[slug],
            icon: summary.icon ?? current.summary.icon ?? HABIT_ICONS[slug],
            color: summary.color ?? current.summary.color ?? HABIT_COLORS[slug],
            targetUnit: nextTargetUnit,
            progressText:
              summary.progressText ??
              formatProgressText(
                summary.progressValue ?? current.summary.progressValue,
                summary.targetValue ?? current.summary.targetValue,
                nextTargetUnit
              ),
          };

          const hasDifference =
            current.summary.id !== updatedSummary.id ||
            current.summary.name !== updatedSummary.name ||
            current.summary.icon !== updatedSummary.icon ||
            current.summary.color !== updatedSummary.color ||
            current.summary.targetValue !== updatedSummary.targetValue ||
            current.summary.targetUnit !== updatedSummary.targetUnit ||
            current.summary.progressValue !== updatedSummary.progressValue ||
            current.summary.completionRate !== updatedSummary.completionRate ||
            current.summary.isComplete !== updatedSummary.isComplete ||
            current.summary.progressText !== updatedSummary.progressText;

          if (!hasDifference) {
            return;
          }

          hasUpdates = true;
          next[slug] = {
            ...current,
            summary: updatedSummary,
          };
        });

        if (!hasUpdates) {
          return prev;
        }

        computedHabits = next;
        return next;
      });

      if (computedHabits) {
        recomputeDailySnapshot(computedHabits);
        rebuildReminders(computedHabits, settings);
      }
    },
    [rebuildReminders, recomputeDailySnapshot, settings]
  );

  const updateHabitIdentifier = useCallback(
    (slug: HabitSlug, identifier?: number | null) => {
      if (!isValidHabitId(identifier)) {
        return;
      }

      let computedHabits: Record<HabitSlug, HabitState> | null = null;

      setHabits((prev) => {
        const current = prev[slug];
        if (!current || current.summary.id === identifier) {
          return prev;
        }

        const next = {
          ...prev,
          [slug]: {
            ...current,
            summary: {
              ...current.summary,
              id: identifier,
            },
          },
        } as Record<HabitSlug, HabitState>;

        computedHabits = next;
        return next;
      });

      if (computedHabits) {
        recomputeDailySnapshot(computedHabits);
        rebuildReminders(computedHabits, settings);
      }
    },
    [rebuildReminders, recomputeDailySnapshot, settings]
  );

  const fetchAndSyncDashboardHabits = useCallback(async () => {
    try {
      const dashboardData = await fetchDashboard();
      if (dashboardData && Array.isArray(dashboardData.habits)) {
        syncHabitSummaries(dashboardData.habits);
      }
    } catch (error) {
      console.warn('No se pudo sincronizar los hábitos con el servidor:', error);
    }
  }, [syncHabitSummaries]);

  const request = useCallback(
    async <T>(endpoint: string, options: ApiRequestOptions = {}) => {
      const result = await apiFetch<T>(endpoint, options);

      if (endpoint.startsWith('/dashboard')) {
        const dashboardPayload = result as unknown as DashboardResponse | null;
        if (dashboardPayload && Array.isArray(dashboardPayload.habits)) {
          syncHabitSummaries(dashboardPayload.habits);
        }
      }

      return result;
    },
    [syncHabitSummaries]
  );

  const registerAchievementNotification = useCallback(
    (slug: HabitSlug, message: string) => {
      setNotifications((prev) => [
        {
          id: nextNotificationId.current++,
          habitId: getHabitIdFromMap(habits, slug),
          title: '🎉 ¡Objetivo alcanzado!',
          message,
          type: 'achievement',
          channel: 'in_app',
          scheduledFor: null,
          read: false,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
    },
    [habits]
  );

  const resetAppState = useCallback(() => {
    const baseSettings = createDefaultSettings(DEFAULT_WATER_TARGET);
    const baseHabits = buildHabitStates(baseSettings);

    nextNotificationId.current = 1;
    setUser(null);
    setSettings(baseSettings);
    setHabits(baseHabits);
    setDailySnapshots({});
    setReminders([]);
    setNotifications([]);
  }, []);

  const initializeUserSession = useCallback(
    (
      profile: UserProfile,
      welcome?: { welcomeTitle?: string; welcomeMessage?: string }
    ) => {
      const recommended = computeRecommendedWater(profile.height, profile.weight);
      const nextSettings = createDefaultSettings(recommended);
      const nextHabits = buildHabitStates(nextSettings);

      nextNotificationId.current = 1;

      setUser(profile);
      setSettings(nextSettings);
      setHabits(nextHabits);
      setDailySnapshots({});
      rebuildReminders(nextHabits, nextSettings);

      if (welcome?.welcomeTitle && welcome?.welcomeMessage) {
        setNotifications([
          {
            id: nextNotificationId.current++,
            habitId: null,
            title: welcome.welcomeTitle,
            message: welcome.welcomeMessage,
            type: 'alert',
            channel: 'in_app',
            scheduledFor: null,
            read: false,
            createdAt: new Date().toISOString(),
          },
        ]);
      } else {
        setNotifications([]);
      }
    },
    [rebuildReminders]
  );

  const logHabitEntry = useCallback<AppContextValue['logHabitEntry']>(
    async (slug, value, notes) => {
      const habit = habits[slug];
      if (!habit) {
        throw new Error('No encontramos este hábito.');
      }

      const habitId = habit.summary.id;
      if (!isValidHabitId(habitId)) {
        throw new Error(
          'No se pudo identificar este hábito. Actualiza la información e inténtalo nuevamente.'
        );
      }
      const timestamp = new Date().toISOString();

      const data = await logHabitEntryRequest(habitId, {
        value,
        notes: notes ?? null,
        loggedAt: timestamp,
      });

      const log: HabitLog = {
        ...data,
        habitId,
        notes: data?.notes ?? notes ?? null,
        loggedAt: data?.loggedAt ?? timestamp,
        entryDate: data?.entryDate ?? toDateKey(new Date(data?.loggedAt ?? timestamp)),
      };

      let achievedToday = false;
      let habitName = habit.summary.name;

      setHabits((prev) => {
        const current = prev[slug];
        const targetValue = resolveTargetFromSettings(slug, settings);
        const progressValue = Math.max(0, current.summary.progressValue + log.value);
        const wasComplete = current.summary.isComplete;
        const isComplete = targetValue > 0 ? progressValue >= targetValue : false;
        achievedToday = !wasComplete && isComplete;
        habitName = current.summary.name;

        const updatedSummary: HabitSummary = {
          ...current.summary,
          progressValue,
          targetValue,
          targetUnit: HABIT_UNITS[slug],
          completionRate: targetValue > 0 ? Math.min(progressValue / targetValue, 1) : 0,
          isComplete,
          progressText: formatProgressText(progressValue, targetValue, HABIT_UNITS[slug]),
        };

        const nextHabits = {
          ...prev,
          [slug]: {
            ...current,
            summary: updatedSummary,
            history: [log, ...current.history],
          },
        };

        recomputeDailySnapshot(nextHabits);
        return nextHabits;
      });

      if (achievedToday) {
        registerAchievementNotification(
          slug,
          `Completaste tu hábito de ${habitName.toLowerCase()} hoy.`
        );
      }

      return log;
    },
    [habits, recomputeDailySnapshot, registerAchievementNotification, settings]
  );

  const applySettings = useCallback(
    (nextSettings: HabitSettingsMap) => {
      let computedHabits: Record<HabitSlug, HabitState> = habits;

      setSettings(nextSettings);
      setHabits((prev) => {
        const updated = { ...prev } as Record<HabitSlug, HabitState>;
        (Object.keys(updated) as HabitSlug[]).forEach((slug) => {
          const targetValue = resolveTargetFromSettings(slug, nextSettings);
          const habit = updated[slug];
          const progressValue = habit.summary.progressValue;
          updated[slug] = {
            ...habit,
            settings: nextSettings[slug],
            summary: {
              ...habit.summary,
              targetValue,
              targetUnit: HABIT_UNITS[slug],
              completionRate: targetValue > 0 ? Math.min(progressValue / targetValue, 1) : 0,
              isComplete: targetValue > 0 ? progressValue >= targetValue : false,
              progressText: formatProgressText(progressValue, targetValue, HABIT_UNITS[slug]),
            },
          };
        });
        computedHabits = updated;
        return updated;
      });

      recomputeDailySnapshot(computedHabits);
      rebuildReminders(computedHabits, nextSettings);
    },
    [habits, recomputeDailySnapshot, rebuildReminders]
  );

  const signIn = useCallback<AppContextValue['signIn']>(
    async ({ username, email, password, height, weight, age }) => {
      setIsLoading(true);
      const normalizedEmail = email.trim().toLowerCase();

      try {
        const data = await apiFetch<{ token?: string; user?: unknown }>(
          '/auth/register',
          {
            method: 'POST',
            body: JSON.stringify({
              name: username.trim(),
              email: normalizedEmail,
              password,
              height,
              weight,
              age,
            }),
            skipAuth: true,
          }
        );

        const authToken = data?.token;

        if (!authToken) {
          throw new Error('No se recibió el token de autenticación.');
        }

        await setStoredToken(authToken);
        setToken(authToken);

        const profile = buildUserProfile(data?.user, {
          id: extractUserIdFromToken(authToken) ?? null,
          username: username.trim(),
          email: normalizedEmail,
          height,
          weight,
          age,
        });

        initializeUserSession(profile, {
          welcomeTitle: '👋 ¡Bienvenido!',
          welcomeMessage:
            'Configura tus hábitos para recibir recordatorios personalizados.',
        });
        await fetchAndSyncDashboardHabits();
        await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(profile));
      } catch (error) {
        await clearStoredToken();
        await AsyncStorage.removeItem(AUTH_USER_KEY);
        setToken(null);
        throw error instanceof Error
          ? error
          : new Error('No pudimos crear tu perfil. Intenta nuevamente.');
      } finally {
        setIsLoading(false);
      }
    },
    [fetchAndSyncDashboardHabits, initializeUserSession]
  );

  const authenticate = useCallback<AppContextValue['authenticate']>(
    async ({ email, password }) => {
      setIsLoading(true);
      const normalizedEmail = email.trim().toLowerCase();

      try {
        const data = await apiFetch<{ token?: string; user?: unknown }>(
          '/auth/login',
          {
            method: 'POST',
            body: JSON.stringify({
              email: normalizedEmail,
              password,
            }),
            skipAuth: true,
          }
        );

        const authToken: string | undefined = data?.token;

        if (!authToken) {
          throw new Error('No se recibió el token de autenticación.');
        }

        await setStoredToken(authToken);
        setToken(authToken);

        const profile = buildUserProfile(data?.user, {
          id: extractUserIdFromToken(authToken) ?? null,
          email: normalizedEmail,
        });

        initializeUserSession(profile, {
          welcomeTitle: '👋 ¡Bienvenido de nuevo!',
          welcomeMessage: 'Revisa tus hábitos para continuar con tu progreso.',
        });
        await fetchAndSyncDashboardHabits();
        await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(profile));
      } catch (error) {
        await clearStoredToken();
        await AsyncStorage.removeItem(AUTH_USER_KEY);
        setToken(null);
        throw error instanceof Error
          ? error
          : new Error('No pudimos validar tus credenciales. Intenta nuevamente.');
      } finally {
        setIsLoading(false);
      }
    },
    [fetchAndSyncDashboardHabits, initializeUserSession]
  );

  const loadSession = useCallback<AppContextValue['loadSession']>(async () => {
    setIsLoading(true);
    let storedToken: string | null = null;
    let forcedSignOut = false;

    try {
      storedToken = await getStoredToken();
      if (!storedToken) {
        setToken(null);
        resetAppState();
        return;
      }

      setToken(storedToken);

      const decodedUserId = extractUserIdFromToken(storedToken);
      const data = await apiFetch<{ user?: unknown }>('/auth/me');
      const profile = buildUserProfile(data?.user ?? data, {
        id: decodedUserId ?? null,
      });

      if (decodedUserId && profile.id && decodedUserId !== profile.id) {
        const mismatchError = new Error('Token y perfil no coinciden') as Error & {
          status?: number;
        };
        mismatchError.status = 401;
        throw mismatchError;
      }

      initializeUserSession(profile);
      await fetchAndSyncDashboardHabits();
      await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(profile));
    } catch (error) {
      const status = (error as { status?: number }).status;
      if (status === 401 || status === 403) {
        forcedSignOut = true;
        await clearStoredToken();
        await AsyncStorage.removeItem(AUTH_USER_KEY);
        setToken(null);
        resetAppState();
        return;
      }

      if (!forcedSignOut && storedToken) {
        const cachedProfile = await AsyncStorage.getItem(AUTH_USER_KEY);
        if (cachedProfile) {
          try {
            const parsedProfile = JSON.parse(cachedProfile) as Partial<UserProfile>;
            const sanitizedProfile = buildUserProfile(parsedProfile, parsedProfile);
            initializeUserSession(sanitizedProfile);
            return;
          } catch {
            await AsyncStorage.removeItem(AUTH_USER_KEY);
          }
        }
      }

      if (error instanceof Error) {
        console.warn('No se pudo restaurar la sesión:', error.message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [fetchAndSyncDashboardHabits, initializeUserSession, resetAppState]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const signOut = useCallback<AppContextValue['signOut']>(async () => {
    try {
      await clearStoredToken();
      await AsyncStorage.removeItem(AUTH_USER_KEY);
    } finally {
      setToken(null);
      resetAppState();
    }
  }, [resetAppState]);

  const updateProfile = useCallback<AppContextValue['updateProfile']>(
    async (updates) => {
      if (!user) {
        throw new Error('No hay una sesión activa.');
      }

      const apiPayload: Record<string, unknown> = {};

      if (updates.username !== undefined) {
        const trimmed = updates.username.trim();
        if (!trimmed) {
          throw new Error('El nombre no puede estar vacío.');
        }
        apiPayload.name = trimmed;
      }

      if (updates.height !== undefined) {
        if (!Number.isFinite(updates.height)) {
          throw new Error('La altura debe ser un número válido.');
        }
        apiPayload.height = updates.height;
      }

      if (updates.weight !== undefined) {
        if (!Number.isFinite(updates.weight)) {
          throw new Error('El peso debe ser un número válido.');
        }
        apiPayload.weight = updates.weight;
      }

      if (updates.age !== undefined) {
        if (!Number.isFinite(updates.age)) {
          throw new Error('La edad debe ser un número válido.');
        }
        apiPayload.age = updates.age;
      }

      if (!Object.keys(apiPayload).length) {
        return user as UserProfile;
      }

      const data = await apiFetch<{ user?: unknown }>('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify(apiPayload),
      });

      const nextProfile = buildUserProfile(data?.user ?? data, {
        ...user,
        ...updates,
      });

      setUser(nextProfile);
      await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(nextProfile));

      const recommended = computeRecommendedWater(
        nextProfile.height,
        nextProfile.weight
      );

      const nextSettings: HabitSettingsMap = {
        ...settings,
        water: {
          ...settings.water,
          recommendedTarget: recommended,
          customTarget: settings.water.useRecommendedTarget
            ? null
            : settings.water.customTarget,
        },
      };

      applySettings(nextSettings);

      return nextProfile;
    },
    [applySettings, settings, user]
  );

  const updateWaterSettings = useCallback<AppContextValue['updateWaterSettings']>(
    async (waterUpdates) => {
      const payload = {
        type: 'water' as const,
        useRecommendedTarget:
          waterUpdates.useRecommendedTarget ?? settings.water.useRecommendedTarget,
        customTarget:
          waterUpdates.customTarget ?? settings.water.customTarget ?? null,
        reminderInterval:
          waterUpdates.reminderIntervalMinutes ?? settings.water.reminderIntervalMinutes,
        targetValue:
          waterUpdates.customTarget ??
          (waterUpdates.useRecommendedTarget === false
            ? settings.water.customTarget ?? settings.water.recommendedTarget
            : settings.water.recommendedTarget),
      };

      const response = await apiFetch<{
        habitId: number;
        settings: {
          targetValue: number;
          recommendedTarget: number;
          customTarget: number | null;
          useRecommendedTarget: boolean;
          reminderInterval: number;
        };
      }>('/habits/settings', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      const updated = response.settings;

      const nextSettings: HabitSettingsMap = {
        ...settings,
        water: {
          ...settings.water,
          reminderIntervalMinutes: updated.reminderInterval,
          useRecommendedTarget: updated.useRecommendedTarget,
          recommendedTarget: updated.recommendedTarget,
          customTarget: updated.useRecommendedTarget
            ? null
            : updated.customTarget ?? updated.targetValue,
        },
      };

      applySettings(nextSettings);
      updateHabitIdentifier('water', response?.habitId);
    },
    [applySettings, settings, updateHabitIdentifier]
  );

  const updateSleepSettings = useCallback<AppContextValue['updateSleepSettings']>(
    async (sleepUpdates) => {
      const payload = {
        type: 'sleep' as const,
        bedTime: sleepUpdates.bedTime ?? settings.sleep.bedTime,
        wakeTime: sleepUpdates.wakeTime ?? settings.sleep.wakeTime,
        reminderEnabled:
          sleepUpdates.reminderEnabled ?? settings.sleep.reminderEnabled,
        reminderAdvance:
          sleepUpdates.reminderAdvanceMinutes ?? settings.sleep.reminderAdvanceMinutes,
      };

      const response = await apiFetch<{
        habitId: number;
        settings: {
          bedTime: string;
          wakeTime: string;
          reminderEnabled: boolean;
          reminderAdvance: number;
          targetValue?: number;
        };
      }>('/habits/settings', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      const nextSettings: HabitSettingsMap = {
        ...settings,
        sleep: {
          ...settings.sleep,
          bedTime: response.settings.bedTime,
          wakeTime: response.settings.wakeTime,
          reminderEnabled: response.settings.reminderEnabled,
          reminderAdvanceMinutes: response.settings.reminderAdvance,
        },
      };

      applySettings(nextSettings);
      updateHabitIdentifier('sleep', response?.habitId);
    },
    [applySettings, settings, updateHabitIdentifier]
  );

  const updateNutritionSettings = useCallback<AppContextValue['updateNutritionSettings']>(
    async (nutritionUpdates) => {
      const meals = (nutritionUpdates.meals ?? settings.nutrition.meals).map((meal) => ({
        id: meal.id,
        label: meal.label,
        time: meal.time,
        enabled: meal.enabled,
      }));

      const response = await apiFetch<{
        habitId: number;
        settings: {
          remindersEnabled: boolean;
          meals: { id: string; label: string; time: string; enabled: boolean }[];
          targetValue: number;
        };
      }>('/habits/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          type: 'nutrition',
          remindersEnabled:
            nutritionUpdates.remindersEnabled ?? settings.nutrition.remindersEnabled,
          meals,
        }),
      });

      const updatedMeals = response.settings.meals.map((meal) => ({
        id: meal.id,
        label: meal.label,
        time: meal.time,
        enabled: meal.enabled,
      }));

      const nextSettings: HabitSettingsMap = {
        ...settings,
        nutrition: {
          ...settings.nutrition,
          remindersEnabled: response.settings.remindersEnabled,
          meals: updatedMeals,
        },
      };

      applySettings(nextSettings);
      updateHabitIdentifier('nutrition', response?.habitId);
    },
    [applySettings, settings, updateHabitIdentifier]
  );

  const updateMealTime = useCallback<AppContextValue['updateMealTime']>(
    (mealId, mealUpdates) => {
      applySettings({
        ...settings,
        nutrition: {
          ...settings.nutrition,
          meals: settings.nutrition.meals.map((meal) =>
            meal.id === mealId ? { ...meal, ...mealUpdates } : meal
          ),
        },
      });
    },
    [applySettings, settings]
  );

  const updateExerciseSettings = useCallback<AppContextValue['updateExerciseSettings']>(
    async (exerciseUpdates) => {
      const payload = {
        type: 'exercise' as const,
        reminderEnabled:
          exerciseUpdates.reminderEnabled ?? settings.exercise.reminderEnabled,
        reminderTime: exerciseUpdates.reminderTime ?? settings.exercise.reminderTime,
        dailyGoalMinutes:
          exerciseUpdates.dailyGoalMinutes ?? settings.exercise.dailyGoalMinutes,
      };

      const response = await apiFetch<{
        habitId: number;
        settings: {
          reminderEnabled: boolean;
          reminderTime: string;
          dailyGoalMinutes: number;
        };
      }>('/habits/settings', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      const nextSettings: HabitSettingsMap = {
        ...settings,
        exercise: {
          ...settings.exercise,
          reminderEnabled: response.settings.reminderEnabled,
          reminderTime: response.settings.reminderTime,
          dailyGoalMinutes: response.settings.dailyGoalMinutes,
        },
      };

      applySettings(nextSettings);
      updateHabitIdentifier('exercise', response?.habitId);
    },
    [applySettings, settings, updateHabitIdentifier]
  );

  const getHabitHistory = useCallback<AppContextValue['getHabitHistory']>(
    (slug) => habits[slug].history,
    [habits]
  );

  const markNotificationAsRead = useCallback<AppContextValue['markNotificationAsRead']>(
    async (notificationId) => {
      await apiFetch(`/notifications/${notificationId}/read`, {
        method: 'PATCH',
      });

      setReminders((prev) =>
        prev.map((reminder) =>
          reminder.id === notificationId ? { ...reminder, read: true } : reminder
        )
      );
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === notificationId ? { ...notification, read: true } : notification
        )
      );
    },
    []
  );

  const refreshReminders = useCallback<AppContextValue['refreshReminders']>(() => {
    rebuildReminders(habits, settings);
  }, [habits, rebuildReminders, settings]);

  const dashboard = useMemo<DashboardState>(() => {
    const reminderList = [...reminders].sort((a, b) => {
      if (a.scheduledFor && b.scheduledFor) {
        return a.scheduledFor.localeCompare(b.scheduledFor);
      }
      return 0;
    });

    const notificationList = [...notifications].sort((a, b) => {
      const timeA = a.scheduledFor ?? a.createdAt;
      const timeB = b.scheduledFor ?? b.createdAt;
      return timeB.localeCompare(timeA);
    });

    return {
      date: toDateKey(new Date()),
      habits,
      reminders: reminderList,
      notifications: notificationList,
      dailySnapshots,
    };
  }, [dailySnapshots, habits, notifications, reminders]);

  const value = useMemo<AppContextValue>(
    () => ({
      user,
      token,
      dashboard,
      isLoading,
      signIn,
      authenticate,
      signOut,
      loadSession,
      updateProfile,
      logHabitEntry,
      getHabitHistory,
      updateWaterSettings,
      updateSleepSettings,
      updateNutritionSettings,
      updateMealTime,
      updateExerciseSettings,
      markNotificationAsRead,
      refreshReminders,
      request,
    }),
    [
      dashboard,
      getHabitHistory,
      isLoading,
      logHabitEntry,
      loadSession,
      markNotificationAsRead,
      request,
      refreshReminders,
      signOut,
      authenticate,
      signIn,
      updateExerciseSettings,
      updateMealTime,
      updateNutritionSettings,
      updateProfile,
      updateSleepSettings,
      updateWaterSettings,
      token,
      user,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext debe utilizarse dentro de un AppProvider');
  }
  return context;
}

