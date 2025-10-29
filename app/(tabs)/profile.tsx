import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  User,
  Settings,
  Bell,
  Target,
  Palette,
  Shield,
  CircleHelp as HelpCircle,
  Mail,
  LogOut,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { ProfileCard } from '@/components/ProfileCard';
import { SettingsItem } from '@/components/SettingsItem';
import { colors, spacing } from '@/constants/theme';
import { useAppContext } from '@/context/AppContext';

export default function Profile() {
  const router = useRouter();
  const { user, updateProfile, dashboard, signOut } = useAppContext();
  const [form, setForm] = useState({
    username: '',
    email: '',
    height: '',
    weight: '',
    age: '',
  });
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setForm({
        username: user.username,
        email: user.email,
        height: String(user.height),
        weight: String(user.weight),
        age: String(user.age),
      });
    }
  }, [user]);

  const streak = useMemo(() => {
    const snapshots = Object.values(dashboard.dailySnapshots ?? {});
    return snapshots.filter((item) => item.completionPercentage > 0).length;
  }, [dashboard.dailySnapshots]);

  const achievements = useMemo(() => {
    const habits = Object.values(dashboard.habits ?? {});
    return habits.filter((habit) => habit.summary.isComplete).length;
  }, [dashboard.habits]);

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!form.username.trim() || !form.email.trim()) {
      setMessage('El nombre de usuario y el correo son obligatorios.');
      return;
    }

    const height = Number(form.height);
    const weight = Number(form.weight);
    const age = Number(form.age);

    if (!Number.isFinite(height) || !Number.isFinite(weight) || !Number.isFinite(age)) {
      setMessage('Verifica que altura, peso y edad sean valores numéricos.');
      return;
    }

    updateProfile({
      username: form.username.trim(),
      email: form.email.trim(),
      height,
      weight,
      age,
    });
    setMessage('Perfil actualizado. Tus recomendaciones se han recalculado.');
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Inicia sesión para personalizar tu perfil</Text>
        </View>
      </SafeAreaView>
    );
  }

  const waterTarget = dashboard.habits.water?.summary.targetValue ?? 2000;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Perfil</Text>
          <Text style={styles.subtitle}>Configuración y preferencias</Text>
        </View>

        <View style={styles.profileSection}>
          <ProfileCard
            name={user.username}
            email={user.email}
            streak={streak}
            achievements={achievements}
          />
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Datos personales</Text>
          <View style={styles.formCard}>
            <ProfileField
              label="Nombre"
              value={form.username}
              onChangeText={(value) => handleChange('username', value)}
              icon={<User size={18} color={colors.gray[500]} />}
            />
            <ProfileField
              label="Correo"
              value={form.email}
              onChangeText={(value) => handleChange('email', value)}
              keyboardType="email-address"
              autoCapitalize="none"
              icon={<Mail size={18} color={colors.gray[500]} />}
            />
            <View style={styles.inlineFields}>
              <ProfileField
                label="Altura (cm)"
                value={form.height}
                onChangeText={(value) => handleChange('height', value)}
                keyboardType="numeric"
                style={styles.inlineInput}
              />
              <ProfileField
                label="Peso (kg)"
                value={form.weight}
                onChangeText={(value) => handleChange('weight', value)}
                keyboardType="numeric"
                style={styles.inlineInput}
              />
              <ProfileField
                label="Edad"
                value={form.age}
                onChangeText={(value) => handleChange('age', value)}
                keyboardType="numeric"
                style={styles.inlineInput}
              />
            </View>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Guardar cambios</Text>
            </TouchableOpacity>
            {message && <Text style={styles.feedback}>{message}</Text>}
          </View>
        </View>

        <View style={styles.goalsSection}>
          <Text style={styles.sectionTitle}>Metas personales</Text>
          <View style={styles.goalCard}>
            <View style={styles.goalHeader}>
              <Target size={24} color={colors.blue.main} />
              <Text style={styles.goalTitle}>Recomendación diaria</Text>
            </View>
            <Text style={styles.goalDescription}>
              Con tus datos actuales te recomendamos beber {(waterTarget / 1000).toFixed(1)} litros de agua al día.
            </Text>
            <View style={styles.goalProgress}>
              <Text style={styles.goalProgressText}>
                Hábitos configurados: {Object.keys(dashboard.habits).length}
              </Text>
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

        <View style={styles.sessionSection}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={async () => {
              try {
                await signOut();
                router.replace('/');
              } catch (error) {
                setMessage(
                  error instanceof Error
                    ? error.message
                    : 'No se pudo cerrar sesión. Intenta nuevamente.'
                );
              }
            }}>
            <LogOut size={18} color="#FFFFFF" />
            <Text style={styles.logoutButtonText}>Cerrar sesión</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

interface ProfileFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'email-address' | 'numeric';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  style?: object;
  icon?: React.ReactNode;
}

function ProfileField({
  label,
  value,
  onChangeText,
  keyboardType = 'default',
  autoCapitalize = 'none',
  style,
  icon,
}: ProfileFieldProps) {
  return (
    <View style={[styles.fieldGroup, style]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldInputWrapper}>
        {icon && <View style={styles.fieldIcon}>{icon}</View>}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          style={styles.fieldInput}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
        />
      </View>
    </View>
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
  formSection: {
    padding: spacing.lg,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: spacing.lg,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    padding: spacing.lg,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    gap: spacing.md,
  },
  fieldGroup: {
    gap: spacing.xs,
  },
  fieldLabel: {
    fontSize: 14,
    color: colors.gray[600],
  },
  fieldInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[100],
    borderRadius: 12,
    paddingHorizontal: spacing.md,
  },
  fieldIcon: {
    marginRight: spacing.sm,
  },
  fieldInput: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.gray[900],
  },
  inlineFields: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  inlineInput: {
    flex: 1,
  },
  saveButton: {
    backgroundColor: colors.blue.main,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  feedback: {
    fontSize: 12,
    color: colors.gray[600],
  },
  goalsSection: {
    padding: spacing.lg,
    paddingTop: 0,
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
    gap: spacing.md,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
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
  sessionSection: {
    padding: spacing.lg,
    paddingTop: 0,
    paddingBottom: spacing.xl,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.error.main,
    borderRadius: 12,
    paddingVertical: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  logoutButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: 18,
    color: colors.gray[600],
    textAlign: 'center',
  },
});

