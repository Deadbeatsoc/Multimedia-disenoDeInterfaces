import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Check } from 'lucide-react-native';
import { colors, spacing } from '@/constants/theme';

interface HabitCardProps {
  icon: React.ReactNode;
  title: string;
  progress: string;
  percentage: number;
  color: string;
  completed: boolean;
}

export function HabitCard({
  icon,
  title,
  progress,
  percentage,
  color,
  completed,
}: HabitCardProps) {
  return (
    <TouchableOpacity style={[styles.container, { width: '48%' }]}>
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
          {icon}
        </View>
        {completed && (
          <View style={[styles.completedBadge, { backgroundColor: color }]}>
            <Check size={12} color="#FFFFFF" />
          </View>
        )}
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.progress}>{progress}</Text>
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${percentage * 100}%`,
              backgroundColor: color,
            },
          ]}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    padding: spacing.lg,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  iconContainer: {
    padding: spacing.sm,
    borderRadius: 12,
  },
  completedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: spacing.xs,
  },
  progress: {
    fontSize: 12,
    color: colors.gray[600],
    marginBottom: spacing.md,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.gray[200],
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
});