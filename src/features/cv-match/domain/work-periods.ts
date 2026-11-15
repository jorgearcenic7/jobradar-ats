/*
Duración laboral general a resolución de meses. Los intervalos son semiabiertos: no se suma
el mes final. Un año sin mes aporta límites, nunca doce meses inventados. La unión elimina
solapamientos y no atribuye el tiempo a tecnologías, empresas o puestos por proximidad.
*/
import type { CvUnit } from './cv-structure';
import { containsAny, normalize } from './text';
import { isRoleHeader } from './experience-role';
import { findYearMentions } from './criteria';

/*
Meses en español e inglés, completos y abreviados («ene.», «Sept», «Aug»), ya normalizados. Una
abreviatura solo cuenta seguida de un año, porque el patrón de fechas siempre lo exige.
*/
const spanishMonths = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];
const englishMonths = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];
const abbreviations = [
  ['ene', 'jan'],
  ['feb'],
  ['mar'],
  ['abr', 'apr'],
  ['may'],
  ['jun'],
  ['jul'],
  ['ago', 'aug'],
  ['sep', 'sept'],
  ['oct'],
  ['nov'],
  ['dic', 'dec'],
];
const monthIndex = new Map<string, number>([
  ...spanishMonths.map((name, month): [string, number] => [name, month]),
  ...englishMonths.map((name, month): [string, number] => [name, month]),
  ...abbreviations.flatMap((names, month) => names.map((name): [string, number] => [name, month])),
  ['setiembre', 8],
]);
// Los nombres más largos primero, para que «septiembre» no se lea como «sep».
const monthPattern = [...monthIndex.keys()].sort((a, b) => b.length - a.length).join('|');
const endpoint = `(?:${monthPattern})\\.?(?:\\s+de)?\\s+\\d{4}|\\d{1,2}/\\d{4}|\\d{4}`;
// Final abierto de un periodo: «actualidad», «presente», «hoy», «present», «current»…
const ongoing = '(?:la\\s+)?actualidad|presente|actual|hoy|present|current|now|today';
const excluded = [
  'curso',
  'formacion',
  'estudios',
  'universidad',
  'certificacion',
  'proyecto personal',
  'previsto',
  'prevista',
  'aprendiendo',
  'no trabaje',
  'no trabajo',
  'no he trabajado',
  'sin experiencia',
  'no',
  'nunca',
  'sin',
];
type Bound = { earliest: number; latest: number; yearOnly: boolean };
type Period = {
  unit: CvUnit;
  range: string;
  start: Bound;
  end: Bound;
  context?: CvUnit;
  relevant?: boolean;
  ambiguousAssociation?: boolean;
};

function bound(text: string, reference: number): Bound | null {
  if (new RegExp(`^(?:${ongoing})$`).test(text))
    return { earliest: reference, latest: reference, yearOnly: false };
  const named = new RegExp(`^(${monthPattern})\\.?(?:\\s+de)?\\s+(\\d{4})$`).exec(text);
  const numeric = /^(\d{1,2})\/(\d{4})$/.exec(text);
  const year = Number(named?.[2] ?? numeric?.[2] ?? text);
  const month = named
    ? (monthIndex.get(named[1]) ?? null)
    : numeric
      ? Number(numeric[1]) - 1
      : null;
  if (
    !Number.isInteger(year) ||
    year < 1900 ||
    year > Math.floor(reference / 12) ||
    (month !== null && (month < 0 || month > 11))
  )
    return null;
  const earliest = year * 12 + (month ?? 0);
  const latest = month === null ? (year + 1) * 12 : earliest;
  if (earliest > reference) return null;
  return { earliest, latest, yearOnly: month === null };
}

function unionMonths(intervals: [number, number][]): number {
  const sorted = intervals.filter(([start, end]) => end > start).sort((a, b) => a[0] - b[0]);
  let total = 0;
  let end = -Infinity;
  for (const [start, nextEnd] of sorted) {
    total += Math.max(0, nextEnd - Math.max(start, end));
    end = Math.max(end, nextEnd);
  }
  return total;
}

