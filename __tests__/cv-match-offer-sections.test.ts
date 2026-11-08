import { analyzeMatch } from '@/features/cv-match/domain/analyze-match';
import { extractOfferRequirements } from '@/features/cv-match/domain/offer-requirements';
import { sampleOffer } from '@/features/cv-match/presentation/sample-texts';

import {
  listWithoutHeadingsOffer,
  paragraphOffer,
  structuredOffer,
  subheadingsOffer,
  unknownHeadingOffer,
} from '../jest/offer-fixtures';

// All job offers and CVs in this file are fictional.

/** `id [importance]` of every requirement, in order. */
function summary(offer: string) {
  return extractOfferRequirements(offer).map((item) => `${item.id} [${item.importance}]`);
}

function requirement(offer: string, id: string) {
  return extractOfferRequirements(offer).find((item) => item.id === id);
}

describe('offer with headings', () => {
  it('keeps only the requirements, the job description and what it cannot classify', () => {
    expect(summary(structuredOffer)).toEqual([
      'review:1 [unclassified]',
      'concept:typescript [required]',
      'years:3:typescript [required]',
      'review:2 [required]',
      'unrecognized:1 [required]',
      'concept:docker [preferred]',
      'concept:kubernetes [preferred]',
      'unrecognized:2 [preferred]',
    ]);
    expect(requirement(structuredOffer, 'review:2')).toMatchObject({
      kind: 'review',
      cause: 'alternative',
      label: 'Experiencia con React o Vue.',
      sources: ['Experiencia con React o Vue.'],
    });
  });

  it('does not take the integrations of the product for requirements', () => {
    expect(requirement(structuredOffer, 'concept:figma')).toBeUndefined();
    expect(requirement(structuredOffer, 'concept:jira')).toBeUndefined();
  });

  it('traces a requirement only to the sentences that ask for it', () => {
    expect(requirement(structuredOffer, 'concept:docker')?.sources).toEqual([
      'Docker y Kubernetes.',
    ]);
  });

  it('holds a sentence about how the company works for review instead of scoring it', () => {
    expect(requirement(structuredOffer, 'review:1')).toEqual({
      kind: 'review',
      id: 'review:1',
      label: 'Desplegamos todos los servicios con Docker sobre infraestructura propia.',
      importance: 'unclassified',
      sources: ['Desplegamos todos los servicios con Docker sobre infraestructura propia.'],
      cause: 'company-practice',
      heading: null,
    });
  });

  it('ignores culture, benefits and how to apply, headings included', () => {
    const labels = extractOfferRequirements(structuredOffer).map((item) => item.label);
    expect(requirement(structuredOffer, 'concept:python')).toBeUndefined();
    expect(requirement(structuredOffer, 'concept:communication')).toBeUndefined();
    expect(labels).not.toContain('Por qué unirte a Nubaria');
    expect(labels).not.toContain('Cómo aplicar');
    expect(labels).not.toContain('Envía tu CV en PDF y un enlace a tu portfolio.');
  });

  it.each([
    ['Ubicación:\n- Madrid, con Docker en la oficina.'],
    ['Nuestra cultura\n- Compartimos lo que aprendemos sobre AWS.'],
    ['El producto\n- Una aplicación hecha con React.'],
    ['¿Por qué unirte?\n- Formación en Kubernetes.'],
    ['How to apply\n- Send your CV and your Python projects.'],
  ])('ignores a section that is not about the candidate: %j', (section) => {
    expect(summary(`Requisitos\n- Experiencia con Git.\n\n${section}`)).toEqual([
      'concept:git [required]',
    ]);
  });

  it('reads a profile heading as a requirements list without a stated importance', () => {
    expect(summary('Funciones\n- Mantener la web.\n\nTu perfil\n- Experiencia con Vue.')).toEqual([
      'concept:vue [unclassified]',
    ]);
  });
});

