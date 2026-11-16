import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { api } from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import { Screen } from '@/components/Screen';
import { Avatar, Button, ErrorText, Field } from '@/components/ui';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { pickAndUploadPhoto } from '@/lib/images';

export default function EditProfileScreen() {
  const { user, setUser } = useAuth();
  const router = useRouter();
  const [name, setName] = useState(user?.name ?? '');
  const [college, setCollege] = useState(user?.college ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [venmo, setVenmo] = useState(user?.venmo ?? '');
  const [photo, setPhoto] = useState(user?.photo ?? null);
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
      const handle = venmo.trim() && !venmo.trim().startsWith('@') ? `@${venmo.trim()}` : venmo.trim();
      const result = await api.updateMe({ name: name.trim(), college: college.trim(), bio: bio.trim(), venmo: handle, photo });
      setUser(result.user);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

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
          <Field
            label="Venmo handle"
            value={venmo}
            onChangeText={setVenmo}
            placeholder="@your-handle"
            autoCapitalize="none"
            hint="Only shown to the other person after you accept a request."
          />
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
});