export function workExperience(units: CvUnit[], referenceDate: Date, role?: string) {
  if (!Number.isFinite(referenceDate.getTime())) return null;
  const reference = referenceDate.getUTCFullYear() * 12 + referenceDate.getUTCMonth();
  const periods: Period[] = [];
  let previousLine = '';
  for (const unit of units) {
    if (unit.section !== 'experience') continue;
    const line = normalize(unit.sourceLine ?? unit.text);
    const excludedLine = containsAny(line, excluded);
    const pattern = new RegExp(
      `(^|[^\\p{L}\\d/])(${endpoint})\\s*(?:[–—-]|\\ba\\b|\\bhasta\\b|\\bto\\b|\\buntil\\b)\\s*(${endpoint}|${ongoing})(?=$|[^\\p{L}\\d/])`,
      'gu',
    );
    const ranges = [...unit.normalized.matchAll(pattern)];
    for (const match of ranges) {
      const range = unit.text.slice(match.index + match[1].length, match.index + match[0].length);
      const onlyRange = unit.normalized.replace(match[0], '').replace(/[().,:;\s]/g, '') === '';
      if (excludedLine || (onlyRange && containsAny(previousLine, excluded))) continue;
      const start = bound(match[2], reference);
      const end = bound(match[3], reference);
      if (
        !start ||
        !end ||
        (!end.yearOnly && end.earliest > reference) ||
        end.latest <= start.earliest
      )
        continue;
      periods.push({
        unit,
        range,
        ambiguousAssociation: ranges.length > 1,
        start,
        end: { ...end, latest: Math.min(end.latest, reference) },
      });
    }
    previousLine = line;
  }
  if (!periods.length) return null;
  for (const period of periods) {
    const previous = units[units.indexOf(period.unit) - 1];
    // Solo el contexto inmediatamente anterior y sin fechas: no se salta otro puesto ni se
    // hereda el título de un empleo anterior. Se usa la frase, no toda una línea con dos empleos.
    const onlyRange = period.unit.text.replace(period.range, '').replace(/[\s().,:;]+/g, '') === '';
    if (onlyRange && previous?.section === 'experience' && !/\b\d{4}\b/.test(previous.text))
      period.context = previous;
    const singlePeriod = !period.ambiguousAssociation;
    const ownHeader = Boolean(
      role && isRoleHeader(period.unit.text.replace(period.range, ''), role),
    );
    const precedingHeader = Boolean(
      role && period.context && isRoleHeader(period.context.text, role),
    );
    period.relevant = !role || (singlePeriod && (ownHeader || (onlyRange && precedingHeader)));
  }
  const relevant = periods.filter((period) => period.relevant);
  const minimumMonths = unionMonths(relevant.map((p) => [p.start.latest, p.end.earliest]));
  const maximumMonths = unionMonths(relevant.map((p) => [p.start.earliest, p.end.latest]));
  return {
    minimumMonths,
    maximumMonths,
    periods,
    reference: `${referenceDate.getUTCFullYear()}-${String(referenceDate.getUTCMonth() + 1).padStart(2, '0')}`,
  };
}

// Palabras de la exigencia que no delimitan un ámbito: «en un puesto similar», «en el sector».
const scopeStopwords = new Set(
  'experiencia experience anos ano years year minimo minima minimos minimas least menos mas como puesto puestos role roles position posicion similar similares afin afines related relacionado relacionada relacionados equivalente equivalent field campo area areas ambito sector empresa empresas company companies preferred preferably preferiblemente preferentemente ideally idealmente valorable deseable trabajo work working professional profesional laboral previa previous demostrable proven solid solida tambien also funciones tareas the and with para por una uno del las los the that this'.split(
    ' ',
  ),
);

/*
Ámbitos profesionales habituales en inglés y español, para que una oferta en un idioma encuentre
los títulos de puesto de un CV en el otro («safety» ↔ «seguridad»). Solo raíces de seis letras o
palabras completas, como compara `sameStem`.
*/
const fieldTranslations: [string, string][] = [
  ['quality', 'calidad'],
  ['safety', 'seguridad'],
  ['health', 'salud'],
  ['logistics', 'logistica'],
  ['transport', 'transporte'],
  ['warehouse', 'almacen'],
  ['purchasing', 'compras'],
  ['procurement', 'compras'],
  ['sales', 'ventas'],
  ['accounting', 'contabilidad'],
  ['finance', 'finanzas'],
  ['maintenance', 'mantenimiento'],
  ['production', 'produccion'],
  ['manufacturing', 'fabricacion'],
  ['engineering', 'ingenieria'],
  ['nursing', 'enfermeria'],
  ['teaching', 'docencia'],
  ['customer', 'cliente'],
  ['marketing', 'marketing'],
  ['recruitment', 'seleccion'],
  ['environmental', 'medioambiente'],
  ['legal', 'juridico'],
];

