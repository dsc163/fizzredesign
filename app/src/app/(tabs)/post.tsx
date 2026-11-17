import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { api, PostType } from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import { Screen } from '@/components/Screen';
import { TimePicker } from '@/components/TimePicker';
import { Button, Card, Chip, ErrorText, Field, IconName, Label, PostThumb } from '@/components/ui';
import { Colors, Radius, Spacing, TypeColors, Typography } from '@/constants/theme';
import { pickAndUploadPhoto } from '@/lib/images';

const ITEM_CATEGORIES = ['Textbooks', 'Electronics', 'Dorm', 'Furniture', 'Clothing', 'Bikes', 'Tickets', 'Other'];
const SERVICE_CATEGORIES = ['Haircuts', 'Tutoring', 'Photography', 'DJ and Music', 'Rentals', 'Rides', 'Other'];
const CONDITIONS = ['New', 'Like new', 'Good', 'Fair'];

type FormType = 'item' | 'service' | 'event';

const TYPES: { type: FormType; title: string; text: string; icon: IconName }[] = [
  { type: 'item', title: 'Item', text: 'Sell something. Anonymous until a sale is agreed.', icon: 'pricetag-outline' },
  { type: 'service', title: 'Service', text: 'Haircuts, tutoring, DJ, photography, rides, rentals. Uses your profile.', icon: 'cut-outline' },
  { type: 'event', title: 'Event', text: 'Host a student event. Post anonymously, as yourself, or as a club.', icon: 'calendar-outline' },
];

const EVENT_TAGS = ['Parties', 'Sports', 'Clubs', 'Performances', 'Food', 'Study', 'Pop-ups'];
const DURATIONS = [1, 2, 3, 4];
const VISIBILITY = [
  { key: 'public', label: 'Public', text: 'Everyone sees the exact location.' },
  { key: 'rsvp', label: 'RSVPs only', text: 'Only people who RSVP see the exact location.' },
  { key: 'reveal', label: 'Reveal day of', text: 'RSVPs see the exact location 3 hours before it starts.' },
] as const;

// Keep digits and at most one decimal point with two places.
function cleanPrice(text: string) {
  const [whole, ...rest] = text.replace(/[^0-9.]/g, '').split('.');
  return rest.length ? `${whole}.${rest.join('').slice(0, 2)}` : whole;
}

export default function PostScreen() {
  const [type, setType] = useState<FormType | null>(null);

  if (!type) {
    return (
      <Screen>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.heading}>What are you posting?</Text>
          {TYPES.map((t) => (
            <Pressable
              key={t.type}
              onPress={() => setType(t.type)}
              style={({ pressed }) => [styles.typeCard, pressed && styles.pressed]}
              accessibilityRole="button">
              <View style={[styles.typeIcon, { backgroundColor: TypeColors[t.type].bg }]}>
                <Ionicons name={t.icon} size={22} color={TypeColors[t.type].fg} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.typeTitle}>{t.title}</Text>
                <Text style={styles.typeText}>{t.text}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </Pressable>
          ))}
          <Text style={styles.soon}>Posting Wanted requests and Lost & Found is coming soon.</Text>
        </ScrollView>
      </Screen>
    );
  }

  if (type === 'event') return <EventForm onBack={() => setType(null)} />;
  return <PostForm type={type} onBack={() => setType(null)} />;
}

