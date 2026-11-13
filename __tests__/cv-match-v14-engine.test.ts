import { analyzeMatch } from '@/features/cv-match/domain/analyze-match';
import { computeCoverage } from '@/features/cv-match/domain/coverage';
import { escoSynonyms } from '@/features/cv-match/domain/esco-synonyms';
import { skillCatalog } from '@/features/cv-match/domain/skill-catalog';
import { normalize, splitSentences } from '@/features/cv-match/domain/text';

// Mejoras deterministas de la v1.4. Todos los CV y ofertas son ficticios; la fecha fija evita que
// el reloj cambie los resultados.
const referenceDate = new Date('2026-11-08T00:00:00Z');
const analyze = (cv: string, offer: string) => analyzeMatch(cv, offer, { referenceDate });
const requirement = (result: ReturnType<typeof analyze>, id: string) =>
  result.requirements.find((item) => item.requirement.id === id)!;

describe('work periods in more formats', () => {
  const offer = 'Requisitos\n- 5 años de experiencia profesional.';

  it.each([
    ['ene. 2020 – ene. 2025', 60],
    ['Jan 2020 - Jan 2025', 60],
    ['January 2020 to January 2025', 60],
    ['enero de 2020 – enero de 2025', 60],
    ['Sept. 2020 – presente', 74],
    ['sep 2020 - present', 74],
    ['03/2021 – current', 68],
    ['2019 – la actualidad', 82],
  ])('reads «%s»', (range, months) => {
    const result = analyze(`EXPERIENCIA\nEmpresa Ficticia · ${range}`, offer);
    const years = requirement(result, 'years:5:general');
    expect(years.reason).toContain(`${months} meses`);
    expect(years.evidence.map((item) => item.text)).toContain(`Empresa Ficticia · ${range}`);
  });

  it('keeps an abbreviated month and its year in the same sentence', () => {
    expect(splitSentences('Tiendas Ejemplo · ene. 2019 – actualidad. Atención al público.')).toEqual(
      ['Tiendas Ejemplo · ene. 2019 – actualidad.', 'Atención al público.'],
    );
    // Sin un año detrás, el punto sigue cerrando la frase.
    expect(splitSentences('Turno de mar. Luego, tarde.')).toEqual(['Turno de mar.', 'Luego, tarde.']);
  });

  it('does not change the points of a period that was already read', () => {
    const before = analyze('EXPERIENCIA\nEmpresa · enero 2020 – enero 2025', offer);
    expect(requirement(before, 'years:5:general')).toMatchObject({
      status: 'supported',
      contribution: { points: 1, weight: 2 },
    });
  });
});

describe('CV headings', () => {
  const offer = 'Requisitos\n- Experiencia con React.';

  it.each([
    'E X P E R I E N C I A',
    'E X P E R I E N C I A   L A B O R A L',
    'Work history',
    'Professional background',
  ])('recognizes «%s» as the experience section', (heading) => {
    const result = analyze(
      `${heading}\nDesarrollé interfaces con React para una tienda en línea.`,
      offer,
    );
    expect(result.cvChecks.sections).toContain('experience');
    expect(requirement(result, 'concept:react').status).toBe('supported');
  });

  it.each(['Core competencies', 'Tech stack', 'Language skills', 'Personal projects'])(
    'recognizes «%s» as a heading',
    (heading) => {
      const result = analyze(`${heading}\nTexto ficticio de la sección.`, offer);
      expect(result.cvChecks.sections).not.toContain('header');
    },
  );

  it('does not join a line of ordinary short words', () => {
    const result = analyze('Y o\nTexto ficticio.', offer);
    expect(result.cvChecks.sections).toEqual(['header']);
  });
});

