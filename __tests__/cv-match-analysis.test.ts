import { analyzeMatch } from '@/features/cv-match/domain/analyze-match';
import type { AnalysisResult } from '@/features/cv-match/domain/types';

// All CVs and job offers in this file are fictional.

const sampleCv = `Laura Martín Ruiz
laura.martin@example.com · +34 600 123 456

PERFIL
Desarrolladora frontend con interés en accesibilidad.

EXPERIENCIA PROFESIONAL
Desarrolladora frontend — Empresa Ficticia S.L. (2021 – actualidad)
- Desarrollé una aplicación de reservas con React y TypeScript usada por 20.000 clientes.
- Automaticé los despliegues con GitHub Actions y reduje el tiempo de publicación un 40 %.
- Tecnologías: React, TypeScript, Jest, Git

FORMACIÓN
Grado en Ingeniería Informática — Universidad Ficticia (2015 – 2019)

HABILIDADES
Docker, Kubernetes, Node.js, trabajo en equipo

IDIOMAS
Inglés: C1
Francés: nivel básico`;

const sampleOffer = `Desarrollador/a frontend (oferta ficticia)

Sobre nosotros
Somos una empresa ficticia que trabaja con Docker en toda su plataforma.

Requisitos
- Experiencia con React y TypeScript.
- Conocimientos de Docker.
- Inglés B2 o superior.
- Grado en Ingeniería Informática o similar.
- Capacidad para adaptarse a entornos cambiantes.

Se valorará
- Experiencia con Kubernetes.
- Python.
- Imprescindible: experiencia con AWS.

Ofrecemos
- Teletrabajo y formación en AWS.`;

function assessment(result: AnalysisResult, id: string) {
  const found = result.requirements.find((item) => item.requirement.id === id);
  if (!found) throw new Error(`Requirement ${id} not found`);
  return found;
}

function statusOf(cv: string, offer: string, id: string) {
  return assessment(analyzeMatch(cv, offer), id).status;
}

const cvWith = (experienceLine: string, extra = '') =>
  `Ana Pérez\nana@example.com\n\nEXPERIENCIA\n${experienceLine}\n${extra}`;

describe('analysis of the sample CV and offer', () => {
  const result = analyzeMatch(sampleCv, sampleOffer);

  it('supports a requirement described in a work experience sentence', () => {
    const react = assessment(result, 'concept:react');
    expect(react.status).toBe('supported');
    expect(react.evidence[0]).toMatchObject({
      text: 'Desarrollé una aplicación de reservas con React y TypeScript usada por 20.000 clientes.',
      section: 'experience',
      role: 'support',
    });
    expect(react.evidence[0].signals).toEqual(expect.arrayContaining(['number', 'action-verb']));
  });

  it('does not treat a skills list as evidence of experience', () => {
    const docker = assessment(result, 'concept:docker');
    expect(docker.status).toBe('mentioned');
    expect(docker.evidence).toEqual([
      expect.objectContaining({
        text: 'Docker, Kubernetes, Node.js, trabajo en equipo',
        section: 'skills',
        role: 'mention',
      }),
    ]);
  });

  it('reports requirements that the CV does not mention', () => {
    expect(assessment(result, 'concept:python')).toMatchObject({ status: 'missing', evidence: [] });
  });

  it('supports a language when the declared level reaches the requested one', () => {
    expect(assessment(result, 'language:en:B2').status).toBe('supported');
  });

  it('supports the education level from the education section', () => {
    expect(assessment(result, 'education:bachelor').status).toBe('supported');
  });

  it('marks unrecognized requirement lines as not evaluable', () => {
    const unrecognized = result.requirements.filter((item) => item.status === 'not-evaluable');
    expect(unrecognized.map((item) => item.requirement.label)).toEqual([
      'Capacidad para adaptarse a entornos cambiantes.',
    ]);
  });

  it('keeps every evidence and every source as literal text', () => {
    for (const item of result.requirements) {
      for (const evidence of item.evidence) expect(sampleCv).toContain(evidence.text);
      for (const source of item.requirement.sources) expect(sampleOffer).toContain(source);
    }
  });

  it('computes an explainable coverage that leaves out unevaluable requirements', () => {
    // Required (weight 2): React 1, TypeScript 1, Docker 0.5, English 1, degree 1 -> 9 of 10.
    // Preferred (weight 1): Kubernetes 0.5, Python 0. Ambiguous (weight 1): AWS 0.
    expect(result.coverage).toEqual({
      percentage: 73,
      earned: 9.5,
      possible: 13,
      evaluated: 8,
      notEvaluated: 1,
      counts: { supported: 4, mentioned: 2, missing: 2, 'not-evaluable': 1 },
    });
  });

  it('explains how each requirement contributes to the coverage', () => {
    expect(assessment(result, 'concept:docker').contribution).toEqual({ points: 0.5, weight: 2 });
    expect(assessment(result, 'concept:aws').contribution).toEqual({ points: 0, weight: 1 });
    expect(result.requirements.find((item) => item.status === 'not-evaluable')?.contribution).toBe(
      null,
    );
  });
});

