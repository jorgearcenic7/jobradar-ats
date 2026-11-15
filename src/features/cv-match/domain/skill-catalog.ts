import { escoSynonyms } from './esco-synonyms';
import { compileTerms, findTerms, normalize, type Term } from './text';

/**
 * Concepts the analysis can recognize. The structure follows ESCO's split between
 * skills, knowledge and transversal skills, with one preferred label and several
 * alternative labels, but the entries are written for JobRadar and contain no ESCO data.
 *
 * Aliases are compared after lowercasing and removing accents. Anything that is not
 * in a catalog is reported as not evaluable instead of being guessed.
 *
 * Desde la v1.4, el catálogo por defecto añade a algunos conceptos sinónimos revisados de ESCO
 * (ver `esco-synonyms.ts`). Se guardan también en `esco` para poder indicar al usuario que una
 * evidencia coincide por un sinónimo y no por el nombre habitual.
 */
export type SkillConcept = {
  id: string;
  kind: 'skill' | 'knowledge' | 'transversal';
  label: string;
  aliases: string[];
  esco?: { uri: string; labels: string[] };
  /**
   * Concepto más general al que pertenece: una mención de este concepto respalda también un
   * requisito del general («ISO 45001» acredita «normas ISO»), nunca al revés.
   */
  broader?: string;
};

export type LanguageConcept = {
  id: string;
  label: string;
  aliases: string[];
};

const skill = (id: string, label: string, aliases: string[]): SkillConcept => ({
  id,
  kind: 'skill',
  label,
  aliases,
});

const knowledge = (id: string, label: string, aliases: string[]): SkillConcept => ({
  id,
  kind: 'knowledge',
  label,
  aliases,
});

const transversal = (id: string, label: string, aliases: string[]): SkillConcept => ({
  id,
  kind: 'transversal',
  label,
  aliases,
});