function EventForm({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const { user } = useAuth();
  const [photos, setPhotos] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [startsAt, setStartsAt] = useState<number | null>(null);
  const [duration, setDuration] = useState(2);
  const [area, setArea] = useState('');
  const [address, setAddress] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'rsvp' | 'reveal'>('public');
  const [hostAs, setHostAs] = useState<'anonymous' | 'me' | 'custom'>('anonymous');
  const [hostName, setHostName] = useState('');
  const [entry, setEntry] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready =
    title.trim().length >= 3 &&
    startsAt !== null &&
    area.trim() !== '' &&
    (visibility === 'public' || address.trim() !== '') &&
    (hostAs !== 'custom' || hostName.trim() !== '');

  async function addPhoto() {
    setError(null);
    setUploading(true);
    try {
      const url = await pickAndUploadPhoto();
      if (url) setPhotos([url]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not upload that photo.');
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      const { listing } = await api.createListing({
        type: 'event',
        title: title.trim(),
        description: description.trim(),
        photos,
        startsAt,
        durationHours: duration,
        area: area.trim(),
        address: address.trim(),
        visibility,
        hostAs,
        hostName: hostName.trim(),
        entry: entry.trim(),
        tags,
      });
      onBack();
      router.push(`/listing/${listing.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not post.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Pressable onPress={onBack} style={styles.back}>
            <Ionicons name="chevron-back" size={18} color={Colors.primary} />
            <Text style={styles.backText}>Change type</Text>
          </Pressable>
          <Text style={styles.heading}>New event</Text>

          <View style={styles.section}>
            <Label>POST EVENT AS</Label>
            <View style={styles.wrap}>
              <Chip label="Anonymous" selected={hostAs === 'anonymous'} onPress={() => setHostAs('anonymous')} />
              <Chip label={user?.name ?? 'Me'} selected={hostAs === 'me'} onPress={() => setHostAs('me')} />
              <Chip label="Club or persona" selected={hostAs === 'custom'} onPress={() => setHostAs('custom')} />
            </View>
            {hostAs === 'custom' && (
              <TextInput
                value={hostName}
                onChangeText={setHostName}
                placeholder="e.g. Baker Socials"
                placeholderTextColor={Colors.textMuted}
                style={styles.input}
                maxLength={40}
              />
            )}
          </View>

          <Field label="Event name" value={title} onChangeText={setTitle} placeholder="e.g. Club Sailing Kickoff Party" maxLength={80} />

          <TimePicker dayLabel="WHAT DAY?" onChange={setStartsAt} />
          <View style={styles.section}>
            <Label>HOW LONG?</Label>
            <View style={styles.wrap}>
              {DURATIONS.map((h) => (
                <Chip key={h} label={`${h} hour${h > 1 ? 's' : ''}`} selected={duration === h} onPress={() => setDuration(h)} />
              ))}
            </View>
          </View>

          <Field
            label="General area (everyone sees this)"
            value={area}
            onChangeText={setArea}
            placeholder="e.g. Off campus, near Rice Village"
            maxLength={80}
          />
          <View style={styles.section}>
            <Label>WHO SEES THE EXACT LOCATION?</Label>
            <View style={styles.wrap}>
              {VISIBILITY.map((v) => (
                <Chip key={v.key} label={v.label} selected={visibility === v.key} onPress={() => setVisibility(v.key)} />
              ))}
            </View>
            <Text style={styles.typeText}>{VISIBILITY.find((v) => v.key === visibility)?.text}</Text>
          </View>
          <Field
            label={visibility === 'public' ? 'Exact location (optional)' : 'Exact location'}
            value={address}
            onChangeText={setAddress}
            placeholder="e.g. 2415 Rice Blvd, back patio"
            maxLength={120}
          />

          <Field label="Entry (optional)" value={entry} onChangeText={setEntry} placeholder="e.g. $5 at the door, or Venmo @club" maxLength={120} />

          <View style={styles.section}>
            <Label>TAGS</Label>
            <View style={styles.wrap}>
              {EVENT_TAGS.map((t) => (
                <Chip
                  key={t}
                  label={t}
                  selected={tags.includes(t)}
                  onPress={() => setTags((all) => (all.includes(t) ? all.filter((x) => x !== t) : [...all, t]))}
                />
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Label>PHOTO (OPTIONAL)</Label>
            <View style={styles.row}>
              {photos[0] ? (
                <Pressable onPress={() => setPhotos([])} accessibilityLabel="Remove photo">
                  <PostThumb type="event" photo={photos[0]} size={96} />
                  <View style={styles.remove}>
                    <Ionicons name="close" size={14} color="#FFFFFF" />
                  </View>
                </Pressable>
              ) : (
                <Pressable onPress={addPhoto} style={styles.addPhoto} accessibilityRole="button" accessibilityLabel="Add photo">
                  <Ionicons name="camera-outline" size={26} color={Colors.textSecondary} />
                  <Text style={styles.addPhotoText}>{uploading ? 'Uploading…' : 'Add photo'}</Text>
                </Pressable>
              )}
            </View>
          </View>

          <Field
            label="Description"
            value={description}
            onChangeText={setDescription}
            placeholder="What's happening, who it's for, what to bring…"
            multiline
            maxLength={1000}
          />

          <ErrorText message={error} />
          <Button title="Post event" onPress={submit} loading={busy} disabled={!ready || uploading} />
          {!ready && (
            <Text style={styles.typeText}>
              Add a name, day and time, and general area{visibility !== 'public' ? ', plus the exact location for RSVPs' : ''}.
            </Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function PostForm({ type, onBack }: { type: 'item' | 'service'; onBack: () => void }) {
  const router = useRouter();
  const { user } = useAuth();
  const [photos, setPhotos] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [condition, setCondition] = useState<string | null>(null);
  const [price, setPrice] = useState('');
  const [options, setOptions] = useState([{ label: '', price: '' }]);
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isService = type === 'service';
  const needsProfile = isService && (!user?.photo || !user?.bio);
  const validOptions = options.filter((o) => o.label.trim() && o.price !== '');
  const ready = isService
    ? title.trim().length >= 3 && category && validOptions.length > 0
    : title.trim().length >= 3 && category && condition && price !== '' && photos.length > 0;

  async function addPhoto() {
    setError(null);
    setUploading(true);
    try {
      const url = await pickAndUploadPhoto();
      if (url) setPhotos((p) => [...p, url]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not upload that photo.');
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      const { listing } = await api.createListing({
        type,
        title: title.trim(),
        category,
        condition,
        description: description.trim(),
        photos,
        price: isService ? undefined : Number(price),
        priceOptions: isService ? validOptions.map((o) => ({ label: o.label.trim(), price: Number(o.price) })) : undefined,
      });
      onBack();
      router.push(`/listing/${listing.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not post.');
    } finally {
      setBusy(false);
    }
  }

  if (needsProfile) {
    return (
      <Screen>
        <View style={styles.content}>
          <Card>
            <Text style={styles.typeTitle}>Set up your provider profile first</Text>
            <Text style={styles.typeText}>
              Students you don't know are more likely to book you when they can see who you are. Add a profile photo and
              a short bio, and confirm your name.
            </Text>
            <Button title="Edit profile" icon="create-outline" onPress={() => router.push('/profile/edit')} />
            <Button variant="ghost" title="Back" onPress={onBack} />
          </Card>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Pressable onPress={onBack} style={styles.back}>
            <Ionicons name="chevron-back" size={18} color={Colors.primary} />
            <Text style={styles.backText}>Change type</Text>
          </Pressable>
          <Text style={styles.heading}>{isService ? 'New service' : 'New item'}</Text>
          {isService ? (
            <Text style={styles.typeText}>Shown with your name, photo, and bio so students know who they're booking.</Text>
          ) : (
            <Text style={styles.typeText}>Shown as "Verified Rice student". Your name is shared only after you accept a request.</Text>
          )}

          <View style={styles.section}>
            <Label>{isService ? 'PHOTOS (OPTIONAL)' : 'PHOTOS'}</Label>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
              {photos.map((p) => (
                <Pressable key={p} onPress={() => setPhotos((all) => all.filter((x) => x !== p))} accessibilityLabel="Remove photo">
                  <PostThumb type={type as PostType} photo={p} size={96} />
                  <View style={styles.remove}>
                    <Ionicons name="close" size={14} color="#FFFFFF" />
                  </View>
                </Pressable>
              ))}
              {photos.length < 5 && (
                <Pressable onPress={addPhoto} style={styles.addPhoto} accessibilityRole="button" accessibilityLabel="Add photo">
                  <Ionicons name="camera-outline" size={26} color={Colors.textSecondary} />
                  <Text style={styles.addPhotoText}>{uploading ? 'Uploading…' : 'Add photo'}</Text>
                </Pressable>
              )}
            </ScrollView>
          </View>

          <Field
            label="Title"
            value={title}
            onChangeText={setTitle}
            placeholder={isService ? 'e.g. Fresh Cuts by Gavin' : 'e.g. TI-84 Plus CE'}
            maxLength={80}
          />

          <View style={styles.section}>
            <Label>CATEGORY</Label>
            <View style={styles.wrap}>
              {(isService ? SERVICE_CATEGORIES : ITEM_CATEGORIES).map((c) => (
                <Chip key={c} label={c} selected={category === c} onPress={() => setCategory(c)} />
              ))}
            </View>
          </View>

          {!isService && (
            <>
              <View style={styles.section}>
                <Label>CONDITION</Label>
                <View style={styles.wrap}>
                  {CONDITIONS.map((c) => (
                    <Chip key={c} label={c} selected={condition === c} onPress={() => setCondition(c)} />
                  ))}
                </View>
              </View>
              <Field
                label="Price ($)"
                value={price}
                onChangeText={(t) => setPrice(cleanPrice(t))}
                placeholder="0"
                keyboardType="decimal-pad"
                inputMode="decimal"
              />
            </>
          )}

          {isService && (
            <View style={styles.section}>
              <Label>WHAT YOU OFFER AND PRICES</Label>
              {options.map((o, i) => (
                <View key={i} style={styles.optionRow}>
                  <TextInput
                    value={o.label}
                    onChangeText={(t) => setOptions((all) => all.map((x, j) => (j === i ? { ...x, label: t } : x)))}
                    placeholder={i === 0 ? 'e.g. Haircut' : 'e.g. Haircut + beard trim'}
                    placeholderTextColor={Colors.textMuted}
                    style={[styles.input, styles.flex]}
                  />
                  <TextInput
                    value={o.price}
                    onChangeText={(t) => setOptions((all) => all.map((x, j) => (j === i ? { ...x, price: cleanPrice(t) } : x)))}
                    placeholder="$"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="decimal-pad"
                    inputMode="decimal"
                    style={[styles.input, styles.priceInput]}
                  />
                  {options.length > 1 && (
                    <Ionicons
                      name="close-circle"
                      size={22}
                      color={Colors.textMuted}
                      onPress={() => setOptions((all) => all.filter((_, j) => j !== i))}
                    />
                  )}
                </View>
              ))}
              {options.length < 5 && (
                <Button variant="ghost" title="Add another option" icon="add" onPress={() => setOptions((all) => [...all, { label: '', price: '' }])} />
              )}
            </View>
          )}

          <Field
            label="Description"
            value={description}
            onChangeText={setDescription}
            placeholder={isService ? 'What is included, how long it takes, where you meet…' : 'Condition details, pickup location…'}
            multiline
            maxLength={1000}
          />

          <ErrorText message={error} />
          <Button title="Post" onPress={submit} loading={busy} disabled={!ready || uploading} />
          {!ready && (
            <Text style={styles.typeText}>
              {isService
                ? 'Add a title, category, and at least one option with a price.'
                : 'Add a photo, title, category, condition, and price.'}
            </Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },
  content: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: Spacing.xxl * 2 },
  heading: { ...Typography.title, color: Colors.text },
  typeCard: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  typeIcon: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  typeTitle: { ...Typography.heading, color: Colors.text },
  typeText: { ...Typography.caption, color: Colors.textSecondary },
  soon: { ...Typography.caption, color: Colors.textMuted, textAlign: 'center' },
  back: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backText: { ...Typography.caption, fontWeight: '600', color: Colors.primary },
  section: { gap: Spacing.sm },
  row: { gap: Spacing.sm },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  addPhoto: {
    width: 96,
    height: 96,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addPhotoText: { ...Typography.caption, color: Colors.textSecondary },
  remove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  input: {
    ...Typography.body,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  priceInput: { width: 80 },
});
