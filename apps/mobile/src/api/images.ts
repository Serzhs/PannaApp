import { imagePath } from '@panna/shared';
import { File } from 'expo-file-system';

import { baseUrl } from './client';
import { authorizedCall } from './session';

/** Where an <Image> fetches a key from. The path comes from the contract, the host from here. */
export function imageUrl(key: string): string {
  return `${baseUrl()}${imagePath(key)}`;
}

export interface PickedImage {
  readonly uri: string;
  readonly mimeType?: string | null | undefined;
  readonly fileName?: string | null | undefined;
}

/** Uploads a picked photo and answers with the key the recipe will carry (0011). */
export async function uploadImage(picked: PickedImage): Promise<string> {
  const form = new FormData();
  // Expo's fetch refuses React Native's old `{ uri }` part; a File from the file system is
  // what it reads. The picker already re-encoded the photo, so the name is only a name.
  form.append('file', new File(picked.uri), picked.fileName ?? 'photo.jpg');
  const { key } = await authorizedCall('uploadImage', { form });
  return key;
}
