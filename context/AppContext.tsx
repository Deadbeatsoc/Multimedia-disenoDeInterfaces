import React, {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
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
  dashboard: DashboardState;
  isLoading: boolean;
  signIn: (payload: SignInPayload) => void;
  authenticate: (credentials: SignInCredentials) => void;
  signOut: () => void;
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
  const [user, setUser] = useState<UserProfile | null>(null);
  const [registeredUsers, setRegisteredUsers] = useState<Record<string, UserProfile>>({});
  const [settings, setSettings] = useState<HabitSettingsMap>(() => createDefaultSettings(2000));
  const [habits, setHabits] = useState<Record<HabitSlug, HabitState>>(() => {
    const initialSettings = createDefaultSettings(2000);
    return {
      water: {
        summary: createHabitSummary('water', resolveTargetFromSettings('water', initialSettings)),
        history: [],
        settings: initialSettings.water,
      },
      sleep: {
        summary: createHabitSummary('sleep', resolveTargetFromSettings('sleep', initialSettings)),
        history: [],
        settings: initialSettings.sleep,
      },
      exercise: {
        summary: createHabitSummary(
          'exercise',
          resolveTargetFromSettings('exercise', initialSettings)
        ),
        history: [],
        settings: initialSettings.exercise,
      },
      nutrition: {
        summary: createHabitSummary(
          'nutrition',
          resolveTargetFromSettings('nutrition', initialSettings)
        ),
        history: [],
        settings: initialSettings.nutrition,
      },
    };
  });
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
    ({ username, email, password, height, weight, age }) => {
      const normalizedEmail = email.trim().toLowerCase();
      if (registeredUsers[normalizedEmail]) {
        throw new Error('Ya existe una cuenta registrada con este correo electrónico.');
      }

      setIsLoading(true);
      const recommended = computeRecommendedWater(height, weight);
      const nextSettings = createDefaultSettings(recommended);

      const nextHabits: Record<HabitSlug, HabitState> = {
        water: {
          summary: createHabitSummary('water', resolveTargetFromSettings('water', nextSettings)),
          history: [],
          settings: nextSettings.water,
        },
        sleep: {
          summary: createHabitSummary('sleep', resolveTargetFromSettings('sleep', nextSettings)),
          history: [],
          settings: nextSettings.sleep,
        },
        exercise: {
          summary: createHabitSummary(
            'exercise',
            resolveTargetFromSettings('exercise', nextSettings)
          ),
          history: [],
          settings: nextSettings.exercise,
        },
        nutrition: {
          summary: createHabitSummary(
            'nutrition',
            resolveTargetFromSettings('nutrition', nextSettings)
          ),
          history: [],
          settings: nextSettings.nutrition,
        },
      };

      setSettings(nextSettings);
      setHabits(nextHabits);
      setDailySnapshots({});
      rebuildReminders(nextHabits, nextSettings);
      setNotifications([
        {
          id: nextNotificationId.current++,
          habitId: null,
          title: '👋 ¡Bienvenido!',
          message: 'Configura tus hábitos para recibir recordatorios personalizados.',
          type: 'alert',
          channel: 'in_app',
          scheduledFor: null,
          read: false,
          createdAt: new Date().toISOString(),
        },
      ]);
      const profile: UserProfile = {
        username,
        email,
        password,
        height,
        weight,
        age,
      };
      setUser(profile);
      setRegisteredUsers((prev) => ({
        ...prev,
        [normalizedEmail]: profile,
      }));
      setIsLoading(false);
    },
    [rebuildReminders, registeredUsers]
  );

  const authenticate = useCallback<AppContextValue['authenticate']>(
    ({ email, password }) => {
      setIsLoading(true);
      const normalizedEmail = email.trim().toLowerCase();
      const record = registeredUsers[normalizedEmail];

      if (!record || record.password !== password) {
        setIsLoading(false);
        throw new Error('Correo o contraseña incorrectos.');
      }

      const recommended = computeRecommendedWater(record.height, record.weight);
      const nextSettings = createDefaultSettings(recommended);

      const nextHabits: Record<HabitSlug, HabitState> = {
        water: {
          summary: createHabitSummary('water', resolveTargetFromSettings('water', nextSettings)),
          history: [],
          settings: nextSettings.water,
        },
        sleep: {
          summary: createHabitSummary('sleep', resolveTargetFromSettings('sleep', nextSettings)),
          history: [],
          settings: nextSettings.sleep,
        },
        exercise: {
          summary: createHabitSummary(
            'exercise',
            resolveTargetFromSettings('exercise', nextSettings)
          ),
          history: [],
          settings: nextSettings.exercise,
        },
        nutrition: {
          summary: createHabitSummary(
            'nutrition',
            resolveTargetFromSettings('nutrition', nextSettings)
          ),
          history: [],
          settings: nextSettings.nutrition,
        },
      };

      setSettings(nextSettings);
      setHabits(nextHabits);
      setDailySnapshots({});
      rebuildReminders(nextHabits, nextSettings);
      setNotifications([
        {
          id: nextNotificationId.current++,
          habitId: null,
          title: '👋 ¡Bienvenido de nuevo!',
          message: 'Revisa tus hábitos para continuar con tu progreso.',
          type: 'alert',
          channel: 'in_app',
          scheduledFor: null,
          read: false,
          createdAt: new Date().toISOString(),
        },
      ]);
      setUser(record);
      setIsLoading(false);
    },
    [rebuildReminders, registeredUsers]
  );

  const signOut = useCallback<AppContextValue['signOut']>(() => {
    const baseSettings = createDefaultSettings(2000);
    const baseHabits: Record<HabitSlug, HabitState> = {
      water: {
        summary: createHabitSummary('water', resolveTargetFromSettings('water', baseSettings)),
        history: [],
        settings: baseSettings.water,
      },
      sleep: {
        summary: createHabitSummary('sleep', resolveTargetFromSettings('sleep', baseSettings)),
        history: [],
        settings: baseSettings.sleep,
      },
      exercise: {
        summary: createHabitSummary(
          'exercise',
          resolveTargetFromSettings('exercise', baseSettings)
        ),
        history: [],
        settings: baseSettings.exercise,
      },
      nutrition: {
        summary: createHabitSummary(
          'nutrition',
          resolveTargetFromSettings('nutrition', baseSettings)
        ),
        history: [],
        settings: baseSettings.nutrition,
      },
    };

    setUser(null);
    setSettings(baseSettings);
    setHabits(baseHabits);
    setDailySnapshots({});
    setReminders([]);
    setNotifications([]);
    nextLogId.current = 1;
    nextNotificationId.current = 1;
  }, []);

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
        const previousKey = prev.email.trim().toLowerCase();
        const nextKey = next.email.trim().toLowerCase();
        setRegisteredUsers((records) => {
          const nextRecords = { ...records };
          if (previousKey && previousKey !== nextKey) {
            delete nextRecords[previousKey];
          }
          nextRecords[nextKey] = next;
          return nextRecords;
        });
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
      dashboard,
      isLoading,
      signIn,
      authenticate,
      signOut,
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

