import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Settings, Bell, Target, Palette, Shield, CircleHelp as HelpCircle } from 'lucide-react-native';
import { ProfileCard } from '@/components/ProfileCard';
import { SettingsItem } from '@/components/SettingsItem';
import { colors, spacing } from '@/constants/theme';

export default function Profile() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Perfil</Text>
          <Text style={styles.subtitle}>Configuración y preferencias</Text>
        </View>

        <View style={styles.profileSection}>
          <ProfileCard
            name="María González"
            email="maria@email.com"
            streak={7}
            achievements={12}
          />
        </View>

        <View style={styles.goalsSection}>
          <Text style={styles.sectionTitle}>Metas Personales</Text>
          <View style={styles.goalCard}>
            <View style={styles.goalHeader}>
              <Target size={24} color={colors.blue.main} />
              <Text style={styles.goalTitle}>Meta Principal</Text>
            </View>
            <Text style={styles.goalDescription}>
              Mantener 4 hábitos saludables diariamente durante 30 días
            </Text>
            <View style={styles.goalProgress}>
              <Text style={styles.goalProgressText}>Progreso: 7/30 días</Text>
              <View style={styles.goalProgressBar}>
                <View style={[styles.goalProgressFill, { width: '23%' }]} />
              </View>
            </View>
          </View>
        </View>

        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Configuración</Text>
          <View style={styles.settingsGroup}>
            <SettingsItem
              icon={<Bell size={20} color={colors.gray[600]} />}
              title="Notificaciones"
              subtitle="Recordatorios y alertas"
              showArrow={true}
            />
            <SettingsItem
              icon={<Palette size={20} color={colors.gray[600]} />}
              title="Apariencia"
              subtitle="Tema claro/oscuro"
              showArrow={true}
            />
            <SettingsItem
              icon={<Shield size={20} color={colors.gray[600]} />}
              title="Accesibilidad"
              subtitle="Contraste y tamaño de texto"
              showArrow={true}
            />
            <SettingsItem
              icon={<Settings size={20} color={colors.gray[600]} />}
              title="General"
              subtitle="Idioma y preferencias"
              showArrow={true}
            />
            <SettingsItem
              icon={<HelpCircle size={20} color={colors.gray[600]} />}
              title="Ayuda y Soporte"
              subtitle="FAQ y contacto"
              showArrow={true}
            />
          </View>
        </View>

        <View style={styles.dataSection}>
          <TouchableOpacity style={styles.dataButton}>
            <Text style={styles.dataButtonText}>Exportar Datos</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dataButton}>
            <Text style={styles.dataButtonText}>Sincronizar Dispositivos</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  profileSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  goalsSection: {
    padding: spacing.lg,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: spacing.lg,
  },
  goalCard: {
    backgroundColor: '#FFFFFF',
    padding: spacing.lg,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  goalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray[900],
  },
  goalDescription: {
    fontSize: 14,
    color: colors.gray[600],
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  goalProgress: {
    gap: spacing.sm,
  },
  goalProgressText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.gray[700],
  },
  goalProgressBar: {
    height: 8,
    backgroundColor: colors.gray[200],
    borderRadius: 4,
    overflow: 'hidden',
  },
  goalProgressFill: {
    height: '100%',
    backgroundColor: colors.blue.main,
    borderRadius: 4,
  },
  settingsSection: {
    padding: spacing.lg,
    paddingTop: 0,
  },
  settingsGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  dataSection: {
    padding: spacing.lg,
    paddingTop: 0,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  dataButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  dataButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.blue.main,
    textAlign: 'center',
  },
});