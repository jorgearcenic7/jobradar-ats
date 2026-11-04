/*
Evalúa cada requisito de la oferta frente a las frases del CV y explica el resultado.

Para cada requisito se buscan las frases del CV que lo nombran y se clasifica cada una según lo
que dice de él: describe su uso (respaldo), solo lo nombra (mención), lo presenta como
conocimiento teórico o como algo que se está aprendiendo, o lo niega. Con esas evidencias se
decide el estado (`supported`, `mentioned`, `missing` o `not-evaluable`) y un motivo legible.

Las evidencias son siempre frases literales del CV, para que el usuario pueda comprobar de
dónde sale cada conclusión. El motor no deduce lo que el CV no dice: no calcula duraciones a
partir de las fechas y no da crédito parcial a un nivel de idioma o a unos años inferiores a
los que pide la oferta.

Las reglas de negación, aprendizaje y conocimiento teórico están escritas para CV en español,
con algunas expresiones habituales en inglés, y se aplican frase a frase.
*/
import {
  compareCefr,
  compareEducation,
  educationLabels,
  findEducationLevels,
  findYears,
  languageLevelAt,
  mentionsExperience,
} from './criteria';
import { withoutDates, type CvUnit } from './cv-structure';
import type { CatalogIndex } from './skill-catalog';
import { containsAny, countWords, type TermMatch } from './text';
import type {
  CefrLevel,
  CvSectionKind,
  Evidence,
  EvidenceRole,
  EvidenceSignal,
  OfferRequirement,
  RequirementStatus,
} from './types';

/** Resultado de evaluar un requisito: estado, motivo legible y evidencias literales del CV. */
export type Assessment = { status: RequirementStatus; reason: string; evidence: Evidence[] };

type Requirement<Kind extends OfferRequirement['kind']> = Extract<OfferRequirement, { kind: Kind }>;

const sectionNames: Record<CvSectionKind, string> = {
  header: 'la cabecera',
  profile: 'el perfil',
  experience: 'la experiencia',
  education: 'la formación',
  skills: 'las habilidades',
  languages: 'los idiomas',
  projects: 'los proyectos',
  certifications: 'las certificaciones',
  other: 'otras secciones',
};

// Expresiones que niegan la experiencia con el término cuando aparecen antes de él, en la
// misma cláusula.
const negationCues = [
  'no tengo',
  'no he',
  'no cuento',
  'no domino',
  'no conozco',
  'no manejo',
  'no uso',
  'no utilizo',
  'no hablo',
  'nunca',
  'sin experiencia',
  'sin conocimientos',
  'ninguna experiencia',
  'desconozco',
  'no experience',
  'never',
  'not familiar',
  'no knowledge',
  'have not',
  'do not',
];

// «y no Docker», «pero no con Docker»: un «no» suelto justo antes del término.
// «no solo Docker» no es una negación y no coincide.
const directNegation = /(^|\s)no(\s+(con|en|de|el|la|los|las))?\s*$/;

// Señales de que el término se está aprendiendo o solo interesa. Se buscan antes de él, en la
// misma cláusula.
const learningCues = [
  'aprendiendo',
  'aprender',
  'en proceso de aprendizaje',
  'formandome',
  'interes en',
  'interesado en',
  'interesada en',
  'learning',
];

// Verbos de acción, sobre todo en primera persona del pasado, que indican trabajo realizado.
const actionVerbs = [
  'desarrolle',
  'implemente',
  'disene',
  'cree',
  'construi',
  'lidere',
  'gestione',
  'coordine',
  'automatice',
  'migre',
  'optimice',
  'mejore',
  'reduje',
  'aumente',
  'mantuve',
  'desplegue',
  'configure',
  'integre',
  'monte',
  'participe',
  'colabore',
  'analice',
  'documente',
  'programe',
  'use',
  'utilice',
  'trabaje',
  'developed',
  'built',
  'implemented',
  'designed',
  'led',
  'managed',
  'created',
  'migrated',
  'improved',
  'reduced',
  'increased',
  'deployed',
  'configured',
  'maintained',
  'automated',
];

