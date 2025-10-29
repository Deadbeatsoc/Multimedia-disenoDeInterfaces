import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing } from '@/constants/theme';

export interface ProgressChartPoint {
  label: string;
  percentage: number;
}

interface ProgressChartProps {
  data: ProgressChartPoint[];
  emptyMessage?: string;
}

export function ProgressChart({ data, emptyMessage = 'No hay datos disponibles' }: ProgressChartProps) {
  if (!data.length) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyMessage}>{emptyMessage}</Text>
      </View>
    );
  }

  const maxHeight = 100;
  const maxValue = Math.max(...data.map((item) => item.percentage), 100);
  const normalized = data.map((item) => ({
    ...item,
    percentage: Math.max(0, Math.min(item.percentage, 100)),
  }));

  return (
    <View style={styles.container}>
      <View style={styles.chart}>
        {normalized.map((item, index) => (
          <View key={`${item.label}-${index}`} style={styles.barContainer}>
            <View style={styles.barColumn}>
              <View
                style={[
                  styles.bar,
                  {
                    height: (item.percentage / maxValue) * maxHeight,
                    backgroundColor: colors.blue.main,
                  },
                ]}
              />
            </View>
            <Text style={styles.barLabel}>{item.label}</Text>
            <Text style={styles.barValue}>{item.percentage}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    padding: spacing.xl,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 160,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    width: '100%',
    height: 140,
  },
  barContainer: {
    alignItems: 'center',
    flex: 1,
  },
  barColumn: {
    height: 100,
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  bar: {
    width: 20,
    backgroundColor: colors.blue.main,
    borderRadius: 4,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.gray[700],
    marginBottom: spacing.xs,
  },
  barValue: {
    fontSize: 10,
    color: colors.gray[500],
  },
  emptyMessage: {
    fontSize: 14,
    color: colors.gray[500],
  },
});

