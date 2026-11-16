import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { api, Listing } from '@/api/client';
import { EmptyState } from '@/components/EmptyState';
import { PostCard } from '@/components/PostCard';
import { Screen } from '@/components/Screen';
import { Chip, ErrorText, Loading } from '@/components/ui';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';

const SECTIONS = [
  { key: 'all', label: 'All' },
  { key: 'services', label: 'Services' },
  { key: 'goods', label: 'Goods' },
  { key: 'events', label: 'Events' },
  { key: 'wanted', label: 'Wanted' },
  { key: 'lostfound', label: 'Lost & Found' },
];

const CATEGORIES: Record<string, string[]> = {
  services: ['Haircuts', 'Tutoring', 'Photography', 'DJ and Music', 'Rentals', 'Rides', 'Other'],
  goods: ['Textbooks', 'Electronics', 'Dorm', 'Furniture', 'Clothing', 'Bikes', 'Tickets', 'Other'],
};

export default function BrowseScreen() {
  const [section, setSection] = useState('all');
  const [category, setCategory] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    try {
      const result = await api.listings({ section, category, q: query.trim() });
      if (id === requestId.current) {
        setListings(result.listings);
        setError(null);
      }
    } catch (e) {
      if (id === requestId.current) setError(e instanceof Error ? e.message : 'Could not load listings.');
    }
  }, [section, category, query]);

  // Debounce typing; reload immediately when the section or category changes.
  useEffect(() => {
    const timer = setTimeout(load, query ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, query]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const categories = CATEGORIES[section];

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={Colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search goods, services, events…"
            placeholderTextColor={Colors.textMuted}
            style={styles.searchInput}
            returnKeyType="search"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <Ionicons name="close-circle" size={18} color={Colors.textMuted} onPress={() => setQuery('')} />
          )}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {SECTIONS.map((s) => (
            <Chip
              key={s.key}
              label={s.label}
              selected={section === s.key}
              onPress={() => {
                setSection(s.key);
                setCategory(null);
              }}
            />
          ))}
        </ScrollView>
        {categories && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            <Chip label="All categories" selected={!category} onPress={() => setCategory(null)} />
            {categories.map((c) => (
              <Chip key={c} label={c} selected={category === c} onPress={() => setCategory(c)} />
            ))}
          </ScrollView>
        )}
      </View>

      {listings === null && !error ? (
        <Loading />
      ) : (
        <FlatList
          data={listings ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <PostCard listing={item} />}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
          ListHeaderComponent={<ErrorText message={error} />}
          ListEmptyComponent={
            error ? undefined : (
              <EmptyState
                icon="search-outline"
                title={query ? `No results for "${query.trim()}"` : 'Nothing here yet'}
                message={query ? 'Try a different word or another section.' : 'New posts will show up here.'}
              />
            )
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: Spacing.md,
    gap: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    paddingBottom: Spacing.sm,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
  },
  searchInput: { ...Typography.body, flex: 1, color: Colors.text, paddingVertical: Spacing.md },
  chips: { gap: Spacing.sm, paddingHorizontal: Spacing.lg },
  list: { padding: Spacing.lg, gap: Spacing.md, flexGrow: 1 },
});
