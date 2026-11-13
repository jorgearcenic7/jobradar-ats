/*
Relaciones semánticas entre requisitos de la oferta y frases del CV (v1.4, opcional).

El motor determinista sigue siendo la fuente de verdad: este módulo no cambia ningún estado,
punto ni peso. Solo propone, para algunos requisitos que el motor no ha podido acreditar, frases
del CV que hablan de algo parecido con otras palabras, para que el usuario las revise. Una
similitud alta no acredita nada.

Qué requisitos se consultan:
- los no evaluables que el motor no reconoce (líneas de requisitos y elementos de listas);
- los conocimientos y competencias transversales del catálogo que el CV no nombra («Pruebas
  unitarias», «Trabajo en equipo»), siempre que el CV no los niegue.
Nunca las tecnologías del catálogo: React y Angular son parecidas, pero no equivalentes, y una
tecnología solo se acredita por su nombre o un sinónimo. Por la misma razón, si un requisito no
reconocido nombra algo concreto («Experiencia con Tableau», «IEC 62443»), la frase del CV debe
contener ese nombre literalmente. Tampoco se consultan años, idiomas ni titulaciones, que
tienen reglas propias.

Qué frases del CV se usan: las de experiencia, proyectos, habilidades, formación, certificaciones
y otras secciones con al menos tres palabras, salvo las que niegan algo o lo presentan como
aprendizaje o conocimiento teórico. El perfil no se usa (ver `passageSections`).

Cómo se decide: e5 da similitudes coseno muy comprimidas (frases sin relación rondan 0,82 y
frases relacionadas 0,85), así que no basta un umbral fijo. Una frase es candidata si supera un
mínimo absoluto y además destaca sobre la mediana de las frases del mismo CV para ese requisito.
Los valores se calibraron con el corpus ficticio de `jest/semantic-corpus.ts`.

Limitación conocida: en un CV corto y de un solo sector todas las frases se parecen, la mediana
sube y una relación clara puede quedarse por debajo del margen. Se probó a añadir a la mediana
frases ficticias de otros sectores; mejoraba ese caso, pero sin falsos positivos solo encontraba
el 31 % de las relaciones del corpus de prueba, frente al 54 % sin ellas, y se descartó.
*/
import { isQualifiedSentence } from './assess';
import { parseCv } from './cv-structure';
import { indexCatalog, skillCatalog, type SkillConcept } from './skill-catalog';
import { containsPhrase, normalize } from './text';
import type { AnalysisResult, CvSectionKind, RequirementAssessment } from './types';

export type SemanticQuery = {
  requirementId: string;
  /** Texto que se compara, sin el prefijo `query: ` de e5. */
  text: string;
  /** Nombres concretos del requisito que la frase del CV debe contener literalmente. */
  namedTerms: string[];
};

export type SemanticPassage = { text: string; normalized: string; section: CvSectionKind };

export type SemanticTargets = { queries: SemanticQuery[]; passages: SemanticPassage[] };

export type SemanticCandidate = { text: string; section: CvSectionKind };

/** Candidatos por id de requisito. Un requisito sin candidatos no aparece. */
export type SemanticReview = Record<string, SemanticCandidate[]>;

export type SemanticRules = {
  /** Similitud mínima con la frase del CV. */
  floor: number;
  /** Cuánto debe superar la mediana de las frases del CV para ese requisito. */
  margin: number;
  maxPerRequirement: number;
};

/*
Calibrado con `scripts/semantic-benchmark.mjs`. El ajuste más fino que no da falsos positivos en
la mitad de calibración (margen 0,01, mínimo 0,835) los da en la de prueba: se ajusta de más a
pocos casos. Con un margen de 0,04 sobre la mediana no hay falsos positivos en ninguna de las dos
mitades, a costa de encontrar algo más de la mitad de las relaciones. Es preferible perder una
relación a proponer una falsa.
*/
export const defaultSemanticRules: SemanticRules = {
  floor: 0.8,
  margin: 0.04,
  maxPerRequirement: 2,
};

// El perfil queda fuera: una autodescripción no es evidencia verificable y, por ser genérica, se
// parece a casi cualquier requisito.
const passageSections: CvSectionKind[] = [
  'experience',
  'projects',
  'skills',
  'education',
  'certifications',
  'other',
];

