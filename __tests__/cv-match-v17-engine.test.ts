import { analyzeMatch } from '@/features/cv-match/domain/analyze-match';
import { isQualifiedSentence } from '@/features/cv-match/domain/assess';
import { findYearMentions } from '@/features/cv-match/domain/criteria';
import { extractOfferRequirements } from '@/features/cv-match/domain/offer-requirements';
import { normalize, splitSentences } from '@/features/cv-match/domain/text';

/*
Mejoras del motor en la v1.7: encabezados en inglés y español, importancia por contraste,
calificadores, años por ámbito, niveles de idioma con palabras, normas ISO, alternativas,
representatividad y recomendaciones con hechos del CV. Todas las ofertas y CV son ficticios.
*/

const referenceDate = new Date('2026-11-15T00:00:00Z');
const analyze = (cv: string, offer: string) => analyzeMatch(cv, offer, { referenceDate });
const byId = (offer: string) =>
  Object.fromEntries(extractOfferRequirements(offer).map((r) => [r.id, r]));

describe('short evidence of actual use', () => {
  it.each([
    'Elaboré informes mensuales con Excel.',
    'Preparé informes con Excel.',
    'Implanté controles con Excel.',
    'Generated reports with Excel.',
    'Built dashboards in Excel.',
  ])('supports a concrete action: %s', (line) => {
    const result = analyze(`EXPERIENCIA\n${line}`, 'Requisitos:\n- Excel.');
    expect(result.requirements[0]).toMatchObject({
      status: 'supported',
      evidence: [{ text: line, role: 'support', signals: ['action-verb'] }],
    });
  });

  it.each([
    'Excel, Docker, React, Python.',
    'Tecnologías: Excel, Docker, React.',
    'Uso Excel y Docker.',
    'Gestioné Excel y Docker.',
    'Gestioné Docker y Excel.',
    'Elaboré informes: Excel, Docker, React.',
    'Elaboré informes, conocimientos de Excel.',
    'Si elaboré informes con Excel.',
    'Estoy aprendiendo Excel para informes.',
    'Conocimientos teóricos de Excel.',
  ])('does not accredit a list, mention or qualified claim: %s', (line) => {
    expect(analyze(`EXPERIENCIA\n${line}`, 'Requisitos:\n- Excel.').requirements[0].status).toBe(
      'mentioned',
    );
  });

  it.each(['No elaboré informes con Excel.', 'Never generated reports with Excel.'])(
    'preserves negations: %s',
    (line) => {
      expect(analyze(`EXPERIENCIA\n${line}`, 'Requisitos:\n- Excel.').requirements[0].status).toBe(
        'missing',
      );
    },
  );

  it('keeps a short claim in the skills section as a mention', () => {
    expect(
      analyze('HABILIDADES\nElaboré informes con Excel.', 'Requisitos:\n- Excel.').requirements[0]
        .status,
    ).toBe('mentioned');
  });

  it('also excludes a negated action from semantic evidence', () => {
    expect(isQualifiedSentence(normalize('No elaboré informes con Excel.'))).toBe(true);
  });

  it('supports a transversal skill described in an actual task', () => {
    const result = analyze(
      'EXPERIENCIA\nMejoré la comunicación entre los departamentos de ventas y soporte.',
      'Requisitos:\n- Comunicación.',
    );
    expect(result.requirements[0]).toMatchObject({ status: 'supported' });
    expect(result.recommendations.some((r) => r.requirementId === 'concept:communication')).toBe(
      false,
    );
  });
});

describe('business tools and closed alternatives', () => {
  it('supports an open WMS/TMS group from an explicitly named TMS', () => {
    const result = analyze(
      'EXPERIENCE\nManaged shipment tracking in the TMS.',
      'Requirements:\n- Experience with a WMS or TMS (e.g. SAP or similar).',
    );
    expect(result.requirements).toHaveLength(1);
    expect(result.requirements[0]).toMatchObject({
      requirement: { kind: 'any-of', openEnded: true },
      status: 'supported',
    });
  });

  it('evaluates accounting alternatives without demanding both tools', () => {
    const result = analyze(
      'EXPERIENCIA\nContabilicé facturas de clientes con Contaplus.',
      'Requisitos:\n- Conocimientos de A3 o Contaplus.',
    );
    expect(result.requirements).toHaveLength(1);
    expect(result.requirements[0]).toMatchObject({
      requirement: { kind: 'any-of', openEnded: false },
      status: 'supported',
    });
  });

  it('does not turn an absent known customs term into an unevaluable requirement', () => {
    expect(
      analyze(
        'EXPERIENCIA\nElaboré informes con Excel.',
        'Requirements:\n- Knowledge of Incoterms.',
      ).requirements[0].status,
    ).toBe('missing');
  });

  it('does not turn a mixed conjunction and alternative into one easy option', () => {
    const result = analyze(
      'EXPERIENCIA\nDesarrollé servicios con Docker para clientes.',
      'Requisitos:\n- Excel y Docker o Kubernetes.',
    );
    expect(result.requirements.every((r) => r.status !== 'supported')).toBe(true);
  });

  it('preserves a negated alternative for review', () => {
    const result = analyze(
      'EXPERIENCIA\nDesarrollé servicios con Docker para clientes.',
      'Requisitos:\n- No es obligatorio Docker o Kubernetes.',
    );
    expect(result.requirements[0]).toMatchObject({
      status: 'not-evaluable',
      contribution: null,
    });
  });
});

