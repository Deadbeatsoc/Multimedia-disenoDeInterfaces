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
import Constants from 'expo-constants';
import { HabitLog, HabitSlug, HabitSummary, NotificationItem, ReminderItem } from '@/types/api';
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
  updateProfile: (updates: Partial<UserProfile>) => void;
  logHabitEntry: (slug: HabitSlug, value: number, notes?: string) => HabitLog;
  getHabitHistory: (slug: HabitSlug) => HabitLog[];
  updateWaterSettings: (updates: Partial<WaterHabitSettings>) => void;
  updateSleepSettings: (updates: Partial<SleepHabitSettings>) => void;
  updateNutritionSettings: (updates: Partial<NutritionHabitSettings>) => void;
  updateMealTime: (mealId: string, updates: Partial<NutritionMealConfig>) => void;
  updateExerciseSettings: (updates: Partial<ExerciseHabitSettings>) => void;
  markNotificationAsRead: (notificationId: number) => void;
  refreshReminders: () => void;
}

const HABIT_IDS: Record<HabitSlug, number> = {
  water: 1,
  sleep: 2,
  exercise: 3,
  nutrition: 4,
};

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

const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_USER_KEY = 'auth_user';
const DEFAULT_WATER_TARGET = 2000;

const resolveApiUrl = () => {
  const extra =
    Constants?.expoConfig?.extra ??
    ((Constants as unknown as { manifest?: { extra?: Record<string, unknown> } }).manifest?.extra ?? {});
  return (extra?.apiUrl as string | undefined) ?? process.env.EXPO_PUBLIC_API_URL ?? '';
};

