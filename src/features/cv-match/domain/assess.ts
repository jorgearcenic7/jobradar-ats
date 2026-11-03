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
import { containsAny, countWords, findTerms, type TermMatch } from './text';
import type {
  CefrLevel,
  CvSectionKind,
  Evidence,
  EvidenceRole,
  EvidenceSignal,
  OfferRequirement,
  RequirementStatus,
} from './types';

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

// "y no Docker", "pero no con Docker": a bare "no" right before the term.
// "no solo Docker" is not a negation and does not match.
const directNegation = /(^|\s)no(\s+(con|en|de|el|la|los|las))?\s*$/;

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

// Clauses end at punctuation or at a contrast: "Node.js, pero no con Docker".
const clauseBreak = /[,;:()]|\s(?:pero|aunque|sino|but|although)\s/g;

function clauseBefore(normalized: string, position: number) {
  const before = normalized.slice(0, position);
  let start = 0;
  let match: RegExpExecArray | null;
  clauseBreak.lastIndex = 0;
  while ((match = clauseBreak.exec(before))) start = match.index + match[0].length;
  return before.slice(start);
}

// "Docker: sin experiencia", "Docker (no)": a negation right after the term.
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

// Theoretical or indirect knowledge. Read in the whole sentence, because the hedge often
// comes after the term ("Conozco Docker de forma teórica"). A long sentence in the
// experience section is not evidence when it says this.
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

/** "Tecnologías: React, Docker, AWS" or "Docker, Kubernetes, Git": an enumeration, not a description. */
function isList(text: string) {
  const body = text.includes(':') ? text.slice(text.indexOf(':') + 1) : text;
  const items = body.split(/[,;|·•]/).filter((item) => item.trim());
  return items.length >= 3 && items.every((item) => countWords(item) <= 3);
}

const minimumDescriptionWords = 6;

function isDescription(unit: CvUnit) {
  return countWords(unit.text) >= minimumDescriptionWords && !isList(unit.text);
}

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
  // A degree or certificate proves knowledge, not hands-on use of a tool.
  const supportingSections: CvSectionKind[] =
    concept?.kind === 'knowledge'
      ? ['experience', 'projects', 'education', 'certifications']
      : ['experience', 'projects'];

  const evidence: Evidence[] = [];
  for (const unit of units) {
    const match = findTerms(unit.normalized, index.conceptTerms).find(
      (item) => item.id === requirement.conceptId,
    );
    if (!match) continue;
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

  for (const unit of units) {
    const match = findTerms(unit.normalized, index.languageTerms).find(
      (item) => item.id === requirement.languageId,
    );
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

  // The CV names the language, but JobRadar cannot read the level the offer asks for.
  if (requirement.level === null && requirement.levelText !== null) {
    return result(
      'not-evaluable',
      `La oferta pide un nivel «${requirement.levelText}» de ${name}, que JobRadar no sabe comparar con la escala MCER. Comprueba tú si tu nivel lo cumple.`,
    );
  }

  // With several different levels in the CV, the lowest one is used.
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
  // A known level below the requested one does not meet the requirement: no partial credit.
  return result(
    'missing',
    `El CV indica un nivel ${cvLevel} de ${name}, inferior al ${requirement.level} que pide la oferta.`,
  );
}

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
  const statements = units.flatMap((unit) => {
    const conceptIds = findTerms(unit.normalized, index.conceptTerms).map((item) => item.id);
    const related = requirement.conceptIds.length
      ? requirement.conceptIds.every((id) => conceptIds.includes(id))
      : mentionsExperience(unit.normalized);
    return related ? findYears(unit.normalized).map((years) => ({ unit, years })) : [];
  });
  const most = statements.reduce((max, item) => Math.max(max, item.years), 0);

  if (statements.length > 0) {
    // Fewer declared years than requested do not meet the requirement: no partial credit.
    const supported = most >= requirement.years;
    return {
      status: supported ? 'supported' : 'missing',
      reason: supported
        ? `El CV declara ${most} años, igual o más de los ${requirement.years} que pide la oferta.`
        : `El CV declara ${most} años, menos de los ${requirement.years} que pide la oferta.`,
      evidence: statements.map(({ unit }) => evidenceOf(unit, supported ? 'support' : 'mention')),
    };
  }

  // No duration stated: the requirement is understood, the evidence is what is missing.
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
    const matches = findTerms(unit.normalized, index.conceptTerms);
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
  }
}
