import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Droplets, Moon, Dumbbell, Apple, Plus } from 'lucide-react-native';
import { HabitTracker } from '@/components/HabitTracker';
import { WaterTracker } from '@/components/WaterTracker';
import { SleepTracker } from '@/components/SleepTracker';
import { colors, spacing } from '@/constants/theme';

type HabitType = 'water' | 'sleep' | 'exercise' | 'nutrition';

export default function Habits() {
  const [selectedHabit, setSelectedHabit] = useState<HabitType>('water');

  const renderHabitContent = () => {
    switch (selectedHabit) {
      case 'water':
        return <WaterTracker />;
      case 'sleep':
        return <SleepTracker />;
      case 'exercise':
        return (
          <HabitTracker
            title="Ejercicio"
            icon={<Dumbbell size={24} color={colors.green.main} />}
            unit="minutos"
            target={30}
            current={0}
            color={colors.green.main}
          />
        );
      case 'nutrition':
        return (
          <HabitTracker
            title="Alimentación"
            icon={<Apple size={24} color={colors.orange.main} />}
            unit="comidas"
            target={3}
            current={2}
            color={colors.orange.main}
          />
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Registro de Hábitos</Text>
        <Text style={styles.subtitle}>Registra tu progreso diario</Text>
      </View>

      <View style={styles.habitSelector}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.selectorContent}>
          <TouchableOpacity
            style={[
              styles.selectorButton,
              selectedHabit === 'water' && styles.selectorButtonActive,
            ]}
            onPress={() => setSelectedHabit('water')}>
            <Droplets
              size={20}
              color={selectedHabit === 'water' ? '#FFFFFF' : colors.blue.main}
            />
            <Text
              style={[
                styles.selectorText,
                selectedHabit === 'water' && styles.selectorTextActive,
              ]}>
              Agua
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.selectorButton,
              selectedHabit === 'sleep' && styles.selectorButtonActive,
            ]}
            onPress={() => setSelectedHabit('sleep')}>
            <Moon
              size={20}
              color={selectedHabit === 'sleep' ? '#FFFFFF' : colors.purple.main}
            />
            <Text
              style={[
                styles.selectorText,
                selectedHabit === 'sleep' && styles.selectorTextActive,
              ]}>
              Sueño
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.selectorButton,
              selectedHabit === 'exercise' && styles.selectorButtonActive,
            ]}
            onPress={() => setSelectedHabit('exercise')}>
            <Dumbbell
              size={20}
              color={
                selectedHabit === 'exercise' ? '#FFFFFF' : colors.green.main
              }
            />
            <Text
              style={[
                styles.selectorText,
                selectedHabit === 'exercise' && styles.selectorTextActive,
              ]}>
              Ejercicio
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.selectorButton,
              selectedHabit === 'nutrition' && styles.selectorButtonActive,
            ]}
            onPress={() => setSelectedHabit('nutrition')}>
            <Apple
              size={20}
              color={
                selectedHabit === 'nutrition' ? '#FFFFFF' : colors.orange.main
              }
            />
            <Text
              style={[
                styles.selectorText,
                selectedHabit === 'nutrition' && styles.selectorTextActive,
              ]}>
              Alimentación
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <View style={styles.content}>{renderHabitContent()}</View>
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
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.gray[900],
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: colors.gray[600],
  },
  habitSelector: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  selectorContent: {
    gap: spacing.md,
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.gray[200],
    gap: spacing.sm,
  },
  selectorButtonActive: {
    backgroundColor: colors.blue.main,
    borderColor: colors.blue.main,
  },
  selectorText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[700],
  },
  selectorTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: spacing.lg,
    paddingTop: 0,
  },
});