describe('evidence in the CV', () => {
  const offer = 'Requisitos\n- Docker.';

  it('treats a list inside the experience section as a mention', () => {
    expect(
      statusOf(cvWith('- Tecnologías: Docker, AWS, Linux, Git'), offer, 'concept:docker'),
    ).toBe('mentioned');
  });

  it('treats a very short experience line as a mention', () => {
    expect(statusOf(cvWith('- Docker.'), offer, 'concept:docker')).toBe('mentioned');
  });

  it('supports a requirement described in a project', () => {
    const cv =
      'PROYECTOS\n- Monté un entorno de pruebas reproducible con Docker para la universidad.';
    expect(statusOf(cv, offer, 'concept:docker')).toBe('supported');
  });

  it('does not count a negated mention as evidence', () => {
    const result = analyzeMatch(
      cvWith('- Mantuve una tienda online con React.', 'PERFIL\nNo tengo experiencia con Docker.'),
      offer,
    );
    const docker = assessment(result, 'concept:docker');
    expect(docker.status).toBe('missing');
    expect(docker.evidence).toEqual([
      expect.objectContaining({ text: 'No tengo experiencia con Docker.', role: 'negation' }),
    ]);
  });

  it('detects a negation introduced after "pero"', () => {
    const cv = cvWith('- Desarrollé servicios con Node.js, pero no con Docker ni Kubernetes.');
    expect(statusOf(cv, offer, 'concept:docker')).toBe('missing');
  });

  it('does not read "no solo" as a negation', () => {
    const cv = cvWith(
      '- Usé no solo Docker sino también Kubernetes en el despliegue de servicios.',
    );
    expect(statusOf(cv, offer, 'concept:docker')).toBe('supported');
  });

  it('treats contradictory statements with caution', () => {
    const cv = cvWith(
      '- Desplegué microservicios con Docker en producción para tres clientes.',
      'PERFIL\nNo tengo experiencia con Docker.',
    );
    const result = analyzeMatch(cv, offer);
    expect(assessment(result, 'concept:docker').status).toBe('mentioned');
    expect(result.recommendations.map((item) => item.kind)).toContain('contradiction');
  });

  it('treats learning in progress as a mention', () => {
    const cv = cvWith('- Actualmente estoy aprendiendo Docker con un curso en línea.');
    const docker = assessment(analyzeMatch(cv, offer), 'concept:docker');
    expect(docker.status).toBe('mentioned');
    expect(docker.evidence[0].role).toBe('learning');
  });

  it('matches the CV without case or accents', () => {
    const cv = cvWith('- Configuré la integracion continua de cuatro repositorios del equipo.');
    expect(statusOf(cv, 'Requisitos\n- Integración continua.', 'concept:ci-cd')).toBe('supported');
  });
});