// Estructura habitual de una oferta europea en inglés, con un perfil sin matiz y un bloque preferente.
const englishOffer = `Junior Quality Engineer — Fictional Industrial Co.

Fictional Industrial Co. is a leading supplier serving 10,000 customers in 12 countries.

Key Responsibilities:
- Conduct internal and external audits.
- Prepare risk evaluations and investigate incidents.

Background:
- Bachelor's or Master's degree preferably in a technical or scientific field.
- Knowledge of ISO standards.
- Fluent in English (written and spoken).
- At least 2 years' experience in a similar role, preferred in quality or safety field.

Preferred Qualifications and Skills:
- Strong analytical and problem-solving skills.

Others:
Travel requirements: Travelling may be required up to 30% of your time.

What we offer
- Health insurance and 26 days off a year.`;

const spanishCv = `Candidata ficticia
EXPERIENCIA
Técnica de calidad y seguridad — planta química (junio 2025 – actualidad)
- Implanté el sistema de gestión conforme a ISO 9001 y coordiné auditorías internas.
Ingeniera de procesos — fabricante ficticio (agosto 2024 – junio 2025)
- Optimicé el control del proceso de una línea de producción.
FORMACIÓN
Grado en Ingeniería Química (2019 – 2024)
IDIOMAS
Inglés B2
HABILIDADES
Capacidad analítica, trabajo en equipo.`;

describe('offer sections in English', () => {
  const requirements = byId(englishOffer);

  it('reads «Background» as the list of requirements, not as an unknown section', () => {
    expect(requirements['education:bachelor']).toBeDefined();
    expect(
      requirements['any-of:iso-standards'] ?? requirements['concept:iso-standards'],
    ).toBeDefined();
    expect(Object.keys(requirements).some((id) => id.startsWith('language:en'))).toBe(true);
    expect(Object.values(requirements).some((r) => r.kind === 'review')).toBe(false);
  });

  it('makes the profile list required when the offer has a separate preferred block', () => {
    expect(requirements['education:bachelor'].importance).toBe('required');
    expect(requirements['concept:iso-standards'].importance).toBe('required');
    expect(requirements['concept:analytical-thinking'].importance).toBe('preferred');
  });

  it('keeps «preferably in…» and «preferred in…» as a qualifier of the field, not of the requirement', () => {
    expect(requirements['education:bachelor'].importance).toBe('required');
    expect(requirements['years:2:general'].importance).toBe('required');
  });

  it('ignores responsibilities, company figures and benefits', () => {
    const labels = Object.values(requirements).map((r) => r.label.toLowerCase());
    expect(labels.some((label) => label.includes('audit'))).toBe(false);
    expect(labels.some((label) => label.includes('insurance'))).toBe(false);
  });

  it('leaves a profile without a preferred block unclassified', () => {
    const offer = 'Background:\n- Knowledge of ISO standards.\n- Fluent in English.';
    expect(byId(offer)['concept:iso-standards'].importance).toBe('unclassified');
  });
});

describe('Spanish headings', () => {
  it('reads «Valoraremos» as the preferred block', () => {
    const offer = 'Lo que buscamos:\n- Excel avanzado.\nValoraremos:\n- Power BI.';
    const requirements = byId(offer);
    expect(requirements['concept:excel'].importance).toBe('required');
    expect(requirements['concept:power-bi'].importance).toBe('preferred');
  });
});

describe('sentence splitting', () => {
  it('does not split at «e.g.», «i.e.» or «p. ej.»', () => {
    expect(splitSentences('Experience with a WMS (e.g. SAP or similar). Excel.')).toEqual([
      'Experience with a WMS (e.g. SAP or similar).',
      'Excel.',
    ]);
    expect(splitSentences('Un ERP (p. ej. SAP) es necesario.')).toHaveLength(1);
  });
});

