import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { api, PostType } from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import { Screen } from '@/components/Screen';
import { Button, Card, Chip, ErrorText, Field, IconName, Label, PostThumb } from '@/components/ui';
import { Colors, Radius, Spacing, TypeColors, Typography } from '@/constants/theme';
import { pickAndUploadPhoto } from '@/lib/images';

const ITEM_CATEGORIES = ['Textbooks', 'Electronics', 'Dorm', 'Furniture', 'Clothing', 'Bikes', 'Tickets', 'Other'];
const SERVICE_CATEGORIES = ['Haircuts', 'Tutoring', 'Photography', 'DJ and Music', 'Rentals', 'Rides', 'Other'];
const CONDITIONS = ['New', 'Like new', 'Good', 'Fair'];

const TYPES: { type: 'item' | 'service'; title: string; text: string; icon: IconName }[] = [
  { type: 'item', title: 'Item', text: 'Sell something. Anonymous until a sale is agreed.', icon: 'pricetag-outline' },
  { type: 'service', title: 'Service', text: 'Haircuts, tutoring, DJ, photography, rides, rentals. Uses your profile.', icon: 'cut-outline' },
];

// Keep digits and at most one decimal point with two places.
function cleanPrice(text: string) {
  const [whole, ...rest] = text.replace(/[^0-9.]/g, '').split('.');
  return rest.length ? `${whole}.${rest.join('').slice(0, 2)}` : whole;
}

export default function PostScreen() {
  const [type, setType] = useState<'item' | 'service' | null>(null);

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
          <Text style={styles.soon}>Posting events, Wanted requests, and Lost & Found is coming soon.</Text>
        </ScrollView>
      </Screen>
    );
  }

  return <PostForm type={type} onBack={() => setType(null)} />;
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
