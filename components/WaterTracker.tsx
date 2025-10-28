import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Droplets } from 'lucide-react-native';
import { ProgressRing } from './ProgressRing';
import { colors, spacing } from '@/constants/theme';
import { HabitLog } from '@/types/api';

const GLASS_SIZES = [
  { size: 250, label: '250ml', icon: '🥃' },
  { size: 500, label: '500ml', icon: '🥛' },
  { size: 750, label: '750ml', icon: '🍶' },
  { size: 1000, label: '1L', icon: '🍼' },
];

interface WaterTrackerProps {
  habitId?: number;
  initialConsumed?: number;
  target?: number;
  color?: string;
  history?: HabitLog[];
  onAddLog?: (amount: number) => Promise<HabitLog | void> | HabitLog | void;
  onComplete?: () => Promise<void> | void;
  isSaving?: boolean;
}

export function WaterTracker({
  habitId,
  initialConsumed = 0,
  target = 2000,
  color = colors.blue.main,
  history = [],
  onAddLog,
  onComplete,
  isSaving = false,
}: WaterTrackerProps) {
  const [consumed, setConsumed] = useState(initialConsumed);
  const [logHistory, setLogHistory] = useState<HabitLog[]>(history);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setConsumed(initialConsumed);
  }, [initialConsumed]);

  useEffect(() => {
    setLogHistory(history);
  }, [history]);

  const progress = useMemo(() => Math.min(consumed / target, 1), [consumed, target]);

  const formatAmount = (amount: number) => {
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}L`;
    }
    return `${amount}ml`;
  };

  const handleAddWater = async (amount: number) => {
    const previousValue = consumed;
    const newValue = Math.min(previousValue + amount, target * 1.5);
    setConsumed(newValue);

    try {
      if (onAddLog) {
        const result = await onAddLog(amount);
        if (result) {
          setLogHistory((prev) => [result, ...prev].slice(0, 20));
        }
      } else {
        setLogHistory((prev) => [
          {
            id: Date.now(),
            habitId: habitId ?? 0,
            value: amount,
            notes: null,
            loggedAt: new Date().toISOString(),
          },
          ...prev,
        ]);
      }
    } catch (error) {
      console.error('[WaterTracker] Error al registrar agua', error);
      setConsumed(previousValue);
    }
  };

  const handleComplete = async () => {
    if (!onComplete || isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);
      await onComplete();
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderHistory = () => {
    if (!logHistory.length) {
      return (
        <View style={styles.emptyHistory}>
          <Text style={styles.emptyHistoryText}>
            Aún no tienes registros para este hábito hoy.
          </Text>
        </View>
      );
    }

    return logHistory.map((log) => {
      const time = new Date(log.loggedAt).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      });

      return (
        <View style={styles.historyItem} key={`${log.id}-${log.loggedAt}`}>
          <Text style={styles.historyTime}>{time}</Text>
          <View style={styles.historyContent}>
            <Droplets size={16} color={color} />
            <Text style={styles.historyText}>
              {formatAmount(log.value)}{log.notes ? ` - ${log.notes}` : ''}
            </Text>
          </View>
        </View>
      );
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Droplets size={24} color={color} />
          <Text style={styles.title}>Consumo de Agua</Text>
        </View>
      </View>

      <View style={styles.progressSection}>
        <ProgressRing progress={progress} size={140} strokeWidth={10}>
          <Text style={styles.progressText}>{Math.round(progress * 100)}%</Text>
          <Text style={styles.progressSubtext}>
            {formatAmount(consumed)} de {formatAmount(target)}
          </Text>
        </ProgressRing>
      </View>

      <View style={styles.glassesSection}>
        <Text style={styles.sectionLabel}>Añadir Agua</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.glassesGrid}>
          {GLASS_SIZES.map((glass) => (
            <TouchableOpacity
              key={glass.size}
              style={styles.glassButton}
              onPress={() => handleAddWater(glass.size)}>
              <Text style={styles.glassIcon}>{glass.icon}</Text>
              <Text style={styles.glassLabel}>{glass.label}</Text>
            </TouchableOpacity>
          ))}
      </ScrollView>
      </View>

      <View style={styles.historySection}>
        <Text style={styles.sectionLabel}>Registro de Hoy</Text>
        <View style={styles.historyList}>{renderHistory()}</View>
      </View>

      {onComplete && (
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: color }]}
          onPress={handleComplete}
          disabled={isSaving || isSubmitting}>
          <Text style={styles.saveButtonText}>
            {isSaving || isSubmitting ? 'Guardando...' : 'Completar Día'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.gray[900],
  },
  progressSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  progressText: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.gray[900],
  },
  progressSubtext: {
    fontSize: 12,
    color: colors.gray[600],
    textAlign: 'center',
  },
  glassesSection: {
    marginBottom: spacing.xl,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: spacing.md,
  },
  glassesGrid: {
    gap: spacing.md,
  },
  glassButton: {
    backgroundColor: colors.blue.light,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 80,
  },
  glassIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  glassLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.blue.main,
  },
  historySection: {
    marginBottom: spacing.xl,
  },
  historyList: {
    gap: spacing.md,
  },
  emptyHistory: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  emptyHistoryText: {
    fontSize: 14,
    color: colors.gray[500],
    textAlign: 'center',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  historyTime: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[700],
    width: 60,
  },
  historyContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  historyText: {
    fontSize: 14,
    color: colors.gray[600],
  },
  saveButton: {
    paddingVertical: spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});