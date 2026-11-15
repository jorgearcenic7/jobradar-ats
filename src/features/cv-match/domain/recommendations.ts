import type {
  CvChecks,
  EvidenceRole,
  Importance,
  Recommendation,
  RequirementAssessment,
} from './types';

/*
Cada mensaje combina un texto fijo, los nombres que usa la oferta y, desde la v1.7, hechos que ya
están en el CV: el nivel de idioma declarado, los meses que suman los puestos relacionados o la
frase literal donde aparece una competencia. Nunca propone añadir experiencia, titulaciones ni
habilidades que el CV no tenga: solo hacer visible lo que ya demuestra o indicar el dato real.
*/

const importanceOrder: Importance[] = ['required', 'ambiguous', 'preferred', 'unclassified'];

type RecommendationInput = {
  status: RequirementAssessment['status'];
  evidence: RequirementAssessment['evidence'];
  label: string;
  requirementId: string;
  partial?: RequirementAssessment['partial'];
};

// Una frase del CV citada en un consejo, recortada para que el mensaje siga siendo legible.
function quote(text: string) {
  const clean = text.replace(/\s+/g, ' ').trim();
  return `«${clean.length > 90 ? `${clean.slice(0, 87).trimEnd()}…` : clean}»`;
}

function monthsText(value: string) {
  const months = Number.parseInt(value, 10);
  if (!Number.isFinite(months)) return value;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const parts = [
    years > 0 && `${years} ${years === 1 ? 'año' : 'años'}`,
    rest > 0 && `${rest} ${rest === 1 ? 'mes' : 'meses'}`,
  ].filter(Boolean);
  return parts.length ? parts.join(' y ') : '0 meses';
}

function hasEvidence(evidence: RequirementAssessment['evidence'], role: EvidenceRole): boolean {
  return evidence.some((item) => item.role === role);
}

function hasOnlyEvidence(evidence: RequirementAssessment['evidence'], role: EvidenceRole): boolean {
  return evidence.length > 0 && evidence.every((item) => item.role === role);
}

function forMissingConcept({
  evidence,
  label,
  requirementId,
}: RecommendationInput): Recommendation {
  if (hasEvidence(evidence, 'negation')) {
    return {
      kind: 'negated',
      requirementId,
      message: `Tu CV indica que no tienes experiencia con ${label}. No lo añadas como competencia; si llegas a usarlo, describe dónde lo aplicaste.`,
    };
  }

  return {
    kind: 'missing',
    requirementId,
    message: `La oferta pide ${label} y no aparece en tu CV. Si lo has usado, indica en qué puesto o proyecto y qué hiciste; si no lo has usado, no lo añadas.`,
  };
}

function forMentionedConcept({
  evidence,
  label,
  requirementId,
}: RecommendationInput): Recommendation {
  if (hasEvidence(evidence, 'support') && hasEvidence(evidence, 'negation')) {
    return {
      kind: 'contradiction',
      requirementId,
      message: `Tu CV dice a la vez que has usado ${label} y que no tienes experiencia con ello. Revisa cuál de las dos afirmaciones es la correcta.`,
    };
  }
  if (hasOnlyEvidence(evidence, 'hedged')) {
    return {
      kind: 'add-evidence',
      requirementId,
      message: `Tu CV presenta ${label} como conocimiento teórico o indirecto. Si lo has usado en la práctica, describe dónde y qué hiciste; si no, déjalo como está.`,
    };
  }
  if (hasOnlyEvidence(evidence, 'learning')) {
    return {
      kind: 'add-evidence',
      requirementId,
      message: `Tu CV presenta ${label} como aprendizaje en curso. Cuando lo apliques en un puesto o proyecto, describe dónde; mientras tanto, déjalo como está.`,
    };
  }

  /*
  En una lista de habilidades basta con nombrar la sección; otra frase se cita literal. Una frase
  con una negación («No tengo 5 años con React») no se cita: no es donde «aparece» la competencia.
  */
  const where = evidence.find((item) => item.role === 'mention');
  const place = !where
    ? null
    : where.section === 'skills'
      ? 'tu lista de habilidades'
      : /(?:^|[^\p{L}])(?:no|nunca|sin|never|not|without)(?=$|[^\p{L}])/iu.test(where.text)
        ? null
        : quote(where.text);
  return {
    kind: 'add-evidence',
    requirementId,
    message: place
      ? `${label} solo aparece en ${place}, sin un ejemplo de uso. Si lo has usado en un puesto o proyecto, describe allí qué hiciste con ello.`
      : `${label} aparece en tu CV sin un ejemplo de uso. Si lo has usado en un puesto o proyecto, describe allí qué hiciste con ello.`,
  };
}

