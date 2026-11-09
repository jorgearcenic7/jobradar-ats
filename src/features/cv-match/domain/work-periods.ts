/*
Duración laboral general a resolución de meses. Los intervalos son semiabiertos: no se suma
el mes final. Un año sin mes aporta límites, nunca doce meses inventados. La unión elimina
solapamientos y no atribuye el tiempo a tecnologías, empresas o puestos por proximidad.
*/
import type { CvUnit } from './cv-structure';
import { containsAny, normalize } from './text';
import { isRoleHeader } from './experience-role';

const months = [
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
const endpoint = `(?:${months.join('|')})\\s+\\d{4}|\\d{1,2}/\\d{4}|\\d{4}`;
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
  if (text === 'actualidad') return { earliest: reference, latest: reference, yearOnly: false };
  const named = new RegExp(`^(${months.join('|')})\\s+(\\d{4})$`).exec(text);
  const numeric = /^(\d{1,2})\/(\d{4})$/.exec(text);
  const year = Number(named?.[2] ?? numeric?.[2] ?? text);
  const month = named ? months.indexOf(named[1]) : numeric ? Number(numeric[1]) - 1 : null;
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
      `(^|[^\\p{L}\\d/])(${endpoint})\\s*(?:[–—-]|\\ba\\b|\\bhasta\\b)\\s*(${endpoint}|actualidad)(?=$|[^\\p{L}\\d/])`,
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

/** Un puesto o tecnología desconocidos en la oferta tampoco se acreditan con años generales. */
export function asksGeneralExperience(sources: string[]): boolean {
  return sources.every(
    (source) =>
      normalize(source)
        .replace(/\d{1,2}\s*\+?\s*(?:o mas\s+)?anos/g, ' ')
        .replace(
          /\b(?:experiencia|profesional|laboral|general|previa|minima|minimo|minimos|mas|al|menos|de|se|requiere|requerida|necesaria|imprescindible|obligatoria|obligatorio)\b/g,
          ' ',
        )
        .replace(/[\s.,;:()]/g, '') === '',
  );
}
