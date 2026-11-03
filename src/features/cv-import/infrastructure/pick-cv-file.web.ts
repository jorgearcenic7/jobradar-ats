import * as DocumentPicker from 'expo-document-picker';

import type { PickResult } from '../domain/readers';

/** MIME types and extensions: browsers do not always report the type of a DOCX. */
export const acceptedTypes = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.pdf',
  '.docx',
];

export const canPickCvFile = true;

/** Opens the browser's file picker. Must be called from a user action, such as a button press. */
export async function pickCvFile(): Promise<PickResult> {
  const result = await DocumentPicker.getDocumentAsync({
    type: acceptedTypes,
    // Keep the browser File instead of a base64 copy of the whole document.
    base64: false,
    copyToCacheDirectory: false,
    multiple: false,
  });
  if (result.canceled) return { kind: 'cancelled' };

  const asset = result.assets[0];
  const file = asset.file;
  if (!file) return { kind: 'unavailable' };
  return {
    kind: 'picked',
    file: {
      name: asset.name,
      size: file.size,
      mimeType: asset.mimeType ?? null,
      readBytes: async () => new Uint8Array(await file.arrayBuffer()),
    },
  };
}
