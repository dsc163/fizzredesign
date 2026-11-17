import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { api, Listing } from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import { PartyEventCard } from '@/components/PartyEventCard';
import { Party, Radius, Spacing, Typography } from '@/constants/theme';
import { houstonDayStart } from '@/lib/format';

const TAGS = ['Parties', 'Sports', 'Clubs', 'Performances', 'Food', 'Study', 'Pop-ups'];
const TAG_EMOJI: Record<string, string> = {
  Parties: '🎉',
  Sports: '⚽',
  Clubs: '🤝',
  Performances: '🎤',
  Food: '🍕',
  Study: '📚',
  'Pop-ups': '🛍️',
};

type Row = { kind: 'header'; title: string } | { kind: 'event'; listing: Listing };

// Today / Tomorrow / This week / Later, with the viewer's interests first in each group (story 7.4).
function rows(listings: Listing[], interests: string[]): Row[] {
  const today = houstonDayStart(Date.now());
  const groups: Record<string, Listing[]> = { Tonight: [], Tomorrow: [], 'This week': [], Later: [] };
  for (const l of listings) {
    const days = Math.round((houstonDayStart(l.details.starts_at ?? 0) - today) / 86400000);
    groups[days <= 0 ? 'Tonight' : days === 1 ? 'Tomorrow' : days < 7 ? 'This week' : 'Later'].push(l);
  }
  const score = (l: Listing) => ((l.details.tags ?? []).some((t) => interests.includes(t)) ? 0 : 1);
  return Object.entries(groups).flatMap(([title, items]) => {
    if (!items.length) return [];
    const sorted = [...items].sort((a, b) => score(a) - score(b) || (a.details.starts_at ?? 0) - (b.details.starts_at ?? 0));
    return [{ kind: 'header' as const, title }, ...sorted.map((listing) => ({ kind: 'event' as const, listing }))];
  });
}