/*
Las negaciones y el aprendizaje se buscan en la cláusula anterior al término, no en toda la
frase, para que afecten solo a lo que acompañan: en «Node.js, pero no con Docker» la negación
se refiere a Docker y no a Node.js. Una cláusula termina en una coma, un punto y coma, unos dos
puntos, un paréntesis o una conjunción como «pero», «aunque» o «sino».
*/
const clauseBreak = /[,;:()]|\s(?:pero|aunque|sino|but|although)\s/g;

function clauseBefore(normalized: string, position: number) {
  const before = normalized.slice(0, position);
  let start = 0;
  let match: RegExpExecArray | null;
  clauseBreak.lastIndex = 0;
  while ((match = clauseBreak.exec(before))) start = match.index + match[0].length;
  return before.slice(start);
}

// «Docker: sin experiencia», «Docker (no)»: una negación justo después del término.
const negationAfter = /^\s*[:\-–—(]?\s*(?:sin experiencia|ninguna experiencia|nada|no)(?![a-z])/;

function isNegated(normalized: string, match: TermMatch) {
  const clause = clauseBefore(normalized, match.start);
  return (
    containsAny(clause, negationCues) ||
    directNegation.test(clause) ||
    negationAfter.test(normalized.slice(match.end))
  );
}

function isLearning(normalized: string, match: TermMatch) {
  return containsAny(clauseBefore(normalized, match.start), learningCues);
}

// Conocimiento teórico o indirecto. Se busca en toda la frase porque suele aparecer después
// del término («Conozco Docker de forma teórica»). Una frase larga de la sección de
// experiencia que lo diga no cuenta como respaldo.
const hedgeCues = [
  'he oido hablar',
  'oido hablar',
  'de forma teorica',
  'a nivel teorico',
  'conocimientos teoricos',
  'conocimiento teorico',
  'formacion teorica',
  'teoricamente',
  'sin experiencia practica',
  'sin experiencia real',
  'sin experiencia profesional',
  'nociones',
  'conocimientos basicos',
  'familiarizado',
  'familiarizada',
  'he leido sobre',
  'heard of',
  'theoretical',
  'basic knowledge',
  'no practical experience',
];

function isHedged(normalized: string) {
  return containsAny(normalized, hedgeCues);
}

/**
 * «Tecnologías: React, Docker, AWS» o «Docker, Kubernetes, Git»: una enumeración, no una
 * descripción de uso.
 */
function isList(text: string) {
  const body = text.includes(':') ? text.slice(text.indexOf(':') + 1) : text;
  const items = body.split(/[,;|·•]/).filter((item) => item.trim());
  return items.length >= 3 && items.every((item) => countWords(item) <= 3);
}

// Una frase más corta, como «React y Docker», nombra herramientas pero no describe su uso.
const minimumDescriptionWords = 6;

function isDescription(unit: CvUnit) {
  return countWords(unit.text) >= minimumDescriptionWords && !isList(unit.text);
}

/*
Señales que hacen más concreta una evidencia: cifras (sin contar las fechas), fechas y verbos de
acción. Se adjuntan a cada evidencia como información; no intervienen en el estado del
requisito.
*/
function signalsOf(unit: CvUnit): EvidenceSignal[] {
  const signals: EvidenceSignal[] = [];
  if (/\d/.test(withoutDates(unit.text))) signals.push('number');
  if (/\b(?:19|20)\d{2}\b|actualidad|presente|present/.test(unit.normalized)) signals.push('date');
  if (containsAny(unit.normalized, actionVerbs)) signals.push('action-verb');
  return signals;
}

function evidenceOf(unit: CvUnit, role: EvidenceRole): Evidence {
  return { text: unit.text, section: unit.section, role, signals: signalsOf(unit) };
}

// Las evidencias más sólidas se muestran primero.
const roleOrder: EvidenceRole[] = ['support', 'mention', 'hedged', 'learning', 'negation'];

function sortEvidence(evidence: Evidence[]) {
  return evidence.sort((a, b) => roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role));
}