describe('languages', () => {
  const offer = 'Requisitos\n- Inglés B2.';

  it('does not give partial credit for a declared level below the requested one', () => {
    const result = analyzeMatch('IDIOMAS\nInglés: B1', offer);
    const english = assessment(result, 'language:en:B2');
    expect(english.status).toBe('missing');
    expect(english.contribution).toEqual({ points: 0, weight: 2 });
    expect(english.reason).toMatch(/B1.*inferior.*B2/);
    expect(english.evidence).toEqual([
      expect.objectContaining({ text: 'Inglés: B1', role: 'mention' }),
    ]);
    const recommendation = result.recommendations.find(
      (item) => item.requirementId === 'language:en:B2',
    );
    expect(recommendation?.kind).toBe('language-level');
    expect(recommendation?.message).not.toMatch(/no aparece/);
  });

  it('marks a language without level as insufficient evidence', () => {
    expect(statusOf('IDIOMAS\nInglés', offer, 'language:en:B2')).toBe('mentioned');
  });

  it('reads "nativo" as the highest level', () => {
    expect(statusOf('IDIOMAS\nInglés nativo', 'Requisitos\n- Inglés C1.', 'language:en:C1')).toBe(
      'supported',
    );
  });

  it('leaves out of the coverage a level that the offer does not express on the CEFR scale', () => {
    const result = analyzeMatch('IDIOMAS\nInglés C1', 'Requisitos\n- Inglés alto.');
    const english = assessment(result, 'language:en');
    expect(english.status).toBe('not-evaluable');
    expect(english.contribution).toBeNull();
    expect(english.evidence[0].text).toBe('Inglés C1');
  });

  it('still reports a language missing from the CV when the offer level is not on the CEFR scale', () => {
    expect(statusOf('IDIOMAS\nFrancés C1', 'Requisitos\n- Inglés alto.', 'language:en')).toBe(
      'missing',
    );
  });

  it('marks a missing language as not found', () => {
    expect(statusOf('IDIOMAS\nFrancés C1', offer, 'language:en:B2')).toBe('missing');
  });

  it('does not count a negated language', () => {
    expect(statusOf('PERFIL\nNo hablo alemán.', 'Requisitos\n- Alemán.', 'language:de')).toBe(
      'missing',
    );
  });
});

describe('education', () => {
  it('does not accept a lower education level', () => {
    const result = analyzeMatch(
      'FORMACIÓN\nGrado en Matemáticas (2014 – 2018)',
      'Requisitos\n- Máster en Ciencia de Datos.',
    );
    const master = assessment(result, 'education:master');
    expect(master.status).toBe('missing');
    expect(master.reason).toMatch(/grado/i);
  });

  it('accepts a higher education level', () => {
    expect(
      statusOf(
        'FORMACIÓN\nMáster en Ingeniería de Software',
        'Requisitos\n- Grado universitario.',
        'education:bachelor',
      ),
    ).toBe('supported');
  });

  it('treats a degree mentioned outside the education section as insufficient evidence', () => {
    expect(
      statusOf(
        'PERFIL\nTengo un grado en Informática.',
        'Requisitos\n- Grado en Informática.',
        'education:bachelor',
      ),
    ).toBe('mentioned');
  });
});

describe('years of experience', () => {
  const offer = 'Requisitos\n- Al menos 3 años de experiencia con React.';

  it('supports an explicit statement that reaches the requested years', () => {
    const cv = 'PERFIL\nTengo 5 años de experiencia con React en comercio electrónico.';
    expect(statusOf(cv, offer, 'years:3:react')).toBe('supported');
  });

  it('does not give partial credit for fewer declared years', () => {
    const cv = 'PERFIL\nTengo 2 años de experiencia con React en proyectos internos.';
    const years = assessment(analyzeMatch(cv, offer), 'years:3:react');
    expect(years.status).toBe('missing');
    expect(years.contribution).toEqual({ points: 0, weight: 2 });
    expect(years.reason).toMatch(/2 años/);
  });

  it('treats an undeclared duration as missing evidence, not as something it cannot read', () => {
    const cv = cvWith('- Desarrollé un panel de administración con React (2019 – 2024).');
    const result = analyzeMatch(cv, offer);
    const years = assessment(result, 'years:3:react');
    expect(years.status).toBe('mentioned');
    expect(years.contribution).toEqual({ points: 0.5, weight: 2 });
    expect(years.reason).toMatch(/no indica cuánto tiempo/);
    expect(result.coverage.notEvaluated).toBe(0);
  });

  it('marks the years as not found when the CV does not mention the technology', () => {
    const cv = cvWith('- Desarrollé un panel de administración con Angular para la intranet.');
    expect(statusOf(cv, offer, 'years:3:react')).toBe('missing');
  });

  it('evaluates general years of experience against the experience section', () => {
    const general = 'Requisitos\n- Experiencia mínima de 2 años.';
    expect(
      statusOf(cvWith('- Atendí la web de una tienda online.'), general, 'years:2:general'),
    ).toBe('mentioned');
    expect(statusOf('PERFIL\nRecién titulada.', general, 'years:2:general')).toBe('missing');
  });
});

