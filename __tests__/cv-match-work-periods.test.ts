import { analyzeMatch } from '@/features/cv-match/domain/analyze-match';

// Todos los historiales son ficticios; la fecha fija evita que el reloj cambie la cobertura.
const referenceDate = new Date('2026-11-08T00:00:00Z');
const offer = 'Requisitos\n- 5 años de experiencia profesional.';
const analyze = (text: string, job = offer, date = referenceDate) =>
  analyzeMatch(text, job, { referenceDate: date });
const years = (result: ReturnType<typeof analyze>) =>
  result.requirements.find((item) => item.requirement.kind === 'years')!;

describe('professional experience from dates', () => {
  it.each([
    ['enero 2020 – enero 2025', 60, 'supported'],
    ['01/2020 – 01/2025', 60, 'supported'],
    ['enero 2021 – marzo 2024', 38, 'mentioned'],
    ['01/2021 – 03/2024', 38, 'mentioned'],
  ])('calculates the traceable month/year range: %s', (range, months, status) => {
    const source = `Empresa Ficticia · ${range}`;
    const result = analyze(`EXPERIENCIA\n${source}`);
    expect(years(result)).toMatchObject({
      status,
      contribution: { points: status === 'supported' ? 1 : 0.5, weight: 2 },
    });
    expect(years(result).reason).toContain(`${months} meses`);
    expect(years(result).reason).toContain(range);
    expect(years(result).evidence.map((item) => item.text)).toContain(source);
    expect(result.coverage.percentage).toBe(status === 'supported' ? 100 : 50);
  });

  it.each([
    ['Empresa A · 01/2020 – 01/2023\nEmpresa B · 01/2023 – 01/2025', 60, 'supported'],
    ['Empresa A · 01/2021 – 01/2024\nEmpresa B · 01/2022 – 01/2025', 48, 'mentioned'],
  ])('unites successive and overlapping jobs: %s', (jobs, months, status) => {
    const result = analyze(`EXPERIENCIA\n${jobs}`);
    expect(years(result).status).toBe(status);
    expect(years(result).reason).toContain(`${months} meses`);
    expect(years(result).evidence).toHaveLength(2);
    expect(result.coverage.percentage).toBe(status === 'supported' ? 100 : 50);
  });

  it.each([
    ['2019 – 2024', 48, 'mentioned'],
    ['2018 – 2024', 60, 'supported'],
  ])('uses a lower bound without inventing months for %s', (range, minimum, status) => {
    const result = analyze(`EXPERIENCIA\nEmpresa Ficticia · ${range}`);
    expect(years(result).status).toBe(status);
    expect(years(result).reason).toContain(`${minimum} meses`);
    expect(years(result).reason).toContain('sin meses');
  });

  it.each([
    ['2026-11-08T00:00:00Z', 58, 'mentioned'],
    ['2027-01-08T00:00:00Z', 60, 'supported'],
  ])('interprets actualidad against the explicit reference %s', (date, minimum, status) => {
    const result = analyze(
      'EXPERIENCIA\nEmpresa Ficticia · 2021 – actualidad',
      offer,
      new Date(date),
    );
    expect(years(result).status).toBe(status);
    expect(years(result).reason).toContain(`${minimum} meses`);
    expect(years(result).reason).toContain(date.slice(0, 7));
  });

  it.each(['13/2020 – 01/2025', '01/2025 – 01/2020', '01/2020 –', '01/2020 – 01/2030'])(
    'does not credit an invalid, incomplete or future range: %s',
    (range) => {
      const result = analyze(`EXPERIENCIA\nEmpresa Ficticia · ${range}`);
      expect(years(result).status).not.toBe('supported');
      expect(result.coverage.percentage).toBeLessThan(100);
    },
  );

  it.each([
    [
      'FORMACIÓN\nUniversidad Ficticia · 01/2010 – 01/2020\nPROYECTOS\nProyecto personal · 01/2020 – 01/2026',
      'missing',
      0,
    ],
    ['EXPERIENCIA\nCurso de especialización\n01/2010 – 01/2020', 'mentioned', 50],
  ])(
    'does not count education or personal projects as professional periods: %s',
    (cv, status, percentage) => {
      const result = analyze(cv);
      expect(years(result).status).toBe(status);
      expect(result.coverage.percentage).toBe(percentage);
    },
  );

  it.each(['con Kubernetes', 'con Databricks', 'como analista'])(
    'does not attribute general dates to experience %s',
    (scope) => {
      const result = analyze(
        'EXPERIENCIA\nEmpresa Ficticia · 01/2010 – 01/2020\nHABILIDADES\nKubernetes, Databricks.',
        `Requisitos\n- 5 años de experiencia ${scope}.`,
      );
      expect(years(result).status).not.toBe('supported');
      expect(result.coverage.percentage).not.toBe(100);
    },
  );

  it('does not turn a negated employment period into positive evidence', () => {
    const result = analyze('EXPERIENCIA\nNo trabajé en Empresa Ficticia; 01/2010 – 01/2020');
    expect(years(result).status).not.toBe('supported');
  });
});
