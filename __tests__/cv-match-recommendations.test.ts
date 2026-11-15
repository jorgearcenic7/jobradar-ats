import { buildRecommendations } from '@/features/cv-match/domain/recommendations';
import type {
  CvChecks,
  EvidenceRole,
  OfferRequirement,
  Recommendation,
  RequirementAssessment,
  RequirementStatus,
} from '@/features/cv-match/domain/types';

const completeCvChecks: CvChecks = {
  hasEmail: true,
  hasPhone: true,
  sections: ['experience', 'education'],
  experienceHasFigures: true,
};

function assessment(
  requirement: OfferRequirement,
  status: RequirementStatus,
  evidenceRoles: EvidenceRole[],
): RequirementAssessment {
  return {
    requirement,
    status,
    reason: 'Caso ficticio para comprobar la recomendación.',
    evidence: evidenceRoles.map((role) => ({
      text: 'Evidencia ficticia.',
      section: 'experience',
      role,
      signals: [],
    })),
    contribution: null,
  };
}

function recommendationFor(item: RequirementAssessment): Recommendation | undefined {
  return buildRecommendations([item], completeCvChecks).find(
    (recommendation) => recommendation.requirementId === item.requirement.id,
  );
}

describe('recommendation contracts for special requirement states', () => {
  it('keeps the exact recommendation for learning in progress', () => {
    const item = assessment(
      {
        kind: 'concept',
        id: 'concept:docker',
        label: 'Docker',
        importance: 'required',
        sources: ['Docker.'],
        conceptId: 'docker',
      },
      'mentioned',
      ['learning'],
    );

    expect(recommendationFor(item)).toEqual({
      kind: 'add-evidence',
      requirementId: 'concept:docker',
      message:
        'Tu CV presenta «Docker» como aprendizaje en curso. Cuando lo apliques en un puesto o proyecto, describe dónde; mientras tanto, déjalo como está.',
    });
  });

  it('keeps the exact recommendation for a non-CEFR language level', () => {
    const item = assessment(
      {
        kind: 'language',
        id: 'language:en',
        label: 'inglés (nivel alto)',
        importance: 'required',
        sources: ['Inglés alto.'],
        languageId: 'en',
        level: null,
        levelText: 'alto',
      },
      'not-evaluable',
      ['mention'],
    );

    expect(recommendationFor(item)).toEqual({
      kind: 'language-level',
      requirementId: 'language:en',
      message:
        'La oferta pide «inglés (nivel alto)», un nivel que JobRadar no puede comparar con la escala MCER. Comprueba tú si tu nivel real lo cumple.',
    });
  });

  it('keeps the exact recommendation for missing education', () => {
    const item = assessment(
      {
        kind: 'education',
        id: 'education:master',
        label: 'máster',
        importance: 'required',
        sources: ['Máster en Ciencia de Datos.'],
        level: 'master',
      },
      'missing',
      [],
    );

    // Desde la v1.7 un obligatorio ausente se señala como posible motivo de descarte.
    expect(recommendationFor(item)).toEqual({
      kind: 'education',
      requirementId: 'education:master',
      message:
        'Posible motivo de descarte. La oferta pide «máster». Si tienes esa formación, inclúyela en la sección de formación; si no, no la añadas.',
    });
  });

  it('keeps the exact recommendation for years without a declared duration', () => {
    const item = assessment(
      {
        kind: 'years',
        id: 'years:3:react',
        label: '3 años de experiencia con React',
        importance: 'required',
        sources: ['Al menos 3 años de experiencia con React.'],
        years: 3,
        conceptIds: ['react'],
      },
      'mentioned',
      ['mention'],
    );

    expect(recommendationFor(item)).toEqual({
      kind: 'years',
      requirementId: 'years:3:react',
      message:
        'La oferta pide «3 años de experiencia con React» y el CV no acredita esa duración. Revisa los periodos laborales o indica la duración real si la tienes; las fechas generales no acreditan años en una tecnología o puesto concreto.',
    });
  });
});
