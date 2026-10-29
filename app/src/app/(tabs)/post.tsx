import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Screen } from '@/components/Screen';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { addListing } from '@/database';

// Keep digits and at most one decimal point with two places.
function cleanPrice(text: string) {
  const [whole, ...rest] = text.replace(/[^0-9.]/g, '').split('.');
  return rest.length ? `${whole}.${rest.join('').slice(0, 2)}` : whole;
}

export default function PostScreen() {
  const [image, setImage] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');

  const priceValue = Number(price);
  const canPost =
    image !== null &&
    title.trim() !== '' &&
    price !== '' &&
    Number.isFinite(priceValue) &&
    description.trim() !== '';

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setImage(result.assets[0].uri);
    }
  }

  function post() {
    if (!canPost || !image) return;
    addListing({
      title: title.trim(),
      price: priceValue,
      description: description.trim(),
      images: [image],
    });
    setImage(null);
    setTitle('');
    setPrice('');
    setDescription('');
    router.navigate('/');
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Pressable
            onPress={pickImage}
            style={({ pressed }) => [styles.photo, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={image ? 'Change photo' : 'Add photo'}>
            {image ? (
              <Image source={{ uri: image }} style={styles.photoImage} />
            ) : (
              <View style={styles.photoEmpty}>
                <Ionicons name="camera-outline" size={32} color={Colors.textSecondary} />
                <Text style={styles.photoText}>Add photo</Text>
              </View>
            )}
          </Pressable>
          {image && <Text style={styles.hint}>Tap the photo to change it.</Text>}

          <View style={styles.field}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="What are you selling?"
              placeholderTextColor={Colors.textMuted}
              style={styles.input}
              maxLength={80}
              returnKeyType="next"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Price</Text>
            <View style={styles.priceRow}>
              <Text style={styles.currency}>$</Text>
              <TextInput
                value={price}
                onChangeText={(text) => setPrice(cleanPrice(text))}
                placeholder="0"
                placeholderTextColor={Colors.textMuted}
                style={[styles.input, styles.priceInput]}
                keyboardType="decimal-pad"
                inputMode="decimal"
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Condition, size, pickup location…"
              placeholderTextColor={Colors.textMuted}
              style={[styles.input, styles.multiline]}
              multiline
              maxLength={500}
              textAlignVertical="top"
            />
          </View>

          <Pressable
            onPress={post}
            disabled={!canPost}
            style={({ pressed }) => [
              styles.button,
              !canPost && styles.buttonDisabled,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button">
            <Text style={styles.buttonText}>Post listing</Text>
          </Pressable>
          {!canPost && (
            <Text style={styles.hint}>Add a photo, title, price, and description to post.</Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  pressed: {
    opacity: 0.7,
  },
  photo: {
    width: 140,
    aspectRatio: 1,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  photoText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  field: {
    gap: Spacing.sm,
  },
  label: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.text,
  },
  input: {
    ...Typography.body,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  currency: {
    ...Typography.heading,
    color: Colors.text,
  },
  priceInput: {
    flex: 1,
  },
  multiline: {
    minHeight: 120,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md + 2,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  buttonDisabled: {
    backgroundColor: Colors.textMuted,
  },
  buttonText: {
    ...Typography.heading,
    color: Colors.background,
  },
  hint: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
});