function listSections(evidence: Evidence[]) {
  const names = [...new Set(evidence.map((item) => sectionNames[item.section]))];
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} y ${names.at(-1)}` : names[0];
}

function assessConcept(
  requirement: Requirement<'concept'>,
  units: CvUnit[],
  index: CatalogIndex,
): Assessment {
  const concept = index.concepts.get(requirement.conceptId);
  // Una titulación o un certificado acreditan conocimientos, no el uso práctico de una herramienta.
  const supportingSections: CvSectionKind[] =
    concept?.kind === 'knowledge'
      ? ['experience', 'projects', 'education', 'certifications']
      : ['experience', 'projects'];

  const evidence: Evidence[] = [];
  for (const unit of units) {
    const match = unit.conceptMatches().find((item) => item.id === requirement.conceptId);
    if (!match) continue;
    /*
    El orden decide qué pesa más en una misma frase: la negación, después el conocimiento
    teórico y el aprendizaje. Solo una frase descriptiva de una sección que acredita el uso
    respalda el requisito; las demás menciones, salvo las negaciones, son evidencia
    insuficiente.
    */
    let role: EvidenceRole = 'mention';
    if (isNegated(unit.normalized, match)) role = 'negation';
    else if (isHedged(unit.normalized)) role = 'hedged';
    else if (isLearning(unit.normalized, match)) role = 'learning';
    else if (supportingSections.includes(unit.section) && isDescription(unit)) role = 'support';
    evidence.push(evidenceOf(unit, role));
  }

  const has = (role: EvidenceRole) => evidence.some((item) => item.role === role);
  const label = requirement.label;
  sortEvidence(evidence);

  if (has('support') && has('negation')) {
    return {
      status: 'mentioned',
      reason: `El CV describe el uso de ${label} y también dice que no tienes experiencia con ello. Ante la contradicción no se da por respaldado.`,
      evidence,
    };
  }
  if (has('support')) {
    return {
      status: 'supported',
      reason: `El CV describe dónde usaste ${label}.`,
      evidence,
    };
  }
  if (has('mention') || has('hedged') || has('learning')) {
    const mentions = evidence.filter((item) => item.role !== 'negation');
    const onlyRole = (role: EvidenceRole) => mentions.every((item) => item.role === role);
    let reason = `${label} aparece en ${listSections(mentions)}, pero sin una frase que describa dónde lo usaste.`;
    if (onlyRole('hedged')) {
      reason = `${label} aparece como conocimiento teórico o indirecto, no como experiencia práctica.`;
    } else if (onlyRole('learning')) {
      reason = `${label} aparece como algo que estás aprendiendo o que te interesa, no como experiencia.`;
    }
    return { status: 'mentioned', reason, evidence };
  }
  if (has('negation')) {
    return {
      status: 'missing',
      reason: `El CV indica que no tienes experiencia con ${label}.`,
      evidence,
    };
  }
  return { status: 'missing', reason: `${label} no aparece en el CV.`, evidence };
}

function assessLanguage(
  requirement: Requirement<'language'>,
  units: CvUnit[],
  index: CatalogIndex,
): Assessment {
  const name = index.languages.get(requirement.languageId)?.label ?? requirement.label;
  const mentions: { unit: CvUnit; level: CefrLevel | null }[] = [];
  const negations: CvUnit[] = [];

  // Un idioma cuenta en cualquier sección del CV, no solo en «Idiomas».
  for (const unit of units) {
    const match = unit.languageMatches().find((item) => item.id === requirement.languageId);
    if (!match) continue;
    if (isNegated(unit.normalized, match)) negations.push(unit);
    else mentions.push({ unit, level: languageLevelAt(unit.normalized, match.start).level });
  }

  const negationEvidence = negations.map((unit) => evidenceOf(unit, 'negation'));
  if (mentions.length === 0) {
    return {
      status: 'missing',
      reason: negations.length
        ? `El CV indica que no hablas ${name}.`
        : `El ${name} no aparece en el CV.`,
      evidence: negationEvidence,
    };
  }

  const result = (status: RequirementStatus, reason: string): Assessment => ({
    status,
    reason,
    evidence: [
      ...mentions.map(({ unit }) =>
        evidenceOf(unit, status === 'supported' ? 'support' : 'mention'),
      ),
      ...negationEvidence,
    ],
  });

  // El CV nombra el idioma, pero JobRadar no sabe interpretar el nivel que pide la oferta.
  if (requirement.level === null && requirement.levelText !== null) {
    return result(
      'not-evaluable',
      `La oferta pide un nivel «${requirement.levelText}» de ${name}, que JobRadar no sabe comparar con la escala MCER. Comprueba tú si tu nivel lo cumple.`,
    );
  }

  // Si el CV indica varios niveles distintos, se usa el más bajo.
  const levels = mentions
    .map((mention) => mention.level)
    .filter((level): level is CefrLevel => level !== null)
    .sort(compareCefr);
  const cvLevel = levels[0];
  if (!cvLevel) {
    return result('mentioned', `El CV menciona el ${name} sin indicar el nivel.`);
  }
  if (requirement.level === null) {
    return result('supported', `El CV indica un nivel ${cvLevel} de ${name}.`);
  }
  if (compareCefr(cvLevel, requirement.level) >= 0) {
    return result(
      'supported',
      `El CV indica un nivel ${cvLevel} de ${name}, igual o superior al ${requirement.level} que pide la oferta.`,
    );
  }
  // Un nivel conocido inferior al pedido no cumple el requisito: no hay crédito parcial.
  return result(
    'missing',
    `El CV indica un nivel ${cvLevel} de ${name}, inferior al ${requirement.level} que pide la oferta.`,
  );
}

/*
Solo la sección de formación acredita una titulación, y en ella cuenta el nivel más alto. Si
esa sección no indica ninguno, la mención de un nivel suficiente en otra parte del CV es
evidencia insuficiente. La especialidad no se comprueba.
*/
function assessEducation(requirement: Requirement<'education'>, units: CvUnit[]): Assessment {
  const found = units.flatMap((unit) =>
    findEducationLevels(unit.normalized, {
      inEducationSection: unit.section === 'education',
    }).map((level) => ({ unit, level })),
  );
  const inSection = found.filter((item) => item.unit.section === 'education');
  const best = inSection
    .map((item) => item.level)
    .sort(compareEducation)
    .at(-1);
  const required = educationLabels[requirement.level];

  if (best && compareEducation(best, requirement.level) >= 0) {
    return {
      status: 'supported',
      reason: `La sección de formación incluye ${educationLabels[best]}. No se comprueba la especialidad.`,
      evidence: inSection.map((item) => evidenceOf(item.unit, 'support')),
    };
  }
  if (best) {
    return {
      status: 'missing',
      reason: `La formación más alta del CV es ${educationLabels[best]}, de nivel inferior a ${required}.`,
      evidence: inSection.map((item) => evidenceOf(item.unit, 'mention')),
    };
  }
  const elsewhere = found.filter((item) => compareEducation(item.level, requirement.level) >= 0);
  if (elsewhere.length) {
    return {
      status: 'mentioned',
      reason: `Se menciona ${required} fuera de la sección de formación.`,
      evidence: elsewhere.map((item) => evidenceOf(item.unit, 'mention')),
    };
  }
  return { status: 'missing', reason: `El CV no muestra ${required}.`, evidence: [] };
}

function assessYears(
  requirement: Requirement<'years'>,
  units: CvUnit[],
  index: CatalogIndex,
): Assessment {
  /*
  Una frase declara años para el requisito si nombra todos sus conceptos o, cuando el
  requisito no nombra ninguno, si habla de experiencia. Si hay varias declaraciones, se usa la
  cifra mayor.
  */
  const statements = units.flatMap((unit) => {
    const conceptIds = unit.conceptMatches().map((item) => item.id);
    const related = requirement.conceptIds.length
      ? requirement.conceptIds.every((id) => conceptIds.includes(id))
      : mentionsExperience(unit.normalized);
    return related ? findYears(unit.normalized).map((years) => ({ unit, years })) : [];
  });
  const most = statements.reduce((max, item) => Math.max(max, item.years), 0);

  if (statements.length > 0) {
    // Declarar menos años de los pedidos no cumple el requisito: no hay crédito parcial.
    const supported = most >= requirement.years;
    return {
      status: supported ? 'supported' : 'missing',
      reason: supported
        ? `El CV declara ${most} años, igual o más de los ${requirement.years} que pide la oferta.`
        : `El CV declara ${most} años, menos de los ${requirement.years} que pide la oferta.`,
      evidence: statements.map(({ unit }) => evidenceOf(unit, supported ? 'support' : 'mention')),
    };
  }

  // El CV no declara ninguna duración: el requisito se entiende, lo que falta es la evidencia.
  const notFromDates = 'JobRadar no calcula la duración a partir de las fechas.';
  if (requirement.conceptIds.length === 0) {
    const hasExperience = units.some((unit) => unit.section === 'experience');
    return hasExperience
      ? {
          status: 'mentioned',
          reason: `El CV tiene experiencia, pero no indica cuánto tiempo suma. ${notFromDates}`,
          evidence: [],
        }
      : { status: 'missing', reason: 'El CV no muestra experiencia.', evidence: [] };
  }

  const labels = requirement.conceptIds
    .map((id) => index.concepts.get(id)?.label ?? id)
    .join(' y ');
  const related = units.filter((unit) => {
    const matches = unit.conceptMatches();
    return requirement.conceptIds.every((id) => {
      const match = matches.find((item) => item.id === id);
      return match && !isNegated(unit.normalized, match);
    });
  });
  if (related.length === 0) {
    return { status: 'missing', reason: `El CV no menciona ${labels}.`, evidence: [] };
  }
  return {
    status: 'mentioned',
    reason: `El CV menciona ${labels}, pero no indica cuánto tiempo lo has usado. ${notFromDates}`,
    evidence: related.map((unit) => evidenceOf(unit, 'mention')),
  };
}

/**
 * Evalúa un requisito de la oferta frente a las frases del CV.
 *
 * Los requisitos no reconocidos y los pendientes de revisión no se evalúan: se devuelven como
 * `not-evaluable`, sin evidencias, para que no cuenten en la cobertura.
 */
export function assessRequirement(
  requirement: OfferRequirement,
  units: CvUnit[],
  index: CatalogIndex,
): Assessment {
  switch (requirement.kind) {
    case 'concept':
      return assessConcept(requirement, units, index);
    case 'language':
      return assessLanguage(requirement, units, index);
    case 'education':
      return assessEducation(requirement, units);
    case 'years':
      return assessYears(requirement, units, index);
    case 'unrecognized':
      return {
        status: 'not-evaluable',
        reason:
          'JobRadar no reconoce ningún criterio en esta línea de la oferta, así que no la evalúa ni la puntúa.',
        evidence: [],
      };
    case 'review':
      return {
        status: 'not-evaluable',
        reason:
          requirement.cause === 'unknown-section'
            ? `Esta frase está en el apartado «${requirement.heading}», que JobRadar no sabe clasificar: puede ser un requisito o información sobre la empresa. No se puntúa; revisa tú si te la piden.`
            : 'Esta frase describe cómo trabaja la empresa, pero no lo pide expresamente. No se puntúa; revisa tú si el puesto lo exige.',
        evidence: [],
      };
  }
}
