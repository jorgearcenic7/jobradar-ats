import { useState } from 'react';

import { analyzeMatch } from '@/features/cv-match/domain/analyze-match';
import { compareAnalyses, type AnalysisComparison } from '@/features/cv-match/domain/compare';
import { missingInputs, type InputField } from '@/features/cv-match/domain/input';
import { cleanOfferText, type OfferCleanup } from '@/features/cv-match/domain/offer-cleanup';
import type { AnalysisResult } from '@/features/cv-match/domain/types';

import { sampleOffer } from './sample-texts';

/** The CV as the screen currently provides it, pasted or read from a document. */
export type CvInput = {
  /** Text to analyze, or `null` when there is no text that can be analyzed. */
  text: string | null;
  /** Identifies the CV itself: another key means another CV, not an edit of the same one. */
  sourceKey: string;
};

type Analysis = {
  result: AnalysisResult;
  cvText: string;
  offerText: string;
  sourceKey: string;
  /** Lo que se dejó fuera de la oferta al analizar (páginas de LinkedIn). */
  offerCleanup: OfferCleanup;
};

/**
 * State of the analysis. Everything stays in memory: the texts are never stored nor sent
 * anywhere, and closing the screen discards them.
 *
 * `focusField` moves focus to the first field that stops the analysis from starting.
 */
export function useCvMatch(cv: CvInput, focusField: (field: InputField) => void) {
  const [offerText, setOfferText] = useState('');
  // Validation runs on submit; once errors show, they follow the fields as they change.
  const [attempted, setAttempted] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [comparison, setComparison] = useState<AnalysisComparison | null>(null);
  const [offerChanged, setOfferChanged] = useState(false);

  const missing = missingInputs(cv.text ?? '', offerText);

  // Devuelve si se ha analizado, para que la pantalla decida si muestra los resultados.
  const analyze = (): boolean => {
    setAttempted(true);
    if (missing.length > 0 || cv.text === null) {
      focusField(missing[0] ?? 'cv');
      return false;
    }
    setAttempted(false);
    // Se analiza la oferta sin el contenido ajeno de la página; el texto del usuario no cambia.
    const offerCleanup = cleanOfferText(offerText);
    const result = analyzeMatch(cv.text, offerCleanup.text);
    // Comparing only makes sense for versions of the CV against the same offer.
    const sameOffer = analysis?.offerText === offerText;
    setComparison(analysis && sameOffer ? compareAnalyses(analysis.result, result) : null);
    setOfferChanged(analysis !== null && !sameOffer);
    setAnalysis({ result, cvText: cv.text, offerText, sourceKey: cv.sourceKey, offerCleanup });
    return true;
  };

  // Results of another CV are hidden until the new one is analyzed.
  const cvReplaced = analysis !== null && analysis.sourceKey !== cv.sourceKey;

  return {
    offerText,
    errors: attempted ? missing : [],
    result: cvReplaced ? null : (analysis?.result ?? null),
    offerCleanup: cvReplaced ? null : (analysis?.offerCleanup ?? null),
    /** Texto del CV del último análisis: el análisis semántico busca en él, no en el actual. */
    analyzedCvText: cvReplaced ? null : (analysis?.cvText ?? null),
    comparison,
    offerChanged,
    cvReplaced,
    isOutdated:
      analysis !== null &&
      !cvReplaced &&
      (analysis.cvText !== cv.text || analysis.offerText !== offerText),
    changeOffer: setOfferText,
    analyze,
    loadSampleOffer: () => {
      setOfferText(sampleOffer);
      setAttempted(false);
    },
  };
}