function forConcept(input: RecommendationInput): Recommendation | null {
  if (input.status === 'missing') return forMissingConcept(input);
  if (input.status === 'mentioned') return forMentionedConcept(input);
  return null;
}

function forMissingLanguage({
  evidence,
  label,
  requirementId,
  partial,
}: RecommendationInput): Recommendation {
  if (hasEvidence(evidence, 'negation')) {
    return {
      kind: 'negated',
      requirementId,
      message: `Tu CV indica que no hablas ${label}. No lo añadas; si llegas a aprenderlo, indica tu nivel real.`,
    };
  }
  if (hasEvidence(evidence, 'mention')) {
    return {
      kind: 'language-level',
      requirementId,
      message: partial
        ? `Tu CV indica un nivel ${partial.achieved} y la oferta pide ${label}. Indica siempre tu nivel real; si tienes un certificado más reciente o lo estás preparando, añádelo con su fecha.`
        : `Tu CV indica un nivel inferior al que pide la oferta (${label}). Indica siempre tu nivel real; no lo eleves para ajustarlo a la oferta.`,
    };
  }

  return {
    kind: 'missing',
    requirementId,
    message: `La oferta pide ${label} y no aparece en tu CV. Si lo hablas, añádelo con tu nivel real.`,
  };
}

function forLanguage(input: RecommendationInput): Recommendation | null {
  const { label, requirementId, status, partial } = input;

  if (status === 'missing') return forMissingLanguage(input);
  if (status === 'mentioned') {
    return {
      kind: 'language-level',
      requirementId,
      // Con el nivel del CV a la vista, el consejo es concreto: precisarlo o acreditarlo.
      message: partial
        ? `Tu CV indica un nivel ${partial.achieved} y la oferta pide ${label}, que puede equivaler a más. Si tu nivel real es superior o tienes un certificado (por ejemplo, de C1), indícalo; si no, mantén ${partial.achieved}.`
        : `Indica tu nivel real de idioma con la escala MCER (de A1 a C2). No lo eleves para ajustarlo a ${label}.`,
    };
  }
  if (status === 'not-evaluable') {
    return {
      kind: 'language-level',
      requirementId,
      message: `La oferta pide ${label}, un nivel que JobRadar no puede comparar con la escala MCER. Comprueba tú si tu nivel real lo cumple.`,
    };
  }
  return null;
}

function forEducation({
  label,
  requirementId,
  status,
}: RecommendationInput): Recommendation | null {
  if (status === 'supported') return null;
  return {
    kind: 'education',
    requirementId,
    message: `La oferta pide ${label}. Si tienes esa formación, inclúyela en la sección de formación; si no, no la añadas.`,
  };
}

function forYears({
  label,
  requirementId,
  status,
  partial,
}: RecommendationInput): Recommendation | null {
  if (status !== 'mentioned') return null;
  // Con los meses que ya suman los puestos relacionados, el consejo dice cuánto falta de verdad.
  if (partial && /meses$/.test(partial.achieved)) {
    return {
      kind: 'years',
      requirementId,
      message: `Tus puestos relacionados suman ${monthsText(partial.achieved)} y la oferta pide ${label}. Si tienes más experiencia en ese ámbito (otro empleo, prácticas o proyectos), añádela con sus fechas; no amplíes las fechas reales.`,
    };
  }
  return {
    kind: 'years',
    requirementId,
    message: `La oferta pide ${label} y el CV no acredita esa duración. Revisa los periodos laborales o indica la duración real si la tienes; las fechas generales no acreditan años en una tecnología o puesto concreto.`,
  };
}

