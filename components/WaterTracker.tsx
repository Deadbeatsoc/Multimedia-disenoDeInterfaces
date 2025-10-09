import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Droplets, Plus } from 'lucide-react-native';
import { ProgressRing } from './ProgressRing';
import { colors, spacing } from '@/constants/theme';

const GLASS_SIZES = [
  { size: 250, label: '250ml', icon: '🥃' },
  { size: 500, label: '500ml', icon: '🥛' },
  { size: 750, label: '750ml', icon: '🍶' },
  { size: 1000, label: '1L', icon: '🍼' },
];

export function WaterTracker() {
  const [consumed, setConsumed] = useState(1500); // ml
  const target = 2000; // ml
  const progress = Math.min(consumed / target, 1);

  const handleAddWater = (amount: number) => {
    setConsumed((prev) => Math.min(prev + amount, target * 1.5));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Droplets size={24} color={colors.blue.main} />
          <Text style={styles.title}>Consumo de Agua</Text>
        </View>
      </View>

      <View style={styles.progressSection}>
        <ProgressRing progress={progress} size={140} strokeWidth={10}>
          <Text style={styles.progressText}>{Math.round(progress * 100)}%</Text>
          <Text style={styles.progressSubtext}>
            {consumed}ml de {target}ml
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
        <View style={styles.historyList}>
          <View style={styles.historyItem}>
            <Text style={styles.historyTime}>08:30</Text>
            <View style={styles.historyContent}>
              <Droplets size={16} color={colors.blue.main} />
              <Text style={styles.historyText}>250ml - Vaso de agua</Text>
            </View>
          </View>
          <View style={styles.historyItem}>
            <Text style={styles.historyTime}>12:15</Text>
            <View style={styles.historyContent}>
              <Droplets size={16} color={colors.blue.main} />
              <Text style={styles.historyText}>500ml - Botella</Text>
            </View>
          </View>
          <View style={styles.historyItem}>
            <Text style={styles.historyTime}>15:45</Text>
            <View style={styles.historyContent}>
              <Droplets size={16} color={colors.blue.main} />
              <Text style={styles.historyText}>750ml - Botella grande</Text>
            </View>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.saveButton, { backgroundColor: colors.blue.main }]}>
        <Text style={styles.saveButtonText}>Completar Día</Text>
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