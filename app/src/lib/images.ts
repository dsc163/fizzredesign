import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { api } from '@/api/client';

// Let the user pick a photo, shrink it so uploads stay small, and upload it.
// Resolves with the photo's URL, or null if the user cancelled.
export async function pickAndUploadPhoto(options: { square?: boolean } = {}): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: options.square ? [1, 1] : [4, 3],
    quality: 1,
  });
  if (result.canceled || !result.assets[0]) return null;

  const image = await ImageManipulator.manipulate(result.assets[0].uri).resize({ width: 900 }).renderAsync();
  const saved = await image.saveAsync({ compress: 0.7, format: SaveFormat.JPEG, base64: true });
  if (!saved.base64) throw new Error('That photo could not be processed. Try another one.');
  const { url } = await api.uploadImage(saved.base64, 'image/jpeg');
  return url;
}
