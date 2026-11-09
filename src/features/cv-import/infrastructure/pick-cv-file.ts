import type { PickResult } from '../domain/readers';

/**
 * Native app: importing CV files is not available yet. Reading the picked file and the PDF
 * and DOCX readers still need a native implementation and testing on devices.
 */
export const canPickCvFile = false;

export async function pickCvFile(): Promise<PickResult> {
  return { kind: 'unavailable' };
}
