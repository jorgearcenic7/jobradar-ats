/*
Calcula la cobertura de un análisis: qué parte de los requisitos evaluables respalda el CV.

Es una suma ponderada con pesos heurísticos, no validados estadísticamente. Cada requisito
aporta 1 punto si está respaldado, 0,5 si solo se menciona y 0 si no se acredita, y los
obligatorios pesan el doble que el resto. El porcentaje orienta al usuario; no predice la
decisión de un ATS ni de la empresa.

Los requisitos no evaluables se cuentan aparte y no entran en el porcentaje, para no tratar
como una carencia del candidato lo que JobRadar no sabe interpretar.
*/
import type { Coverage, Importance, RequirementAssessment, RequirementStatus } from './types';

const points: Record<Exclude<RequirementStatus, 'not-evaluable'>, number> = {
  supported: 1,
  mentioned: 0.5,
  missing: 0,
};

/**
 * Los requisitos obligatorios pesan el doble. Los de importancia ambigua no se tratan como
 * obligatorios, para no duplicar el peso de algo que la oferta no exige con claridad.
 */
function weightOf(importance: Importance) {
  return importance === 'required' ? 2 : 1;
}

/**
 * Aportación de un requisito a la cobertura: puntos según su estado y peso según su
 * importancia. Un requisito no evaluable devuelve `null` y queda fuera del cálculo.
 */
export function contributionOf(
  status: RequirementStatus,
  importance: Importance,
): RequirementAssessment['contribution'] {
  return status === 'not-evaluable'
    ? null
    : { points: points[status], weight: weightOf(importance) };
}

/**
 * Resume la cobertura de un análisis. `percentage` son los puntos obtenidos sobre los
 * posibles, redondeados a un entero, o `null` si no se ha podido evaluar ningún requisito.
 * `counts` incluye los no evaluables, que se informan pero no puntúan.
 */
export function computeCoverage(assessments: RequirementAssessment[]): Coverage {
  const counts: Coverage['counts'] = { supported: 0, mentioned: 0, missing: 0, 'not-evaluable': 0 };
  let earned = 0;
  let possible = 0;
  for (const { status, contribution } of assessments) {
    counts[status] += 1;
    if (contribution) {
      earned += contribution.points * contribution.weight;
      possible += contribution.weight;
    }
  }
  return {
    percentage: possible > 0 ? Math.round((earned / possible) * 100) : null,
    earned,
    possible,
    evaluated: assessments.length - counts['not-evaluable'],
    notEvaluated: counts['not-evaluable'],
    counts,
  };
}
