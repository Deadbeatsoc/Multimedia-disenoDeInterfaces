import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, Award, TrendingUp } from 'lucide-react-native';
import { StatCard } from '@/components/StatCard';
import { ProgressChart } from '@/components/ProgressChart';
import { AchievementBadge } from '@/components/AchievementBadge';
import { colors, spacing } from '@/constants/theme';

type PeriodType = 'week' | 'month' | 'year';

export default function Stats() {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('week');

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
            title="Racha Actual"
            value="7"
            subtitle="días consecutivos"
            color={colors.green.main}
          />
          <StatCard
            icon={<Calendar size={20} color={colors.blue.main} />}
            title="Completados"
            value="85%"
            subtitle="esta semana"
            color={colors.blue.main}
          />
        </View>

        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>Tendencias</Text>
          <ProgressChart period={selectedPeriod} />
        </View>

        <View style={styles.achievementsSection}>
          <Text style={styles.sectionTitle}>Logros Recientes</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.achievementsContent}>
            <AchievementBadge
              icon="🏆"
              title="Primera Semana"
              description="7 días seguidos"
              unlocked={true}
            />
            <AchievementBadge
              icon="💧"
              title="Hidratado"
              description="Meta de agua 5 días"
              unlocked={true}
            />
            <AchievementBadge
              icon="⭐"
              title="Perfeccionista"
              description="100% en un día"
              unlocked={false}
            />
            <AchievementBadge
              icon="🎯"
              title="Consistente"
              description="30 días seguidos"
              unlocked={false}
            />
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