describe('years', () => {
  it('does not use an explicit general duration for a specific field', () => {
    const result = analyze(
      'PERFIL\nTengo diez años de experiencia profesional.\nEXPERIENCIA\nTécnica de logística (enero 2026 – actualidad)',
      'Requisitos:\n- Tres años de experiencia en logística.',
    );
    const years = result.requirements.find((r) => r.requirement.kind === 'years')!;
    expect(years.status).toBe('mentioned');
    expect(years.partial).toEqual({ achieved: '10 meses', required: '36 meses' });
  });

  it('accepts a duration explicitly declared in the requested field', () => {
    const result = analyze(
      'PERFIL\nTengo cinco años de experiencia en logística.',
      'Requisitos:\n- Tres años de experiencia en logística.',
    );
    expect(result.requirements.find((r) => r.requirement.kind === 'years')?.status).toBe(
      'supported',
    );
  });

  it('recognizes general experience in English without inventing a field', () => {
    const result = analyze(
      'EXPERIENCE\nAssistant (January 2022 – January 2026)',
      'Requirements:\n- At least two years of professional experience.',
    );
    expect(result.requirements.find((r) => r.requirement.kind === 'years')?.status).toBe(
      'supported',
    );
  });

  it.each([
    ['1 año de experiencia', 1],
    ['one year of experience', 1],
    ['tres años de experiencia', 3],
    ["2 years' experience", 2],
  ])('reads «%s»', (text, years) => {
    expect(findYearMentions(normalize(text))[0]?.years).toBe(years);
  });

  it('counts only the jobs whose title names the requested field', () => {
    const result = analyze(spanishCv, englishOffer);
    const years = result.requirements.find((r) => r.requirement.id === 'years:2:general')!;
    // Calidad y seguridad desde junio de 2025: 17 meses. El puesto de procesos no cuenta.
    expect(years.status).toBe('mentioned');
    expect(years.partial).toEqual({ achieved: '17 meses', required: '24 meses' });
    expect(years.reason).toContain('Técnica de calidad y seguridad');
    expect(years.reason).not.toContain('Ingeniera de procesos —');
  });

  it('accredits the years when the related jobs reach them', () => {
    const result = analyze(
      'EXPERIENCIA\nEnfermero — Servicio de Urgencias (octubre 2024 – actualidad)\n- Triaje.',
      'Requisitos:\n- Experiencia mínima de 1 año en UCI o Urgencias.',
    );
    expect(result.requirements.find((r) => r.requirement.kind === 'years')?.status).toBe(
      'supported',
    );
  });

  it('does not use job titles for a role requirement or a truncated sentence', () => {
    const result = analyze(
      'EXPERIENCIA\nData Engineer · 01/2010 – 01/2024',
      'Requisitos\n- Más de 5 años de experiencia como Data…',
    );
    expect(result.requirements.find((r) => r.requirement.kind === 'years')?.status).toBe(
      'mentioned',
    );
  });
});

describe('ISO standards and broader concepts', () => {
  it('accredits «ISO standards» with a specific standard used at work', () => {
    const iso = analyze(spanishCv, englishOffer).requirements.find(
      (r) => r.requirement.id === 'concept:iso-standards',
    )!;
    expect(iso.status).toBe('supported');
    expect(iso.evidence[0].text).toContain('ISO 9001');
  });

  it('never accredits a specific standard with another one', () => {
    const result = analyze(spanishCv, 'Requisitos:\n- Experiencia con ISO 14001.');
    expect(result.requirements[0].status).toBe('missing');
  });
});

describe('alternatives', () => {
  it('supports «e.g. SAP or similar» with explicit use of a TMS', () => {
    const result = analyze(
      'EXPERIENCIA\nGestioné envíos con el TMS de la empresa.',
      'Requirements:\n- Hands-on experience with a WMS or TMS (e.g. SAP EWM, Manhattan or similar).',
    );
    expect(result.requirements[0]).toMatchObject({
      requirement: { kind: 'any-of', openEnded: true },
      status: 'supported',
    });
  });
});

describe('coverage representativeness', () => {
  it('flags a percentage calculated over a small part of the offer', () => {
    const result = analyze(
      'EXPERIENCIA\nDesarrollé informes con Excel.',
      'Requisitos:\n- Excel.\n- Carnet de manipulador de alimentos.\n- Disponibilidad para turnos.\n- Conocimientos de la normativa sanitaria local.',
    );
    expect(result.coverage).toMatchObject({
      evaluated: 1,
      detected: 4,
      requiredNotEvaluated: 3,
      representativeness: 'insufficient',
    });
  });

  it('considers a mostly evaluated offer representative', () => {
    const result = analyze(spanishCv, englishOffer);
    expect(result.coverage.representativeness).toBe('sufficient');
  });
});

describe('recommendations with facts from the CV', () => {
  const messages = analyze(spanishCv, englishOffer).recommendations.map((r) => r.message);

  it('states the months already accredited and flags a possible discard', () => {
    expect(messages).toContainEqual(
      expect.stringMatching(
        /^Posible motivo de descarte\. Tus puestos relacionados suman 1 año y 5 meses/,
      ),
    );
  });

  it('quotes the CV level for an ambiguous language requirement without calling it a discard', () => {
    const english = messages.find((m) => m.includes('nivel B2'));
    expect(english).toMatch(/puede equivaler a más/);
    expect(english).not.toMatch(/descarte/);
  });

  it('points to the skills list instead of quoting a broken line', () => {
    expect(messages).toContainEqual(
      expect.stringMatching(/«Capacidad analítica» solo aparece en tu lista de habilidades/),
    );
  });

  it('never suggests adding something that is not in the CV', () => {
    for (const message of messages) {
      expect(message).not.toMatch(/añade (tu|el|la) .*(experiencia|título|grado) que no/i);
    }
  });
});