function withTranslations(terms: Set<string>): Set<string> {
  for (const term of [...terms]) {
    for (const [english, spanish] of fieldTranslations) {
      if (sameStem(term, english)) terms.add(spanish);
      if (sameStem(term, spanish)) terms.add(english);
    }
  }
  return terms;
}

/**
 * Palabras que delimitan el ámbito de una exigencia de años sin conceptos del catálogo:
 * «2 years of experience in logistics or transport coordination» → logistics, transport,
 * coordination. Vacío si la exigencia es general.
 */
export function experienceScopeTerms(sources: string[]): string[] {
  const terms = new Set<string>();
  for (const source of sources) {
    const text = normalize(source);
    const at = text.search(/\b(?:experiencia|experience)\b/);
    /*
    «Experiencia como…» o «as a…» pide un puesto: lo resuelve la coincidencia literal de títulos
    (`experience-role.ts`), no estas palabras. Una frase truncada tampoco delimita nada.
    */
    if (at < 0 || /\b(?:como|as)\b/.test(text.slice(at)) || /(?:…|\.\.\.)\s*$/.test(source))
      continue;
    const scope = text.slice(at).match(/\b(?:en|in|within)\b(.*)$/)?.[1] ?? '';
    for (const word of scope.split(/[^a-z0-9]+/)) {
      if (word.length >= 3 && !/^\d+$/.test(word) && !scopeStopwords.has(word)) terms.add(word);
    }
  }
  return [...withTranslations(terms)];
}

/*
Dos palabras se consideran la misma si coinciden enteras o, en palabras de cinco letras o más,
si comparten las seis primeras («contabilidad» y «contable», «logistics» y «logística»).
Es una comparación deliberadamente estrecha: solo sirve para títulos de puesto.
*/
function sameStem(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length < 5 || b.length < 5) return false;
  const size = Math.min(6, a.length, b.length);
  return a.slice(0, size) === b.slice(0, size);
}

/** Coincidencia del ámbito explícito, con los mismos límites que los títulos de puesto. */
export function namesExperienceScope(text: string, terms: string[]): boolean {
  const words = normalize(text)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  return terms.some((term) => words.some((word) => sameStem(term, word)));
}

/**
 * Meses de los periodos cuyo título de puesto (la línea de las fechas o el encabezado sin fechas
 * que la precede) contiene alguna palabra del ámbito pedido. Nunca usa la descripción del puesto:
 * mencionar algo en una tarea no convierte todo el empleo en experiencia de ese ámbito.
 */
export function scopedExperience(
  experience: NonNullable<ReturnType<typeof workExperience>>,
  terms: string[],
) {
  const matching = experience.periods.filter((period) => {
    const title = normalize(
      `${period.context?.text ?? ''} ${period.unit.text.replace(period.range, '')}`,
    );
    return !period.ambiguousAssociation && namesExperienceScope(title, terms);
  });
  return {
    periods: matching,
    minimumMonths: unionMonths(matching.map((p) => [p.start.latest, p.end.earliest])),
  };
}

/** Un puesto o tecnología desconocidos en la oferta tampoco se acreditan con años generales. */
export function asksGeneralExperience(sources: string[]): boolean {
  return sources.every((source) => {
    let text = normalize(source);
    // Se usa el mismo lector que en la oferta: singular, cifras y números escritos en ambos idiomas.
    for (const mention of findYearMentions(text).reverse()) {
      text = text.slice(0, mention.start) + ' ' + text.slice(mention.end);
    }
    return (
      text
        .replace(
          /\b(?:experiencia|profesional|laboral|general|previa|minima|minimo|minimos|mas|al|menos|de|se|requiere|requerida|necesaria|imprescindible|obligatoria|obligatorio|experience|professional|work|previous|minimum|at|least|of|required|more|than)\b/g,
          ' ',
        )
        .replace(/[\s.,;:()]/g, '') === ''
    );
  });
}