describe('theoretical or indirect knowledge', () => {
  const offer = 'Requisitos\n- Docker.\n- Kubernetes.';

  it.each([
    '- He oído hablar de Docker en mi anterior empresa de desarrollo web.',
    '- Conozco Docker de forma teórica gracias a varios cursos en línea.',
    '- Trabajé en un equipo que usaba Docker, aunque sin experiencia práctica propia.',
    '- Tengo nociones básicas de Docker por la documentación del equipo.',
  ])('does not treat "%s" as evidence of experience', (line) => {
    const docker = assessment(analyzeMatch(cvWith(line), offer), 'concept:docker');
    expect(docker.status).toBe('mentioned');
    expect(docker.evidence[0].role).toBe('hedged');
    expect(docker.reason).toMatch(/teórico o indirecto/);
  });

  it('does not let a hedge in one sentence affect another sentence', () => {
    const cv = cvWith(
      '- Desplegué servicios con Docker en producción para tres clientes; conozco Kubernetes de forma teórica.',
    );
    const result = analyzeMatch(cv, offer);
    expect(assessment(result, 'concept:docker').status).toBe('supported');
    expect(assessment(result, 'concept:kubernetes').status).toBe('mentioned');
  });

  it('detects a negation written after the technology', () => {
    expect(statusOf(cvWith('- Docker: sin experiencia.'), offer, 'concept:docker')).toBe('missing');
  });

  it('asks to describe practical use without suggesting to invent it', () => {
    const cv = cvWith('- Conozco Docker de forma teórica gracias a varios cursos en línea.');
    const recommendation = analyzeMatch(cv, offer).recommendations.find(
      (item) => item.requirementId === 'concept:docker',
    );
    expect(recommendation?.kind).toBe('add-evidence');
    expect(recommendation?.message).toMatch(/teórico o indirecto/);
    expect(recommendation?.message).toMatch(/si no, déjalo como está/);
  });
});

// Los términos de cada frase del CV se buscan una vez y los reutilizan todos los requisitos.
describe('one CV sentence read by several requirements', () => {
  const offer = `Requisitos
- React.
- React Native.
- Java.
- JavaScript.
- 3 años de experiencia con React Native.
- Inglés B2.
- Francés B1.`;

  it('is evidence for every requirement it names', () => {
    const sentence =
      'Desarrollé una app con React Native y una web con React y JavaScript para 3.000 clientes.';
    const result = analyzeMatch(cvWith(`- ${sentence}`), offer);
    for (const id of ['concept:react', 'concept:react-native', 'concept:javascript']) {
      expect(assessment(result, id).status).toBe('supported');
      expect(assessment(result, id).evidence.map((item) => item.text)).toEqual([sentence]);
    }
  });

  it('keeps the priority of the longest alias', () => {
    const cv = cvWith('- Desarrollé una app con React Native y JavaScript para 3.000 clientes.');
    const result = analyzeMatch(cv, offer);
    expect(assessment(result, 'concept:react-native').status).toBe('supported');
    expect(assessment(result, 'concept:react').status).toBe('missing');
    expect(assessment(result, 'concept:java').status).toBe('missing');
  });

  it('evaluates negations and years for each term of the sentence', () => {
    const cv = `${cvWith('- Tengo 4 años de experiencia con React Native, pero no con Java.')}
IDIOMAS
Inglés B2 y francés B1`;
    const result = analyzeMatch(cv, offer);
    expect(assessment(result, 'years:3:react-native').status).toBe('supported');
    expect(assessment(result, 'concept:java').status).toBe('missing');
    expect(assessment(result, 'concept:java').evidence[0].role).toBe('negation');
    expect(assessment(result, 'language:en:B2').status).toBe('supported');
    expect(assessment(result, 'language:fr:B1').status).toBe('supported');
  });

  it('gives the same result whatever the order of the requirements', () => {
    const cv = `${cvWith('- Tengo 4 años de experiencia con React Native, pero no con Java.')}
- Desarrollé una web con React y JavaScript para 3.000 clientes.
IDIOMAS
Inglés B2 y francés B1`;
    const [heading, ...lines] = offer.split('\n');
    const reversed = [heading, ...lines.reverse()].join('\n');
    // Invertir la oferta también invierte sus frases de origen; solo se compara lo que sale del CV.
    const byId = (result: AnalysisResult) =>
      Object.fromEntries(
        result.requirements.map(({ requirement, status, reason, evidence, contribution }) => [
          requirement.id,
          { status, reason, evidence, contribution },
        ]),
      );
    expect(byId(analyzeMatch(cv, reversed))).toEqual(byId(analyzeMatch(cv, offer)));
  });
});

