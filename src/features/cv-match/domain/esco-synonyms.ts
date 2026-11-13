/*
Sinónimos de ESCO aceptados para conceptos del catálogo de JobRadar.

Procedencia: ESCO (European Skills, Competences, Qualifications and Occupations), versión de
datos v1.2.1, consultada el 13 de noviembre de 2026 con la API pública
https://ec.europa.eu/esco/api (script `scripts/fetch-esco-candidates.cjs`).
Atribución: «Este servicio utiliza la clasificación ESCO de la Comisión Europea». ESCO se
reutiliza gratuitamente según la Decisión 2011/833/UE de la Comisión.

Solo se aceptan etiquetas preferentes o alternativas de ESCO, tal cual, que nombran exactamente el
mismo concepto, y solo las que el catálogo no tenía ya.
Se descartaron, entre otras:
- variantes que también nombran otra cosa: «Mocha» (JavaScript), «SEQUEL» (SQL), «ML»;
- conceptos más amplios o más concretos: «source control» (Git), «supervised learning»
  (aprendizaje automático), «use markup languages» (HTML);
- herramientas o tecnologías relacionadas, no equivalentes: Jenkins, AngularJS;
- términos genéricos o más amplios: «cooperate», «trabajar en grupo», «interaction»;
- la gestión ágil de proyectos, que en ESCO es un concepto distinto del desarrollo ágil.

Las etiquetas se comparan como el resto de alias: en minúsculas, sin tildes y como palabras
completas. Las evidencias que coinciden por una de ellas lo indican al usuario.
*/

export type EscoSynonyms = {
  /** URI del concepto en ESCO, para comprobar el origen de las etiquetas. */
  uri: string;
  labels: string[];
};

export const escoVersion = 'v1.2.1';

export const escoSynonyms: Readonly<Record<string, EscoSynonyms>> = {
  css: {
    uri: 'http://data.europa.eu/esco/skill/e5d1f825-60ed-4bdd-872a-e748c387f777',
    labels: ['cascading style sheets'],
  },
  csharp: {
    uri: 'http://data.europa.eu/esco/skill/4c016b68-4116-468c-9dc6-42710c239e4a',
    labels: ['c sharp'],
  },
  php: {
    uri: 'http://data.europa.eu/esco/skill/4350c38d-0fe9-4ca7-bab9-40ed7f72b04f',
    labels: ['hypertext preprocessor', 'php5', 'php7'],
  },
  python: {
    uri: 'http://data.europa.eu/esco/skill/ccd0a1d9-afda-43d9-b901-96344886e14d',
    labels: ['python3', 'python2'],
  },
  agile: {
    uri: 'http://data.europa.eu/esco/skill/dba46f87-0831-49cd-a1c7-340a653c0221',
    labels: ['desarrollo agil'],
  },
  'data-analysis': {
    uri: 'http://data.europa.eu/esco/skill/97bd1c21-66b2-4b7e-ad0f-e3cda590e378',
    labels: ['data analytics'],
  },
  teamwork: {
    uri: 'http://data.europa.eu/esco/skill/60c78287-22eb-4103-9c8c-28deaa460da0',
    labels: [
      'trabajar en equipos',
      'colaborar con los miembros del equipo',
      'working in teams',
      'team-working',
    ],
  },
  leadership: {
    uri: 'http://data.europa.eu/esco/skill/75d8e5d9-bef3-418b-9011-01bff9f27207',
    labels: ['liderar a otras personas', 'dirigir a los demas', 'lead others', 'leading others'],
  },
  'problem-solving': {
    uri: 'http://data.europa.eu/esco/skill/adc6dc11-3376-467b-96c5-9b0a21edc869',
    labels: ['resolver problemas', 'solve problems', 'resolve problems'],
  },
};
