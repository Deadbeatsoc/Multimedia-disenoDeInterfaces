import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, TrendingUp } from 'lucide-react-native';
import { StatCard } from '@/components/StatCard';
import { ProgressChart, ProgressChartPoint } from '@/components/ProgressChart';
import { AchievementBadge } from '@/components/AchievementBadge';
import { colors, spacing } from '@/constants/theme';
import { useAppContext } from '@/context/AppContext';
import {
  addDays,
  subtractDays,
  subtractMonths,
  subtractWeeks,
  startOfMonth,
  daysInMonth,
  toDateKey,
  formatWeekdayShort,
  formatMonthShort,
} from '@/utils/date';

type PeriodType = 'week' | 'month' | 'year';

export default function Stats() {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('week');
  const { dashboard } = useAppContext();

  const streak = useMemo(() => {
    const snapshots = Object.values(dashboard.dailySnapshots ?? {});
    return snapshots.filter((item) => item.completionPercentage > 0).length;
  }, [dashboard.dailySnapshots]);

  const completionThisWeek = useMemo(() => {
    const today = new Date();
    const snapshots = dashboard.dailySnapshots ?? {};
    const values = Array.from({ length: 7 }).map((_, index) => {
      const dateKey = toDateKey(subtractDays(today, index));
      return snapshots[dateKey]?.completionPercentage ?? 0;
    });
    const average = values.reduce((sum, value) => sum + value, 0) / values.length;
    return Math.round(average * 100);
  }, [dashboard.dailySnapshots]);

  const chartData = useMemo<ProgressChartPoint[]>(() => {
    const snapshots = dashboard.dailySnapshots ?? {};
    const today = new Date();

    if (selectedPeriod === 'week') {
      return Array.from({ length: 7 }).map((_, index) => {
        const date = subtractDays(today, 6 - index);
        const key = toDateKey(date);
        const percentage = Math.round((snapshots[key]?.completionPercentage ?? 0) * 100);
        return {
          label: formatWeekdayShort(date),
          percentage,
        };
      });
    }

    if (selectedPeriod === 'month') {
      return Array.from({ length: 4 }).map((_, index) => {
        const endOfWeek = subtractWeeks(today, 3 - index);
        const dates = Array.from({ length: 7 }).map((__, offset) =>
          toDateKey(subtractDays(endOfWeek, offset))
        );
        const values = dates.map((dateKey) => snapshots[dateKey]?.completionPercentage ?? 0);
        const average = values.reduce((sum, value) => sum + value, 0) / values.length;
        return {
          label: `S${index + 1}`,
          percentage: Math.round(average * 100),
        };
      });
    }

    return Array.from({ length: 6 }).map((_, index) => {
      const monthDate = subtractMonths(today, 5 - index);
      const label = formatMonthShort(monthDate);
      const start = startOfMonth(monthDate);
      const totalDays = daysInMonth(monthDate);
      const values = Array.from({ length: totalDays }).map((__, offset) => {
        const current = addDays(start, offset);
        return snapshots[toDateKey(current)]?.completionPercentage ?? 0;
      });
      const average = values.reduce((sum, value) => sum + value, 0) / (values.length || 1);
      return {
        label,
        percentage: Math.round(average * 100),
      };
    });
  }, [dashboard.dailySnapshots, selectedPeriod]);

  const achievementBadges = useMemo(() => [
    {
      icon: '🏆',
      title: 'Primera Semana',
      description: '7 días seguidos',
      unlocked: streak >= 7,
    },
    {
      icon: '💧',
      title: 'Hidratado',
      description: 'Meta de agua 5 días',
      unlocked: dashboard.habits.water?.summary.isComplete ?? false,
    },
    {
      icon: '⭐',
      title: 'Perfeccionista',
      description: '100% en un día',
      unlocked: Object.values(dashboard.dailySnapshots ?? {}).some(
        (item) => item.completionPercentage >= 1
      ),
    },
    {
      icon: '🎯',
      title: 'Consistente',
      description: '30 días seguidos',
      unlocked: streak >= 30,
    },
  ], [dashboard.dailySnapshots, dashboard.habits, streak]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Estadísticas</Text>
          <Text style={styles.subtitle}>Analiza tu progreso</Text>
        </View>

        <View style={styles.periodSelector}>
          <TouchableOpacity
            style={[
              styles.periodButton,
              selectedPeriod === 'week' && styles.periodButtonActive,
            ]}
            onPress={() => setSelectedPeriod('week')}>
            <Text
              style={[
                styles.periodText,
                selectedPeriod === 'week' && styles.periodTextActive,
              ]}>
              Semana
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.periodButton,
              selectedPeriod === 'month' && styles.periodButtonActive,
            ]}
            onPress={() => setSelectedPeriod('month')}>
            <Text
              style={[
                styles.periodText,
                selectedPeriod === 'month' && styles.periodTextActive,
              ]}>
              Mes
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.periodButton,
              selectedPeriod === 'year' && styles.periodButtonActive,
            ]}
            onPress={() => setSelectedPeriod('year')}>
            <Text
              style={[
                styles.periodText,
                selectedPeriod === 'year' && styles.periodTextActive,
              ]}>
              Año
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsGrid}>
          <StatCard
            icon={<TrendingUp size={20} color={colors.green.main} />}
            title="Racha actual"
            value={`${streak}`}
            subtitle="días consecutivos"
            color={colors.green.main}
          />
          <StatCard
            icon={<Calendar size={20} color={colors.blue.main} />}
            title="Promedio semanal"
            value={`${completionThisWeek}%`}
            subtitle="hábitos completados"
            color={colors.blue.main}
          />
        </View>

        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>Tendencias</Text>
          <ProgressChart data={chartData} emptyMessage="Sin datos para este periodo" />
        </View>

        <View style={styles.achievementsSection}>
          <Text style={styles.sectionTitle}>Logros recientes</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.achievementsContent}>
            {achievementBadges.map((badge) => (
              <AchievementBadge
                key={badge.title}
                icon={badge.icon}
                title={badge.title}
                description={badge.description}
                unlocked={badge.unlocked}
              />
            ))}
          </ScrollView>
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
  periodSelector: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.gray[100],
    borderRadius: 12,
    padding: spacing.xs,
  },
  periodButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  periodText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[600],
  },
  periodTextActive: {
    color: colors.gray[900],
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  chartSection: {
    padding: spacing.lg,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: spacing.lg,
  },
  achievementsSection: {
    padding: spacing.lg,
    paddingTop: 0,
    paddingBottom: spacing.xl,
  },
  achievementsContent: {
    gap: spacing.md,
  },
});

