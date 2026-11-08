/*
Extrae de una oferta de empleo los requisitos que JobRadar puede evaluar.

La oferta se recorre línea a línea. Los encabezados («Requisitos», «Se valorará», «Funciones»,
«Ofrecemos»…) indican en qué sección está cada frase y con qué firmeza se pide, y las palabras
de la propia frase («imprescindible», «valorable») pueden matizarlo. Así se separa lo que se
exige al candidato de lo que cuenta la empresa sobre sí misma, su producto, sus beneficios o
cómo inscribirse, y no se penaliza al candidato por tecnologías que solo aparecen ahí.

En cada frase se reconocen conceptos del catálogo, idiomas con su nivel, la titulación y los
años de experiencia. Lo que no se sabe interpretar no se adivina: las líneas de una lista de
requisitos que no nombran nada conocido se devuelven como no reconocidas, y las frases que
pueden ser o no un requisito quedan pendientes de revisión. Ninguna de las dos puntúa.

Las reglas están pensadas para ofertas en español, con algunas expresiones habituales en
inglés, y solo reconocen lo que figura en el catálogo.
*/
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
 * De qué trata la parte de la oferta que se está leyendo:
 * - `preamble`: el texto anterior al primer encabezado reconocido, o una oferta sin encabezados.
 * - `requirements`: lo que la oferta pide al candidato.
 * - `description`: las funciones del puesto.
 * - `excluded`: la empresa, el producto, la cultura, los beneficios, las condiciones o cómo
 *   inscribirse.
 * - `doubtful`: un encabezado que JobRadar no sabe clasificar. Sus frases quedan pendientes de
 *   revisión.
 */
type Section =
  | { role: 'preamble' }
  | { role: 'requirements'; importance: Importance }
  | { role: 'description' }
  | { role: 'excluded' }
  | { role: 'doubtful'; heading: string };

/** Lo que dice una línea sobre las secciones, antes de tener en cuenta la sección actual. */
type Heading = Exclude<Section, { role: 'preamble' | 'doubtful' }> | 'topic' | 'unknown';

// Palabras que hacen obligatorio un requisito. «Requisitos» es más débil y no está aquí: un
// encabezado «Requisitos deseables» habla de requisitos que se valoran, no que se exigen.
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

// Se retiran de la frase antes de buscar las palabras anteriores, para que «No es
// imprescindible» no convierta el requisito en obligatorio.
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

// Encabezados de una lista de requisitos que no dicen con qué firmeza se piden: la
// importancia queda sin clasificar.
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

// Encabezados que nombran un tema («Backend», «Idiomas») en lugar de un tipo de sección.
// Dentro de una lista de requisitos son subencabezados y conservan su importancia.
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

// Secciones que no hablan del candidato: todas sus líneas se descartan hasta el siguiente
// encabezado.
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

// Frases que, fuera de una lista de requisitos, no hablan del candidato: cómo inscribirse,
// los beneficios, o la empresa, su cultura o su producto.
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

// La empresa describe su propia forma de trabajar. Puede insinuar un requisito o no, así que
// la frase queda pendiente de revisión.
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

// Palabras que piden algo al candidato. Mantienen como requisito una frase que contenga
// alguna de las señales anteriores: «Somos una startup que busca experiencia con React».
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

/** Importancia que declaran las palabras de una frase, o `null` si no declaran ninguna. */
function statedImportance(normalized: string): Importance | null {
  const negated = containsAny(normalized, negatedRequiredWords);
  const rest = removePhrases(normalized, negatedRequiredWords);
  const required = containsAny(rest, requiredWords);
  const preferred = containsAny(rest, preferredWords);
  // «No es imprescindible, pero se valorará» es valorable; una negación sin más es ambigua.
  if (negated) return preferred ? 'preferred' : 'ambiguous';
  if (required && preferred) return 'ambiguous';
  if (required) return 'required';
  return preferred ? 'preferred' : null;
}