describe('worked example of the coverage', () => {
  const cv = `Marta Ruiz (perfil ficticio)
marta.ruiz@example.com · 600 111 222

PERFIL
Desarrolladora web. No tengo experiencia con Kubernetes. Actualmente estoy aprendiendo Python.

EXPERIENCIA
Desarrolladora frontend — Tienda Ficticia (2020 – actualidad)
- Desarrollé el catálogo de la tienda online con React y TypeScript.
- Configuré la integración continua con GitHub Actions para tres repositorios.
- Tecnologías: Docker, Node.js, Git

FORMACIÓN
Técnico Superior en Desarrollo de Aplicaciones Web (2018 – 2020)

HABILIDADES
Docker, Figma, trabajo en equipo

IDIOMAS
Inglés: B1`;

  const offer = `Desarrollador/a web (oferta ficticia)

Requisitos imprescindibles:
- Al menos 3 años de experiencia con React.
- TypeScript y Docker.
- Inglés B2.
- Grado en Ingeniería Informática o similar.
- Buena actitud y ganas de crecer.

Se valorará
- Kubernetes.
- Python (imprescindible para el equipo de datos).
- Experiencia con CI/CD.

Ofrecemos
- Formación en AWS.`;

  it('adds up every evaluated requirement with its weight', () => {
    const result = analyzeMatch(cv, offer);
    const rows = result.requirements.map((item) => [
      item.requirement.id,
      item.requirement.importance,
      item.status,
      item.contribution,
    ]);
    expect(rows).toEqual([
      ['concept:react', 'required', 'supported', { points: 1, weight: 2 }],
      ['years:3:react', 'required', 'mentioned', { points: 0.5, weight: 2 }],
      ['concept:typescript', 'required', 'supported', { points: 1, weight: 2 }],
      ['concept:docker', 'required', 'mentioned', { points: 0.5, weight: 2 }],
      ['language:en:B2', 'required', 'missing', { points: 0, weight: 2 }],
      ['education:bachelor', 'required', 'missing', { points: 0, weight: 2 }],
      ['unrecognized:1', 'required', 'not-evaluable', null],
      ['concept:kubernetes', 'preferred', 'missing', { points: 0, weight: 1 }],
      ['concept:python', 'ambiguous', 'mentioned', { points: 0.5, weight: 1 }],
      ['concept:ci-cd', 'preferred', 'supported', { points: 1, weight: 1 }],
    ]);
    // Earned: 2 + 1 + 2 + 1 + 0 + 0 + 0 + 0.5 + 1 = 7.5. Possible: 6 × 2 + 3 × 1 = 15.
    expect(result.coverage).toEqual({
      percentage: 50,
      earned: 7.5,
      possible: 15,
      evaluated: 9,
      notEvaluated: 1,
      counts: { supported: 3, mentioned: 3, missing: 3, 'not-evaluable': 1 },
    });
  });
});

describe('coverage', () => {
  it('has no percentage when no requirement can be evaluated', () => {
    const result = analyzeMatch(sampleCv, 'Requisitos\n- Ganas de aprender y buena actitud.');
    expect(result.coverage).toMatchObject({ percentage: null, evaluated: 0, notEvaluated: 1 });
  });

  it('returns an empty analysis for empty texts', () => {
    const result = analyzeMatch('', '');
    expect(result.requirements).toEqual([]);
    expect(result.coverage.percentage).toBeNull();
  });
});

