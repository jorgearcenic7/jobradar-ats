import { analyzeMatch } from '@/features/cv-match/domain/analyze-match';
import { extractOfferRequirements } from '@/features/cv-match/domain/offer-requirements';

/*
Ofertas en inglés y en español copiadas sin viñetas, como quedan al copiar de muchas webs. Una
sección excluida al principio («Why join us?», «¿Por qué unirte?») no debe tragarse el resto de
la oferta. Empresas y datos ficticios.
*/
const englishOffer = `Data Engineer
Sample Shipping Co. is the leading provider of e-commerce shipping software.
Why join us?
We are a remote-first company with a culture of ownership.
What You'll Do
Design, build and maintain scalable data pipelines using Python and SQL.
What You’ll Bring
3+ years of experience as a Data Engineer.
Strong proficiency in Python and SQL.
Hands-on experience with Spark or dbt.
Experience with cloud platforms such as AWS or Azure.
Bonus Points
Experience with Docker.
Pay Range
Competitive salary with Kubernetes training budget.`;

const spanishOffer = `Ingeniero/a de Datos
Empresa Ficticia S.L. es líder en software logístico.
¿Por qué unirte?
Somos una empresa en remoto con una cultura de autonomía.
Lo que harás
Diseñar y mantener flujos de datos con Python y SQL.
Lo que buscamos
3 años de experiencia como ingeniero de datos.
Dominio de Python y SQL.
Experiencia con Spark o dbt.
Experiencia con AWS o Azure.
Se valorará
Experiencia con Docker.
Ofrecemos
Salario competitivo y formación en Kubernetes.`;

const summary = (offer: string) =>
  extractOfferRequirements(offer).map((requirement) => ({
    id: requirement.id,
    importance: requirement.importance,
    ...(requirement.kind === 'review' && { cause: requirement.cause }),
  }));

describe.each([
  ['English', englishOffer],
  ['Spanish', spanishOffer],
])('%s offer without bullets', (_language, offer) => {
  const requirements = summary(offer);
  const ids = requirements.map((item) => item.id);

  it('keeps the requirements after an excluded section', () => {
    expect(ids).toEqual(expect.arrayContaining(['concept:python', 'concept:sql']));
    // En español se reconoce además el puesto literal («como ingeniero de datos»).
    expect(ids.some((id) => id.startsWith('years:3:'))).toBe(true);
  });

  it('keeps explicit alternatives as unscored groups', () => {
    const alternatives = requirements.filter((item) => item.cause === 'alternative');
    expect(alternatives).toHaveLength(2);
    expect(ids).not.toEqual(expect.arrayContaining(['concept:spark', 'concept:aws']));
  });

  it('marks the optional block as preferred', () => {
    expect(requirements.find((item) => item.id === 'concept:docker')?.importance).toBe('preferred');
  });

  it('ignores benefits and salary', () => {
    expect(ids).not.toContain('concept:kubernetes');
  });

  it('evaluates against the CV evidence only', () => {
    const result = analyzeMatch(
      'Experience\nBuilt data pipelines in Python and SQL for a fictitious retailer.',
      offer,
    );
    const status = (id: string) => result.requirements.find((r) => r.requirement.id === id)?.status;
    expect(status('concept:python')).toBe('supported');
    expect(status('concept:sql')).toBe('supported');
    expect(status('concept:docker')).toBe('missing');
  });
});

describe('English headings', () => {
  it.each([
    ["What You'll Need", 'required'],
    ['Must-haves', 'required'],
    ['Nice-to-haves', 'preferred'],
    ['About the role', 'unclassified'],
  ])('reads «%s»', (heading, importance) => {
    const [python] = extractOfferRequirements(`${heading}\nExperience with Python.`);
    expect(python).toMatchObject({ id: 'concept:python', importance });
  });

  it('recognizes common data tools', () => {
    const ids = extractOfferRequirements(
      'Requirements\nExperience with Databricks.\nExperience with Airflow.\nExperience with Snowflake.',
    ).map((item) => item.id);
    expect(ids).toEqual(['concept:databricks', 'concept:airflow', 'concept:snowflake']);
  });
});
