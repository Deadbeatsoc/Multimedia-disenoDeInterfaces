import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Droplets, Moon, Dumbbell, Apple } from 'lucide-react-native';
import { HabitCard } from '@/components/HabitCard';
import { ProgressRing } from '@/components/ProgressRing';
import { QuickAction } from '@/components/QuickAction';
import { colors, spacing } from '@/constants/theme';

export default function Dashboard() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.greeting}>¡Buen día!</Text>
          <Text style={styles.date}>Miércoles, 15 Enero 2025</Text>
        </View>

        <View style={styles.progressSection}>
          <Text style={styles.sectionTitle}>Progreso de Hoy</Text>
          <View style={styles.progressContainer}>
            <ProgressRing progress={0.75} size={120} strokeWidth={8}>
              <Text style={styles.progressText}>75%</Text>
              <Text style={styles.progressSubtext}>Completado</Text>
            </ProgressRing>
            <View style={styles.progressDetails}>
              <Text style={styles.progressDetailText}>3 de 4 hábitos</Text>
              <Text style={styles.motivationalText}>¡Estás muy cerca!</Text>
            </View>
          </View>
        </View>

        <View style={styles.habitsSection}>
          <Text style={styles.sectionTitle}>Hábitos de Hoy</Text>
          <View style={styles.habitsGrid}>
            <HabitCard
              icon={<Droplets size={24} color={colors.blue.main} />}
              title="Agua"
              progress="1.5L de 2L"
              percentage={0.75}
              color={colors.blue.main}
              completed={false}
            />
            <HabitCard
              icon={<Moon size={24} color={colors.purple.main} />}
              title="Sueño"
              progress="8h cumplidas"
              percentage={1}
              color={colors.purple.main}
              completed={true}
            />
            <HabitCard
              icon={<Dumbbell size={24} color={colors.green.main} />}
              title="Ejercicio"
              progress="30 min"
              percentage={1}
              color={colors.green.main}
              completed={true}
            />
            <HabitCard
              icon={<Apple size={24} color={colors.orange.main} />}
              title="Alimentación"
              progress="2 de 3 comidas"
              percentage={0.67}
              color={colors.orange.main}
              completed={false}
            />
          </View>
        </View>

        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
          <View style={styles.quickActionsGrid}>
            <QuickAction
              icon={<Droplets size={20} color="#FFFFFF" />}
              title="Beber Agua"
              backgroundColor={colors.blue.main}
            />
            <QuickAction
              icon={<Dumbbell size={20} color="#FFFFFF" />}
              title="Ejercicio"
              backgroundColor={colors.green.main}
            />
            <QuickAction
              icon={<Apple size={20} color="#FFFFFF" />}
              title="Comida"
              backgroundColor={colors.orange.main}
            />
          </View>
        </View>

        <View style={styles.reminderSection}>
          <View style={styles.reminderCard}>
            <Text style={styles.reminderText}>💧 ¡Es hora de beber agua!</Text>
            <Text style={styles.reminderSubtext}>
              Te queda 0.5L para cumplir tu meta diaria
            </Text>
            <TouchableOpacity style={styles.reminderButton}>
              <Text style={styles.reminderButtonText}>Registrar Agua</Text>
            </TouchableOpacity>
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
    gap: spacing.md,
  },
  reminderSection: {
    padding: spacing.lg,
    paddingTop: 0,
    paddingBottom: spacing.xl,
  },
  reminderCard: {
    backgroundColor: colors.blue[50],
    padding: spacing.lg,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.blue.main,
  },
  reminderText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: spacing.xs,
  },
  reminderSubtext: {
    fontSize: 14,
    color: colors.gray[600],
    marginBottom: spacing.md,
  },
  reminderButton: {
    backgroundColor: colors.blue.main,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  reminderButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});