/*
Un requisito obligatorio sin acreditar, o con menos años o menos nivel de los pedidos, es un
motivo de descarte habitual en un filtrado ATS. Se dice como posibilidad, nunca como certeza.
*/
function discardRisk(assessment: RequirementAssessment): boolean {
  if (assessment.requirement.importance !== 'required') return false;
  if (assessment.status === 'missing') return true;
  // Un nivel de idioma ambiguo («fluent» frente a B2) no es un descarte probable; unos años de menos sí.
  return (
    assessment.status === 'mentioned' &&
    assessment.requirement.kind === 'years' &&
    assessment.partial !== undefined
  );
}

function forRequirement(assessment: RequirementAssessment): Recommendation | null {
  const recommendation = forRequirementKind(assessment);
  if (!recommendation || !discardRisk(assessment)) return recommendation;
  return { ...recommendation, message: `Posible motivo de descarte. ${recommendation.message}` };
}

function forRequirementKind(assessment: RequirementAssessment): Recommendation | null {
  const { requirement, status, evidence, partial } = assessment;
  const input: RecommendationInput = {
    status,
    evidence,
    label: `«${requirement.label}»`,
    requirementId: requirement.id,
    partial,
  };

  switch (requirement.kind) {
    case 'concept':
      return forConcept(input);
    case 'any-of':
      // Con alternativas abiertas que no aparecen, no hay nada concreto que recomendar.
      return status === 'not-evaluable' ? null : forConcept(input);
    case 'language':
      return forLanguage(input);
    case 'education':
      return forEducation(input);
    case 'years':
      // Fewer declared years are shown in the requirement itself; there is nothing to add.
      return forYears(input);
    case 'unrecognized':
    case 'review':
      return null;
  }
}

function forStructure(checks: CvChecks): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const missingContact = [
    !checks.hasEmail && 'un correo electrónico',
    !checks.hasPhone && 'un teléfono',
  ].filter(Boolean);
  if (missingContact.length) {
    recommendations.push({
      kind: 'contact',
      message: `No se detecta ${missingContact.join(' ni ')} de contacto en tu CV.`,
    });
  }
  if (!checks.sections.includes('experience')) {
    recommendations.push({
      kind: 'section',
      message:
        'No se detecta una sección de experiencia. Si tienes experiencia, agrúpala bajo un encabezado como «Experiencia».',
    });
  } else if (!checks.experienceHasFigures) {
    recommendations.push({
      kind: 'measurable-results',
      message:
        'Tu experiencia no incluye cifras aparte de las fechas. Si tienes resultados medibles reales, añádelos; no estimes cifras que no puedas justificar.',
    });
  }
  if (!checks.sections.includes('education')) {
    recommendations.push({
      kind: 'section',
      message:
        'No se detecta una sección de formación. Si tienes estudios, agrúpalos bajo un encabezado como «Formación».',
    });
  }
  return recommendations;
}

export function buildRecommendations(
  assessments: RequirementAssessment[],
  checks: CvChecks,
): Recommendation[] {
  const byImportance = [...assessments].sort(
    (a, b) =>
      importanceOrder.indexOf(a.requirement.importance) -
      importanceOrder.indexOf(b.requirement.importance),
  );
  const recommendations = byImportance
    .map(forRequirement)
    .filter((item): item is Recommendation => item !== null);

  const unrecognized = assessments.filter(
    (item) => item.requirement.kind === 'unrecognized',
  ).length;
  if (unrecognized > 0) {
    recommendations.push({
      kind: 'review-unrecognized',
      message:
        unrecognized === 1
          ? 'JobRadar no ha podido evaluar 1 requisito de la oferta. Revísalo tú y comprueba si tu CV lo refleja.'
          : `JobRadar no ha podido evaluar ${unrecognized} requisitos de la oferta. Revísalos tú y comprueba si tu CV los refleja.`,
    });
  }

  const review = assessments.filter((item) => item.requirement.kind === 'review').length;
  if (review > 0) {
    recommendations.push({
      kind: 'review-sentences',
      message:
        review === 1
          ? 'JobRadar no sabe si 1 frase de la oferta es un requisito. Revísala tú: no cuenta en el porcentaje.'
          : `JobRadar no sabe si ${review} frases de la oferta son requisitos. Revísalas tú: no cuentan en el porcentaje.`,
    });
  }

  return [...recommendations, ...forStructure(checks)];
}
