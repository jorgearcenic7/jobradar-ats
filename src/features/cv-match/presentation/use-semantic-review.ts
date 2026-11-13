/*
Estado del análisis semántico opcional en Resultados.

Nada se descarga ni se calcula hasta que el usuario lo activa, después de ver cuánto ocupa el
modelo. Una vez activado, se aplica a los análisis siguientes de la misma página sin volver a
preguntar; el modelo queda cargado en el worker mientras la página siga abierta. Si el
dispositivo no lo admite o algo falla, el resultado determinista no cambia.

Los textos solo viajan entre la página y el worker. El resultado (`SemanticReview`) son frases
literales del CV agrupadas por requisito y no se guarda en ningún sitio.
*/
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  cosine,
  e5Passage,
  e5Query,
  selectSemanticCandidates,
  semanticTargets,
  type SemanticReview,
} from '@/features/cv-match/domain/semantic-candidates';
import type { AnalysisResult } from '@/features/cv-match/domain/types';
import { semanticEngine as defaultEngine } from '@/features/cv-match/infrastructure/semantic-engine';
import {
  SemanticEngineError,
  type SemanticEngine,
  type SemanticManifest,
} from '@/features/cv-match/infrastructure/semantic-engine-types';

export type SemanticErrorCode = 'download' | 'integrity' | 'crashed' | 'unknown';

export type SemanticState =
  | { kind: 'checking' }
  /** El navegador no lo admite (`unsupported`) o esta compilación no incluye el modelo. */
  | { kind: 'unavailable'; reason: 'unsupported' | 'missing-model' }
  | { kind: 'idle'; manifest: SemanticManifest; downloaded: boolean }
  | { kind: 'loading'; manifest: SemanticManifest; loaded: number; total: number }
  | { kind: 'analyzing'; manifest: SemanticManifest }
  | {
      kind: 'ready';
      manifest: SemanticManifest;
      review: SemanticReview;
      /** Requisitos consultados: los no reconocidos y las competencias no acreditadas. */
      queried: number;
    }
  | { kind: 'error'; manifest: SemanticManifest; code: SemanticErrorCode };

// Elegido en esta página: los análisis siguientes no vuelven a preguntar.
let activatedInPage = false;

/** Solo para las pruebas: olvida la activación de la página. */
export function resetSemanticActivation() {
  activatedInPage = false;
}

function errorCode(error: unknown): SemanticErrorCode {
  if (!(error instanceof SemanticEngineError)) return 'unknown';
  return error.code === 'download' || error.code === 'integrity' || error.code === 'crashed'
    ? error.code
    : 'unknown';
}

export function useSemanticReview(
  result: AnalysisResult | null,
  cvText: string | null,
  engine: SemanticEngine = defaultEngine,
) {
  const [state, setState] = useState<SemanticState>({ kind: 'checking' });
  // En el estado, para que la revisión automática espere a que llegue; en la referencia, para
  // leerlo desde las acciones sin recrearlas.
  const [manifest, setManifest] = useState<SemanticManifest | null>(null);
  const manifestRef = useRef<SemanticManifest | null>(null);
  // Identifica el cálculo en curso: si llega otro análisis, el anterior se descarta.
  const run = useRef(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!engine.supported) {
        setState({ kind: 'unavailable', reason: 'unsupported' });
        return;
      }
      const manifest = await engine.manifest();
      if (cancelled) return;
      manifestRef.current = manifest;
      setManifest(manifest);
      if (!manifest) {
        setState({ kind: 'unavailable', reason: 'missing-model' });
        return;
      }
      setState({ kind: 'idle', manifest, downloaded: await engine.isDownloaded(manifest) });
    })();
    return () => {
      cancelled = true;
    };
  }, [engine]);

  const analyze = useCallback(
    async (manifest: SemanticManifest) => {
      const id = ++run.current;
      if (!result || cvText === null) return;
      setState({ kind: 'analyzing', manifest });
      try {
        const targets = semanticTargets(cvText, result);
        let review: SemanticReview = {};
        if (targets.queries.length > 0 && targets.passages.length > 0) {
          const queries = await engine.embed(targets.queries.map((query) => e5Query(query.text)));
          const passages = await engine.embed(
            targets.passages.map((passage) => e5Passage(passage.text)),
          );
          review = selectSemanticCandidates(targets, (q, p) =>
            cosine(queries.vectors, q, passages.vectors, p, queries.dimensions),
          );
        }
        if (id !== run.current) return;
        setState({ kind: 'ready', manifest, review, queried: targets.queries.length });
      } catch (error) {
        if (id !== run.current) return;
        activatedInPage = false;
        setState({ kind: 'error', manifest, code: errorCode(error) });
      }
    },
    [result, cvText, engine],
  );

  const activate = useCallback(async () => {
    const manifest = manifestRef.current;
    if (!manifest) return;
    const id = ++run.current;
    setState({ kind: 'loading', manifest, loaded: 0, total: manifest.downloadBytes });
    try {
      await engine.load(manifest, (loaded, total) => {
        if (id === run.current) setState({ kind: 'loading', manifest, loaded, total });
      });
    } catch (error) {
      if (id === run.current) setState({ kind: 'error', manifest, code: errorCode(error) });
      return;
    }
    activatedInPage = true;
    await analyze(manifest);
  }, [engine, analyze]);

  // Con la función ya activada, cada análisis nuevo se revisa sin volver a preguntar.
  useEffect(() => {
    if (!activatedInPage || !manifest || !result) return;
    void (async () => {
      try {
        await engine.load(manifest, () => {});
      } catch (error) {
        setState({ kind: 'error', manifest, code: errorCode(error) });
        return;
      }
      await analyze(manifest);
    })();
  }, [manifest, result, analyze, engine]);

  const remove = useCallback(async () => {
    run.current += 1;
    activatedInPage = false;
    await engine.removeDownload();
    const manifest = manifestRef.current;
    if (manifest) setState({ kind: 'idle', manifest, downloaded: false });
  }, [engine]);

  return { state, activate, remove };
}
