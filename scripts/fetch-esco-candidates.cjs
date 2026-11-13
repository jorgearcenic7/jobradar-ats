/*
Consulta la API pública de ESCO para obtener las etiquetas de los conceptos del catálogo de
JobRadar. Se ejecutó una vez para preparar `src/features/cv-match/domain/esco-synonyms.ts`; no
forma parte de la compilación.

El resultado es material en bruto para revisarlo a mano: las etiquetas alternativas de ESCO
incluyen variantes que no son sinónimos para un CV (por ejemplo, «Mocha» figura como etiqueta
alternativa de JavaScript y también es el nombre de un framework de pruebas). Solo pasan al
catálogo las que nombran exactamente el mismo concepto.

Versión de datos fijada: ESCO v1.2.1, la más reciente que acepta la API.
Uso: node scripts/fetch-esco-candidates.cjs [archivo de salida]
*/
const fs = require('node:fs');
const path = require('node:path');

const version = 'v1.2.1';
const api = 'https://ec.europa.eu/esco/api';
const out = path.resolve(
  process.argv[2] ?? path.join('node_modules', '.cache', 'esco-candidates.json'),
);

// Términos de búsqueda en inglés, la lengua de referencia de ESCO, por concepto del catálogo.
const queries = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  react: 'React',
  angular: 'Angular',
  vue: 'Vue.js',
  node: 'Node.js',
  html: 'HTML',
  css: 'CSS',
  python: 'Python',
  java: 'Java',
  kotlin: 'Kotlin',
  swift: 'Swift',
  csharp: 'C#',
  dotnet: 'ASP.NET',
  php: 'PHP',
  go: 'Go programming',
  sql: 'SQL',
  postgresql: 'PostgreSQL',
  mysql: 'MySQL',
  mongodb: 'MongoDB',
  graphql: 'GraphQL',
  docker: 'Docker',
  kubernetes: 'Kubernetes',
  aws: 'Amazon Web Services',
  azure: 'Microsoft Azure',
  gcp: 'Google Cloud',
  git: 'Git',
  figma: 'Figma',
  jira: 'Jira',
  linux: 'Linux',
  excel: 'spreadsheets software',
  'rest-api': 'REST API',
  'ci-cd': 'continuous integration',
  'unit-testing': 'unit testing',
  accessibility: 'web accessibility',
  agile: 'agile project management',
  'machine-learning': 'machine learning',
  'data-analysis': 'data analytics',
  teamwork: 'work in teams',
  communication: 'communication',
  leadership: 'leadership',
  'problem-solving': 'solve problems',
};

async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json();
}

async function main() {
  const concepts = {};
  for (const [id, text] of Object.entries(queries)) {
    const search = await getJson(
      `${api}/search?text=${encodeURIComponent(text)}&language=en&type=skill&limit=4&selectedVersion=${version}`,
    );
    concepts[id] = [];
    for (const result of search._embedded?.results ?? []) {
      const resource = await getJson(
        `${api}/resource/skill?uri=${encodeURIComponent(result.uri)}&language=en&selectedVersion=${version}`,
      );
      concepts[id].push({
        uri: result.uri,
        preferred: { en: resource.preferredLabel?.en, es: resource.preferredLabel?.es },
        alternatives: {
          en: resource.alternativeLabel?.en ?? [],
          es: resource.alternativeLabel?.es ?? [],
        },
      });
    }
  }
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(
    out,
    JSON.stringify(
      { source: api, version, retrieved: new Date().toISOString(), concepts },
      null,
      2,
    ),
  );
  console.log(`Candidatos de ESCO ${version} guardados en ${out}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