const baseCatalog: readonly SkillConcept[] = [
  skill('javascript', 'JavaScript', ['javascript', 'ecmascript']),
  skill('typescript', 'TypeScript', ['typescript']),
  skill('react', 'React', ['react', 'react.js', 'reactjs']),
  skill('react-native', 'React Native', ['react native']),
  skill('expo', 'Expo', ['expo']),
  skill('angular', 'Angular', ['angular']),
  skill('vue', 'Vue', ['vue', 'vue.js', 'vuejs']),
  skill('node', 'Node.js', ['node.js', 'nodejs', 'node']),
  skill('html', 'HTML', ['html', 'html5']),
  skill('css', 'CSS', ['css', 'css3']),
  skill('tailwind', 'Tailwind CSS', ['tailwind', 'tailwind css']),
  skill('python', 'Python', ['python']),
  skill('java', 'Java', ['java']),
  skill('kotlin', 'Kotlin', ['kotlin']),
  skill('swift', 'Swift', ['swift']),
  skill('csharp', 'C#', ['c#', 'csharp']),
  skill('dotnet', '.NET', ['.net', 'dotnet', 'asp.net']),
  skill('php', 'PHP', ['php']),
  skill('go', 'Go', ['golang']),
  skill('sql', 'SQL', ['sql']),
  skill('postgresql', 'PostgreSQL', ['postgresql', 'postgres']),
  skill('mysql', 'MySQL', ['mysql']),
  skill('mongodb', 'MongoDB', ['mongodb', 'mongo']),
  skill('graphql', 'GraphQL', ['graphql']),
  skill('docker', 'Docker', ['docker']),
  skill('kubernetes', 'Kubernetes', ['kubernetes', 'k8s']),
  skill('aws', 'AWS', ['aws', 'amazon web services']),
  skill('azure', 'Azure', ['azure', 'microsoft azure']),
  skill('gcp', 'Google Cloud', ['google cloud', 'gcp']),
  skill('git', 'Git', ['git']),
  skill('jest', 'Jest', ['jest']),
  skill('figma', 'Figma', ['figma']),
  skill('jira', 'Jira', ['jira']),
  skill('linux', 'Linux', ['linux']),
  skill('excel', 'Excel', ['excel']),
  // Datos y analítica (v1.4): herramientas habituales en ofertas de ingeniería y análisis de datos.
  skill('spark', 'Apache Spark', ['spark', 'apache spark', 'pyspark', 'spark sql']),
  skill('databricks', 'Databricks', ['databricks']),
  skill('airflow', 'Apache Airflow', ['airflow', 'apache airflow']),
  skill('dbt', 'dbt', ['dbt']),
  skill('snowflake', 'Snowflake', ['snowflake']),
  skill('kafka', 'Apache Kafka', ['kafka', 'apache kafka']),
  skill('terraform', 'Terraform', ['terraform']),
  skill('scala', 'Scala', ['scala']),
  skill('pandas', 'pandas', ['pandas']),
  skill('tableau', 'Tableau', ['tableau']),
  skill('power-bi', 'Power BI', ['power bi', 'powerbi']),
  knowledge('rest-api', 'API REST', ['api rest', 'apis rest', 'rest api', 'rest apis', 'restful']),
  knowledge('ci-cd', 'Integración y despliegue continuos', [
    'ci/cd',
    'integracion continua',
    'despliegue continuo',
    'continuous integration',
    'github actions',
    'gitlab ci',
  ]),
  knowledge('unit-testing', 'Pruebas unitarias', [
    'pruebas unitarias',
    'tests unitarios',
    'test unitarios',
    'unit testing',
    'unit tests',
  ]),
  knowledge('accessibility', 'Accesibilidad web', ['accesibilidad', 'accessibility', 'wcag']),
  knowledge('agile', 'Metodologías ágiles', [
    'metodologias agiles',
    'metodologia agil',
    'agile',
    'scrum',
    'kanban',
  ]),
  knowledge('machine-learning', 'Aprendizaje automático', [
    'machine learning',
    'aprendizaje automatico',
  ]),
  knowledge('data-analysis', 'Análisis de datos', ['analisis de datos', 'data analysis']),
  // Gestión empresarial e industrial (v1.7): ERP, normas ISO y prevención, comunes a muchos sectores.
  knowledge('erp', 'ERP', ['erp', 'erps', 'sistema erp', 'sistemas erp', 'software erp']),
  { ...skill('sap', 'SAP', ['sap', 'sap erp', 's/4hana', 'sap s/4hana']), broader: 'erp' },
  skill('wms', 'WMS', ['wms', 'warehouse management system', 'sistema de gestion de almacenes']),
  skill('tms', 'TMS', ['tms', 'transport management system', 'transportation management system']),
  skill('a3', 'A3', ['a3', 'a3eco', 'a3con']),
  skill('contaplus', 'Contaplus', ['contaplus', 'contaplus flex']),
  knowledge('incoterms', 'Incoterms', ['incoterms']),
  knowledge('iso-standards', 'Normas ISO', [
    'iso',
    'normas iso',
    'norma iso',
    'normativa iso',
    'estandares iso',
    'iso standards',
    'iso standard',
    'iso norms',
  ]),
  { ...knowledge('iso-9001', 'ISO 9001', ['iso 9001', 'iso9001']), broader: 'iso-standards' },
  { ...knowledge('iso-14001', 'ISO 14001', ['iso 14001', 'iso14001']), broader: 'iso-standards' },
  {
    ...knowledge('iso-45001', 'ISO 45001', ['iso 45001', 'iso45001', 'ohsas 18001']),
    broader: 'iso-standards',
  },
  { ...knowledge('iso-27001', 'ISO 27001', ['iso 27001', 'iso27001']), broader: 'iso-standards' },
  { ...knowledge('iso-22000', 'ISO 22000', ['iso 22000', 'iso22000']), broader: 'iso-standards' },
  { ...knowledge('iso-50001', 'ISO 50001', ['iso 50001', 'iso50001']), broader: 'iso-standards' },
  knowledge('occupational-safety', 'Prevención de riesgos laborales', [
    'prevencion de riesgos laborales',
    'prl',
    'seguridad y salud laboral',
    'seguridad y salud en el trabajo',
    'occupational health and safety',
    'occupational safety',
    'health and safety',
    'hse',
    'ehs',
  ]),
  transversal('teamwork', 'Trabajo en equipo', [
    'trabajo en equipo',
    'trabajar en equipo',
    'teamwork',
    'team player',
    'part of a team',
  ]),
  transversal('autonomy', 'Trabajo autónomo', [
    'trabajo autonomo',
    'autonomia',
    'de forma autonoma',
    'work independently',
    'working independently',
    'independent work',
    'self-starter',
  ]),
  transversal('analytical-thinking', 'Capacidad analítica', [
    'capacidad analitica',
    'capacidad de analisis',
    'pensamiento analitico',
    'analytical skills',
    'analytical thinking',
    'analytical mindset',
    'analytical',
  ]),
  transversal('communication', 'Comunicación', [
    'comunicacion',
    'habilidades comunicativas',
    'communication skills',
  ]),
  transversal('leadership', 'Liderazgo', ['liderazgo', 'leadership']),
  transversal('problem-solving', 'Resolución de problemas', [
    'resolucion de problemas',
    'problem solving',
    'problem-solving',
  ]),
];