/**
 * Un encabezado es una línea corta (hasta seis palabras), sin viñeta, sin punto, coma ni
 * punto y coma al final y sin ningún término del catálogo: una línea que nombra una
 * tecnología es un requisito, no un título. Las palabras conocidas lo clasifican. Una línea
 * que solo nombra un tema o que tiene palabras desconocidas cuenta como encabezado si termina
 * en dos puntos, o si empieza por mayúscula e introduce una lista con viñetas; así, una frase
 * corta de un párrafo no se toma por encabezado.
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
  // «Requisitos» sin ningún matiz se entiende como una lista de requisitos obligatorios.
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
    // Fuera de una lista de requisitos, un tema («Idiomas») abre una sin importancia declarada.
    return current.role === 'requirements'
      ? current
      : { role: 'requirements', importance: 'unclassified' };
  }
  if (heading === 'unknown') {
    /*
    La sección desconocida evita que sus frases hereden el papel de la sección anterior; por
    ejemplo, que cuenten como requisitos solo por venir después de «Requisitos». Antes del
    primer encabezado reconocido no hay nada que heredar, así que se sigue en el preámbulo.
    */
    if (current.role === 'preamble') return current;
    return { role: 'doubtful', heading: line.text.replace(/:\s*$/, '').trim() };
  }
  return heading;
}

// Fuera de una lista de requisitos (preámbulo, funciones del puesto) la sección no aporta
// importancia: solo la deciden las palabras de la frase.
function sectionImportance(section: Section): Importance {
  return section.role === 'requirements' ? section.importance : 'unclassified';
}

/**
 * Las listas de requisitos y las secciones desconocidas informan de las líneas que JobRadar
 * no sabe leer.
 */
function reportsEveryLine(section: Section) {
  return section.role === 'requirements' || section.role === 'doubtful';
}

type SentenceRole = 'requirement' | 'review' | 'excluded';

/**
 * Toda frase de una lista de requisitos es un requisito. En el resto de la oferta, una frase
 * sobre cómo inscribirse, los beneficios o la empresa se descarta, y una sobre cómo trabaja la
 * empresa, o bajo un encabezado desconocido, queda pendiente de revisión. Una importancia
 * declarada convierte siempre la frase en requisito; fuera de las secciones desconocidas,
 * también las palabras que piden algo al candidato. Sin ninguna de estas señales, la frase
 * cuenta como requisito.
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
 * La sección fija la importancia salvo que la frase diga otra cosa. Si las dos dicen cosas
 * distintas («Imprescindible» bajo «Se valorará»), el resultado es ambiguo.
 */
function combineImportance(section: Importance, stated: Importance | null): Importance {
  if (!stated || stated === section) return section;
  if (section === 'unclassified') return stated;
  return 'ambiguous';
}

/**
 * Importancia de un requisito que aparece en varias frases. Una mención sin importancia
 * declarada, como las de las funciones del puesto, no contradice lo que se pide en otra parte.
 */
function mergeImportance(a: Importance, b: Importance): Importance {
  if (a === b) return a;
  if (a === 'unclassified') return b;
  if (b === 'unclassified') return a;
  return 'ambiguous';
}

// Se distribuye sobre la unión, para que cada tipo de requisito conserve sus propios campos.
type Candidate = OfferRequirement extends infer Item
  ? Item extends OfferRequirement
    ? Omit<Item, 'importance' | 'sources'>
    : never
  : never;

