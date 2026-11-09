import { analyzeMatch } from '@/features/cv-match/domain/analyze-match';
import { compareAnalyses } from '@/features/cv-match/domain/compare';
import { missingInputs } from '@/features/cv-match/domain/input';

// All CVs and job offers in this file are fictional.

const offer = 'Requisitos\n- Docker.\n- React.';
const cvBefore =
  'EXPERIENCIA\n- Desarrollé una tienda online con React para un comercio local.\n\nHABILIDADES\nDocker';
const cvAfter =
  'EXPERIENCIA\n- Desarrollé una tienda online con React para un comercio local.\n- Desplegué la tienda en contenedores Docker en un servidor propio.\n\nHABILIDADES\nDocker';

describe('comparison between analyses', () => {
  it('reports no changes when nothing changed', () => {
    const result = analyzeMatch(cvBefore, offer);
    expect(compareAnalyses(result, analyzeMatch(cvBefore, offer))).toEqual({
      coverage: { before: result.coverage.percentage, after: result.coverage.percentage },
      changes: [],
    });
  });

  it('lists the requirements whose status changed and the coverage before and after', () => {
    const before = analyzeMatch(cvBefore, offer);
    const after = analyzeMatch(cvAfter, offer);
    expect(compareAnalyses(before, after)).toEqual({
      coverage: { before: 75, after: 100 },
      changes: [
        {
          requirementId: 'concept:docker',
          label: 'Docker',
          before: 'mentioned',
          after: 'supported',
        },
      ],
    });
  });

  it('reports requirements added to or removed from the offer', () => {
    const before = analyzeMatch(cvBefore, offer);
    const after = analyzeMatch(cvBefore, 'Requisitos\n- React.\n- Python.');
    expect(compareAnalyses(before, after).changes).toEqual([
      { requirementId: 'concept:python', label: 'Python', before: null, after: 'missing' },
      { requirementId: 'concept:docker', label: 'Docker', before: 'mentioned', after: null },
    ]);
  });
});

describe('analysis input', () => {
  it('reports blank texts', () => {
    expect(missingInputs('   \n', 'Requisitos')).toEqual(['cv']);
    expect(missingInputs('', '')).toEqual(['cv', 'offer']);
    expect(missingInputs('CV', 'Oferta')).toEqual([]);
  });
});
