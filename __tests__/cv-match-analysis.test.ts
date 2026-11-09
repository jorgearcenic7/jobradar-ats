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

describe('alternative and partial technical requirements', () => {
  const cv =
    'EXPERIENCIA\nDesarrollé servicios con Docker y consultas con SQL para una empresa ficticia.';

  it.each([
    'Experiencia con Docker o Kubernetes; basta con uno.',
    'Experiencia con Docker o Kubernetes.',
    'Experiencia con SQL o Databricks.',
  ])(
    'retains an alternative group for review without penalizing the other option: %s',
    (sentence) => {
      const result = analyzeMatch(cv, `Requisitos\n- ${sentence}`);
      expect(result.requirements).toHaveLength(1);
      expect(result.requirements[0]).toMatchObject({
        requirement: { kind: 'review', cause: 'alternative', label: sentence, sources: [sentence] },
        status: 'not-evaluable',
        contribution: null,
        evidence: [],
      });
      expect(result.requirements[0].reason).toMatch(/alternativas/);
      expect(result.coverage).toMatchObject({
        evaluated: 0,
        notEvaluated: 1,
        possible: 0,
        percentage: null,
      });
    },
  );

  it('keeps a conjunction as two independent requirements', () => {
    const result = analyzeMatch(cv, 'Requisitos\n- Experiencia con Docker y Kubernetes.');
    expect(result.requirements.map((i) => [i.requirement.id, i.status])).toEqual([
      ['concept:docker', 'supported'],
      ['concept:kubernetes', 'missing'],
    ]);
    expect(result.coverage).toMatchObject({ evaluated: 2, notEvaluated: 0, percentage: 50 });
  });

  it.each([
    'Experiencia con SQL y Databricks.',
    'Experiencia con Databricks y SQL.',
    'Experiencia con SQL, Python y Databricks.',
    'Experiencia con SQL y Databricks y Databricks.',
  ])('preserves the known requirements and isolates the unknown item: %s', (sentence) => {
    const result = analyzeMatch(cv, `Requisitos\n- ${sentence}`);
    const sql = assessment(result, 'concept:sql');
    expect(sql).toMatchObject({
      status: 'supported',
      requirement: { sources: [sentence] },
      contribution: { points: 1, weight: 2 },
    });
    expect(sql.evidence[0].text).toBe(cv.split('\n')[1]);
    const reviews = result.requirements.filter((i) => i.requirement.kind === 'review');
    expect(reviews).toHaveLength(1);
    expect(reviews[0]).toMatchObject({
      requirement: { label: 'Databricks', cause: 'partial-recognition', sources: [sentence] },
      status: 'not-evaluable',
      contribution: null,
    });
    expect(reviews[0].reason).toMatch(/no reconoce/);
    expect(result.requirements.filter((i) => i.requirement.id === 'concept:sql')).toHaveLength(1);
    expect(result.coverage).toMatchObject({
      evaluated: sentence.includes('Python') ? 2 : 1,
      notEvaluated: 1,
      percentage: sentence.includes('Python') ? 50 : 100,
    });
  });

  it.each([
    ['Usamos SQL y Databricks en el producto.', 0, 1],
    ['Funciones\n- Mantener servicios con SQL y Databricks.', 1, 0],
    ['Sobre nosotros\n- Usamos SQL y Databricks.', 0, 0],
    ['Requisitos\n- SQL y ganas de aprender.', 1, 0],
  ])(
    'does not invent partial requirements from unsafe or contextual text: %s',
    (offer, evaluated, notEvaluated) => {
      const result = analyzeMatch(cv, offer);
      expect(result.coverage).toMatchObject({ evaluated, notEvaluated });
      expect(
        result.requirements.some(
          (i) => i.requirement.kind === 'review' && i.requirement.cause === 'partial-recognition',
        ),
      ).toBe(false);
    },
  );
});

