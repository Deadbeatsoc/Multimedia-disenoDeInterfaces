import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { ProgressRing } from './ProgressRing';
import { VideoAccordion } from './VideoAccordion';
import { colors, spacing } from '@/constants/theme';

interface HabitTrackerProps {
  title: string;
  icon: React.ReactNode;
  unit: string;
  target: number;
  current: number;
  color: string;
  onSave?: (value: number, notes: string) => Promise<void> | void;
  isSaving?: boolean;
  defaultNotes?: string;
  habitType?: 'exercise' | 'nutrition';
}

export function HabitTracker({
  title,
  icon,
  unit,
  target,
  current: initialCurrent,
  color,
  onSave,
  isSaving = false,
  defaultNotes = '',
  habitType,
}: HabitTrackerProps) {
  const [current, setCurrent] = useState(initialCurrent);
  const [notes, setNotes] = useState(defaultNotes);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const progress = Math.min(current / target, 1);
  const percentage = Math.round(progress * 100);

  const handleIncrement = () => {
    setCurrent((prev) => prev + 1);
  };

  const handleDecrement = () => {
    setCurrent((prev) => Math.max(0, prev - 1));
  };

  useEffect(() => {
    setCurrent(initialCurrent);
  }, [initialCurrent]);

  useEffect(() => {
    setNotes(defaultNotes);
  }, [defaultNotes]);

  const handleSave = async () => {
    if (!onSave || isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave(current, notes);
      setNotes(defaultNotes);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          {icon}
          <Text style={styles.title}>{title}</Text>
        </View>
      </View>

      <View style={styles.progressSection}>
        <ProgressRing progress={progress} size={140} strokeWidth={10}>
          <Text style={styles.progressText}>{percentage}%</Text>
          <Text style={styles.progressSubtext}>
            {current} de {target} {unit}
          </Text>
        </ProgressRing>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlButton, { borderColor: color }]}
          onPress={handleDecrement}>
          <Minus size={24} color={color} />
        </TouchableOpacity>

        <View style={styles.currentValue}>
          <Text style={[styles.currentText, { color }]}>{current}</Text>
          <Text style={styles.unitText}>{unit}</Text>
        </View>

        <TouchableOpacity
          style={[styles.controlButton, { backgroundColor: color }]}
          onPress={handleIncrement}>
          <Plus size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.notesSection}>
        <Text style={styles.notesLabel}>Notas (opcional)</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="Añade observaciones sobre este hábito..."
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      {habitType === 'exercise' && (
        <View style={styles.videosSection}>
          <Text style={styles.videosTitle}>Aprende sobre Ejercicio</Text>
          <VideoAccordion
            title="Técnicas de Entrenamiento"
            description="Mejora tu rutina de ejercicio"
            color={color}
            videoSource={require('@/assets/videos/IntruduccionAplicacionOmar.mp4')}
          />
        </View>
      )}

      {habitType === 'nutrition' && (
        <View style={styles.videosSection}>
          <Text style={styles.videosTitle}>Aprende sobre Nutrición</Text>
          <VideoAccordion
            title="Alimentación Saludable"
            description="Consejos para comer mejor"
            color={color}
            videoSource={require('@/assets/videos/AlimentacionGarcia.mp4')}
          />
        </View>
      )}

      <TouchableOpacity
        style={[styles.saveButton, { backgroundColor: color }]}
        onPress={handleSave}
        disabled={isSaving || isSubmitting}>
        <Text style={styles.saveButtonText}>
          {isSaving || isSubmitting ? 'Guardando...' : 'Guardar Registro'}
        </Text>
      </TouchableOpacity>
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
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    gap: spacing.xl,
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  currentValue: {
    alignItems: 'center',
  },
  currentText: {
    fontSize: 32,
    fontWeight: '700',
  },
  unitText: {
    fontSize: 14,
    color: colors.gray[600],
  },
  notesSection: {
    marginBottom: spacing.xl,
  },
  notesLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: spacing.md,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: 12,
    padding: spacing.lg,
    fontSize: 14,
    color: colors.gray[900],
    backgroundColor: colors.gray[50],
    minHeight: 80,
  },
  videosSection: {
    marginBottom: spacing.xl,
  },
  videosTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: spacing.md,
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