/**
 * Requisitos que nombra una frase: cada concepto del catálogo una sola vez, los idiomas con
 * el nivel que se lee junto a ellos, la titulación y los años de experiencia.
 */
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

  const languageMatches = findTerms(normalized, index.languageTerms);
  for (const match of languageMatches) {
    const language = index.languages.get(match.id)!;
    const { level, levelText } = languageLevelAt(normalized, match.start, languageMatches);
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

  // «Grado o máster» pide al menos un grado: el requisito es el nivel más bajo.
  const [education] = findEducationLevels(normalized).sort(compareEducation);
  if (education) {
    candidates.push({
      kind: 'education',
      id: `education:${education}`,
      level: education,
      label: educationLabels[education],
    });
  }

  /*
  Solo se usa la primera cifra seguida de «años» («3-5 años» se lee como 5; «tres años», en
  letras, no se reconoce) y se asocia a todos los conceptos de la frase. Esos conceptos siguen
  siendo además requisitos propios, evaluados por separado.
  */
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

type DemandClause = {
  source: string;
  text: string;
  importance?: Importance;
  review?: boolean;
  reviewCause?: 'alternative' | 'partial-recognition';
};

/** Solo listas técnicas delimitadas: no intenta adivinar competencias dentro de prosa. */
function technicalList(text: string, index: CatalogIndex) {
  const prefix =
    /^(?:(?:experiencia|conocimientos?|dominio|manejo)\s+(?:con|en|de)\s+|(?:imprescindible|valorable|deseable|obligatorio|se requiere|se valorara)\s*:?\s+)/.exec(
      normalize(text),
    );
  const body = text
    .slice(prefix?.[0].length ?? 0)
    .trim()
    .replace(/[.;!?]+$/, '')
    .trim();
  const parts = body.split(/\s+(?:y|o|u)\s+|,\s*/i);
  if (parts.length < 2) return null;
  const items: { text: string; known: boolean }[] = [];
  for (const part of parts) {
    const value = part.trim();
    const normalized = normalize(value);
    const matches = findTerms(normalized, index.conceptTerms);
    const known = matches.length === 1 && matches[0].start === 0 && matches[0].end === value.length;
    // Los nombres desconocidos deben ser elementos breves con mayúscula inicial. Idiomas,
    // años, negaciones y calificativos de conceptos conocidos no se tratan como tecnología nueva.
    if (
      !known &&
      (recognize(normalized, index).length > 0 ||
        !/^\p{Lu}[\p{L}\p{N}.+#-]*(?:\s+\p{Lu}[\p{L}\p{N}.+#-]*)?$/u.test(value))
    )
      return null;
    items.push({ text: value, known });
  }
  return items.some((item) => item.known) ? items : null;
}

function hasAlternative(text: string, index: CatalogIndex): boolean {
  const normalized = normalize(text);
  const matches = findTerms(normalized, index.conceptTerms);
  if (
    matches.some(
      (match, i) => i > 0 && /\b(?:o|u)\b/.test(normalized.slice(matches[i - 1].end, match.start)),
    )
  )
    return true;
  return /\s+(?:o|u)\s+/.test(normalized) && technicalList(text, index) !== null;
}

/** Mantiene «; basta con uno» unido al grupo sin cambiar la segmentación del CV. */
function offerSentences(text: string, index: CatalogIndex): string[] {
  const parts = splitSentences(text);
  const sentences: string[] = [];
  let offset = 0;
  for (let i = 0; i < parts.length; i++) {
    const start = text.indexOf(parts[i], offset);
    let end = start + parts[i].length;
    if (
      hasAlternative(parts[i], index) &&
      /^basta con (?:uno|una)\b/.test(normalize(parts[i + 1] ?? ''))
    ) {
      end = text.indexOf(parts[i + 1], end) + parts[i + 1].length;
      i++;
    }
    sentences.push(text.slice(start, end));
    offset = end;
  }
  return sentences;
}

function protectedDemandClauses(
  source: string,
  index: CatalogIndex,
  section: Section,
): DemandClause[] {
  const normalized = normalize(source);
  if (
    sentenceRole(normalized, section, statedImportance(normalized)) === 'requirement' &&
    hasAlternative(source, index)
  ) {
    return [{ source, text: source, review: true, reviewCause: 'alternative' }];
  }
  return demandClauses(source, index).flatMap((clause) => {
    if (
      clause.review ||
      !(
        section.role === 'requirements' ||
        (section.role === 'preamble' && containsAny(normalize(clause.text), demandWords))
      )
    )
      return [clause];
    const value = normalize(clause.text);
    if (
      sentenceRole(value, section, clause.importance ?? statedImportance(value)) !==
        'requirement' ||
      /\b(?:o|u)\b/.test(value)
    )
      return [clause];
    const items = technicalList(clause.text, index);
    return [
      clause,
      ...(items
        ?.filter((item) => !item.known)
        .map((item) => ({
          source: clause.source,
          text: item.text,
          review: true,
          reviewCause: 'partial-recognition' as const,
        })) ?? []),
    ];
  });
}

/**
 * Aísla solo demandas con marcadores propios. Cada fragmento conserva la frase de origen;
 * si no podemos atribuir la negación o la importancia, se conserva para revisión sin puntuar.
 */
function demandClauses(source: string, index: CatalogIndex): DemandClause[] {
  const normalized = normalize(source);
  const negated = containsAny(normalized, negatedRequiredWords);
  const mixed = containsAny(normalized, requiredWords) && containsAny(normalized, preferredWords);
  if (!negated && !mixed) return [{ source, text: source }];
  // La protección de alternativas se resuelve antes; aquí no se reinterpretan como conjunciones.
  if (containsAny(normalized, ['o'])) {
    return [{ source, text: source, review: negated }];
  }
  // Una negación sin el patrón de exigencia reconocido no se propaga al siguiente concepto.
  if (!negated && containsAny(normalized, ['no'])) return [{ source, text: source, review: true }];

  const explicitStart =
    /^(?:imprescindible|obligatorio|necesario|se requiere|valorable|deseable|opcional|se valorara|se valora)\b/;
  const negativeStart = (text: string) =>
    negatedRequiredWords.some((phrase) => text === phrase || text.startsWith(`${phrase} `));
  const parts: string[] = [];
  let start = 0;
  for (const match of normalized.matchAll(/\s*(?:,\s*)?\b(y|pero)\s+/g)) {
    const end = match.index + match[0].length;
    const right = normalized.slice(end);
    if (!explicitStart.test(right) && !negativeStart(right) && !(negated && match[1] === 'pero'))
      continue;
    parts.push(source.slice(start, match.index).trim());
    start = end;
  }
  parts.push(source.slice(start).trim());
  const uncertain = (): DemandClause[] => [{ source, text: source, review: true }];
  if (parts.length === 1) return uncertain();

  const clauses: DemandClause[] = [];
  for (const [position, text] of parts.entries()) {
    const value = normalize(text);
    const candidates = recognize(value, index);
    if (containsAny(value, negatedRequiredWords)) {
      // «No es imprescindible, pero se valorará Docker» no nombra un criterio en su primera
      // parte. La fuente completa queda en la demanda positiva; no añadimos una fila vacía.
      if (position === 0 && negatedRequiredWords.includes(value.replace(/[,.:]+$/, ''))) continue;
      clauses.push({ source, text, review: true });
      continue;
    }
    const importance = statedImportance(value);
    if (explicitStart.test(value) && (importance === 'required' || importance === 'preferred')) {
      if (candidates.length > 0) {
        clauses.push({ source, text, importance });
        continue;
      }
      // La elipsis solo retoma un criterio inequívoco de la negación inmediatamente anterior.
      if (
        parts.length === 2 &&
        position === 1 &&
        importance === 'preferred' &&
        containsAny(normalize(parts[0]), negatedRequiredWords) &&
        recognize(normalize(parts[0]), index).length === 1
      ) {
        return [{ source, text: source, importance: 'preferred' }];
      }
    }
    if (
      position > 0 &&
      /^si\s+/.test(value) &&
      importance === null &&
      candidates.length > 0 &&
      containsAny(normalize(parts[position - 1]), negatedRequiredWords)
    ) {
      clauses.push({ source, text, importance: 'required' });
      continue;
    }
    return uncertain();
  }
  // Dos cláusulas no pueden asignar exigencias incompatibles al mismo criterio. La excepción
  // «no requerido, pero valorable» declara precisamente que se prefiere sin exigirlo.
  const assigned = new Map<string, DemandClause>();
  for (const clause of clauses) {
    for (const candidate of recognize(normalize(clause.text), index)) {
      const previous = assigned.get(candidate.id);
      if (previous && !(previous.review && clause.importance === 'preferred')) return uncertain();
      assigned.set(candidate.id, clause);
    }
  }
  return clauses.length ? clauses : uncertain();
}

/**
 * Extrae los requisitos de una oferta con el catálogo indicado (por defecto, el de la app).
 *
 * Cada requisito conserva en `sources` las frases literales de la oferta de las que procede,
 * para que el usuario pueda comprobar por qué se ha reconocido. Un requisito que aparece en
 * varias frases se devuelve una sola vez, con la importancia combinada de todas ellas. El
 * orden es el de su primera aparición.
 */
export function extractOfferRequirements(
  offerText: string,
  catalog: readonly SkillConcept[] = skillCatalog,
): OfferRequirement[] {
  return extractOfferRequirementsFromIndex(offerText, indexCatalog(catalog));
}

/** Punto de entrada interno para un análisis que ya ha preparado el índice del catálogo. */
export function extractOfferRequirementsFromIndex(
  offerText: string,
  index: CatalogIndex,
): OfferRequirement[] {
  const requirements = new Map<string, OfferRequirement>();
  const unscored = new Map<string, OfferRequirement>();
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

    for (const clause of offerSentences(line.text, index).flatMap((text) =>
      protectedDemandClauses(text, index, section),
    )) {
      const sentence = clause.source;
      const normalized = normalize(clause.text);
      const stated = clause.importance ?? statedImportance(normalized);
      // Un marcador local no hace obligatoria una cláusula que contradice un apartado deseable.
      const wordingReview =
        clause.review ||
        (clause.importance === 'required' && sectionImportance(section) === 'preferred');
      const role = wordingReview ? 'review' : sentenceRole(normalized, section, stated);
      if (role === 'excluded') continue;

      const importance = wordingReview
        ? combineImportance(sectionImportance(section), stated)
        : (clause.importance ?? combineImportance(sectionImportance(section), stated));
      const candidates = recognize(normalized, index);

      // Una práctica de la empresa que no nombra nada conocido no deja nada que revisar.
      if (
        role === 'review' &&
        !wordingReview &&
        candidates.length === 0 &&
        !reportsEveryLine(section)
      )
        continue;

      if (role === 'review' || (candidates.length === 0 && reportsEveryLine(section))) {
        // Solo unificamos repeticiones literales del mismo tipo y contexto. No inferimos
        // equivalencias entre frases desconocidas ni mezclamos obligaciones con preferencias.
        const text = clause.text.toLowerCase().replace(/\s+/g, ' ').replace(/\.$/, '').trim();
        const key = JSON.stringify([
          role,
          section,
          importance,
          text,
          Boolean(wordingReview),
          clause.reviewCause,
        ]);
        const existing = unscored.get(key);
        if (existing) {
          if (!existing.sources.includes(sentence)) existing.sources.push(sentence);
          continue;
        }
        const item: OfferRequirement =
          role === 'review'
            ? {
                kind: 'review',
                id: `review:${++review}`,
                label: clause.text,
                importance,
                sources: [sentence],
                cause: wordingReview
                  ? (clause.reviewCause ?? 'requirement-wording')
                  : section.role === 'doubtful'
                    ? 'unknown-section'
                    : 'company-practice',
                heading: !wordingReview && section.role === 'doubtful' ? section.heading : null,
              }
            : {
                kind: 'unrecognized',
                id: `unrecognized:${++unrecognized}`,
                label: sentence,
                importance,
                sources: [sentence],
              };
        requirements.set(item.id, item);
        unscored.set(key, item);
        continue;
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