describe('ESCO synonyms', () => {
  it('accepts a reviewed ESCO synonym and says so in the evidence', () => {
    const result = analyze(
      'Experiencia\nDesarrollé servicios en C Sharp para la facturación de una empresa ficticia.',
      'Requisitos\n- Experiencia con C#.',
    );
    const csharp = requirement(result, 'concept:csharp');
    expect(csharp.status).toBe('supported');
    expect(csharp.evidence[0].escoSynonym).toBe('C Sharp');
  });

  it('does not mark the usual name of a concept as a synonym', () => {
    const result = analyze(
      'Experiencia\nDesarrollé servicios en C# para la facturación de una empresa ficticia.',
      'Requisitos\n- Experiencia con C#.',
    );
    expect(requirement(result, 'concept:csharp').evidence[0].escoSynonym).toBeUndefined();
  });

  it('recognizes an ESCO synonym in the offer as the same concept', () => {
    const result = analyze(
      'Habilidades\nTrabajo en equipo.',
      'Requisitos\n- Capacidad para trabajar en equipos multidisciplinares.',
    );
    expect(requirement(result, 'concept:teamwork').status).toBe('mentioned');
  });

  it('keeps ambiguous ESCO labels out of the catalog', () => {
    const aliases = skillCatalog.flatMap((concept) => concept.aliases.map(normalize));
    for (const rejected of ['mocha', 'sequel', 'ml', 'angularjs', 'jenkins', 'source control']) {
      expect(aliases).not.toContain(rejected);
    }
  });

  it('adds each ESCO label once and to a single concept', () => {
    const owners = new Map<string, string>();
    for (const concept of skillCatalog) {
      for (const alias of concept.aliases.map(normalize)) {
        expect(owners.get(alias) ?? concept.id).toBe(concept.id);
        owners.set(alias, concept.id);
      }
    }
    for (const [id, { labels }] of Object.entries(escoSynonyms)) {
      const concept = skillCatalog.find((item) => item.id === id)!;
      expect(concept.esco?.labels).toEqual(labels.filter((label) => concept.aliases.includes(label)));
    }
  });
});

describe('informative partial evidence', () => {
  it('reports a lower language level without changing its status or points', () => {
    const result = analyze('Idiomas\nInglés B1.', 'Requisitos\n- Inglés B2.');
    expect(requirement(result, 'language:en:B2')).toMatchObject({
      status: 'missing',
      contribution: { points: 0, weight: 2 },
      partial: { achieved: 'B1', required: 'B2' },
    });
  });

  it('reports fewer declared years without changing their status or points', () => {
    const result = analyze(
      'Experiencia\n2 años de experiencia con React en una agencia ficticia.',
      'Requisitos\n- 3 años de experiencia con React.',
    );
    expect(requirement(result, 'years:3:react')).toMatchObject({
      status: 'missing',
      contribution: { points: 0, weight: 2 },
      partial: { achieved: '2 años', required: '3 años' },
    });
  });

  it('reports dated periods that add up to less than required', () => {
    const result = analyze(
      'EXPERIENCIA\nEmpresa Ficticia · enero 2023 – enero 2025',
      'Requisitos\n- 5 años de experiencia profesional.',
    );
    expect(requirement(result, 'years:5:general')).toMatchObject({
      status: 'mentioned',
      partial: { achieved: '24 meses', required: '60 meses' },
    });
  });

  it('does not report a mere mention as partial evidence', () => {
    const result = analyze(
      'Habilidades\nReact.',
      'Requisitos\n- 3 años de experiencia con React.',
    );
    expect(requirement(result, 'years:3:react').partial).toBeUndefined();
  });

  it('leaves the coverage exactly as it is without the partial evidence', () => {
    const result = analyze(
      'Idiomas\nInglés B1.\nExperiencia\n2 años de experiencia con React en una agencia.',
      'Requisitos\n- Inglés B2.\n- 3 años de experiencia con React.',
    );
    expect(result.requirements.filter((item) => item.partial)).toHaveLength(2);
    const withoutPartial = result.requirements.map(({ partial: _partial, ...item }) => item);
    expect(computeCoverage(withoutPartial)).toEqual(result.coverage);
  });
});