describe('offer demand scope', () => {
  it.each([
    'No se requiere Docker.',
    'Docker no es obligatorio.',
    'No es necesario tener experiencia con Docker.',
  ])('does not penalize an explicitly unnecessary skill: %s', (sentence) => {
    const result = analyzeMatch('HABILIDADES\nSQL.', `Requisitos\n- ${sentence}`);
    expect(result.coverage).toMatchObject({
      evaluated: 0,
      notEvaluated: 1,
      possible: 0,
      percentage: null,
    });
    expect(result.requirements[0]).toMatchObject({
      status: 'not-evaluable',
      contribution: null,
      evidence: [],
      requirement: { kind: 'review', cause: 'requirement-wording', sources: [sentence] },
    });
    expect(result.requirements[0].reason).toMatch(/niega.*exigencia/);
  });

  it('keeps an elliptical preference for the same skill evaluable and preferred', () => {
    const sentence = 'No se requiere Docker, pero se valorará.';
    const result = analyzeMatch('HABILIDADES\nSQL.', `Requisitos\n- ${sentence}`);
    expect(result.requirements).toHaveLength(1);
    expect(result.requirements[0]).toMatchObject({
      status: 'missing',
      requirement: { id: 'concept:docker', importance: 'preferred', sources: [sentence] },
    });
    expect(result.coverage).toMatchObject({
      evaluated: 1,
      notEvaluated: 0,
      possible: 1,
      percentage: 0,
    });
  });

  it('keeps an explicit positive contrast required without transferring the negation', () => {
    const sentence = 'No se requiere Docker, pero sí Kubernetes.';
    const cv = 'EXPERIENCIA\nAdministré Kubernetes en una empresa ficticia durante un proyecto.';
    const result = analyzeMatch(cv, `Requisitos\n- ${sentence}`);
    const kubernetes = assessment(result, 'concept:kubernetes');
    expect(kubernetes).toMatchObject({
      status: 'supported',
      requirement: { importance: 'required', sources: [sentence] },
    });
    expect(kubernetes.evidence[0].text).toBe(cv.split('\n')[1]);
    expect(result.requirements.find((i) => i.requirement.id === 'concept:docker')).toBeUndefined();
    expect(result.coverage).toMatchObject({
      evaluated: 1,
      notEvaluated: 1,
      earned: 2,
      possible: 2,
      percentage: 100,
    });
  });

  it('keeps CV negations negative and calculates coverage using the two explicit clause weights', () => {
    const cv =
      'EXPERIENCIA\nDesarrollé consultas con SQL para una empresa ficticia.\nNo tengo experiencia con Docker.';
    const result = analyzeMatch(cv, 'Requisitos\n- Imprescindible SQL y valorable Docker.');
    expect(assessment(result, 'concept:sql').requirement.importance).toBe('required');
    expect(assessment(result, 'concept:sql').contribution).toEqual({ points: 1, weight: 2 });
    const docker = assessment(result, 'concept:docker');
    expect(docker).toMatchObject({ status: 'missing', requirement: { importance: 'preferred' } });
    expect(docker.contribution).toEqual({ points: 0, weight: 1 });
    expect(docker.evidence[0]).toMatchObject({
      text: 'No tengo experiencia con Docker.',
      role: 'negation',
    });
    expect(result.coverage).toMatchObject({ earned: 2, possible: 3, percentage: 67 });
  });

  it('keeps contextual mentions for review and a shared explicit requirement intact', () => {
    const result = analyzeMatch(
      'HABILIDADES\nSQL, Python.',
      'Usamos Docker para el producto.\nPerfil\n- Imprescindible SQL y Python.',
    );
    expect(
      result.requirements.map((i) => [i.requirement.kind, i.requirement.importance, i.status]),
    ).toEqual([
      ['review', 'unclassified', 'not-evaluable'],
      ['concept', 'required', 'mentioned'],
      ['concept', 'required', 'mentioned'],
    ]);
    expect(result.coverage).toMatchObject({ evaluated: 2, notEvaluated: 1, percentage: 50 });
  });
});

