import {
  compareEducation,
  educationLabels,
  findEducationLevels,
  findYears,
  languageLevelAt,
  mentionsExperience,
} from './criteria';
import {
  indexCatalog,
  namesAnyTerm,
  skillCatalog,
  type CatalogIndex,
  type SkillConcept,
} from './skill-catalog';
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

/**
 * What the current part of the offer is about:
 * - `preamble`: text before the first heading, or an offer without headings.
 * - `requirements`: what the offer asks of the candidate.
 * - `description`: the tasks of the job.
 * - `excluded`: company, product, culture, benefits, conditions or how to apply.
 * - `doubtful`: a heading JobRadar cannot classify. Its sentences are held for review.
 */
type Section =
  | { role: 'preamble' }
  | { role: 'requirements'; importance: Importance }
  | { role: 'description' }
  | { role: 'excluded' }
  | { role: 'doubtful'; heading: string };

/** What a line says about the sections, before taking the current section into account. */
type Heading = Exclude<Section, { role: 'preamble' | 'doubtful' }> | 'topic' | 'unknown';

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

// Headings of a requirements list that do not say how firmly it is asked: the
// importance stays unclassified.
const profileHeadingWords = [
  'perfil',
  'tu perfil',
  'perfil buscado',
  'lo que buscamos',
  'que buscamos',
  'a quien buscamos',
  'sobre ti',
  'lo que necesitas',
  'que necesitas',
  'lo que aportas',
  'que aportas',
  'about you',
  'your profile',
  'who you are',
  'what we are looking for',
  "what we're looking for",
  'what you bring',
  'you have',
];

// Headings that name a topic ("Backend", "Idiomas") instead of a kind of section. Inside a
// requirements list they are subheadings and keep its importance.
const topicHeadingWords = [
  'stack',
  'tecnologias',
  'herramientas',
  'habilidades',
  'competencias',
  'conocimientos',
  'tecnicos',
  'tecnicas',
  'soft skills',
  'hard skills',
  'skills',
  'tools',
  'frontend',
  'front-end',
  'backend',
  'back-end',
  'bases de datos',
  'cloud',
  'idiomas',
  'languages',
  'experiencia',
  'experience',
  'estudios',
  'titulacion',
  'education',
];

const ignoredHeadingWords = [
  'ofrecemos',
  'que ofrecemos',
  'beneficios',
  'ventajas',
  'sobre nosotros',
  'quienes somos',
  'sobre la empresa',
  'la empresa',
  'nuestra empresa',
  'la compania',
  'el producto',
  'nuestro producto',
  'la plataforma',
  'nuestra plataforma',
  'cultura',
  'nuestra cultura',
  'valores',
  'nuestros valores',
  'mision',
  'por que unirte',
  'por que trabajar',
  'por que nosotros',
  'por que elegirnos',
  'about us',
  'about the company',
  'who we are',
  'our culture',
  'why join',
  'why us',
  'benefits',
  'perks',
  'we offer',
  'condiciones',
  'retribucion',
  'compensacion',
  'compensation',
  'salario',
  'salary',
  'ubicacion',
  'localizacion',
  'location',
  'modalidad',
  'jornada',
  'tipo de contrato',
  'proceso de seleccion',
  'proceso de contratacion',
  'hiring process',
  'siguientes pasos',
  'next steps',
  'como aplicar',
  'como postular',
  'como postularte',
  'como inscribirte',
  'candidatura',
  'candidaturas',
  'how to apply',
];

// Sentences outside a requirements list that are not about the candidate: how to apply,
// benefits, and the company, its culture or its product.
const notRequirementWords = [
  'envia tu',
  'envianos',
  'manda tu',
  'adjunta',
  'inscribete',
  'postulate',
  'tu candidatura',
  'send your',
  'send us',
  'to apply',
  'apply now',
  'ofrecemos',
  'we offer',
  'formacion continua',
  'plan de formacion',
  'presupuesto de formacion',
  'presupuesto anual',
  'seguro medico',
  'seguro de salud',
  'ticket restaurante',
  'tickets restaurante',
  'retribucion flexible',
  'horario flexible',
  'jornada flexible',
  'jornada intensiva',
  'teletrabajo',
  'dias de vacaciones',
  'salario',
  'banda salarial',
  'rango salarial',
  'contrato indefinido',
  'clases de',
  'health insurance',
  'paid time off',
  'salary',
  'stock options',
  'somos',
  'nuestra mision',
  'nuestra vision',
  'nuestros valores',
  'nuestra cultura',
  'nuestro proposito',
  'fundada en',
  'fundado en',
  'se integra con',
  'se integran con',
  'nos integramos con',
  'integrates with',
  'our mission',
  'our values',
  'our culture',
];

// The company describing its own way of working. It may hint at a requirement or not.
const companyPracticeWords = [
  'usamos',
  'utilizamos',
  'trabajamos con',
  'desplegamos',
  'nuestro stack',
  'we use',
  'we deploy',
  'we work with',
  'our stack',
];

