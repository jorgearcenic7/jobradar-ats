import { assessRequirement } from './assess';
import { computeCoverage, contributionOf } from './coverage';
import { parseCv } from './cv-structure';
import { extractOfferRequirementsFromIndex } from './offer-requirements';
import { buildRecommendations } from './recommendations';
import { indexCatalog, skillCatalog, type SkillConcept } from './skill-catalog';
import type { AnalysisResult, RequirementAssessment } from './types';

/**
 * Compara un CV con una oferta, requisito a requisito, con criterios habituales de evaluación
 * ATS. Cada estado se explica con frases literales de los dos textos. Se ejecuta en el
 * dispositivo y no guarda nada.
 */
export function analyzeMatch(
  cvText: string,
  offerText: string,
  {
    catalog = skillCatalog,
    referenceDate = new Date(),
  }: { catalog?: readonly SkillConcept[]; referenceDate?: Date } = {},
): AnalysisResult {
  const index = indexCatalog(catalog);
  const cv = parseCv(cvText, index);

  const requirements: RequirementAssessment[] = extractOfferRequirementsFromIndex(
    offerText,
    index,
  ).map((requirement) => {
    const assessment = assessRequirement(requirement, cv.units, index, referenceDate);
    return {
      requirement,
      ...assessment,
      contribution: contributionOf(assessment.status, requirement.importance),
    };
  });

  return {
    requirements,
    coverage: computeCoverage(requirements),
    recommendations: buildRecommendations(requirements, cv.checks),
    cvChecks: cv.checks,
  };
}
