import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Droplets, Moon, Dumbbell, Apple } from 'lucide-react-native';
import { HabitTracker } from '@/components/HabitTracker';
import { WaterTracker } from '@/components/WaterTracker';
import { SleepTracker } from '@/components/SleepTracker';
import { colors, spacing } from '@/constants/theme';
import { useDashboardData } from '@/hooks/useDashboardData';
import { fetchHabitLogs, logHabitEntry } from '@/services/api';
import { HabitLog, HabitSummary, HabitSlug } from '@/types/api';

type HabitType = HabitSlug;

export default function Habits() {
  const [selectedHabit, setSelectedHabit] = useState<HabitType>('water');
  const [habitLogs, setHabitLogs] = useState<Record<number, HabitLog[]>>({});
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { data, isLoading, refresh } = useDashboardData();

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

  const loadHabitLogs = async (habit: HabitSummary) => {
    setIsLoadingLogs(true);
    try {
      const logs = await fetchHabitLogs(habit.id, {
        date: new Date().toISOString().slice(0, 10),
      });
      setHabitLogs((prev) => ({ ...prev, [habit.id]: logs }));
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error
          ? error.message
          : 'No se pudo cargar el historial del hábito.'
      );
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (selectedHabitSummary) {
      void loadHabitLogs(selectedHabitSummary);
    }
  }, [selectedHabitSummary]);

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
      setIsSaving(true);
      const log = await logHabitEntry(habit.id, { value, notes });
      setHabitLogs((prev) => ({
        ...prev,
        [habit.id]: [log, ...(prev[habit.id] ?? [])],
      }));
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
      setIsSaving(false);
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

    const history = habitLogs[selectedHabitSummary.id] ?? [];

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
            isSaving={isSaving}
          />
        );
      case 'sleep':
        return (
          <SleepTracker
            target={selectedHabitSummary.targetValue}
            initialHours={selectedHabitSummary.progressValue}
            onSave={({ hours }) => handleSaveHabit(selectedHabitSummary, hours, '')}
            isSaving={isSaving}
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
            isSaving={isSaving}
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
            isSaving={isSaving}
          />
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

      <View style={styles.content}>
        {isLoadingLogs && (
          <View style={styles.loadingLogs}>
            <ActivityIndicator size="small" color={colors.blue.main} />
            <Text style={styles.loadingLogsText}>Actualizando registros...</Text>
          </View>
        )}
        {renderHabitContent()}
      </View>
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
    padding: spacing.lg,
    paddingTop: 0,
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
  loadingLogs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  loadingLogsText: {
    fontSize: 12,
    color: colors.gray[500],
  },
});
