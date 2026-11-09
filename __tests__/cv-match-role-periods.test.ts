import { analyzeMatch } from '@/features/cv-match/domain/analyze-match';

// Puestos y empresas ficticios; no se usa una ontología ni equivalencias entre profesiones.
const referenceDate = new Date('2026-11-09T00:00:00Z');
const offer = 'Requisitos\n- Más de 5 años de experiencia como Data Engineer.';
const analyze = (cv: string, job = offer) => analyzeMatch(cv, job, { referenceDate });
const years = (result: ReturnType<typeof analyze>) =>
  result.requirements.find((i) => i.requirement.kind === 'years')!;

describe('literal role and employment period association', () => {
  it.each([
    'Data Engineer · Empresa Ficticia · 01/2018 – 02/2024',
    'Data Engineer · Empresa Ficticia\n01/2018 – 02/2024',
  ])('credits only an explicitly associated literal title: %s', (jobs) => {
    const result = analyze(`EXPERIENCIA\n${jobs}`);
    expect(years(result)).toMatchObject({
      status: 'supported',
      requirement: { role: 'data engineer', comparison: 'more-than' },
    });
    expect(years(result).reason).toContain('73 meses');
    expect(years(result).reason).toContain('incluido');
    expect(
      years(result)
        .evidence.map((e) => e.text)
        .join('\n'),
    ).toContain('Data Engineer');
    expect(result.coverage.percentage).toBe(100);
  });

  it('unites relevant periods without adding another role or double counting overlaps', () => {
    const result = analyze(
      'EXPERIENCIA\nData Engineer · A · 01/2018 – 01/2022\nData Engineer · B · 01/2020 – 02/2024\nData Analyst · C · 01/2010 – 01/2018',
    );
    expect(years(result).status).toBe('supported');
    expect(years(result).reason).toContain('73 meses');
    expect(years(result).reason).toContain('Data Analyst');
    expect(years(result).reason).toContain('excluido');
    expect(years(result).reason).toContain('2026-11');
    expect(years(result).evidence.find((e) => e.text.includes('Data Analyst'))?.role).toBe(
      'mention',
    );
  });

  it.each([
    'Data Analyst · Empresa Ficticia · 01/2010 – 01/2024',
    'Senior Data Engineer · Empresa Ficticia · 01/2010 – 01/2024',
    'Colaboré con Data Engineer en un equipo ficticio · 01/2010 – 01/2024',
    'Data Engineer\nData Analyst\n01/2010 – 01/2024',
  ])('does not infer relevance from a different, mentioned or displaced title: %s', (jobs) => {
    const result = analyze(`EXPERIENCIA\n${jobs}`);
    expect(years(result).status).toBe('mentioned');
    expect(years(result).reason).toContain('0 meses');
    expect(years(result).reason).toContain('excluido');
    expect(result.coverage.percentage).toBe(50);
  });

  it.each([
    ['Más de', '01/2019 – 01/2024', 'mentioned'],
    ['Al menos', '01/2019 – 01/2024', 'supported'],
    ['Más de', '01/2019 – 02/2024', 'supported'],
    ['Más de', '2018 – 2024', 'mentioned'],
  ])('keeps the threshold %s five years with dates %s', (word, range, status) => {
    const result = analyze(
      `EXPERIENCIA\nData Engineer · Empresa Ficticia · ${range}`,
      `Requisitos\n- ${word} 5 años de experiencia como Data Engineer.`,
    );
    expect(years(result).status).toBe(status);
    expect(years(result).reason).toContain(word === 'Más de' ? 'superar' : 'alcanzar');
  });

  it('does not use a generic declared duration to credit a role or a strict threshold', () => {
    const generic = analyze('PERFIL\nTengo 10 años de experiencia profesional.');
    expect(years(generic).status).not.toBe('supported');
    const exact = analyze('PERFIL\nTengo 5 años de experiencia como Data Engineer.');
    expect(years(exact).status).toBe('missing');
    expect(years(analyze('PERFIL\nTengo 6 años de experiencia como Data Engineer.')).status).toBe(
      'supported',
    );
  });

  it('keeps role, general and technology durations distinct', () => {
    const cv =
      'EXPERIENCIA\nData Engineer · Empresa Ficticia · 01/2010 – 01/2024\nHABILIDADES\nKubernetes.';
    const result = analyze(
      cv,
      'Requisitos\n- Al menos 5 años de experiencia general.\n- Al menos 5 años de experiencia como Data Analyst.\n- Al menos 5 años de experiencia con Kubernetes.',
    );
    const durations = result.requirements.filter((i) => i.requirement.kind === 'years');
    expect(durations.map((i) => i.status)).toEqual(['supported', 'mentioned', 'mentioned']);
    expect(new Set(durations.map((i) => i.requirement.id)).size).toBe(3);
    expect(durations[2].reason).toContain('01/2010');
    expect(durations[2].evidence.every((e) => e.role !== 'support')).toBe(true);
  });

  it.each([
    ['Data Engineer · 01/2020 – 01/2022; Data Analyst · 01/2010 – 01/2020', 24],
    ['Data Engineer · 01/2020 – 01/2022 · Data Analyst · 01/2010 – 01/2020', 0],
    ['Data Engineer · 13/2020 – 01/2022 · Data Analyst · 01/2010 – 01/2020', 0],
  ])('does not assign ambiguous multiple roles to all periods: %s', (line, months) => {
    const result = analyze(`EXPERIENCIA\n${line}`);
    expect(years(result).status).toBe('mentioned');
    expect(years(result).reason).toContain(`${months} meses`);
  });

  it('does not read upper bounds as a minimum requirement or an exact CV duration', () => {
    const result = analyze(
      'EXPERIENCIA\nData Engineer · 01/2010 – 01/2024',
      'Requisitos\n- No más de 5 años de experiencia como Data Engineer.',
    );
    expect(result.coverage.evaluated).toBe(0);
    expect(result.requirements[0]).toMatchObject({
      status: 'not-evaluable',
      requirement: { kind: 'review' },
    });
    expect(
      years(analyze('PERFIL\nTengo no más de 6 años de experiencia como Data Engineer.')).status,
    ).toBe('mentioned');
  });

  it('does not infer a complete title from a truncated role', () => {
    const result = analyze(
      'EXPERIENCIA\nData Engineer · 01/2010 – 01/2024',
      'Requisitos\n- Más de 5 años de experiencia como Data…',
    );
    expect(years(result).status).toBe('mentioned');
    expect(years(result).reason).toContain('título completo');
    expect(
      years(
        analyze(
          'PERFIL\nTengo 10 años de experiencia profesional.',
          'Requisitos\n- Más de 5 años de experiencia como Data…',
        ),
      ).status,
    ).not.toBe('supported');
  });

  it('does not transfer the larger general declaration into the role in a mixed sentence', () => {
    const result = analyze(
      'PERFIL\nTengo 10 años de experiencia general, pero solo 2 años de experiencia como Data Engineer.',
    );
    expect(years(result).status).toBe('mentioned');
    expect(
      years(
        analyze('PERFIL\nTengo 10 años de experiencia general y experiencia como Data Engineer.'),
      ).status,
    ).not.toBe('supported');
  });

  it.each([
    ['más de', 'supported'],
    ['al menos', 'mentioned'],
  ])('honors an explicit CV lower bound %s five years', (word, status) => {
    const result = analyze(`PERFIL\nTengo ${word} 5 años de experiencia como Data Engineer.`);
    expect(years(result).status).toBe(status);
  });

  it.each([
    ['Más de', 'missing'],
    ['Al menos', 'supported'],
  ])('applies %s correctly to an explicit general duration', (word, status) => {
    const result = analyze(
      'PERFIL\nTengo 5 años de experiencia profesional.',
      `Requisitos\n- ${word} 5 años de experiencia profesional.`,
    );
    expect(years(result).status).toBe(status);
  });
});