// Words that ask something of the candidate. They keep a sentence with any of the cues
// above as a requirement: "Somos una startup que busca experiencia con React".
const demandWords = [
  'experiencia',
  'experience',
  'conocimiento',
  'conocimientos',
  'knowledge',
  'dominio',
  'manejo',
  'capacidad',
  'buscamos',
  'busca',
  'buscando',
  'looking for',
  'necesitamos',
  'we need',
  'tienes',
  'you have',
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

/**
 * A heading is a short line without a bullet, a final period or any catalog term. Known
 * words classify it. A line with only a topic or with unknown words counts as a heading
 * when it ends with a colon or introduces a bulleted list, so a short sentence of a
 * paragraph is not taken for one.
 */
function headingOf(
  line: Line,
  normalized: string,
  index: CatalogIndex,
  introducesList: boolean,
): Heading | null {
  if (line.bulleted || namesAnyTerm(normalized, index)) return null;
  const endsWithColon = /:\s*$/.test(normalized);
  const text = normalized
    .replace(/:\s*$/, '')
    .replace(/^[#¿¡\s]+/, '')
    .trim();
  if (!text || text.includes(':') || /[.,;]$/.test(text) || countWords(text) > 6) return null;

  if (containsAny(text, ignoredHeadingWords)) return { role: 'excluded' };
  const stated = statedImportance(text);
  if (stated) return { role: 'requirements', importance: stated };
  if (containsAny(text, requirementHeadingWords)) {
    return { role: 'requirements', importance: 'required' };
  }
  if (containsAny(text, profileHeadingWords)) {
    return { role: 'requirements', importance: 'unclassified' };
  }
  if (containsAny(text, descriptionHeadingWords)) return { role: 'description' };

  const looksLikeHeading = endsWithColon || (introducesList && /^[#¿¡\s]*\p{Lu}/u.test(line.text));
  if (!looksLikeHeading) return null;
  return containsAny(text, topicHeadingWords) ? 'topic' : 'unknown';
}

function nextSection(current: Section, heading: Heading, line: Line): Section {
  if (heading === 'topic') {
    return current.role === 'requirements'
      ? current
      : { role: 'requirements', importance: 'unclassified' };
  }
  if (heading === 'unknown') {
    // Before the first known heading nothing can leak into the unknown one.
    if (current.role === 'preamble') return current;
    return { role: 'doubtful', heading: line.text.replace(/:\s*$/, '').trim() };
  }
  return heading;
}

function sectionImportance(section: Section): Importance {
  return section.role === 'requirements' ? section.importance : 'unclassified';
}

/** Requirements lists and unknown sections report the lines JobRadar cannot read. */
function reportsEveryLine(section: Section) {
  return section.role === 'requirements' || section.role === 'doubtful';
}

type SentenceRole = 'requirement' | 'review' | 'excluded';

/**
 * Every sentence of a requirements list is a requirement. Elsewhere, a sentence about
 * applying, benefits or the company is left out, and one about how the company works,
 * or under an unknown heading, is held for review. A stated importance always makes a
 * requirement; outside unknown sections, so do words that ask something of the candidate.
 */
function sentenceRole(
  normalized: string,
  section: Section,
  stated: Importance | null,
): SentenceRole {
  if (section.role === 'requirements' || stated) return 'requirement';
  if (section.role !== 'doubtful' && containsAny(normalized, demandWords)) return 'requirement';
  if (containsAny(normalized, notRequirementWords)) return 'excluded';
  if (section.role === 'doubtful' || containsAny(normalized, companyPracticeWords)) {
    return 'review';
  }
  return 'requirement';
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
  return extractOfferRequirementsFromIndex(offerText, indexCatalog(catalog));
}

/** Internal entry point for an analysis that has already prepared its catalog. */
export function extractOfferRequirementsFromIndex(
  offerText: string,
  index: CatalogIndex,
): OfferRequirement[] {
  const requirements = new Map<string, OfferRequirement>();
  const lines = splitLines(offerText);
  let section: Section = { role: 'preamble' };
  let unrecognized = 0;
  let review = 0;

  for (const [position, line] of lines.entries()) {
    const introducesList = lines[position + 1]?.bulleted ?? false;
    const heading = headingOf(line, normalize(line.text), index, introducesList);
    if (heading) {
      section = nextSection(section, heading, line);
      continue;
    }
    if (section.role === 'excluded') continue;

    for (const sentence of splitSentences(line.text)) {
      const normalized = normalize(sentence);
      const stated = statedImportance(normalized);
      const role = sentenceRole(normalized, section, stated);
      if (role === 'excluded') continue;

      const importance = combineImportance(sectionImportance(section), stated);
      const candidates = recognize(normalized, index);

      // Kept as it is, without scoring it, so the user can decide whether it applies.
      if (role === 'review') {
        if (candidates.length === 0 && !reportsEveryLine(section)) continue;
        review += 1;
        const id = `review:${review}`;
        requirements.set(id, {
          kind: 'review',
          id,
          label: sentence,
          importance,
          sources: [sentence],
          cause: section.role === 'doubtful' ? 'unknown-section' : 'company-practice',
          heading: section.role === 'doubtful' ? section.heading : null,
        });
        continue;
      }

      // Lines of a requirements section that name nothing known are shown as such,
      // instead of being dropped or guessed.
      if (candidates.length === 0 && reportsEveryLine(section)) {
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