export default function EventsScreen() {
  const router = useRouter();
  const { user, setUser } = useAuth();
  const [events, setEvents] = useState<Listing[] | null>(null);
  const [tag, setTag] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setEvents((await api.listings({ section: 'events' })).listings);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load events.');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (user && user.interests === null) {
    return <InterestPicker onDone={async (interests) => setUser((await api.updateMe({ interests })).user)} />;
  }

  const interests = user?.interests ?? [];
  const visible = (events ?? []).filter((e) => !tag || (e.details.tags ?? []).includes(tag));
  const replace = (updated: Listing) => setEvents((all) => all?.map((e) => (e.id === updated.id ? updated : e)) ?? null);

  return (
    <View style={styles.screen}>
      <FlatList
        data={rows(visible, interests)}
        keyExtractor={(r) => (r.kind === 'header' ? `h-${r.title}` : r.listing.id)}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            tintColor={Party.pink}
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.kicker}>STUDENT-RUN · RICE</Text>
            <Text style={styles.headline}>What's happening</Text>
            <LinearGradient colors={Party.glow} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.underline} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              <TagChip label="All" selected={!tag} onPress={() => setTag(null)} />
              {TAGS.map((t) => (
                <TagChip
                  key={t}
                  label={`${TAG_EMOJI[t]} ${t}`}
                  selected={tag === t}
                  highlighted={interests.includes(t)}
                  onPress={() => setTag(tag === t ? null : t)}
                />
              ))}
            </ScrollView>
            <Pressable onPress={() => router.push({ pathname: '/post', params: { type: 'event' } })} accessibilityRole="button">
              <LinearGradient colors={Party.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.hostButton}>
                <Ionicons name="add-circle" size={20} color="#FFFFFF" />
                <Text style={styles.hostText}>Host an event</Text>
              </LinearGradient>
            </Pressable>
            {error && <Text style={styles.error}>{error}</Text>}
          </View>
        }
        renderItem={({ item }) =>
          item.kind === 'header' ? (
            <Text style={styles.group}>{item.title}</Text>
          ) : (
            <PartyEventCard listing={item.listing} onChange={replace} />
          )
        }
        ListEmptyComponent={
          events === null ? (
            <ActivityIndicator color={Party.pink} style={styles.loading} />
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🪩</Text>
              <Text style={styles.emptyTitle}>{tag ? `No ${tag.toLowerCase()} events yet` : 'No events yet'}</Text>
              <Text style={styles.emptyBody}>
                Throwing a party, a pickup game, or a pop-up? Post it here so the whole campus can find it.
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}

function TagChip({
  label,
  selected,
  highlighted,
  onPress,
}: {
  label: string;
  selected: boolean;
  highlighted?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.chip, highlighted && styles.chipHighlighted, selected && styles.chipSelected]}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

function InterestPicker({ onDone }: { onDone: (interests: string[]) => Promise<void> }) {
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const finish = async (interests: string[]) => {
    setBusy(true);
    await onDone(interests).catch(() => setBusy(false));
  };
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.picker}>
      <Text style={styles.pickerEmoji}>✨</Text>
      <Text style={styles.headline}>What are you into?</Text>
      <Text style={styles.emptyBody}>Pick a few. We'll put events you care about first.</Text>
      <View style={styles.pickerGrid}>
        {TAGS.map((t) => {
          const on = picked.includes(t);
          return (
            <Pressable
              key={t}
              onPress={() => setPicked((all) => (on ? all.filter((x) => x !== t) : [...all, t]))}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              style={[styles.pickerTile, on && styles.pickerTileOn]}>
              <Text style={styles.pickerTileEmoji}>{TAG_EMOJI[t]}</Text>
              <Text style={[styles.pickerTileText, on && styles.chipTextSelected]}>{t}</Text>
            </Pressable>
          );
        })}
      </View>
      <Pressable disabled={busy || picked.length === 0} onPress={() => finish(picked)} accessibilityRole="button">
        <LinearGradient
          colors={picked.length ? Party.gradient : [Party.cardBorder, Party.cardBorder]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.hostButton}>
          <Text style={styles.hostText}>{busy ? 'Saving…' : "Let's go"}</Text>
        </LinearGradient>
      </Pressable>
      <Pressable onPress={() => finish([])} disabled={busy}>
        <Text style={styles.skip}>Skip for now</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Party.bg },
  list: { padding: Spacing.lg, gap: Spacing.md, flexGrow: 1 },
  header: { gap: Spacing.md, marginBottom: Spacing.xs },
  kicker: { color: Party.pink, fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  headline: { color: Party.text, fontSize: 32, fontWeight: '900', letterSpacing: -0.5 },
  underline: { height: 4, width: 96, borderRadius: 2, marginTop: -6 },
  chips: { gap: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Party.cardBorder,
    backgroundColor: Party.card,
  },
  chipHighlighted: { borderColor: Party.purple },
  chipSelected: { backgroundColor: Party.pink, borderColor: Party.pink },
  chipText: { ...Typography.caption, fontWeight: '700', color: Party.textSecondary },
  chipTextSelected: { color: '#FFFFFF' },
  hostButton: {
    height: 48,
    borderRadius: Radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  hostText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', letterSpacing: 0.3 },
  group: { color: Party.text, fontSize: 20, fontWeight: '900', marginTop: Spacing.sm },
  error: { ...Typography.caption, color: Party.pink },
  loading: { marginTop: Spacing.xxl },
  empty: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xxl, paddingHorizontal: Spacing.lg },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { color: Party.text, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  emptyBody: { ...Typography.body, color: Party.textSecondary, textAlign: 'center' },
  picker: { padding: Spacing.xl, gap: Spacing.lg, flexGrow: 1, justifyContent: 'center' },
  pickerEmoji: { fontSize: 44, textAlign: 'center' },
  pickerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, justifyContent: 'center' },
  pickerTile: {
    width: '30%',
    minWidth: 96,
    aspectRatio: 1,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Party.cardBorder,
    backgroundColor: Party.card,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  pickerTileOn: { borderColor: Party.pink, backgroundColor: 'rgba(255,61,154,0.18)' },
  pickerTileEmoji: { fontSize: 28 },
  pickerTileText: { ...Typography.caption, fontWeight: '700', color: Party.textSecondary },
  skip: { ...Typography.caption, color: Party.muted, textAlign: 'center', textDecorationLine: 'underline' },
});
