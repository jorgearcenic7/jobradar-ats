import {
  compareEducation,
  educationLabels,
  findEducationLevels,
  findYears,
  languageLevelAt,
  mentionsExperience,
} from './criteria';
import { indexCatalog, skillCatalog, type CatalogIndex, type SkillConcept } from './skill-catalog';
import {
  containsAny,
  countWords,
  findTerms,
  normalize,
  removePhrases,
  splitLines,
  splitSentences,
  type Line,
} from './text';
import type { Importance, OfferRequirement } from './types';

type Section = Importance | 'ignored';

// Words that make a requirement mandatory. "Requisitos" on its own is weaker: a
// "Requisitos deseables" heading is about preferred requirements.
const requiredWords = [
  'imprescindible',
  'imprescindibles',
  'obligatorio',
  'obligatoria',
  'obligatorios',
  'indispensable',
  'indispensables',
  'se requiere',
  'requerido',
  'requerida',
  'necesario',
  'necesaria',
  'must have',
  'required',
  'minimos',
  'minimum',
];

const requirementHeadingWords = [
  'requisitos',
  'requisito',
  'requirements',
  'que pedimos',
  'que necesitamos',
  'qualifications',
];

const preferredWords = [
  'se valorara',
  'se valora',
  'valorable',
  'valorables',
  'valoramos',
  'deseable',
  'deseables',
  'nice to have',
  'plus',
  'bonus',
  'preferred',
  'preferible',
  'preferiblemente',
  'opcional',
];

const negatedRequiredWords = [
  'no es imprescindible',
  'no imprescindible',
  'no es obligatorio',
  'no es necesario',
  'no es necesaria',
  'no se requiere',
  'no requerido',
  'not required',
];

const descriptionHeadingWords = [
  'funciones',
  'responsabilidades',
  'tareas',
  'que haras',
  'tu dia a dia',
  'responsibilities',
  'what you will do',
  'descripcion',
  'el puesto',
  'sobre el puesto',
  'el rol',
];

const ignoredHeadingWords = [
  'ofrecemos',
  'que ofrecemos',
  'beneficios',
  'sobre nosotros',
  'quienes somos',
  'about us',
  'benefits',
  'we offer',
  'condiciones',
  'proceso de seleccion',
  'salario',
];

/** Importance stated by the words of one sentence, or `null` when it states none. */
function statedImportance(normalized: string): Importance | null {
  const negated = containsAny(normalized, negatedRequiredWords);
  const rest = removePhrases(normalized, negatedRequiredWords);
  const required = containsAny(rest, requiredWords);
  const preferred = containsAny(rest, preferredWords);
  // "No es imprescindible, pero se valorará" is preferred; a bare negation is unclear.
  if (negated) return preferred ? 'preferred' : 'ambiguous';
  if (required && preferred) return 'ambiguous';
  if (required) return 'required';
  return preferred ? 'preferred' : null;
}