describe('recommendations', () => {
  const result = analyzeMatch(sampleCv, sampleOffer);

  it('does not recommend anything for supported requirements', () => {
    const supported = result.requirements
      .filter((item) => item.status === 'supported')
      .map((item) => item.requirement.id);
    for (const recommendation of result.recommendations) {
      expect(supported).not.toContain(recommendation.requirementId);
    }
  });

  it('phrases missing requirements as conditional advice', () => {
    const python = result.recommendations.find((item) => item.requirementId === 'concept:python');
    expect(python?.kind).toBe('missing');
    expect(python?.message).toMatch(/Si lo has usado/);
    expect(python?.message).toMatch(/no lo añadas/);
  });

  it('asks for evidence of requirements that are only mentioned', () => {
    const docker = result.recommendations.find((item) => item.requirementId === 'concept:docker');
    expect(docker?.kind).toBe('add-evidence');
  });

  it('lists required requirements first', () => {
    expect(result.recommendations[0].requirementId).toBe('concept:docker');
  });

  it('asks the user to review requirements that could not be evaluated', () => {
    expect(result.recommendations).toContainEqual(
      expect.objectContaining({ kind: 'review-unrecognized' }),
    );
  });

  it('advises against adding a skill that the CV denies', () => {
    const cv = cvWith(
      '- Mantuve una tienda online con React.',
      'PERFIL\nNo tengo experiencia con Docker.',
    );
    const negated = analyzeMatch(cv, 'Requisitos\n- Docker.').recommendations[0];
    expect(negated.kind).toBe('negated');
    expect(negated.message).toMatch(/No lo añadas/);
  });

  it('never copies CV sentences into the recommendations', () => {
    const cvSentences = sampleCv.split('\n').filter((line) => line.split(' ').length >= 4);
    for (const recommendation of result.recommendations) {
      for (const sentence of cvSentences) expect(recommendation.message).not.toContain(sentence);
    }
  });

  it('checks the contact details and the main sections', () => {
    const kinds = analyzeMatch('Docker y React', 'Requisitos\n- Docker.').recommendations.map(
      (item) => item.kind,
    );
    expect(kinds).toEqual(expect.arrayContaining(['contact', 'section']));
  });

  it('suggests measurable results only when the experience has no figures besides dates', () => {
    const withoutFigures = cvWith('- Desarrollé la web corporativa con React (2019 – 2021).');
    const withFigures = cvWith('- Reduje un 30 % el tiempo de carga de la web con React.');
    const kindsOf = (cv: string) =>
      analyzeMatch(cv, 'Requisitos\n- React.').recommendations.map((item) => item.kind);
    expect(kindsOf(withoutFigures)).toContain('measurable-results');
    expect(kindsOf(withFigures)).not.toContain('measurable-results');
  });

  it('reports the structural checks of the CV', () => {
    expect(result.cvChecks).toEqual({
      hasEmail: true,
      hasPhone: true,
      sections: ['header', 'profile', 'experience', 'education', 'skills', 'languages'],
      experienceHasFigures: true,
    });
  });
});

describe('long texts', () => {
  it('analyzes long offers and CVs completely, without truncating them', () => {
    const offer =
      'Funciones\n' +
      '- Colaborarás con el equipo de producto en la mejora de la plataforma.\n'.repeat(900) +
      '\nRequisitos\n- Experiencia con Python.';
    const cv =
      'EXPERIENCIA\n' +
      '- Participé en reuniones semanales de planificación con el equipo.\n'.repeat(900) +
      '- Desarrollé scripts de análisis de datos con Python para el equipo de ventas.';
    expect(offer.length).toBeGreaterThan(50_000);
    expect(cv.length).toBeGreaterThan(50_000);

    const python = assessment(analyzeMatch(cv, offer), 'concept:python');
    expect(python.status).toBe('supported');
    expect(python.evidence[0].text).toBe(
      'Desarrollé scripts de análisis de datos con Python para el equipo de ventas.',
    );
  });
});
