import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { User, Award, Flame } from 'lucide-react-native';
import { colors, spacing } from '@/constants/theme';

interface ProfileCardProps {
  name: string;
  email: string;
  streak: number;
  achievements: number;
}

export function ProfileCard({
  name,
  email,
  streak,
  achievements,
}: ProfileCardProps) {
  return (
    <View style={styles.container}>
      <View style={styles.avatarContainer}>
        <User size={40} color={colors.gray[600]} />
      </View>
      
      <View style={styles.userInfo}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.email}>{email}</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <View style={styles.statIcon}>
            <Flame size={20} color={colors.orange.main} />
          </View>
          <Text style={styles.statValue}>{streak}</Text>
          <Text style={styles.statLabel}>Racha</Text>
        </View>
        
        <View style={styles.statItem}>
          <View style={styles.statIcon}>
            <Award size={20} color={colors.purple.main} />
          </View>
          <Text style={styles.statValue}>{achievements}</Text>
          <Text style={styles.statLabel}>Logros</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    padding: spacing.xl,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.gray[200],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  userInfo: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.gray[900],
    marginBottom: spacing.xs,
  },
  email: {
    fontSize: 14,
    color: colors.gray[600],
  },
  statsContainer: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  statItem: {
    alignItems: 'center',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.gray[900],
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: 12,
    color: colors.gray[600],
  },
});