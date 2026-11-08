import { extractOfferRequirements } from '@/features/cv-match/domain/offer-requirements';
import { skillCatalog, type SkillConcept } from '@/features/cv-match/domain/skill-catalog';

// All job offers in this file are fictional.

function requirementsOf(offer: string, catalog: readonly SkillConcept[] = skillCatalog) {
  return extractOfferRequirements(offer, catalog);
}

function requirement(offer: string, id: string) {
  return requirementsOf(offer).find((item) => item.id === id);
}

describe('offer requirement importance', () => {
  it('treats concepts under a requirements heading as required', () => {
    expect(requirement('Requisitos\n- Experiencia con React.', 'concept:react')?.importance).toBe(
      'required',
    );
  });

  it('treats a "desirable requirements" heading as preferred', () => {
    expect(requirement('Requisitos deseables:\n- Docker', 'concept:docker')?.importance).toBe(
      'preferred',
    );
  });

  it('does not let "imprescindible" inside a "Se valorará" section make a requirement required', () => {
    const offer = 'Se valorará\n- Imprescindible: experiencia con AWS.';
    expect(requirement(offer, 'concept:aws')?.importance).toBe('ambiguous');
  });

  it('marks "valorable" inside a requirements section as ambiguous', () => {
    const offer = 'Requisitos\n- Docker (valorable).';
    expect(requirement(offer, 'concept:docker')?.importance).toBe('ambiguous');
  });

  it('uses a line marker when the section does not classify the line', () => {
    const offer = 'Funciones\n- Imprescindible manejar Docker a diario.';
    expect(requirement(offer, 'concept:docker')?.importance).toBe('required');
  });

  it('reads "no es imprescindible, pero se valorará" as preferred', () => {
    const offer = 'No es imprescindible, pero se valorará experiencia con Docker.';
    expect(requirement(offer, 'concept:docker')?.importance).toBe('preferred');
  });

  it('retains a negated demand for review instead of scoring it as a requirement', () => {
    const offer = 'Requisitos\n- No es necesario saber Java.';
    expect(requirement(offer, 'concept:java')).toBeUndefined();
    expect(requirement(offer, 'review:1')).toMatchObject({
      kind: 'review',
      cause: 'requirement-wording',
      sources: ['No es necesario saber Java.'],
    });
  });

  it.each(['Perfil', 'Requisitos'])(
    'reads explicit importance per clause under %s without changing the literal source',
    (heading) => {
      const sentence = 'Imprescindible SQL y valorable Docker.';
      const result = requirementsOf(`${heading}\n- ${sentence}`);
      expect(result.map((item) => [item.id, item.importance])).toEqual([
        ['concept:sql', 'required'],
        ['concept:docker', 'preferred'],
      ]);
      expect(result.every((item) => item.sources[0] === sentence)).toBe(true);
    },
  );

  it.each([
    'Imprescindible y valorable Docker.',
    'No se requiere Docker, pero Kubernetes.',
    'Imprescindible Docker y valorable Docker.',
    'No se requiere Docker, pero sí Docker.',
    'Imprescindible SQL y valorable Docker, pero no Git.',
  ])('does not invent a score when the demand cannot be assigned safely: %s', (sentence) => {
    const result = requirementsOf(`Requisitos\n- ${sentence}`);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      kind: 'review',
      cause: 'requirement-wording',
      sources: [sentence],
    });
  });

  it('marks a concept required in one section and desirable in another as ambiguous', () => {
    const offer = 'Requisitos\n- Docker.\n\nSe valorará\n- Experiencia con Docker en producción.';
    const docker = requirement(offer, 'concept:docker');
    expect(docker?.importance).toBe('ambiguous');
    expect(docker?.sources).toEqual(['Docker.', 'Experiencia con Docker en producción.']);
  });

  it('keeps a requirement required when the job description also mentions it', () => {
    const offer = 'Funciones\n- Mantener servicios en Docker.\n\nRequisitos\n- Docker.';
    expect(requirement(offer, 'concept:docker')?.importance).toBe('required');
  });

  it('leaves concepts outside any heading unclassified', () => {
    expect(requirement('Buscamos a alguien con Python.', 'concept:python')?.importance).toBe(
      'unclassified',
    );
  });

  it('ignores company and benefits sections', () => {
    const offer =
      'Sobre nosotros\nUsamos Docker en todos los equipos.\n\nOfrecemos\n- Formación en AWS.';
    expect(requirementsOf(offer)).toEqual([]);
  });

  it('does not treat a short line with a concept as a heading', () => {
    const offer = 'Experiencia valorable en Docker\nOtra línea';
    expect(requirement(offer, 'concept:docker')?.importance).toBe('preferred');
  });
});

