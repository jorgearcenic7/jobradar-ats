import type { Coverage, Importance, RequirementAssessment, RequirementStatus } from './types';

const points: Record<Exclude<RequirementStatus, 'not-evaluable'>, number> = {
  supported: 1,
  mentioned: 0.5,
  missing: 0,
};

/** Required requirements count double. Ambiguous ones are not promoted to required. */
function weightOf(importance: Importance) {
  return importance === 'required' ? 2 : 1;
}

export function contributionOf(
  status: RequirementStatus,
  importance: Importance,
): RequirementAssessment['contribution'] {
  return status === 'not-evaluable'
    ? null
    : { points: points[status], weight: weightOf(importance) };
}

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