/** Initial catalog: software development. Extend it or pass another one to the analysis. */
export const skillCatalog: readonly SkillConcept[] = baseCatalog.map((concept) => {
  const esco = escoSynonyms[concept.id];
  if (!esco) return concept;
  const own = new Set(concept.aliases.map(normalize));
  const labels = esco.labels.filter((label) => !own.has(normalize(label)));
  return { ...concept, aliases: [...concept.aliases, ...labels], esco: { uri: esco.uri, labels } };
});

/** Si una coincidencia del texto normalizado es un sinónimo de ESCO del concepto. */
export function isEscoSynonym(concept: SkillConcept | undefined, matched: string): boolean {
  return Boolean(concept?.esco?.labels.some((label) => normalize(label) === matched));
}

const languageCatalog: readonly LanguageConcept[] = [
  { id: 'en', label: 'inglés', aliases: ['ingles', 'english'] },
  { id: 'es', label: 'español', aliases: ['espanol', 'castellano', 'spanish'] },
  { id: 'fr', label: 'francés', aliases: ['frances', 'french'] },
  { id: 'de', label: 'alemán', aliases: ['aleman', 'german'] },
  { id: 'it', label: 'italiano', aliases: ['italiano', 'italian'] },
  { id: 'pt', label: 'portugués', aliases: ['portugues', 'portuguese'] },
  { id: 'ca', label: 'catalán', aliases: ['catalan', 'catala'] },
];

/** A catalog ready for matching. Built once per analysis. */
export type CatalogIndex = {
  concepts: ReadonlyMap<string, SkillConcept>;
  languages: ReadonlyMap<string, LanguageConcept>;
  conceptTerms: Term[];
  languageTerms: Term[];
};

export function indexCatalog(catalog: readonly SkillConcept[]): CatalogIndex {
  return {
    concepts: new Map(catalog.map((concept) => [concept.id, concept])),
    languages: new Map(languageCatalog.map((language) => [language.id, language])),
    conceptTerms: compileTerms(catalog),
    languageTerms: compileTerms(languageCatalog),
  };
}

/** Whether a normalized text names any concept or language of the catalog. */
export function namesAnyTerm(normalized: string, index: CatalogIndex): boolean {
  return (
    findTerms(normalized, index.conceptTerms).length > 0 ||
    findTerms(normalized, index.languageTerms).length > 0
  );
}