const API_URL = resolveApiUrl();

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
  const emailCandidate =
    (typeof apiUser?.email === 'string' && apiUser.email) ?? fallback.email ?? '';
  const usernameCandidate =
    (typeof apiUser?.username === 'string' && apiUser.username) ||
    (typeof apiUser?.name === 'string' && apiUser.name) ||
    fallback.username ||
    emailCandidate ||
    'Usuario';

  return {
    username: usernameCandidate,
    email: emailCandidate,
    password: fallback.password ?? '',
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

const parseErrorResponse = async (response: Response) => {
  const fallback = 'No se pudo completar la solicitud. Inténtalo de nuevo más tarde.';
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
  id: HABIT_IDS[slug],
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

  const nextLogId = useRef(1);
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
          habitId: HABIT_IDS[slug],
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

  const registerAchievementNotification = useCallback(
    (slug: HabitSlug, message: string) => {
      setNotifications((prev) => [
        {
          id: nextNotificationId.current++,
          habitId: HABIT_IDS[slug],
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
    []
  );

  const resetAppState = useCallback(() => {
    const baseSettings = createDefaultSettings(DEFAULT_WATER_TARGET);
    const baseHabits = buildHabitStates(baseSettings);

    nextLogId.current = 1;
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

      nextLogId.current = 1;
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
    (slug, value, notes) => {
      const now = new Date();
      const entryDate = toDateKey(now);
      const logId = nextLogId.current++;
      let achievedToday = false;
      let habitName = HABIT_NAMES[slug];

      setHabits((prev) => {
        const habit = prev[slug];
        const targetValue = resolveTargetFromSettings(slug, settings);
        const progressValue = Math.max(0, habit.summary.progressValue + value);
        const wasComplete = habit.summary.isComplete;
        const isComplete = targetValue > 0 ? progressValue >= targetValue : false;
        achievedToday = !wasComplete && isComplete;
        habitName = habit.summary.name;

        const log: HabitLog = {
          id: logId,
          habitId: habit.summary.id,
          value,
          notes: notes ?? null,
          loggedAt: now.toISOString(),
          entryDate,
        };

        const updatedSummary: HabitSummary = {
          ...habit.summary,
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
            ...habit,
            summary: updatedSummary,
            history: [log, ...habit.history],
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

      return {
        id: logId,
        habitId: HABIT_IDS[slug],
        value,
        notes: notes ?? null,
        loggedAt: now.toISOString(),
        entryDate,
      };
    },
    [recomputeDailySnapshot, registerAchievementNotification, settings]
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
        console.log("➡️ Intentando registrar usuario en:", `${API_URL}/auth/register`);
        const response = await fetch(`${API_URL}/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: username.trim(),
            email: normalizedEmail,
            password,
            height,
            weight,
            age,
          }),
        });

        if (!response.ok) {
          const message = await parseErrorResponse(response);
          throw new Error(message);
        }

        const data = await response.json();
        const authToken: string | undefined =
          data?.token ?? data?.accessToken ?? data?.jwt;

        if (!authToken) {
          throw new Error('No se recibió el token de autenticación.');
        }

        await AsyncStorage.setItem(AUTH_TOKEN_KEY, authToken);
        setToken(authToken);

        const profile = buildUserProfile(data?.user, {
          username: username.trim(),
          email: normalizedEmail,
          password,
          height,
          weight,
          age,
        });

        initializeUserSession(profile, {
          welcomeTitle: '👋 ¡Bienvenido!',
          welcomeMessage:
            'Configura tus hábitos para recibir recordatorios personalizados.',
        });
        await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(profile));
      } catch (error) {
        await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
        await AsyncStorage.removeItem(AUTH_USER_KEY);
        setToken(null);
        throw error instanceof Error
          ? error
          : new Error('No pudimos crear tu perfil. Intenta nuevamente.');
      } finally {
        setIsLoading(false);
      }
    },
    [initializeUserSession]
  );

  const authenticate = useCallback<AppContextValue['authenticate']>(
    async ({ email, password }) => {
      setIsLoading(true);
      const normalizedEmail = email.trim().toLowerCase();

      try {
        const response = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: normalizedEmail,
            password,
          }),
        });

        if (!response.ok) {
          const message = await parseErrorResponse(response);
          throw new Error(message);
        }

        const data = await response.json();
        const authToken: string | undefined =
          data?.token ?? data?.accessToken ?? data?.jwt;

        if (!authToken) {
          throw new Error('No se recibió el token de autenticación.');
        }

        await AsyncStorage.setItem(AUTH_TOKEN_KEY, authToken);
        setToken(authToken);

        const profile = buildUserProfile(data?.user, {
          email: normalizedEmail,
          password,
        });

        initializeUserSession(profile, {
          welcomeTitle: '👋 ¡Bienvenido de nuevo!',
          welcomeMessage: 'Revisa tus hábitos para continuar con tu progreso.',
        });
        await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(profile));
      } catch (error) {
        await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
        await AsyncStorage.removeItem(AUTH_USER_KEY);
        setToken(null);
        throw error instanceof Error
          ? error
          : new Error('No pudimos validar tus credenciales. Intenta nuevamente.');
      } finally {
        setIsLoading(false);
      }
    },
    [initializeUserSession]
  );

  const loadSession = useCallback<AppContextValue['loadSession']>(async () => {
    setIsLoading(true);
    let storedToken: string | null = null;
    let forcedSignOut = false;

    try {
      storedToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      if (!storedToken) {
        setToken(null);
        resetAppState();
        return;
      }

      setToken(storedToken);

      const response = await fetch(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${storedToken}`,
        },
      });

      if (!response.ok) {
        const message = await parseErrorResponse(response);
        if (response.status === 401 || response.status === 403) {
          forcedSignOut = true;
          await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
          await AsyncStorage.removeItem(AUTH_USER_KEY);
          setToken(null);
          resetAppState();
        }
        throw new Error(message);
      }

      const data = await response.json();
      const profile = buildUserProfile(data?.user ?? data);

      initializeUserSession(profile);
      await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(profile));
    } catch (error) {
      if (!forcedSignOut && storedToken) {
        const cachedProfile = await AsyncStorage.getItem(AUTH_USER_KEY);
        if (cachedProfile) {
          try {
            const parsedProfile = JSON.parse(cachedProfile) as UserProfile;
            initializeUserSession(parsedProfile);
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
  }, [initializeUserSession, resetAppState]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const signOut = useCallback<AppContextValue['signOut']>(async () => {
    try {
      await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
      await AsyncStorage.removeItem(AUTH_USER_KEY);
    } finally {
      setToken(null);
      resetAppState();
    }
  }, [resetAppState]);

  const updateProfile = useCallback<AppContextValue['updateProfile']>(
    (updates) => {
      setUser((prev) => {
        if (!prev) {
          return prev;
        }
        const next = { ...prev, ...updates };
        if (updates.height !== undefined || updates.weight !== undefined) {
          const recommended = computeRecommendedWater(
            updates.height ?? next.height,
            updates.weight ?? next.weight
          );
          applySettings({
            ...settings,
            water: {
              ...settings.water,
              recommendedTarget: recommended,
            },
          });
        }
        return next;
      });
    },
    [applySettings, settings]
  );

  const updateWaterSettings = useCallback<AppContextValue['updateWaterSettings']>(
    (waterUpdates) => {
      applySettings({
        ...settings,
        water: {
          ...settings.water,
          ...waterUpdates,
        },
      });
    },
    [applySettings, settings]
  );

  const updateSleepSettings = useCallback<AppContextValue['updateSleepSettings']>(
    (sleepUpdates) => {
      applySettings({
        ...settings,
        sleep: {
          ...settings.sleep,
          ...sleepUpdates,
        },
      });
    },
    [applySettings, settings]
  );

  const updateNutritionSettings = useCallback<AppContextValue['updateNutritionSettings']>(
    (nutritionUpdates) => {
      applySettings({
        ...settings,
        nutrition: {
          ...settings.nutrition,
          ...nutritionUpdates,
        },
      });
    },
    [applySettings, settings]
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
    (exerciseUpdates) => {
      applySettings({
        ...settings,
        exercise: {
          ...settings.exercise,
          ...exerciseUpdates,
        },
      });
    },
    [applySettings, settings]
  );

  const getHabitHistory = useCallback<AppContextValue['getHabitHistory']>(
    (slug) => habits[slug].history,
    [habits]
  );

  const markNotificationAsRead = useCallback<AppContextValue['markNotificationAsRead']>(
    (notificationId) => {
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
    }),
    [
      dashboard,
      getHabitHistory,
      isLoading,
      logHabitEntry,
      loadSession,
      markNotificationAsRead,
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