/*
Un nombre concreto es una palabra con mayúscula que no abre la frase, una sigla o una palabra
con cifras o signos técnicos («IEC 62443», «Tableau», «SEO», «C++»). Las palabras que abren la
frase solo cuentan si son siglas o llevan cifras, porque en español la primera palabra siempre
va en mayúscula.
*/
function namedTermsOf(text: string): string[] {
  // El punto o el guion final son puntuación de la frase, no parte del nombre («SAP.»).
  const words = (text.match(/[\p{L}\d][\p{L}\d.+#-]*/gu) ?? []).map((word) =>
    word.replace(/[.-]+$/, ''),
  );
  return words
    .filter((word, index) => {
      const acronym = /^\p{Lu}[\p{Lu}\d.+#-]+$/u.test(word);
      const technical = /\d|[+#]/.test(word) || /\p{Ll}\.\p{L}/u.test(word);
      const capitalized = /^\p{Lu}/u.test(word);
      return acronym || technical || (index > 0 && capitalized);
    })
    .map((word) => normalize(word));
}

function queryOf(
  assessment: RequirementAssessment,
  concepts: ReadonlyMap<string, SkillConcept>,
): SemanticQuery | null {
  const { requirement, status, evidence } = assessment;
  if (status === 'not-evaluable') {
    const unrecognized =
      requirement.kind === 'unrecognized' ||
      (requirement.kind === 'review' && requirement.cause === 'partial-recognition');
    if (!unrecognized) return null;
    return {
      requirementId: requirement.id,
      text: requirement.label,
      namedTerms: namedTermsOf(requirement.label),
    };
  }
  if (status === 'missing' && requirement.kind === 'concept') {
    const concept = concepts.get(requirement.conceptId);
    if (!concept || concept.kind === 'skill') return null;
    if (evidence.some((item) => item.role === 'negation')) return null;
    return { requirementId: requirement.id, text: concept.label, namedTerms: [] };
  }
  return null;
}

/** Requisitos que se consultan y frases del CV donde buscar, sin calcular nada todavía. */
export function semanticTargets(
  cvText: string,
  result: AnalysisResult,
  catalog: readonly SkillConcept[] = skillCatalog,
): SemanticTargets {
  const index = indexCatalog(catalog);
  const queries = result.requirements
    .map((assessment) => queryOf(assessment, index.concepts))
    .filter((query): query is SemanticQuery => query !== null);
  if (queries.length === 0) return { queries, passages: [] };

  const seen = new Set<string>();
  const passages: SemanticPassage[] = [];
  for (const unit of parseCv(cvText, index).units) {
    if (!passageSections.includes(unit.section)) continue;
    if (unit.text.split(/\s+/).length < 3 || isQualifiedSentence(unit.normalized)) continue;
    if (seen.has(unit.normalized)) continue;
    seen.add(unit.normalized);
    passages.push({ text: unit.text, normalized: unit.normalized, section: unit.section });
  }
  return { queries, passages };
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/**
 * Elige los candidatos a partir de la similitud de cada consulta con cada frase.
 * `similarity(q, p)` es el coseno entre la consulta `q` y la frase `p`, en el orden de
 * `targets`.
 */
export function selectSemanticCandidates(
  targets: SemanticTargets,
  similarity: (query: number, passage: number) => number,
  rules: SemanticRules = defaultSemanticRules,
): SemanticReview {
  const review: SemanticReview = {};
  if (targets.passages.length === 0) return review;
  targets.queries.forEach((query, q) => {
    const scores = targets.passages.map((_, p) => similarity(q, p));
    const typical = median(scores);
    const candidates = targets.passages
      .map((passage, p) => ({ passage, score: scores[p] }))
      .filter(
        ({ passage, score }) =>
          score >= rules.floor &&
          score - typical >= rules.margin &&
          query.namedTerms.every((term) => containsPhrase(passage.normalized, term)),
      )
      .sort((a, b) => b.score - a.score)
      .slice(0, rules.maxPerRequirement)
      .map(({ passage }) => ({ text: passage.text, section: passage.section }));
    if (candidates.length > 0) review[query.requirementId] = candidates;
  });
  return review;
}

/** Producto escalar de vectores ya normalizados: la similitud coseno. */
export function cosine(
  a: Float32Array,
  aIndex: number,
  b: Float32Array,
  bIndex: number,
  dimensions: number,
): number {
  let sum = 0;
  const aOffset = aIndex * dimensions;
  const bOffset = bIndex * dimensions;
  for (let d = 0; d < dimensions; d += 1) sum += a[aOffset + d] * b[bOffset + d];
  return sum;
}

/** Prefijos que espera multilingual-e5: `query: ` para el requisito y `passage: ` para el CV. */
export const e5Query = (text: string) => `query: ${text}`;
export const e5Passage = (text: string) => `passage: ${text}`;