describe('abbreviated minimum experience', () => {
  it.each([
    [
      'Tengo experiencia de 2 años con React.',
      'Experiencia mín. de 3 años con React.',
      'missing',
      50,
    ],
    [
      'Tengo experiencia mín. de 4 años con React.',
      '3 años de experiencia con React.',
      'supported',
      100,
    ],
  ])('evaluates the literal years in CV %j against %j', (cv, offer, status, percentage) => {
    const result = analyzeMatch(`EXPERIENCIA\n${cv}`, `Requisitos\n- ${offer}`);
    const years = assessment(result, 'years:3:react');
    expect(years.status).toBe(status);
    expect(years.evidence.map((item) => item.text)).toEqual([cv]);
    expect(result.coverage).toMatchObject({ evaluated: 2, notEvaluated: 0, percentage });
  });
});

describe('languages', () => {
  it.each([
    ['Inglés C1 y francés B1.', 'B1'],
    ['C1 de inglés y B1 de francés.', 'B1'],
    ['Inglés nativo y francés básico.', null],
  ])('never credits French B2 using the English level in %s', (sentence, frenchLevel) => {
    const result = analyzeMatch(`IDIOMAS\n${sentence}`, 'Requisitos\n- Francés B2.');
    const french = assessment(result, 'language:fr:B2');
    expect(french.status).toBe(frenchLevel ? 'missing' : 'mentioned');
    expect(french.evidence.map((item) => item.text)).toEqual([sentence]);
    expect(french.reason).toContain(frenchLevel ? 'nivel B1' : 'sin indicar el nivel');
    expect(result.coverage).toMatchObject({ percentage: frenchLevel ? 0 : 50, possible: 2 });
  });

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

// Una duración negada no prueba que se cumpla el requisito, pero tampoco cuántos años se tienen.
describe('negated years of experience', () => {
  const offer = `Requisitos
- Mínimo 3 años de experiencia con React.
- Mínimo 3 años de experiencia con Python.`;
  const yearsOf = (experienceLine: string, id = 'years:3:react') =>
    assessment(analyzeMatch(cvWith(experienceLine), offer), id);

  it.each([
    '- No tengo 5 años de experiencia con React.',
    '- Nunca he trabajado 5 años con React.',
  ])('does not take "%s" as evidence of the duration', (line) => {
    const years = yearsOf(line);
    expect(years.status).toBe('missing');
    expect(years.contribution).toEqual({ points: 0, weight: 2 });
    expect(years.evidence.map((item) => item.role)).toEqual(['negation']);
    // Negar una cifra no es negar toda experiencia: el motivo no lo afirma.
    expect(years.reason).toBe(
      'El CV dice que no tienes 5 años de experiencia con React, pero no indica cuántos tienes, así que no acredita los 3 años que pide la oferta.',
    );
  });

  it('still supports a duration stated without negation', () => {
    expect(yearsOf('- Tengo 5 años de experiencia con React en comercio electrónico.').status).toBe(
      'supported',
    );
  });

  it('does not read "no solo" as a negation of the duration', () => {
    const years = yearsOf('- No solo tengo 5 años de experiencia con React, también con Vue.');
    expect(years.status).toBe('supported');
    expect(years.reason).toMatch(/declara 5 años/);
  });

  it('evaluates each technology with the duration of its own clause', () => {
    const line = '- No tengo 5 años con React, pero sí 6 años con Python.';
    expect(yearsOf(line).status).toBe('missing');
    const python = yearsOf(line, 'years:3:python');
    expect(python.status).toBe('supported');
    expect(python.reason).toMatch(/declara 6 años/);
  });

  it('does not lend a negated duration to the other clause when its number has no unit', () => {
    // «sí 6» sin «años» no se reconoce como duración: Python queda sin una duración declarada.
    const line = '- No tengo 5 años con React, pero sí 6 con Python.';
    expect(yearsOf(line).status).toBe('missing');
    expect(yearsOf(line, 'years:3:python').status).toBe('mentioned');
  });

  it('does not lend the duration of one technology to another one the CV denies', () => {
    const line = '- Tengo 4 años de experiencia con Python, pero no con React.';
    expect(yearsOf(line, 'years:3:python').status).toBe('supported');
    expect(yearsOf(line).status).not.toBe('supported');
  });

  it('supports the requirement with a positive statement in another sentence', () => {
    const years = yearsOf(
      '- No tengo 5 años de experiencia con React.\n- Tengo 4 años de experiencia con React en comercio electrónico.',
    );
    expect(years.status).toBe('supported');
    expect(years.reason).toMatch(/declara 4 años/);
  });

  it('keeps the earlier readings of statements without negation', () => {
    expect(yearsOf('- Tengo 5 años de experiencia, sobre todo con React y Python.').status).toBe(
      'supported',
    );
    expect(yearsOf('- Tengo 2 años de experiencia con React.').status).toBe('missing');
    expect(yearsOf('- Desarrollé un panel con React para 3 clientes.').status).toBe('mentioned');
  });

  it('does not take a negated general duration as evidence', () => {
    const general = 'Requisitos\n- Experiencia mínima de 2 años.';
    const cv = 'PERFIL\nNo tengo 5 años de experiencia, pero sí formación en desarrollo web.';
    const years = assessment(analyzeMatch(cv, general), 'years:2:general');
    expect(years.status).toBe('missing');
    expect(years.reason).toBe(
      'El CV dice que no tienes 5 años de experiencia, pero no indica cuántos tienes, así que no acredita los 2 años que pide la oferta.',
    );
  });

  // Tres situaciones distintas, con tres explicaciones distintas.
  it('tells a denied duration apart from a denied technology and from a missing duration', () => {
    expect(yearsOf('- No tengo 5 años de experiencia con React.').reason).toBe(
      'El CV dice que no tienes 5 años de experiencia con React, pero no indica cuántos tienes, así que no acredita los 3 años que pide la oferta.',
    );

    const deniedTechnology = yearsOf('- Tengo 5 años de experiencia con Python y no con React.');
    expect(deniedTechnology.status).toBe('missing');
    expect(deniedTechnology.evidence.map((item) => item.role)).toEqual(['negation']);
    expect(deniedTechnology.reason).toBe(
      'El CV solo menciona React en frases que lo niegan, así que no acredita los 3 años que pide la oferta.',
    );

    const noDuration = yearsOf('- Desarrollé un panel con React para 3 clientes.');
    expect(noDuration.status).toBe('mentioned');
    expect(noDuration.reason).toBe(
      'El CV menciona React, pero no indica cuánto tiempo lo has usado. Las fechas solo acreditan experiencia general cuando los periodos laborales son reconocibles; no se atribuyen a tecnologías o puestos por proximidad.',
    );
  });
});

// Negar una duración no es negar la tecnología, ni tampoco acreditarla.
describe('technology mentioned next to a denied duration', () => {
  const offer = 'Requisitos\n- React.\n- Python.\n- Mínimo 3 años de experiencia con React.';
  const resultOf = (experienceLine: string) => analyzeMatch(cvWith(experienceLine), offer);
  const recommendationFor = (result: AnalysisResult, id: string) =>
    result.recommendations.find((item) => item.requirementId === id);

  it.each([
    '- No tengo 5 años de experiencia con React.',
    '- Nunca he trabajado 5 años con React.',
    '- No tengo 5 años con React; tengo 3.',
  ])('does not read "%s" as having no experience with React', (line) => {
    const result = resultOf(line);
    const react = assessment(result, 'concept:react');
    expect(react.status).toBe('mentioned');
    expect(react.contribution).toEqual({ points: 0.5, weight: 2 });
    expect(react.evidence.map((item) => item.role)).toEqual(['mention']);
    expect(react.reason).toBe(
      'React aparece en la experiencia, pero sin una frase que describa dónde lo usaste.',
    );
    expect(recommendationFor(result, 'concept:react')?.message).toBe(
      '«React» aparece en tu CV sin un ejemplo de uso. Si lo has usado en un puesto o proyecto, describe allí qué hiciste con ello.',
    );
    // La duración negada sigue sin acreditar los años.
    expect(assessment(result, 'years:3:react').status).toBe('missing');
  });

  it('keeps an explicit denial of any experience', () => {
    const result = resultOf('- No tengo experiencia con React.');
    const react = assessment(result, 'concept:react');
    expect(react.status).toBe('missing');
    expect(react.reason).toBe('El CV indica que no tienes experiencia con React.');
    expect(recommendationFor(result, 'concept:react')?.kind).toBe('negated');
  });

  it('keeps positive evidence of use with fewer years than requested', () => {
    const result = resultOf('- Tengo 2 años desarrollando aplicaciones con React.');
    expect(assessment(result, 'concept:react').status).toBe('supported');
    expect(assessment(result, 'years:3:react').status).toBe('missing');
  });

  it('keeps the positive evidence of another clause without inventing a duration', () => {
    const result = resultOf(
      '- No tengo 5 años con React, pero he desarrollado aplicaciones con React.',
    );
    expect(assessment(result, 'concept:react').status).toBe('supported');
    expect(assessment(result, 'years:3:react').status).toBe('missing');
  });

  it('still reads "no solo" as an affirmation', () => {
    const result = resultOf('- No solo tengo 5 años con React, también he trabajado con Vue.');
    expect(assessment(result, 'concept:react').status).toBe('supported');
    expect(assessment(result, 'years:3:react').status).toBe('supported');
  });

  it('applies a denial of experience only to the technology it names', () => {
    const result = resultOf('- No tengo experiencia con React, pero sí con Python.');
    expect(assessment(result, 'concept:react').status).toBe('missing');
    expect(assessment(result, 'concept:python').status).toBe('supported');
  });

  it.each([
    '- No tengo 5 años de experiencia y no uso React.',
    '- No he usado React durante 5 años.',
    '- React: sin experiencia, no tengo 5 años.',
  ])('still reads "%s" as a denial of React', (line) => {
    expect(assessment(resultOf(line), 'concept:react').status).toBe('missing');
  });
});

// Cada cifra de años cuenta solo para las tecnologías de su propio tramo de la frase.
describe('years attributed to each clause', () => {
  const offer = `Requisitos
- Mínimo 5 años de experiencia con React.
- Mínimo 5 años de experiencia con Python.`;
  const statusFor = (experienceLine: string, id: string) =>
    assessment(analyzeMatch(cvWith(experienceLine), offer), id).status;

  it.each([
    ['- Tengo 8 años de experiencia profesional, pero solo 2 años con Python.', 'years:5:python'],
    ['- Tengo 8 años de experiencia profesional, aunque solo 2 años con React.', 'years:5:react'],
  ])('does not lend general years to a technology: "%s"', (line, id) => {
    const years = assessment(analyzeMatch(cvWith(line), offer), id);
    expect(years.status).toBe('missing');
    expect(years.reason).toMatch(/declara 2 años/);
  });

  it('gives each technology the years of its own clause', () => {
    const line = '- Tengo 6 años con React, pero solo 2 años con Python.';
    expect(statusFor(line, 'years:5:react')).toBe('supported');
    expect(statusFor(line, 'years:5:python')).toBe('missing');
  });

  it('keeps an explicit statement in another sentence', () => {
    const lines =
      '- Tengo 8 años de experiencia profesional. Durante 6 años he trabajado con Python.';
    expect(statusFor(lines, 'years:5:python')).toBe('supported');
  });

  it('does not say a technology is absent when the CV only mentions it to deny it', () => {
    const years = assessment(
      analyzeMatch(cvWith('- Tengo 4 años de experiencia con Python, pero no con React.'), offer),
      'years:5:react',
    );
    expect(years.status).toBe('missing');
    expect(years.reason).toBe(
      'El CV solo menciona React en frases que lo niegan, así que no acredita los 5 años que pide la oferta.',
    );
    expect(years.evidence.map((item) => item.role)).toEqual(['negation']);
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
