import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing } from '@/constants/theme';

interface ProgressChartProps {
  period: 'week' | 'month' | 'year';
}

const mockData = {
  week: [
    { day: 'L', percentage: 80 },
    { day: 'M', percentage: 90 },
    { day: 'M', percentage: 75 },
    { day: 'J', percentage: 85 },
    { day: 'V', percentage: 95 },
    { day: 'S', percentage: 70 },
    { day: 'D', percentage: 60 },
  ],
  month: [
    { day: 'S1', percentage: 85 },
    { day: 'S2', percentage: 78 },
    { day: 'S3', percentage: 92 },
    { day: 'S4', percentage: 88 },
  ],
  year: [
    { day: 'E', percentage: 82 },
    { day: 'F', percentage: 78 },
    { day: 'M', percentage: 85 },
    { day: 'A', percentage: 90 },
    { day: 'M', percentage: 88 },
    { day: 'J', percentage: 85 },
  ],
};

export function ProgressChart({ period }: ProgressChartProps) {
  const data = mockData[period];
  const maxHeight = 100;

  return (
    <View style={styles.container}>
      <View style={styles.chart}>
        {data.map((item, index) => (
          <View key={index} style={styles.barContainer}>
            <View style={styles.barColumn}>
              <View
                style={[
                  styles.bar,
                  {
                    height: (item.percentage / 100) * maxHeight,
                    backgroundColor: colors.blue.main,
                  },
                ]}
              />
            </View>
            <Text style={styles.barLabel}>{item.day}</Text>
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
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
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
});