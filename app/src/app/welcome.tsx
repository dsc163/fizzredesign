import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/AuthProvider';
import { Button, ErrorText, Field } from '@/components/ui';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';

export default function WelcomeScreen() {
  const { signIn, signUp } = useAuth();
  const router = useRouter();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [college, setCollege] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      if (mode === 'signup') await signUp({ name: name.trim(), email: email.trim(), password, college: college.trim() });
      else await signIn(email.trim(), password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>F</Text>
            </View>
            <Text style={styles.title}>Fizz Marketplace</Text>
            <Text style={styles.tagline}>
              Buy, sell, and book services from other Rice students, all in one trusted place.
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.formTitle}>{mode === 'signup' ? 'Create your account' : 'Welcome back'}</Text>
            {mode === 'signup' && (
              <Field label="Full name" value={name} onChangeText={setName} placeholder="Jordan Lee" autoComplete="name" />
            )}
            <Field
              label="Rice email"
              value={email}
              onChangeText={setEmail}
              placeholder="netid@rice.edu"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              inputMode="email"
            />
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'}
              secureTextEntry
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              onSubmitEditing={submit}
            />
            {mode === 'signup' && (
              <Field
                label="Residential college (optional)"
                value={college}
                onChangeText={setCollege}
                placeholder="e.g. Baker, Duncan, Wiess"
              />
            )}
            <ErrorText message={error} />
            <Button
              title={mode === 'signup' ? 'Create account' : 'Sign in'}
              onPress={submit}
              loading={busy}
              disabled={!email || !password || (mode === 'signup' && !name)}
            />
            <Button
              variant="ghost"
              title={mode === 'signup' ? 'I already have an account' : 'New here? Create an account'}
              onPress={() => {
                setError(null);
                setMode(mode === 'signup' ? 'signin' : 'signup');
              }}
            />
          </View>

          <Button
            variant="secondary"
            title="Just browsing for now"
            onPress={() => (router.canGoBack() ? router.back() : router.replace((next as never) || '/'))}
          />

          <Text style={styles.note}>
            This is a test version. Any email address works, and Rice email verification is simulated.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  content: { padding: Spacing.xl, gap: Spacing.xl, flexGrow: 1, justifyContent: 'center' },
  brand: { alignItems: 'center', gap: Spacing.sm },
  logo: {
    width: 56,
    height: 56,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { color: '#FFFFFF', fontSize: 28, fontWeight: '800' },
  title: { ...Typography.title, color: Colors.text },
  tagline: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center' },
  form: { gap: Spacing.lg },
  formTitle: { ...Typography.heading, color: Colors.text },
  note: { ...Typography.caption, color: Colors.textMuted, textAlign: 'center' },
});
