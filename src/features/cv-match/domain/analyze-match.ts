import { assessRequirement } from './assess';
import { computeCoverage, contributionOf } from './coverage';
import { parseCv } from './cv-structure';
import { extractOfferRequirements } from './offer-requirements';
import { buildRecommendations } from './recommendations';
import { indexCatalog, skillCatalog, type SkillConcept } from './skill-catalog';
import type { AnalysisResult, RequirementAssessment } from './types';

/**
 * Compares a CV with a job offer, requirement by requirement. The result explains each
 * status with literal sentences of both texts. It is not a prediction of any applicant
 * tracking system or of the employer's decision. Runs locally; nothing is stored.
 */
export function analyzeMatch(
  cvText: string,
  offerText: string,
  { catalog = skillCatalog }: { catalog?: readonly SkillConcept[] } = {},
): AnalysisResult {
  const index = indexCatalog(catalog);
  const cv = parseCv(cvText, index);

  const requirements: RequirementAssessment[] = extractOfferRequirements(offerText, catalog).map(
    (requirement) => {
      const assessment = assessRequirement(requirement, cv.units, index);
      return {
        requirement,
        ...assessment,
        contribution: contributionOf(assessment.status, requirement.importance),
      };
    },
  );

  return {
    requirements,
    coverage: computeCoverage(requirements),
    recommendations: buildRecommendations(requirements, cv.checks),
    cvChecks: cv.checks,
  };
}