describe('unknown headings', () => {
  it('holds the sentences of an unknown section for review instead of scoring them', () => {
    expect(summary(unknownHeadingOffer)).toEqual([
      'concept:react [required]',
      'review:1 [unclassified]',
      'review:2 [unclassified]',
      'concept:aws [preferred]',
    ]);
  });

  it('records the unknown heading of a sentence held for review', () => {
    expect(requirement(unknownHeadingOffer, 'review:1')).toMatchObject({
      label: 'Docker.',
      cause: 'unknown-section',
      heading: 'Lo que te hará destacar',
    });
  });

  it('does not let an unknown heading extend the importance of the previous section', () => {
    expect(requirement(unknownHeadingOffer, 'concept:docker')).toBeUndefined();
    expect(requirement(unknownHeadingOffer, 'concept:kubernetes')).toBeUndefined();
  });

  it('keeps a requirement that states its importance under an unknown heading', () => {
    expect(requirement(unknownHeadingOffer, 'concept:aws')?.importance).toBe('preferred');
  });

  it('leaves out a benefit under an unknown heading', () => {
    expect(requirement(unknownHeadingOffer, 'concept:python')).toBeUndefined();
    expect(extractOfferRequirements(unknownHeadingOffer).map((item) => item.label)).not.toContain(
      'Formación continua en Python.',
    );
  });

  it('keeps topic subheadings inside a requirements list', () => {
    expect(summary(subheadingsOffer)).toEqual([
      'concept:react [required]',
      'concept:typescript [required]',
      'concept:node [required]',
      'language:en:B2 [required]',
    ]);
  });

  it('does not change the reading before the first known heading', () => {
    expect(summary('Lo que te hará destacar\n- Docker.')).toEqual([
      'concept:docker [unclassified]',
    ]);
  });

  it('does not take a short line of a paragraph for a heading', () => {
    const offer =
      'Requisitos\n- Experiencia con React.\nBuen ambiente de equipo\nUsarás Docker a diario.';
    expect(requirement(offer, 'concept:docker')?.importance).toBe('required');
  });
});

describe('offer without headings', () => {
  it('separates the requirements of a single paragraph from the rest of the offer', () => {
    expect(summary(paragraphOffer)).toEqual([
      'concept:react [unclassified]',
      'concept:typescript [unclassified]',
      'concept:docker [preferred]',
      'review:1 [unclassified]',
    ]);
    expect(requirement(paragraphOffer, 'review:1')?.sources).toEqual([
      'Trabajamos con Kubernetes en todos los entornos.',
    ]);
  });

  it('reads a list introduced by a sentence and leaves out the benefits after it', () => {
    expect(summary(listWithoutHeadingsOffer)).toEqual([
      'concept:node [unclassified]',
      'concept:postgresql [unclassified]',
      'language:en:B2 [unclassified]',
    ]);
  });

  it('keeps a sentence about the company when it also asks something of the candidate', () => {
    expect(summary('Somos una startup que busca experiencia con React.')).toEqual([
      'concept:react [unclassified]',
    ]);
  });

  it('keeps a stated importance in a sentence about the company', () => {
    expect(summary('Usamos Docker, así que se valorará experiencia con él.')).toEqual([
      'concept:docker [preferred]',
    ]);
  });
});

describe('sentences held for review in the analysis', () => {
  const cv = `Ana Pérez
ana@example.com

EXPERIENCIA
- Desarrollé con React una aplicación de reservas usada por 2.000 clientes.`;
  const result = analyzeMatch(cv, unknownHeadingOffer);
  const reviewItems = result.requirements.filter((item) => item.requirement.kind === 'review');

  it('leaves them out of the coverage', () => {
    expect(reviewItems.map((item) => [item.status, item.contribution])).toEqual([
      ['not-evaluable', null],
      ['not-evaluable', null],
    ]);
    expect(result.coverage).toMatchObject({
      earned: 2,
      possible: 3,
      evaluated: 2,
      notEvaluated: 2,
    });
  });

  it('explains why each one is not scored', () => {
    expect(reviewItems[0].reason).toContain('«Lo que te hará destacar»');
    const practice = analyzeMatch(cv, paragraphOffer).requirements.find(
      (item) => item.requirement.kind === 'review',
    );
    expect(practice?.reason).toContain('describe cómo trabaja la empresa');
  });

  it('asks the user to review them', () => {
    expect(result.recommendations).toContainEqual({
      kind: 'review-sentences',
      message:
        'JobRadar no sabe si 2 frases de la oferta son requisitos. Revísalas tú: no cuentan en el porcentaje.',
    });
  });
});

describe('offers that the change does not affect', () => {
  it('reads the sample offer of the app exactly as before', () => {
    expect(summary(sampleOffer)).toEqual([
      'concept:react [required]',
      'concept:figma [unclassified]',
      'concept:accessibility [unclassified]',
      'years:3:react [required]',
      'concept:typescript [required]',
      'concept:docker [required]',
      'language:en:B2 [required]',
      'education:bachelor [required]',
      'unrecognized:1 [required]',
      'concept:unit-testing [preferred]',
      'concept:python [ambiguous]',
      'concept:ci-cd [preferred]',
      'concept:kubernetes [preferred]',
    ]);
  });
});
