import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { api, Listing } from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import { PartyEventCard } from '@/components/PartyEventCard';
import { PostCard } from '@/components/PostCard';
import { Screen } from '@/components/Screen';
import { SignInPrompt } from '@/components/SignInPrompt';
import { Avatar, Button, Card, Label, VerifiedBadge } from '@/components/ui';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { paymentEntries } from '@/lib/payments';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [events, setEvents] = useState<Listing[]>([]);
  const [saved, setSaved] = useState<Listing[]>([]);

  useFocusEffect(
    useCallback(() => {
      api.myListings().then((r) => setListings(r.listings)).catch(() => undefined);
      api.myEvents().then((r) => setEvents(r.listings)).catch(() => undefined);
      api.saved().then((r) => setSaved(r.listings)).catch(() => undefined);
    }, [])
  );

  if (!user) {
    return (
      <SignInPrompt
        icon="person-circle-outline"
        title="Your profile"
        message="Sign in to see your posts, saved items, and the events you're going to."
      />
    );
  }
  const pay = paymentEntries(user.payments);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Avatar name={user.name} photo={user.photo} size={72} />
          <View style={styles.headerText}>
            <View style={styles.inline}>
              <Text style={styles.name}>{user.name}</Text>
              <VerifiedBadge />
            </View>
            <Text style={styles.meta}>
              {user.college ? `${user.college} College · ` : ''}
              {user.email}
            </Text>
          </View>
        </View>
        {user.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}

        <Card>
          <Label>HOW PEOPLE CAN PAY YOU</Label>
          {pay.length === 0 ? (
            <Text style={styles.body}>No payment apps added. Add Venmo, Cash App, Zelle, PayPal, or Apple Pay in Edit profile.</Text>
          ) : (
            pay.map((p) => (
              <Text key={p.key} style={styles.body}>
                {p.label}: <Text style={styles.payHandle}>{p.handle}</Text>
              </Text>
            ))
          )}
          <Text style={styles.hint}>Only shown to the other person after you accept a request.</Text>
        </Card>
        <Button variant="secondary" title="Edit profile" icon="create-outline" onPress={() => router.push('/profile/edit')} />

        <Text style={styles.section}>Events I'm going to</Text>
        {events.length === 0 ? (
          <Text style={styles.body}>RSVP to an event in the Events tab and it shows up here.</Text>
        ) : (
          events.map((e) => (
            <PartyEventCard key={e.id} listing={e} onChange={(u) => setEvents((all) => all.map((x) => (x.id === u.id ? u : x)))} />
          ))
        )}

        <Text style={styles.section}>Saved</Text>
        {saved.length === 0 ? (
          <Text style={styles.body}>Tap Save on any post or event to come back to it later.</Text>
        ) : (
          saved.map((l) => (l.type === 'event' ? <PartyEventCard key={l.id} listing={l} /> : <PostCard key={l.id} listing={l} />))
        )}

        <Text style={styles.section}>My posts</Text>
        {listings.length === 0 ? (
          <Text style={styles.body}>You haven't posted anything yet.</Text>
        ) : (
          listings.map((l) => (
            <View key={l.id} style={styles.listing}>
              {l.type === 'event' ? <PartyEventCard listing={l} /> : <PostCard listing={l} />}
              {l.status !== 'active' && (
                <Text style={styles.statusTag}>{l.status === 'sold' ? 'Sold' : 'Paused'} · hidden from Browse</Text>
              )}
            </View>
          ))
        )}
        <Button variant="primary" title="Post something" icon="add" onPress={() => router.push('/post')} />

        <Button variant="danger" title="Sign out" onPress={signOut} style={styles.signOut} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: Spacing.xxl * 2 },
  header: { flexDirection: 'row', gap: Spacing.lg, alignItems: 'center' },
  headerText: { flex: 1, gap: 4 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
  name: { ...Typography.title, color: Colors.text },
  meta: { ...Typography.caption, color: Colors.textSecondary },
  bio: { ...Typography.body, color: Colors.text },
  body: { ...Typography.body, color: Colors.textSecondary },
  hint: { ...Typography.caption, color: Colors.textSecondary },
  payHandle: { color: Colors.text, fontWeight: '600' },
  section: { ...Typography.heading, color: Colors.text, marginTop: Spacing.sm },
  listing: { gap: 4 },
  statusTag: { ...Typography.caption, color: Colors.warning, paddingLeft: Spacing.sm },
  signOut: { marginTop: Spacing.xl },
});
