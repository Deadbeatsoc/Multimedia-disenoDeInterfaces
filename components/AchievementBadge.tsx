import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing } from '@/constants/theme';

interface AchievementBadgeProps {
  icon: string;
  title: string;
  description: string;
  unlocked: boolean;
}

export function AchievementBadge({
  icon,
  title,
  description,
  unlocked,
}: AchievementBadgeProps) {
  return (
    <View style={[styles.container, !unlocked && styles.lockedContainer]}>
      <View style={[styles.iconContainer, !unlocked && styles.lockedIcon]}>
        <Text style={[styles.icon, !unlocked && styles.lockedIconText]}>
          {unlocked ? icon : '🔒'}
        </Text>
      </View>
      <Text style={[styles.title, !unlocked && styles.lockedText]}>
        {title}
      </Text>
      <Text style={[styles.description, !unlocked && styles.lockedText]}>
        {description}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    padding: spacing.lg,
    borderRadius: 16,
    alignItems: 'center',
    width: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  lockedContainer: {
    backgroundColor: colors.gray[100],
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.blue.light,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  lockedIcon: {
    backgroundColor: colors.gray[200],
  },
  icon: {
    fontSize: 28,
  },
  lockedIconText: {
    fontSize: 20,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[900],
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: 12,
    color: colors.gray[600],
    textAlign: 'center',
  },
  lockedText: {
    color: colors.gray[500],
  },
});