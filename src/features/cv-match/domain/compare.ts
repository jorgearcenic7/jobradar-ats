import type { AnalysisResult, RequirementStatus } from './types';

export type StatusChange = {
  requirementId: string;
  label: string;
  /** `null` when the requirement is new in the current analysis. */
  before: RequirementStatus | null;
  /** `null` when the requirement is no longer in the offer. */
  after: RequirementStatus | null;
};

export type AnalysisComparison = {
  coverage: { before: number | null; after: number | null };
  changes: StatusChange[];
};

/** What changed between two analyses: requirements first in current order, removed ones last. */
export function compareAnalyses(
  previous: AnalysisResult,
  current: AnalysisResult,
): AnalysisComparison {
  const previousById = new Map(previous.requirements.map((item) => [item.requirement.id, item]));
  const currentIds = new Set(current.requirements.map((item) => item.requirement.id));
  const changes: StatusChange[] = [];

  for (const item of current.requirements) {
    const before = previousById.get(item.requirement.id)?.status ?? null;
    if (before !== item.status) {
      changes.push({
        requirementId: item.requirement.id,
        label: item.requirement.label,
        before,
        after: item.status,
      });
    }
  }
  for (const item of previous.requirements) {
    if (!currentIds.has(item.requirement.id)) {
      changes.push({
        requirementId: item.requirement.id,
        label: item.requirement.label,
        before: item.status,
        after: null,
      });
    }
  }

  return {
    coverage: { before: previous.coverage.percentage, after: current.coverage.percentage },
    changes,
  };
}
