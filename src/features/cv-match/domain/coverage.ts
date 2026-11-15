/*
Calcula la cobertura de un análisis: qué parte de los requisitos evaluables respalda el CV.

Es una suma ponderada con pesos heurísticos, no validados estadísticamente. Cada requisito
aporta 1 punto si está respaldado, 0,5 si solo se menciona y 0 si no se acredita, y los
obligatorios pesan el doble que el resto. El porcentaje resume, con estos criterios, la
compatibilidad del CV con los requisitos de la oferta.

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
  const evaluated = assessments.length - counts['not-evaluable'];
  return {
    percentage: possible > 0 ? Math.round((earned / possible) * 100) : null,
    earned,
    possible,
    evaluated,
    notEvaluated: counts['not-evaluable'],
    counts,
    detected: assessments.length,
    pendingReview: assessments.filter((item) => item.requirement.kind === 'review').length,
    requiredNotEvaluated: assessments.filter(
      (item) => item.status === 'not-evaluable' && item.requirement.importance === 'required',
    ).length,
    representativeness: representativenessOf(evaluated, assessments.length),
  };
}

/*
Umbrales provisionales y no validados: con al menos el 80 % de lo detectado evaluado, el
porcentaje resume la oferta; por debajo del 50 %, o con menos de tres requisitos evaluados, solo
habla de una parte pequeña y no debe presentarse como el resultado de toda la oferta.
*/
export const representativenessThresholds = { sufficient: 0.8, limited: 0.5, minimumEvaluated: 3 };

function representativenessOf(evaluated: number, detected: number): Coverage['representativeness'] {
  if (detected === 0) return 'insufficient';
  const share = evaluated / detected;
  if (evaluated < representativenessThresholds.minimumEvaluated) return 'insufficient';
  if (share < representativenessThresholds.limited) return 'insufficient';
  return share < representativenessThresholds.sufficient ? 'limited' : 'sufficient';
}
