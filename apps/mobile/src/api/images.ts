import { imagePath } from '@panna/shared';

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
  // React Native's FormData takes a file as a plain object with a uri, not a Blob.
  form.append('file', {
    uri: picked.uri,
    type: picked.mimeType ?? 'image/jpeg',
    name: picked.fileName ?? 'photo.jpg',
  } as unknown as Blob);
  const { key } = await authorizedCall('uploadImage', { form });
  return key;
}
