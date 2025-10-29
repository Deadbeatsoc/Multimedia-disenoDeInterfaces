import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Droplets, Moon, Dumbbell, Apple } from 'lucide-react-native';
import { HabitTracker } from '@/components/HabitTracker';
import { WaterTracker } from '@/components/WaterTracker';
import { SleepTracker } from '@/components/SleepTracker';
import { colors, spacing } from '@/constants/theme';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useAppContext } from '@/context/AppContext';
import { HabitLog, HabitSummary, HabitSlug } from '@/types/api';
import {
  ExerciseHabitSettings,
  NutritionHabitSettings,
  NutritionMealConfig,
  SleepHabitSettings,
  WaterHabitSettings,
} from '@/types/app';

type HabitType = HabitSlug;

type NutritionFormMeal = NutritionMealConfig & { localTime: string };

export default function Habits() {
  const [selectedHabit, setSelectedHabit] = useState<HabitType>('water');
  const [isLogging, setIsLogging] = useState(false);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const { data, isLoading, refresh } = useDashboardData();
  const {
    dashboard,
    logHabitEntry,
    getHabitHistory,
    updateWaterSettings,
    updateSleepSettings,
    updateNutritionSettings,
    updateExerciseSettings,
  } = useAppContext();

  const habits = data?.habits ?? [];

  useEffect(() => {
    if (!habits.length) {
      return;
    }

    const exists = habits.some((habit) => habit.slug === selectedHabit);
    if (!exists) {
      setSelectedHabit(habits[0].slug);
    }
  }, [habits, selectedHabit]);

  const selectedHabitSummary = useMemo(
    () => habits.find((habit) => habit.slug === selectedHabit),
    [habits, selectedHabit]
  );

  const waterSettings = dashboard.habits.water
    ?.settings as WaterHabitSettings;
  const sleepSettings = dashboard.habits.sleep
    ?.settings as SleepHabitSettings;
  const nutritionSettings = dashboard.habits.nutrition
    ?.settings as NutritionHabitSettings;
  const exerciseSettings = dashboard.habits.exercise
    ?.settings as ExerciseHabitSettings;

  const [waterGoalType, setWaterGoalType] = useState<'recommended' | 'custom'>(
    waterSettings?.useRecommendedTarget ? 'recommended' : 'custom'
  );
  const [customWaterGoal, setCustomWaterGoal] = useState(
    String(
      waterSettings?.customTarget ?? waterSettings?.recommendedTarget ?? 2000
    )
  );
  const [waterInterval, setWaterInterval] = useState(
    String(waterSettings?.reminderIntervalMinutes ?? 120)
  );

  const [sleepForm, setSleepForm] = useState({
    bedTime: sleepSettings?.bedTime ?? '22:30',
    wakeTime: sleepSettings?.wakeTime ?? '06:30',
    reminderEnabled: sleepSettings?.reminderEnabled ?? true,
    reminderAdvanceMinutes: String(sleepSettings?.reminderAdvanceMinutes ?? 30),
  });

  const [nutritionForm, setNutritionForm] = useState({
    remindersEnabled: nutritionSettings?.remindersEnabled ?? true,
    meals: (nutritionSettings?.meals ?? []).map((meal) => ({
      ...meal,
      localTime: meal.time,
    })) as NutritionFormMeal[],
  });

  const [exerciseForm, setExerciseForm] = useState({
    dailyGoalMinutes: String(exerciseSettings?.dailyGoalMinutes ?? 30),
    reminderEnabled: exerciseSettings?.reminderEnabled ?? true,
    reminderTime: exerciseSettings?.reminderTime ?? '18:00',
  });

  useEffect(() => {
    if (waterSettings) {
      setWaterGoalType(waterSettings.useRecommendedTarget ? 'recommended' : 'custom');
      setCustomWaterGoal(
        String(waterSettings.customTarget ?? waterSettings.recommendedTarget)
      );
      setWaterInterval(String(waterSettings.reminderIntervalMinutes));
    }
  }, [waterSettings]);

  useEffect(() => {
    if (sleepSettings) {
      setSleepForm({
        bedTime: sleepSettings.bedTime,
        wakeTime: sleepSettings.wakeTime,
        reminderEnabled: sleepSettings.reminderEnabled,
        reminderAdvanceMinutes: String(sleepSettings.reminderAdvanceMinutes),
      });
    }
  }, [sleepSettings]);

  useEffect(() => {
    if (nutritionSettings) {
      setNutritionForm({
        remindersEnabled: nutritionSettings.remindersEnabled,
        meals: nutritionSettings.meals.map((meal) => ({
          ...meal,
          localTime: meal.time,
        })),
      });
    }
  }, [nutritionSettings]);

  useEffect(() => {
    if (exerciseSettings) {
      setExerciseForm({
        dailyGoalMinutes: String(exerciseSettings.dailyGoalMinutes),
        reminderEnabled: exerciseSettings.reminderEnabled,
        reminderTime: exerciseSettings.reminderTime,
      });
    }
  }, [exerciseSettings]);

  const handleLogEntry = async (
    habit: HabitSummary,
    value: number,
    notes?: string
  ): Promise<HabitLog | void> => {
    if (value <= 0) {
      Alert.alert('Aviso', 'El progreso debe ser mayor para registrar un avance.');
      return;
    }

    try {
      setIsLogging(true);
      const log = logHabitEntry(habit.slug, value, notes);
      await refresh();
      return log;
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error
          ? error.message
          : 'No se pudo guardar el registro.'
      );
      throw error;
    } finally {
      setIsLogging(false);
    }
  };

  const handleSaveHabit = async (
    habit: HabitSummary,
    value: number,
    notes: string
  ) => {
    const delta = value - habit.progressValue;
    if (delta <= 0) {
      Alert.alert('Aviso', 'El valor debe ser mayor que el progreso actual.');
      return;
    }

    await handleLogEntry(habit, delta, notes);
  };

  const history = selectedHabitSummary
    ? getHabitHistory(selectedHabitSummary.slug)
    : [];

  const handleSaveWaterSettings = () => {
    const interval = Number(waterInterval);
    if (!Number.isFinite(interval) || interval <= 0) {
      Alert.alert('Aviso', 'El intervalo debe ser un número positivo.');
      return;
    }

    const customTarget = Number(customWaterGoal);
    if (waterGoalType === 'custom' && (!Number.isFinite(customTarget) || customTarget <= 0)) {
      Alert.alert('Aviso', 'Define una meta personalizada válida en mililitros.');
      return;
    }

    setIsUpdatingSettings(true);
    try {
      updateWaterSettings({
        reminderIntervalMinutes: interval,
        useRecommendedTarget: waterGoalType === 'recommended',
        customTarget: waterGoalType === 'custom' ? customTarget : null,
      });
      Alert.alert('Listo', 'Actualizamos tu meta de hidratación.');
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const handleSaveSleepSettings = () => {
    const advance = Number(sleepForm.reminderAdvanceMinutes);
    if (!Number.isFinite(advance) || advance < 0) {
      Alert.alert('Aviso', 'El recordatorio debe tener un margen válido.');
      return;
    }

    setIsUpdatingSettings(true);
    try {
      updateSleepSettings({
        bedTime: sleepForm.bedTime,
        wakeTime: sleepForm.wakeTime,
        reminderEnabled: sleepForm.reminderEnabled,
        reminderAdvanceMinutes: advance,
      });
      Alert.alert('Listo', 'Guardamos tu rutina de sueño.');
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const handleSaveNutritionSettings = () => {
    const meals = nutritionForm.meals.map((meal) => ({
      ...meal,
      time: meal.localTime,
    }));

    setIsUpdatingSettings(true);
    try {
      updateNutritionSettings({
        remindersEnabled: nutritionForm.remindersEnabled,
        meals,
      });
      Alert.alert('Listo', 'Configuramos tus recordatorios de comida.');
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const handleSaveExerciseSettings = () => {
    const goal = Number(exerciseForm.dailyGoalMinutes);
    if (!Number.isFinite(goal) || goal <= 0) {
      Alert.alert('Aviso', 'Indica una meta de minutos válida.');
      return;
    }

    setIsUpdatingSettings(true);
    try {
      updateExerciseSettings({
        dailyGoalMinutes: goal,
        reminderEnabled: exerciseForm.reminderEnabled,
        reminderTime: exerciseForm.reminderTime,
      });
      Alert.alert('Listo', 'Actualizamos tu rutina de ejercicio.');
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const renderHabitContent = () => {
    if (!selectedHabitSummary) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>Sin hábitos configurados</Text>
          <Text style={styles.emptyStateText}>
            Crea nuevos hábitos desde el panel principal para comenzar a registrarlos.
          </Text>
        </View>
      );
    }

    switch (selectedHabit) {
      case 'water':
        return (
          <WaterTracker
            habitId={selectedHabitSummary.id}
            initialConsumed={selectedHabitSummary.progressValue}
            target={selectedHabitSummary.targetValue}
            color={selectedHabitSummary.color}
            history={history}
            onAddLog={(amount) => handleLogEntry(selectedHabitSummary, amount)}
            isSaving={isLogging}
          />
        );
      case 'sleep':
        return (
          <SleepTracker
            target={selectedHabitSummary.targetValue}
            initialHours={selectedHabitSummary.progressValue}
            onSave={({ hours }) => handleSaveHabit(selectedHabitSummary, hours, '')}
            isSaving={isLogging}
          />
        );
      case 'exercise':
        return (
          <HabitTracker
            title="Ejercicio"
            icon={<Dumbbell size={24} color={colors.green.main} />}
            unit="minutos"
            target={selectedHabitSummary.targetValue}
            current={selectedHabitSummary.progressValue}
            color={selectedHabitSummary.color}
            onSave={(value, notes) => handleSaveHabit(selectedHabitSummary, value, notes)}
            isSaving={isLogging}
          />
        );
      case 'nutrition':
        return (
          <HabitTracker
            title="Alimentación"
            icon={<Apple size={24} color={colors.orange.main} />}
            unit="comidas"
            target={selectedHabitSummary.targetValue}
            current={selectedHabitSummary.progressValue}
            color={selectedHabitSummary.color}
            onSave={(value, notes) => handleSaveHabit(selectedHabitSummary, value, notes)}
            isSaving={isLogging}
          />
        );
      default:
        return null;
    }
  };

  const renderHabitSettings = () => {
    switch (selectedHabit) {
      case 'water':
        return (
          <View style={styles.settingsCard}>
            <Text style={styles.settingsTitle}>Meta de agua diaria</Text>
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[styles.toggleButton, waterGoalType === 'recommended' && styles.toggleButtonActive]}
                onPress={() => setWaterGoalType('recommended')}>
                <Text
                  style={[styles.toggleButtonText, waterGoalType === 'recommended' && styles.toggleButtonTextActive]}>
                  Recomendado
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleButton, waterGoalType === 'custom' && styles.toggleButtonActive]}
                onPress={() => setWaterGoalType('custom')}>
                <Text
                  style={[styles.toggleButtonText, waterGoalType === 'custom' && styles.toggleButtonTextActive]}>
                  Personalizado
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.helperText}>
              Recomendación actual: {(waterSettings?.recommendedTarget ?? 2000) / 1000} litros
            </Text>
            {waterGoalType === 'custom' && (
              <TextInput
                style={styles.textInput}
                value={customWaterGoal}
                onChangeText={setCustomWaterGoal}
                keyboardType="numeric"
                placeholder="Meta diaria en ml"
              />
            )}
            <Text style={styles.label}>Recordatorio cada (minutos)</Text>
            <TextInput
              style={styles.textInput}
              value={waterInterval}
              onChangeText={setWaterInterval}
              keyboardType="numeric"
              placeholder="120"
            />
            <TouchableOpacity
              style={[styles.saveButton, isUpdatingSettings && styles.buttonDisabled]}
              onPress={handleSaveWaterSettings}
              disabled={isUpdatingSettings}>
              <Text style={styles.saveButtonText}>Guardar cambios</Text>
            </TouchableOpacity>
          </View>
        );
      case 'sleep':
        return (
          <View style={styles.settingsCard}>
            <Text style={styles.settingsTitle}>Rutina de sueño</Text>
            <Text style={styles.label}>Hora de dormir</Text>
            <TextInput
              style={styles.textInput}
              value={sleepForm.bedTime}
              onChangeText={(text) => setSleepForm((prev) => ({ ...prev, bedTime: text }))}
              placeholder="22:30"
            />
            <Text style={styles.label}>Hora de despertar</Text>
            <TextInput
              style={styles.textInput}
              value={sleepForm.wakeTime}
              onChangeText={(text) => setSleepForm((prev) => ({ ...prev, wakeTime: text }))}
              placeholder="06:30"
            />
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Recordatorio antes de dormir</Text>
              <Switch
                value={sleepForm.reminderEnabled}
                onValueChange={(value) =>
                  setSleepForm((prev) => ({ ...prev, reminderEnabled: value }))
                }
              />
            </View>
            <Text style={styles.label}>Anticipación (minutos)</Text>
            <TextInput
              style={styles.textInput}
              value={sleepForm.reminderAdvanceMinutes}
              onChangeText={(text) =>
                setSleepForm((prev) => ({ ...prev, reminderAdvanceMinutes: text }))
              }
              keyboardType="numeric"
              placeholder="30"
            />
            <TouchableOpacity
              style={[styles.saveButton, isUpdatingSettings && styles.buttonDisabled]}
              onPress={handleSaveSleepSettings}
              disabled={isUpdatingSettings}>
              <Text style={styles.saveButtonText}>Guardar rutina</Text>
            </TouchableOpacity>
          </View>
        );
      case 'nutrition':
        return (
          <View style={styles.settingsCard}>
            <Text style={styles.settingsTitle}>Recordatorios de comidas</Text>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Activar recordatorios</Text>
              <Switch
                value={nutritionForm.remindersEnabled}
                onValueChange={(value) =>
                  setNutritionForm((prev) => ({ ...prev, remindersEnabled: value }))
                }
              />
            </View>
            {nutritionForm.meals.map((meal) => (
              <View key={meal.id} style={styles.mealRow}>
                <View style={styles.mealHeader}>
                  <Text style={styles.mealLabel}>{meal.label}</Text>
                  <Switch
                    value={meal.enabled}
                    onValueChange={(value) =>
                      setNutritionForm((prev) => ({
                        ...prev,
                        meals: prev.meals.map((item) =>
                          item.id === meal.id ? { ...item, enabled: value } : item
                        ),
                      }))
                    }
                  />
                </View>
                <TextInput
                  style={styles.textInput}
                  value={meal.localTime}
                  onChangeText={(text) =>
                    setNutritionForm((prev) => ({
                      ...prev,
                      meals: prev.meals.map((item) =>
                        item.id === meal.id ? { ...item, localTime: text } : item
                      ),
                    }))
                  }
                  placeholder="13:00"
                />
              </View>
            ))}
            <TouchableOpacity
              style={[styles.saveButton, isUpdatingSettings && styles.buttonDisabled]}
              onPress={handleSaveNutritionSettings}
              disabled={isUpdatingSettings}>
              <Text style={styles.saveButtonText}>Guardar recordatorios</Text>
            </TouchableOpacity>
          </View>
        );
      case 'exercise':
        return (
          <View style={styles.settingsCard}>
            <Text style={styles.settingsTitle}>Objetivo de ejercicio</Text>
            <Text style={styles.label}>Minutos diarios</Text>
            <TextInput
              style={styles.textInput}
              value={exerciseForm.dailyGoalMinutes}
              onChangeText={(text) =>
                setExerciseForm((prev) => ({ ...prev, dailyGoalMinutes: text }))
              }
              keyboardType="numeric"
              placeholder="30"
            />
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Recordatorio diario</Text>
              <Switch
                value={exerciseForm.reminderEnabled}
                onValueChange={(value) =>
                  setExerciseForm((prev) => ({ ...prev, reminderEnabled: value }))
                }
              />
            </View>
            <Text style={styles.label}>Hora del recordatorio</Text>
            <TextInput
              style={styles.textInput}
              value={exerciseForm.reminderTime}
              onChangeText={(text) =>
                setExerciseForm((prev) => ({ ...prev, reminderTime: text }))
              }
              placeholder="18:00"
            />
            <TouchableOpacity
              style={[styles.saveButton, isUpdatingSettings && styles.buttonDisabled]}
              onPress={handleSaveExerciseSettings}
              disabled={isUpdatingSettings}>
              <Text style={styles.saveButtonText}>Guardar objetivo</Text>
            </TouchableOpacity>
          </View>
        );
      default:
        return null;
    }
  };

  if (isLoading && !habits.length) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.blue.main} />
        <Text style={styles.loadingText}>Cargando hábitos...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Registro de Hábitos</Text>
        <Text style={styles.subtitle}>Registra tu progreso diario</Text>
      </View>

      <View style={styles.habitSelector}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.selectorContent}>
          <TouchableOpacity
            style={[
              styles.selectorButton,
              selectedHabit === 'water' && styles.selectorButtonActive,
            ]}
            onPress={() => setSelectedHabit('water')}>
            <Droplets
              size={20}
              color={selectedHabit === 'water' ? '#FFFFFF' : colors.blue.main}
            />
            <Text
              style={[
                styles.selectorText,
                selectedHabit === 'water' && styles.selectorTextActive,
              ]}>
              Agua
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.selectorButton,
              selectedHabit === 'sleep' && styles.selectorButtonActive,
            ]}
            onPress={() => setSelectedHabit('sleep')}>
            <Moon
              size={20}
              color={selectedHabit === 'sleep' ? '#FFFFFF' : colors.purple.main}
            />
            <Text
              style={[
                styles.selectorText,
                selectedHabit === 'sleep' && styles.selectorTextActive,
              ]}>
              Sueño
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.selectorButton,
              selectedHabit === 'exercise' && styles.selectorButtonActive,
            ]}
            onPress={() => setSelectedHabit('exercise')}>
            <Dumbbell
              size={20}
              color={selectedHabit === 'exercise' ? '#FFFFFF' : colors.green.main}
            />
            <Text
              style={[
                styles.selectorText,
                selectedHabit === 'exercise' && styles.selectorTextActive,
              ]}>
              Ejercicio
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.selectorButton,
              selectedHabit === 'nutrition' && styles.selectorButtonActive,
            ]}
            onPress={() => setSelectedHabit('nutrition')}>
            <Apple
              size={20}
              color={selectedHabit === 'nutrition' ? '#FFFFFF' : colors.orange.main}
            />
            <Text
              style={[
                styles.selectorText,
                selectedHabit === 'nutrition' && styles.selectorTextActive,
              ]}>
              Alimentación
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}>
        {renderHabitContent()}

        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Configura tu hábito</Text>
          {renderHabitSettings()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray[50],
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: colors.gray[600],
  },
  header: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.gray[900],
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: colors.gray[600],
  },
  habitSelector: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  selectorContent: {
    gap: spacing.md,
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.gray[200],
    gap: spacing.sm,
  },
  selectorButtonActive: {
    backgroundColor: colors.blue.main,
    borderColor: colors.blue.main,
  },
  selectorText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[700],
  },
  selectorTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingTop: 0,
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray[900],
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.gray[600],
    textAlign: 'center',
  },
  settingsSection: {
    gap: spacing.lg,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.gray[900],
  },
  settingsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: spacing.xl,
    gap: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray[900],
  },
  toggleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.gray[100],
    padding: spacing.xs,
    borderRadius: 12,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  toggleButtonText: {
    fontSize: 14,
    color: colors.gray[600],
    fontWeight: '600',
  },
  toggleButtonTextActive: {
    color: colors.gray[900],
  },
  helperText: {
    fontSize: 12,
    color: colors.gray[500],
  },
  label: {
    fontSize: 14,
    color: colors.gray[600],
  },
  textInput: {
    backgroundColor: colors.gray[100],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    fontSize: 16,
    color: colors.gray[900],
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 14,
    color: colors.gray[600],
    flex: 1,
    marginRight: spacing.sm,
  },
  mealRow: {
    gap: spacing.sm,
    backgroundColor: colors.gray[100],
    padding: spacing.md,
    borderRadius: 12,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mealLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[700],
  },
  saveButton: {
    backgroundColor: colors.blue.main,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

