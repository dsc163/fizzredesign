import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { api, Payments } from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import { Screen } from '@/components/Screen';
import { SignInPrompt } from '@/components/SignInPrompt';
import { Avatar, Button, Chip, ErrorText, Field, Label } from '@/components/ui';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { pickAndUploadPhoto } from '@/lib/images';
import { PAYMENT_METHODS } from '@/lib/payments';

const INTERESTS = ['Parties', 'Sports', 'Clubs', 'Performances', 'Food', 'Study', 'Pop-ups'];

export default function EditProfileScreen() {
  const { user, setUser } = useAuth();
  const router = useRouter();
  const [name, setName] = useState(user?.name ?? '');
  const [college, setCollege] = useState(user?.college ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [payments, setPayments] = useState<Payments>(user?.payments ?? {});
  const [photo, setPhoto] = useState(user?.photo ?? null);
  const [interests, setInterests] = useState<string[]>(user?.interests ?? []);
  const [remindDay, setRemindDay] = useState(user?.prefs.remindDay ?? true);
  const [remindHour, setRemindHour] = useState(user?.prefs.remindHour ?? true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function choosePhoto() {
    setError(null);
    setUploading(true);
    try {
      const url = await pickAndUploadPhoto({ square: true });
      if (url) setPhoto(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not upload that photo.');
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setError(null);
    setSaving(true);
    try {
      const cleaned = Object.fromEntries(
        PAYMENT_METHODS.map((m) => [m.key, m.normalize((payments[m.key] ?? '').trim())])
      ) as Payments;
      const result = await api.updateMe({
        name: name.trim(),
        college: college.trim(),
        bio: bio.trim(),
        payments: cleaned,
        photo,
        interests,
        prefs: { remindDay, remindHour },
      });
      setUser(result.user);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  }

  if (!user) {
    return <SignInPrompt icon="person-circle-outline" title="Edit your profile" message="Sign in to edit your profile." />;
  }

  return (
    <Screen>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Pressable onPress={choosePhoto} style={styles.photo} accessibilityRole="button" accessibilityLabel="Change photo">
            <Avatar name={name || user.name} photo={photo} size={88} />
            <Text style={styles.photoText}>{uploading ? 'Uploading…' : photo ? 'Change photo' : 'Add photo'}</Text>
          </Pressable>
          <Field label="Full name" value={name} onChangeText={setName} />
          <Field label="Residential college" value={college} onChangeText={setCollege} placeholder="e.g. Duncan" />
          <Field
            label="Bio"
            value={bio}
            onChangeText={setBio}
            placeholder="What do you offer? How long have you been doing it?"
            multiline
            maxLength={300}
          />
          <View style={styles.section}>
            <Label>HOW PEOPLE CAN PAY YOU (ALL OPTIONAL)</Label>
            <Text style={styles.hint}>Only shown to someone after you tap "Share my name & payment info" in a chat.</Text>
            {PAYMENT_METHODS.map((m) => (
              <Field
                key={m.key}
                label={m.label}
                value={payments[m.key] ?? ''}
                onChangeText={(v) => setPayments((all) => ({ ...all, [m.key]: v }))}
                placeholder={m.placeholder}
                autoCapitalize="none"
                autoCorrect={false}
              />
            ))}
          </View>
          <View style={styles.section}>
            <Label>EVENT INTERESTS</Label>
            <View style={styles.wrap}>
              {INTERESTS.map((t) => (
                <Chip
                  key={t}
                  label={t}
                  selected={interests.includes(t)}
                  onPress={() => setInterests((all) => (all.includes(t) ? all.filter((x) => x !== t) : [...all, t]))}
                />
              ))}
            </View>
          </View>
          <View style={styles.section}>
            <Label>EVENT REMINDERS</Label>
            <View style={styles.switchRow}>
              <Text style={styles.switchText}>The day before</Text>
              <Switch value={remindDay} onValueChange={setRemindDay} />
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.switchText}>1 hour before</Text>
              <Switch value={remindHour} onValueChange={setRemindHour} />
            </View>
          </View>
          <ErrorText message={error} />
          <Button title="Save" onPress={save} loading={saving} disabled={uploading} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.lg },
  photo: { alignItems: 'center', gap: Spacing.sm },
  photoText: { ...Typography.caption, fontWeight: '600', color: Colors.primary },
  section: { gap: Spacing.sm },
  hint: { ...Typography.caption, color: Colors.textSecondary },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  switchText: { ...Typography.body, color: Colors.text },
});
