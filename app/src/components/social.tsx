import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { api, Comment, Listing, ListingResponse, resolveUrl } from '@/api/client';
import { Colors, Party, Radius, Spacing, Typography } from '@/constants/theme';
import { formatAgo } from '@/lib/format';
import { pickAndUploadPhoto } from '@/lib/images';
import { useRequireSignIn } from '@/lib/requireSignIn';
import { sharePost } from '@/lib/share';

import { IconName } from './ui';

type Variant = 'light' | 'party';

const palette = {
  light: { text: Colors.text, muted: Colors.textSecondary, border: Colors.border, surface: Colors.surface, accent: Colors.primary, liked: '#E11D48' },
  party: { text: Party.text, muted: Party.textSecondary, border: Party.cardBorder, surface: Party.card, accent: Party.cyan, liked: Party.pink },
};

function Action({
  icon,
  label,
  color,
  onPress,
  accessibilityLabel,
}: {
  icon: IconName;
  label?: string;
  color: string;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
      <Ionicons name={icon} size={22} color={color} />
      {label !== undefined && <Text style={[styles.actionLabel, { color }]}>{label}</Text>}
    </Pressable>
  );
}

// Like, comment count, save, and share for a post.
export function SocialBar({
  listing,
  onChange,
  variant = 'light',
}: {
  listing: Listing;
  onChange: (r: ListingResponse) => void;
  variant?: Variant;
}) {
  const p = palette[variant];
  const requireSignIn = useRequireSignIn();
  const [note, setNote] = useState<string | null>(null);
  const s = listing.stats;

  async function share() {
    const result = await sharePost(listing).catch(() => 'cancelled' as const);
    if (result === 'copied') {
      setNote('Link copied');
      setTimeout(() => setNote(null), 2500);
    }
  }

  return (
    <View style={[styles.bar, { borderColor: p.border }]}>
      <Action
        icon={s.liked ? 'heart' : 'heart-outline'}
        label={String(s.likes)}
        color={s.liked ? p.liked : p.muted}
        accessibilityLabel={s.liked ? 'Unlike' : 'Like'}
        onPress={() => requireSignIn(() => api.like(listing.id, !s.liked).then(onChange).catch(() => undefined))}
      />
      <Action icon="chatbubble-outline" label={String(s.comments)} color={p.muted} accessibilityLabel="Comments" onPress={() => undefined} />
      <View style={styles.spacer} />
      {note && <Text style={[styles.note, { color: p.accent }]}>{note}</Text>}
      <Action
        icon={s.saved ? 'bookmark' : 'bookmark-outline'}
        label={s.saved ? 'Saved' : 'Save'}
        color={s.saved ? p.accent : p.muted}
        accessibilityLabel={s.saved ? 'Remove from saved' : 'Save for later'}
        onPress={() => requireSignIn(() => api.save(listing.id, !s.saved).then(onChange).catch(() => undefined))}
      />
      <Action icon="share-outline" label="Share" color={p.muted} accessibilityLabel="Share link" onPress={share} />
    </View>
  );
}

// Anonymous comments with an optional photo.
export function Comments({
  listing,
  comments,
  onChange,
  variant = 'light',
  title = 'Comments',
}: {
  listing: Listing;
  comments: Comment[];
  onChange: (r: ListingResponse) => void;
  variant?: Variant;
  title?: string;
}) {
  const p = palette[variant];
  const requireSignIn = useRequireSignIn();
  const [draft, setDraft] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addPhoto() {
    setError(null);
    try {
      const url = await pickAndUploadPhoto();
      if (url) setPhoto(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not upload that photo.');
    }
  }

  async function send() {
    if (!draft.trim() && !photo) return;
    setBusy(true);
    setError(null);
    try {
      onChange(await api.comment(listing.id, draft.trim(), photo));
      setDraft('');
      setPhoto(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not post your comment.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.comments}>
      <Text style={[styles.heading, { color: p.text }]}>
        {title} {comments.length > 0 ? `(${comments.length})` : ''}
      </Text>
      {comments.length === 0 && (
        <Text style={[styles.empty, { color: p.muted }]}>No comments yet. Comments are anonymous.</Text>
      )}
      {comments.map((c) => (
        <View key={c.id} style={[styles.comment, { backgroundColor: p.surface }]}>
          <View style={styles.commentHead}>
            <Text style={[styles.commentAuthor, { color: c.author === 'Verified Rice student' ? p.muted : p.accent }]}>
              {c.mine ? 'You' : c.author}
            </Text>
            <Text style={[styles.commentTime, { color: p.muted }]}>{formatAgo(c.createdAt)}</Text>
            {c.mine && (
              <Pressable
                onPress={() => api.deleteComment(listing.id, c.id).then(onChange).catch(() => undefined)}
                accessibilityLabel="Delete comment">
                <Ionicons name="trash-outline" size={15} color={p.muted} />
              </Pressable>
            )}
          </View>
          {c.body ? <Text style={[styles.commentBody, { color: p.text }]}>{c.body}</Text> : null}
          {c.photo && <Image source={{ uri: resolveUrl(c.photo)! }} style={styles.commentPhoto} />}
        </View>
      ))}
      {photo && (
        <View style={styles.pending}>
          <Image source={{ uri: resolveUrl(photo)! }} style={styles.pendingPhoto} />
          <Pressable onPress={() => setPhoto(null)} accessibilityLabel="Remove photo">
            <Text style={[styles.remove, { color: p.muted }]}>Remove photo</Text>
          </Pressable>
        </View>
      )}
      <View style={styles.inputRow}>
        <Pressable onPress={() => requireSignIn(addPhoto)} accessibilityRole="button" accessibilityLabel="Add a photo" style={styles.iconButton}>
          <Ionicons name="image-outline" size={22} color={p.muted} />
        </Pressable>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Add an anonymous comment"
          placeholderTextColor={p.muted}
          style={[styles.input, { color: p.text, borderColor: p.border, backgroundColor: variant === 'party' ? Party.bg : Colors.background }]}
          onSubmitEditing={() => requireSignIn(send)}
          returnKeyType="send"
          maxLength={500}
        />
        <Pressable
          onPress={() => requireSignIn(send)}
          disabled={busy || (!draft.trim() && !photo)}
          accessibilityRole="button"
          accessibilityLabel="Post comment"
          style={[styles.send, { backgroundColor: !draft.trim() && !photo ? p.border : variant === 'party' ? Party.pink : Colors.primary }]}>
          <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
        </Pressable>
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.6 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.xs,
  },
  action: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.sm },
  actionLabel: { ...Typography.caption, fontWeight: '600' },
  spacer: { flex: 1 },
  note: { ...Typography.caption, fontWeight: '700' },
  comments: { gap: Spacing.sm },
  heading: { ...Typography.heading },
  empty: { ...Typography.caption },
  comment: { borderRadius: Radius.md, padding: Spacing.md, gap: 4 },
  commentHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  commentAuthor: { ...Typography.caption, fontWeight: '700' },
  commentTime: { ...Typography.caption, flex: 1 },
  commentBody: { ...Typography.body },
  commentPhoto: { width: '100%', aspectRatio: 4 / 3, borderRadius: Radius.md, marginTop: 4 },
  pending: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  pendingPhoto: { width: 56, height: 56, borderRadius: Radius.sm },
  remove: { ...Typography.caption, textDecorationLine: 'underline' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  iconButton: { padding: 4 },
  input: {
    ...Typography.body,
    flex: 1,
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
  },
  send: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  error: { ...Typography.caption, color: Colors.danger },
});
