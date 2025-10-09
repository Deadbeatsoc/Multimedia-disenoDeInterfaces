import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Moon, Clock } from 'lucide-react-native';
import { ProgressRing } from './ProgressRing';
import { colors, spacing } from '@/constants/theme';

export function SleepTracker() {
  const [sleepHours, setSleepHours] = useState(8);
  const [bedTime, setBedTime] = useState('22:30');
  const [wakeTime, setWakeTime] = useState('06:30');
  const [quality, setQuality] = useState(4);

  const target = 8;
  const progress = Math.min(sleepHours / target, 1);

  const qualityLabels = ['Muy Malo', 'Malo', 'Regular', 'Bueno', 'Excelente'];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Moon size={24} color={colors.purple.main} />
          <Text style={styles.title}>Seguimiento del Sueño</Text>
        </View>
      </View>

      <View style={styles.progressSection}>
        <ProgressRing progress={progress} size={140} strokeWidth={10}>
          <Text style={styles.progressText}>{sleepHours}h</Text>
          <Text style={styles.progressSubtext}>de {target}h</Text>
        </ProgressRing>
      </View>

      <View style={styles.timeSection}>
        <Text style={styles.sectionLabel}>Horarios</Text>
        <View style={styles.timeRow}>
          <View style={styles.timeInput}>
            <Text style={styles.timeLabel}>Hora de dormir</Text>
            <TextInput
              style={styles.timeField}
              value={bedTime}
              onChangeText={setBedTime}
              placeholder="22:30"
            />
          </View>
          <View style={styles.timeInput}>
            <Text style={styles.timeLabel}>Hora de despertar</Text>
            <TextInput
              style={styles.timeField}
              value={wakeTime}
              onChangeText={setWakeTime}
              placeholder="06:30"
            />
          </View>
        </View>
      </View>

      <View style={styles.qualitySection}>
        <Text style={styles.sectionLabel}>Calidad del Sueño</Text>
        <View style={styles.qualityButtons}>
          {[1, 2, 3, 4, 5].map((rating) => (
            <TouchableOpacity
              key={rating}
              style={[
                styles.qualityButton,
                quality >= rating && {
                  backgroundColor: colors.purple.main,
                },
              ]}
              onPress={() => setQuality(rating)}>
              <Text
                style={[
                  styles.qualityButtonText,
                  quality >= rating && styles.qualityButtonTextActive,
                ]}>
                ⭐
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.qualityLabel}>{qualityLabels[quality - 1]}</Text>
      </View>

      <TouchableOpacity
        style={[styles.saveButton, { backgroundColor: colors.purple.main }]}>
        <Text style={styles.saveButtonText}>Guardar Sueño</Text>
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
  timeSection: {
    marginBottom: spacing.xl,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: spacing.md,
  },
  timeRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  timeInput: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 14,
    color: colors.gray[600],
    marginBottom: spacing.sm,
  },
  timeField: {
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: 8,
    padding: spacing.md,
    fontSize: 16,
    backgroundColor: colors.gray[50],
  },
  qualitySection: {
    marginBottom: spacing.xl,
  },
  qualityButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  qualityButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray[200],
  },
  qualityButtonText: {
    fontSize: 16,
  },
  qualityButtonTextActive: {
    opacity: 1,
  },
  qualityLabel: {
    fontSize: 14,
    color: colors.purple.main,
    fontWeight: '600',
    textAlign: 'center',
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