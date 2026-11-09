import type {
  CvChecks,
  EvidenceRole,
  Importance,
  Recommendation,
  RequirementAssessment,
} from './types';

// Every message is fixed wording plus labels taken from the offer. Nothing from the CV
// is copied, and nothing suggests adding experience the user does not have.

const importanceOrder: Importance[] = ['required', 'ambiguous', 'preferred', 'unclassified'];

type RecommendationInput = {
  status: RequirementAssessment['status'];
  evidence: RequirementAssessment['evidence'];
  label: string;
  requirementId: string;
};

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

  return {
    kind: 'add-evidence',
    requirementId,
    message: `${label} aparece en tu CV sin un ejemplo de uso. Si lo has usado en un puesto o proyecto, describe allí qué hiciste con ello.`,
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
      message: `Tu CV indica un nivel inferior al que pide la oferta (${label}). Indica siempre tu nivel real; no lo eleves para ajustarlo a la oferta.`,
    };
  }

  return {
    kind: 'missing',
    requirementId,
    message: `La oferta pide ${label} y no aparece en tu CV. Si lo hablas, añádelo con tu nivel real.`,
  };
}

function forLanguage(input: RecommendationInput): Recommendation | null {
  const { label, requirementId, status } = input;

  if (status === 'missing') return forMissingLanguage(input);
  if (status === 'mentioned') {
    return {
      kind: 'language-level',
      requirementId,
      message: `Indica tu nivel real de idioma con la escala MCER (de A1 a C2). No lo eleves para ajustarlo a ${label}.`,
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

function forYears({ label, requirementId, status }: RecommendationInput): Recommendation | null {
  if (status !== 'mentioned') return null;
  return {
    kind: 'years',
    requirementId,
    message: `La oferta pide ${label} y el CV no acredita esa duración. Revisa los periodos laborales o indica la duración real si la tienes; las fechas generales no acreditan años en una tecnología o puesto concreto.`,
  };
}

function forRequirement(assessment: RequirementAssessment): Recommendation | null {
  const { requirement, status, evidence } = assessment;
  const input: RecommendationInput = {
    status,
    evidence,
    label: `«${requirement.label}»`,
    requirementId: requirement.id,
  };

  switch (requirement.kind) {
    case 'concept':
      return forConcept(input);
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
