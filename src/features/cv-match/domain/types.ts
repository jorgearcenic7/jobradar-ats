/** How firmly the offer asks for a requirement, after reading its section and its own line. */
export type Importance = 'required' | 'preferred' | 'unclassified' | 'ambiguous';

export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

/** Ordered from lowest to highest. */
export type EducationLevel = 'vocational' | 'bachelor' | 'master' | 'doctorate';

type RequirementBase = {
  /** Stable identifier, e.g. `concept:react` or `language:en:B2`. */
  id: string;
  /** Short name shown to the user. For unrecognized lines it is the line itself. */
  label: string;
  importance: Importance;
  /** Literal sentences of the offer the requirement comes from. */
  sources: string[];
};

export type OfferRequirement =
  | (RequirementBase & { kind: 'concept'; conceptId: string })
  | (RequirementBase & {
      kind: 'language';
      languageId: string;
      level: CefrLevel | null;
      /** A level the offer states outside the CEFR scale, such as "alto". */
      levelText: string | null;
    })
  | (RequirementBase & { kind: 'education'; level: EducationLevel })
  | (RequirementBase & {
      kind: 'years';
      years: number;
      conceptIds: string[];
      /** Título literal solicitado con «experiencia como…», sin equivalencias profesionales. */
      role?: string;
      /** Ausente equivale a «al menos»; «más de» exige superar el umbral. */
      comparison?: 'more-than';
    })
  | (RequirementBase & { kind: 'unrecognized' })
  | (RequirementBase & {
      /** A sentence that may or may not be a requirement. Shown for review, never scored. */
      kind: 'review';
      /**
       * - `unknown-section`: it sits under a heading JobRadar cannot classify.
       * - `company-practice`: it describes how the company works without asking for it.
       * - `requirement-wording`: niega una exigencia o su alcance necesita revisión.
       * - `alternative`: grupo de opciones que no se puntúan como obligaciones independientes.
       * - `partial-recognition`: elemento explícito de una lista técnica no reconocido.
       */
      cause:
        | 'unknown-section'
        | 'company-practice'
        | 'requirement-wording'
        | 'alternative'
        | 'partial-recognition';
      /** The unclassified heading, for `unknown-section`. */
      heading: string | null;
    });

export type CvSectionKind =
  | 'header'
  | 'profile'
  | 'experience'
  | 'education'
  | 'skills'
  | 'languages'
  | 'projects'
  | 'certifications'
  | 'other';

/**
 * - `support`: a sentence of experience or projects that describes its use.
 * - `mention`: named without describing where it was used.
 * - `hedged`: presented as theoretical or indirect knowledge ("de forma teórica").
 * - `learning`: presented as something being learned.
 * - `negation`: the CV says there is no experience with it.
 */
export type EvidenceRole = 'support' | 'mention' | 'hedged' | 'learning' | 'negation';

export type EvidenceSignal = 'number' | 'date' | 'action-verb';

export type Evidence = {
  /** Literal sentence of the CV. */
  text: string;
  section: CvSectionKind;
  role: EvidenceRole;
  signals: EvidenceSignal[];
};

export type RequirementStatus = 'supported' | 'mentioned' | 'missing' | 'not-evaluable';

export type RequirementAssessment = {
  requirement: OfferRequirement;
  status: RequirementStatus;
  /** Why the requirement got its status, in plain language. */
  reason: string;
  evidence: Evidence[];
  /** Points earned and weight in the coverage; `null` when the requirement is not evaluated. */
  contribution: { points: number; weight: number } | null;
};

export type Coverage = {
  /** Rounded share of the possible points, or `null` when nothing could be evaluated. */
  percentage: number | null;
  earned: number;
  possible: number;
  evaluated: number;
  notEvaluated: number;
  counts: Record<RequirementStatus, number>;
};

export type CvChecks = {
  hasEmail: boolean;
  hasPhone: boolean;
  /** Sections found in the CV, in order of appearance. */
  sections: CvSectionKind[];
  /** Whether the experience contains figures other than dates. */
  experienceHasFigures: boolean;
};

export type RecommendationKind =
  | 'missing'
  | 'add-evidence'
  | 'negated'
  | 'contradiction'
  | 'language-level'
  | 'education'
  | 'years'
  | 'review-unrecognized'
  | 'review-sentences'
  | 'contact'
  | 'section'
  | 'measurable-results';

export type Recommendation = {
  kind: RecommendationKind;
  requirementId?: string;
  /** Built only from fixed wording and labels of the offer, never from CV content. */
  message: string;
};

export type AnalysisResult = {
  requirements: RequirementAssessment[];
  coverage: Coverage;
  recommendations: Recommendation[];
  cvChecks: CvChecks;
};
