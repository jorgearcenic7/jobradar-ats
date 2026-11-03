export type InputField = 'cv' | 'offer';

/** Fields that must be filled in before analyzing. Texts are never trimmed or truncated. */
export function missingInputs(cvText: string, offerText: string): InputField[] {
  const missing: InputField[] = [];
  if (!cvText.trim()) missing.push('cv');
  if (!offerText.trim()) missing.push('offer');
  return missing;
}
