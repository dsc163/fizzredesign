import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { api } from '@/api/client';
import { Screen } from '@/components/Screen';
import { Button, Chip, ErrorText, Field, Label } from '@/components/ui';
import { Colors, Spacing, Typography } from '@/constants/theme';

const REASONS = ['Scam or fraud', 'Harassment', 'No-show', 'Inappropriate content', 'Something else'];

export default function ReportScreen() {
  const { threadId, listingId } = useLocalSearchParams<{ threadId?: string; listingId?: string }>();
  const router = useRouter();
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState('');
  const [block, setBlock] = useState(Boolean(threadId));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ blocked: boolean } | null>(null);

  async function submit() {
    if (!reason) return;
    setBusy(true);
    setError(null);
    try {
      const result = await api.report({ threadId, listingId, reason, details: details.trim(), block });
      setDone({ blocked: result.blocked });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send your report.');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <Screen>
        <View style={styles.done}>
          <Ionicons name="shield-checkmark" size={48} color={Colors.success} />
          <Text style={styles.title}>Thanks for letting us know</Text>
          <Text style={styles.body}>
            Fizz moderators will review your report.
            {done.blocked ? ' You blocked this person, so they can no longer message you and you won’t see their posts.' : ''}
          </Text>
          <Button title="Back to Browse" onPress={() => router.replace('/')} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.body}>Reports are private. The other person won’t know who reported them.</Text>
        <View style={styles.section}>
          <Label>WHAT HAPPENED?</Label>
          <View style={styles.wrap}>
            {REASONS.map((r) => (
              <Chip key={r} label={r} selected={reason === r} onPress={() => setReason(r)} />
            ))}
          </View>
        </View>
        <Field label="Details (optional)" value={details} onChangeText={setDetails} multiline maxLength={1000} />
        <Pressable style={styles.blockRow} onPress={() => setBlock(!block)} accessibilityRole="checkbox" accessibilityState={{ checked: block }}>
          <Ionicons name={block ? 'checkbox' : 'square-outline'} size={22} color={block ? Colors.primary : Colors.textMuted} />
          <Text style={styles.blockText}>Also block this person</Text>
        </Pressable>
        <ErrorText message={error} />
        <Button title="Send report" variant="primary" onPress={submit} disabled={!reason} loading={busy} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, gap: Spacing.lg },
  section: { gap: Spacing.sm },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  body: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center' },
  title: { ...Typography.title, color: Colors.text, textAlign: 'center' },
  blockRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  blockText: { ...Typography.body, color: Colors.text },
  done: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg, padding: Spacing.xl },
});
