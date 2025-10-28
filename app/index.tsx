import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, useRouter } from 'expo-router';
import { User, Mail, Lock, Ruler, Scale, Calendar } from 'lucide-react-native';
import { useAppContext } from '@/context/AppContext';
import { colors, spacing } from '@/constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { user, signIn, isLoading } = useAppContext();
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [height, setHeight] = useState('170');
  const [weight, setWeight] = useState('65');
  const [age, setAge] = useState('28');
  const [error, setError] = useState<string | null>(null);

  const canContinueStepOne = useMemo(
    () => username.trim() !== '' && email.trim() !== '' && password.trim().length >= 6,
    [email, password, username]
  );

  const canSubmit = useMemo(() => {
    const numericHeight = Number(height);
    const numericWeight = Number(weight);
    const numericAge = Number(age);
    return (
      canContinueStepOne &&
      Number.isFinite(numericHeight) &&
      Number.isFinite(numericWeight) &&
      Number.isFinite(numericAge) &&
      numericHeight > 0 &&
      numericWeight > 0 &&
      numericAge > 0
    );
  }, [age, canContinueStepOne, height, weight]);

  const handleContinue = () => {
    if (!canContinueStepOne) {
      setError('Completa tu usuario, correo y una contraseña de al menos 6 caracteres.');
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleSubmit = () => {
    if (!canSubmit) {
      setError('Verifica tus datos antes de continuar.');
      return;
    }

    try {
      signIn({
        username: username.trim(),
        email: email.trim(),
        password,
        height: Number(height),
        weight: Number(weight),
        age: Number(age),
      });
      router.replace('/(tabs)');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No pudimos crear tu perfil. Intenta nuevamente.'
      );
    }
  };

  if (user) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>Hábitos Saludables</Text>
            <Text style={styles.subtitle}>
              Diseña tu plan de hidratación, sueño, alimentación y ejercicio en un solo lugar.
            </Text>
          </View>

          <View style={styles.stepIndicator}>
            <View style={[styles.stepBullet, step >= 1 && styles.stepBulletActive]} />
            <View style={styles.stepLine} />
            <View style={[styles.stepBullet, step >= 2 && styles.stepBulletActive]} />
          </View>

          {step === 1 ? (
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Crea tu cuenta</Text>
              <InputField
                label="Nombre de usuario"
                value={username}
                onChangeText={setUsername}
                placeholder="tu_usuario"
                icon={<User size={18} color={colors.gray[500]} />}
              />
              <InputField
                label="Correo electrónico"
                value={email}
                onChangeText={setEmail}
                placeholder="correo@ejemplo.com"
                keyboardType="email-address"
                autoCapitalize="none"
                icon={<Mail size={18} color={colors.gray[500]} />}
              />
              <InputField
                label="Contraseña"
                value={password}
                onChangeText={setPassword}
                placeholder="Al menos 6 caracteres"
                secureTextEntry
                icon={<Lock size={18} color={colors.gray[500]} />}
              />

              <TouchableOpacity
                style={[styles.primaryButton, !canContinueStepOne && styles.buttonDisabled]}
                onPress={handleContinue}
                disabled={!canContinueStepOne || isLoading}>
                <Text style={styles.primaryButtonText}>Continuar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Personaliza tus metas</Text>
              <InputField
                label="Altura (cm)"
                value={height}
                onChangeText={setHeight}
                placeholder="Ej. 170"
                keyboardType="numeric"
                icon={<Ruler size={18} color={colors.gray[500]} />}
              />
              <InputField
                label="Peso (kg)"
                value={weight}
                onChangeText={setWeight}
                placeholder="Ej. 65"
                keyboardType="numeric"
                icon={<Scale size={18} color={colors.gray[500]} />}
              />
              <InputField
                label="Edad"
                value={age}
                onChangeText={setAge}
                placeholder="Ej. 28"
                keyboardType="numeric"
                icon={<Calendar size={18} color={colors.gray[500]} />}
              />

              <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep(1)}>
                  <Text style={styles.secondaryButtonText}>Volver</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryButton, !canSubmit && styles.buttonDisabled]}
                  onPress={handleSubmit}
                  disabled={!canSubmit || isLoading}>
                  <Text style={styles.primaryButtonText}>Empezar</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {error && <Text style={styles.errorText}>{error}</Text>}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

interface InputFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  icon?: React.ReactNode;
}

function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType = 'default',
  autoCapitalize = 'none',
  icon,
}: InputFieldProps) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.inputWrapper}>
        {icon && <View style={styles.inputIcon}>{icon}</View>}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          style={styles.input}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  header: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.gray[900],
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: colors.gray[600],
    lineHeight: 22,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  stepBullet: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.blue.main,
    backgroundColor: 'transparent',
  },
  stepBulletActive: {
    backgroundColor: colors.blue.main,
  },
  stepLine: {
    height: 2,
    width: 40,
    backgroundColor: colors.blue.main,
    opacity: 0.4,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    gap: spacing.md,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.gray[900],
  },
  inputGroup: {
    gap: spacing.xs,
  },
  inputLabel: {
    fontSize: 14,
    color: colors.gray[600],
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[100],
    borderRadius: 12,
    paddingHorizontal: spacing.md,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.gray[900],
  },
  primaryButton: {
    backgroundColor: colors.blue.main,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.gray[300],
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  secondaryButtonText: {
    color: colors.gray[700],
    fontWeight: '600',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  errorText: {
    color: colors.error.main,
    textAlign: 'center',
    fontSize: 14,
  },
});