function headingSection(line: Line, normalized: string, index: CatalogIndex): Section | null {
  if (line.bulleted || findTerms(normalized, index.conceptTerms).length > 0) return null;
  if (findTerms(normalized, index.languageTerms).length > 0) return null;
  const endsWithColon = /:\s*$/.test(normalized);
  const text = normalized
    .replace(/:\s*$/, '')
    .replace(/^[#¿¡\s]+/, '')
    .trim();
  if (!text || text.includes(':') || text.endsWith('.') || countWords(text) > 6) return null;

  if (containsAny(text, ignoredHeadingWords)) return 'ignored';
  const stated = statedImportance(text);
  if (stated) return stated;
  if (containsAny(text, requirementHeadingWords)) return 'required';
  if (endsWithColon || containsAny(text, descriptionHeadingWords)) return 'unclassified';
  return null;
}

/**
 * The section sets the importance unless the sentence says otherwise. When both say
 * different things ("Imprescindible" under "Se valorará"), the result is ambiguous.
 */
function combineImportance(section: Importance, stated: Importance | null): Importance {
  if (!stated || stated === section) return section;
  if (section === 'unclassified') return stated;
  return 'ambiguous';
}

/** A mention in the job description does not contradict a requirement elsewhere. */
function mergeImportance(a: Importance, b: Importance): Importance {
  if (a === b) return a;
  if (a === 'unclassified') return b;
  if (b === 'unclassified') return a;
  return 'ambiguous';
}

// Distributes over the union, so each kind keeps its own fields.
type Candidate = OfferRequirement extends infer Item
  ? Item extends OfferRequirement
    ? Omit<Item, 'importance' | 'sources'>
    : never
  : never;

function recognize(normalized: string, index: CatalogIndex): Candidate[] {
  const candidates: Candidate[] = [];
  const conceptIds: string[] = [];

  for (const match of findTerms(normalized, index.conceptTerms)) {
    if (conceptIds.includes(match.id)) continue;
    conceptIds.push(match.id);
    const concept = index.concepts.get(match.id)!;
    candidates.push({
      kind: 'concept',
      id: `concept:${match.id}`,
      conceptId: match.id,
      label: concept.label,
    });
  }

  for (const match of findTerms(normalized, index.languageTerms)) {
    const language = index.languages.get(match.id)!;
    const { level, levelText } = languageLevelAt(normalized, match.start);
    candidates.push({
      kind: 'language',
      id: level ? `language:${match.id}:${level}` : `language:${match.id}`,
      languageId: match.id,
      level,
      levelText,
      label: level
        ? `${language.label} ${level}`
        : levelText
          ? `${language.label} (nivel ${levelText})`
          : language.label,
    });
  }

  // "Grado o máster" asks for at least a degree: the lowest level is the requirement.
  const [education] = findEducationLevels(normalized).sort(compareEducation);
  if (education) {
    candidates.push({
      kind: 'education',
      id: `education:${education}`,
      level: education,
      label: educationLabels[education],
    });
  }

  const [years] = findYears(normalized);
  if (years !== undefined && mentionsExperience(normalized)) {
    const labels = conceptIds.map((id) => index.concepts.get(id)!.label);
    candidates.push({
      kind: 'years',
      id: `years:${years}:${conceptIds.join('+') || 'general'}`,
      years,
      conceptIds,
      label: labels.length
        ? `${years} años de experiencia con ${labels.join(' y ')}`
        : `${years} años de experiencia`,
    });
  }

  return candidates;
}

export function extractOfferRequirements(
  offerText: string,
  catalog: readonly SkillConcept[] = skillCatalog,
): OfferRequirement[] {
  const index = indexCatalog(catalog);
  const requirements = new Map<string, OfferRequirement>();
  let section: Section = 'unclassified';
  let unrecognized = 0;

  for (const line of splitLines(offerText)) {
    const heading = headingSection(line, normalize(line.text), index);
    if (heading) {
      section = heading;
      continue;
    }
    if (section === 'ignored') continue;

    for (const sentence of splitSentences(line.text)) {
      const normalized = normalize(sentence);
      const importance = combineImportance(section, statedImportance(normalized));
      const candidates = recognize(normalized, index);

      // Lines of a requirements section that name nothing known are shown as such,
      // instead of being dropped or guessed.
      if (candidates.length === 0 && section !== 'unclassified') {
        unrecognized += 1;
        const id = `unrecognized:${unrecognized}`;
        requirements.set(id, {
          kind: 'unrecognized',
          id,
          label: sentence,
          importance,
          sources: [sentence],
        });
      }

      for (const candidate of candidates) {
        const existing = requirements.get(candidate.id);
        if (existing) {
          existing.importance = mergeImportance(existing.importance, importance);
          if (!existing.sources.includes(sentence)) existing.sources.push(sentence);
        } else {
          requirements.set(candidate.id, {
            ...candidate,
            importance,
            sources: [sentence],
          } as OfferRequirement);
        }
      }
    }
  }

  return [...requirements.values()];
}