describe('offer requirement extraction', () => {
  it.each([
    ['Requisitos', 'Dominio de la herramienta Lince.', 'unrecognized'],
    ['Requisitos\n- React.\nTu próximo reto:', 'Docker.', 'review'],
    ['', 'Usamos React para las aplicaciones.', 'review'],
  ])(
    'deduplicates repeated unscored sentences under %j and retains literal sources',
    (heading, sentence, kind) => {
      const variant = sentence.toUpperCase().replace(/ /g, '  ').replace(/\.$/, '');
      const result = requirementsOf(`${heading}\n- ${sentence}\n- ${sentence}\n- ${variant}`);
      const items = result.filter((item) => item.kind === kind);
      expect(items).toHaveLength(1);
      expect(items[0].sources).toEqual([sentence, variant]);
      expect(items[0].label).toBe(sentence);
    },
  );

  it('does not turn a required clause under a preferred heading into a scored obligation', () => {
    const sentence = 'Imprescindible SQL y valorable Docker.';
    const result = requirementsOf(`Se valorará\n- ${sentence}`);
    expect(result.map((item) => [item.kind, item.importance])).toEqual([
      ['review', 'ambiguous'],
      ['concept', 'preferred'],
    ]);
    expect(result[0]).toMatchObject({
      cause: 'requirement-wording',
      label: 'Imprescindible SQL',
      sources: [sentence],
    });
  });

  it('keeps different unknown meanings, importance and review headings separate', () => {
    const result = requirementsOf(`Requisitos
- Dominio de Lince.
- Conocimientos de Lince.
Se valorará
- Dominio de Lince.
Tu próximo reto:
- Docker.
Nuestro entorno futuro:
- Docker.`);
    expect(result.map((item) => [item.kind, item.importance])).toEqual([
      ['unrecognized', 'required'],
      ['unrecognized', 'required'],
      ['unrecognized', 'preferred'],
      ['review', 'unclassified'],
      ['review', 'unclassified'],
    ]);
    expect(result.filter((item) => item.kind === 'review').map((item) => item.heading)).toEqual([
      'Tu próximo reto',
      'Nuestro entorno futuro',
    ]);
  });

  it('keeps a minimum-years abbreviation in the requirement and preserves its source', () => {
    const sentence = 'Experiencia mín. de 3 años con React.';
    const result = requirementsOf(`Requisitos\n- ${sentence}`);
    expect(result.map((item) => item.id)).toEqual(['concept:react', 'years:3:react']);
    expect(result.every((item) => item.sources[0] === sentence)).toBe(true);
  });

  it('still separates independent sentences rather than borrowing experience from another one', () => {
    const result = requirementsOf(
      'Requisitos\n- Experiencia con React. 3 años en una empresa ficticia.',
    );
    expect(result.map((item) => item.id)).toEqual(['concept:react', 'unrecognized:1']);
    expect(result[0].sources).toEqual(['Experiencia con React.']);
  });

  it.each(['Inglés C1 y francés B1.', 'C1 de inglés y B1 de francés.'])(
    'assigns each explicit coordinated language level to its own language: %s',
    (sentence) => {
      const result = requirementsOf(`Requisitos\n- ${sentence}`);
      expect(result.map((item) => item.id)).toEqual(['language:en:C1', 'language:fr:B1']);
      expect(result.every((item) => item.sources[0] === sentence)).toBe(true);
    },
  );

  it.each([
    ['Inglés y francés B2.', ['language:en:B2', 'language:fr:B2']],
    ['Inglés oral y escrito B2.', ['language:en:B2']],
  ])('does not split a shared level or skills within one language: %s', (sentence, ids) => {
    expect(requirementsOf(`Requisitos\n- ${sentence}`).map((item) => item.id)).toEqual(ids);
  });

  it('keeps the original sentence of the offer as the source', () => {
    const offer = 'Requisitos\n- Experiencia con React y TypeScript.\n- Otra cosa.';
    const react = requirement(offer, 'concept:react');
    expect(react?.sources).toEqual(['Experiencia con React y TypeScript.']);
    expect(offer).toContain(react?.sources[0]);
  });

  it('reports unrecognized lines of requirement sections without guessing their meaning', () => {
    const offer = 'Requisitos\n- Capacidad para adaptarse a entornos cambiantes.';
    expect(requirementsOf(offer)).toEqual([
      expect.objectContaining({
        kind: 'unrecognized',
        label: 'Capacidad para adaptarse a entornos cambiantes.',
        importance: 'required',
      }),
    ]);
  });

  it('does not report unrecognized lines of description sections', () => {
    expect(requirementsOf('Funciones\n- Trabajarás con un equipo de cinco personas.')).toEqual([]);
  });

  it('detects languages with a CEFR level', () => {
    expect(requirement('Requisitos\n- Inglés B2 o superior.', 'language:en:B2')).toMatchObject({
      kind: 'language',
      languageId: 'en',
      level: 'B2',
      importance: 'required',
    });
  });

  it('keeps a language level that is not on the CEFR scale as text', () => {
    expect(requirement('Requisitos\n- Nivel alto de inglés.', 'language:en')).toMatchObject({
      level: null,
      levelText: 'alto',
    });
  });

  it('detects the education level', () => {
    const offer = 'Requisitos\n- Grado en Ingeniería Informática o similar.';
    expect(requirement(offer, 'education:bachelor')).toMatchObject({
      kind: 'education',
      level: 'bachelor',
    });
  });

  it('does not read a team name as an education requirement', () => {
    const offer = 'Funciones\n- Colaborar con el equipo de ingeniería en tareas de React.';
    expect(requirementsOf(offer).map((item) => item.id)).toEqual(['concept:react']);
  });

  it('detects minimum years of experience together with the related concept', () => {
    const offer = 'Requisitos\n- Al menos 3 años de experiencia con React.';
    const ids = requirementsOf(offer).map((item) => item.id);
    expect(ids).toEqual(['concept:react', 'years:3:react']);
    expect(requirement(offer, 'years:3:react')).toMatchObject({ years: 3, conceptIds: ['react'] });
  });

  it('matches labels without case or accents', () => {
    expect(requirement('REQUISITOS\n- integracion continua', 'concept:ci-cd')).toBeDefined();
    expect(requirement('Requisitos\n- Inglés C1', 'language:en:C1')).toBeDefined();
  });

  it('does not match a shorter label inside a longer one', () => {
    const ids = requirementsOf('Requisitos\n- React Native').map((item) => item.id);
    expect(ids).toEqual(['concept:react-native']);
  });

  it('does not match a label inside another word', () => {
    expect(requirementsOf('Requisitos\n- JavaScript').map((item) => item.id)).toEqual([
      'concept:javascript',
    ]);
  });

  it('accepts an extended catalog', () => {
    const catalog = [
      ...skillCatalog,
      { id: 'sap', kind: 'skill', label: 'SAP', aliases: ['sap'] } satisfies SkillConcept,
    ];
    expect(requirementsOf('Requisitos\n- Experiencia con SAP.', catalog)[0]?.id).toBe(
      'concept:sap',
    );
  });
});
