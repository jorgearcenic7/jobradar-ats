import { analyzeMatch } from '@/features/cv-match/domain/analyze-match';
import {
  cosine,
  defaultSemanticRules,
  e5Passage,
  e5Query,
  selectSemanticCandidates,
  semanticTargets,
  type SemanticTargets,
} from '@/features/cv-match/domain/semantic-candidates';

import { semanticCases, semanticCvs } from '../jest/semantic-corpus';

// CV y ofertas ficticios. La similitud se simula: estas pruebas comprueban qué se consulta y cómo
// se decide, no la calidad del modelo, que mide `scripts/semantic-benchmark.mjs`.
const cv = `Laura Ejemplo
laura@example.com

Perfil
Desarrolladora web centrada en interfaces accesibles y rápidas.

Experiencia
Desarrollé interfaces web con React y TypeScript para una plataforma de reservas.
Escribí pruebas automatizadas con Jest para cada componente.
Coordiné a un equipo de cuatro desarrolladores.
No tengo experiencia con Kubernetes ni con la nube.
Estoy aprendiendo Terraform en un curso en línea.
Conozco Kafka de forma teórica por tutoriales.

Idiomas
Inglés B2 certificado por una escuela ficticia.`;

const offer = `Requisitos
- Experiencia con Angular.
- Pruebas unitarias.
- Trabajo en equipo.
- Experiencia en testing automatizado de interfaces.
- Experiencia con Qlik.
- Inglés C1.
- 5 años de experiencia profesional.`;

const result = analyzeMatch(cv, offer);
const targets = semanticTargets(cv, result);
const queryTexts = targets.queries.map((query) => query.text);
const passageTexts = targets.passages.map((passage) => passage.text);

describe('semantic targets', () => {
  it('queries unrecognized requirements and uncredited non-technical concepts only', () => {
    expect(queryTexts).toEqual([
      'Pruebas unitarias',
      'Trabajo en equipo',
      'Experiencia en testing automatizado de interfaces.',
      'Experiencia con Qlik.',
    ]);
  });

  it('never queries named technologies of the catalog, years, languages or education', () => {
    expect(queryTexts.join(' ')).not.toMatch(/Angular|Inglés|años/);
  });

  it('requires the named terms of an unrecognized requirement in the CV sentence', () => {
    expect(targets.queries.find((query) => query.text.includes('Qlik'))?.namedTerms).toEqual([
      'qlik',
    ]);
    expect(targets.queries.find((query) => query.text.includes('testing'))?.namedTerms).toEqual([]);
  });

  it('leaves out the profile, the header, languages and qualified sentences', () => {
    expect(passageTexts).toEqual([
      'Desarrollé interfaces web con React y TypeScript para una plataforma de reservas.',
      'Escribí pruebas automatizadas con Jest para cada componente.',
      'Coordiné a un equipo de cuatro desarrolladores.',
    ]);
  });

  it('skips a concept the CV denies', () => {
    const denied = analyzeMatch(
      'Experiencia\nNo tengo experiencia de trabajo en equipo.\nAtendí clientes en una tienda.',
      'Requisitos\n- Trabajo en equipo.',
    );
    expect(semanticTargets('', denied).queries).toEqual([]);
  });

  it('adds the e5 prefixes', () => {
    expect(e5Query('Liderazgo')).toBe('query: Liderazgo');
    expect(e5Passage('Coordiné un equipo.')).toBe('passage: Coordiné un equipo.');
  });
});

describe('semantic candidates', () => {
  const fixed: SemanticTargets = {
    queries: [
      { requirementId: 'a', text: 'A', namedTerms: [] },
      { requirementId: 'b', text: 'B', namedTerms: ['qlik'] },
    ],
    passages: ['uno', 'dos con qlik', 'tres', 'cuatro', 'cinco'].map((text) => ({
      text,
      normalized: text,
      section: 'experience' as const,
    })),
  };
  // Las frases 0 y 1 destacan claramente; el resto queda en la mediana.
  const scores = [
    [0.9, 0.88, 0.82, 0.82, 0.82],
    [0.9, 0.88, 0.82, 0.82, 0.82],
  ];
  const review = selectSemanticCandidates(fixed, (q, p) => scores[q][p]);

  it('proposes the sentences that stand out over the median, best first', () => {
    expect(review.a.map((item) => item.text)).toEqual(['uno', 'dos con qlik']);
  });

  it('drops sentences that do not contain the named terms', () => {
    expect(review.b.map((item) => item.text)).toEqual(['dos con qlik']);
  });

  it('proposes nothing below the margin or the floor', () => {
    const flat = selectSemanticCandidates(fixed, (_q, p) => (p === 0 ? 0.83 : 0.82));
    expect(flat).toEqual({});
    const low = selectSemanticCandidates(fixed, (_q, p) => (p === 0 ? 0.79 : 0.7));
    expect(low).toEqual({});
  });

  it('limits the candidates per requirement', () => {
    const one = selectSemanticCandidates(fixed, (_q, p) => [0.95, 0.94, 0.8, 0.8, 0.8][p], {
      ...defaultSemanticRules,
      maxPerRequirement: 1,
    });
    expect(one.a.map((item) => item.text)).toEqual(['uno']);
  });

  it('computes the cosine of normalized vectors', () => {
    const a = new Float32Array([1, 0, 0, 1]);
    const b = new Float32Array([0.6, 0.8, 1, 0]);
    expect(cosine(a, 0, b, 0, 2)).toBeCloseTo(0.6);
    expect(cosine(a, 1, b, 1, 2)).toBeCloseTo(0);
  });

  it('never changes the deterministic result', () => {
    const before = JSON.stringify(result);
    selectSemanticCandidates(targets, () => 0.99);
    expect(JSON.stringify(result)).toBe(before);
  });
});

describe('semantic corpus', () => {
  it.each(semanticCases.map((item) => [item.requirement, item] as const))(
    'quotes literal sentences of its CV: %s',
    (_name, item) => {
      for (const fragment of [...item.expected, ...item.traps.map((trap) => trap.text)]) {
        expect(semanticCvs[item.cv]).toContain(fragment);
      }
    },
  );

  it('keeps qualified traps out of the passages', () => {
    for (const item of semanticCases) {
      const qualified = item.traps.filter((trap) => trap.kind !== 'related');
      if (qualified.length === 0) continue;
      const fake = analyzeMatch('', `Requisitos\n- ${item.requirement}`);
      const passages = semanticTargets(semanticCvs[item.cv], {
        ...fake,
        requirements: [
          {
            requirement: {
              kind: 'unrecognized',
              id: 'unrecognized:1',
              label: item.requirement,
              importance: 'required',
              sources: [],
            },
            status: 'not-evaluable',
            reason: '',
            evidence: [],
            contribution: null,
          },
        ],
      }).passages.map((passage) => passage.text);
      for (const trap of qualified) {
        expect(passages.some((text) => text.includes(trap.text))).toBe(false);
      }
    }
  });
});
