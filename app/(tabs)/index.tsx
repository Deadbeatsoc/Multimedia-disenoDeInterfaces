import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HabitCard } from '@/components/HabitCard';
import { ProgressRing } from '@/components/ProgressRing';
import { QuickAction } from '@/components/QuickAction';
import { colors, spacing } from '@/constants/theme';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useAppContext } from '@/context/AppContext';
import { getHabitIcon } from '@/utils/habitIcons';
import { HabitSummary, HabitSlug } from '@/types/api';

const quickActionConfig: Record<HabitSlug, { label: string; amount: number }> = {
  water: { label: 'Beber 250ml', amount: 250 },
  sleep: { label: 'Registrar 1h', amount: 1 },
  exercise: { label: 'Añadir 10min', amount: 10 },
  nutrition: { label: 'Registrar comida', amount: 1 },
};

export default function Dashboard() {
  const { logHabitEntry, markNotificationAsRead } = useAppContext();
  const { data, notifications, isLoading, isRefreshing, refresh } = useDashboardData();
  const [pendingHabitId, setPendingHabitId] = useState<number | null>(null);
  const [isMarkingReminder, setIsMarkingReminder] = useState(false);

  const dashboard = data;
  const habits = dashboard?.habits ?? [];

  const formattedDate = useMemo(() => {
    if (!dashboard) {
      return '';
    }

    const formatter = new Intl.DateTimeFormat('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const formatted = formatter.format(new Date(dashboard.date));
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }, [dashboard]);

  const reminder = useMemo(() => {
    if (!dashboard) {
      return null;
    }

    const unreadReminder = dashboard.reminders.find((item) => !item.read);
    if (unreadReminder) {
      return unreadReminder;
    }

    return notifications.find((notification) => notification.type === 'reminder') ?? null;
  }, [dashboard, notifications]);

  const reminderHabit = reminder
    ? habits.find((habit) => habit.id === reminder.habitId)
    : undefined;

  const completionRate = dashboard?.completionPercentage ?? 0;
  const motivationalText = completionRate >= 1
    ? '¡Objetivo del día completado!'
    : completionRate >= 0.5
      ? '¡Estás muy cerca!'
      : 'Continúa, aún hay tiempo para lograrlo.';

  const quickActions = habits.slice(0, 3);

  const handleQuickAction = async (habit: HabitSummary) => {
    const config = quickActionConfig[habit.slug];
    if (!config) {
      return;
    }

    try {
      setPendingHabitId(habit.id);
      await logHabitEntry(habit.slug, config.amount);
      await refresh();
      Alert.alert('¡Listo!', `${config.label} registrado correctamente.`);
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error
          ? error.message
          : 'No se pudo registrar la acción rápida.'
      );
    } finally {
      setPendingHabitId(null);
    }
  };

  const handleReminderAction = async () => {
    if (!reminder) {
      return;
    }

    try {
      setIsMarkingReminder(true);
      await markNotificationAsRead(reminder.id);
      await refresh();
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error
          ? error.message
          : 'No se pudo actualizar la notificación.'
      );
    } finally {
      setIsMarkingReminder(false);
    }
  };

  if (isLoading && !dashboard) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.blue.main} />
        <Text style={styles.loadingText}>Cargando tu progreso...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={refresh} />
        }>
        <View style={styles.header}>
          <Text style={styles.greeting}>¡Buen día!</Text>
          <Text style={styles.date}>{formattedDate}</Text>
        </View>

        <View style={styles.progressSection}>
          <Text style={styles.sectionTitle}>Progreso de Hoy</Text>
          <View style={styles.progressContainer}>
            <ProgressRing progress={completionRate} size={120} strokeWidth={8}>
              <Text style={styles.progressText}>{Math.round(completionRate * 100)}%</Text>
              <Text style={styles.progressSubtext}>Completado</Text>
            </ProgressRing>
            <View style={styles.progressDetails}>
              <Text style={styles.progressDetailText}>
                {dashboard?.completedHabits ?? 0} de {dashboard?.totalHabits ?? 0} hábitos
              </Text>
              <Text style={styles.motivationalText}>{motivationalText}</Text>
            </View>
          </View>
        </View>

        <View style={styles.habitsSection}>
          <Text style={styles.sectionTitle}>Hábitos de Hoy</Text>
          <View style={styles.habitsGrid}>
            {habits.map((habit) => (
              <HabitCard
                key={habit.id}
                icon={getHabitIcon(habit.icon, habit.color)}
                title={habit.name}
                progress={habit.progressText}
                percentage={habit.completionRate}
                color={habit.color}
                completed={habit.isComplete}
              />
            ))}
          </View>
        </View>

        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
          <View style={styles.quickActionsGrid}>
            {quickActions.map((habit) => {
              const config = quickActionConfig[habit.slug];
              if (!config) {
                return null;
              }

              return (
                <QuickAction
                  key={habit.id}
                  icon={getHabitIcon(habit.icon, '#FFFFFF', 20)}
                  title={config.label}
                  backgroundColor={habit.color}
                  onPress={() => handleQuickAction(habit)}
                  disabled={pendingHabitId === habit.id}
                />
              );
            })}
          </View>
        </View>

        <View style={styles.reminderSection}>
          <View style={styles.reminderCard}>
            <Text style={styles.reminderText}>
              {reminder?.title ?? 'No tienes recordatorios pendientes'}
            </Text>
            <Text style={styles.reminderSubtext}>
              {reminder?.message ?? 'Cuando tengas recordatorios los verás aquí.'}
            </Text>
            {reminder && (
              <TouchableOpacity
                style={styles.reminderButton}
                onPress={handleReminderAction}
                disabled={isMarkingReminder}>
                <Text style={styles.reminderButtonText}>
                  {isMarkingReminder ? 'Actualizando...' : 'Marcar como leída'}
                </Text>
              </TouchableOpacity>
            )}
            {reminderHabit && (
              <Text style={styles.reminderHabit}>Hábito: {reminderHabit.name}</Text>
            )}
          </View>
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
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.gray[900],
    marginBottom: spacing.xs,
  },
  date: {
    fontSize: 16,
    color: colors.gray[600],
  },
  progressSection: {
    padding: spacing.lg,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: spacing.lg,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: spacing.xl,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  progressText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.gray[900],
    textAlign: 'center',
  },
  progressSubtext: {
    fontSize: 12,
    color: colors.gray[600],
    textAlign: 'center',
  },
  progressDetails: {
    marginLeft: spacing.xl,
    flex: 1,
  },
  progressDetailText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: spacing.xs,
  },
  motivationalText: {
    fontSize: 14,
    color: colors.green.main,
    fontWeight: '500',
  },
  habitsSection: {
    padding: spacing.lg,
    paddingTop: 0,
  },
  habitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  quickActionsSection: {
    padding: spacing.lg,
    paddingTop: 0,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  reminderSection: {
    padding: spacing.lg,
    paddingTop: 0,
    paddingBottom: spacing.xxl,
  },
  reminderCard: {
    backgroundColor: '#FFFFFF',
    padding: spacing.xl,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    gap: spacing.sm,
  },
  reminderText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray[900],
  },
  reminderSubtext: {
    fontSize: 14,
    color: colors.gray[600],
  },
  reminderButton: {
    marginTop: spacing.sm,
    backgroundColor: colors.blue.main,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  reminderButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  reminderHabit: {
    fontSize: 12,
    color: colors.gray[500],
  },
});

