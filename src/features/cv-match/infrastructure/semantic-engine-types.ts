/*
Contrato del motor semántico, común a la web y a la app nativa. La implementación web vive en
`semantic-engine.web.ts`; la nativa, en `semantic-engine.ts`.
*/
import type { SemanticManifest, WorkerErrorCode } from './semantic-worker/protocol';

export type { SemanticManifest } from './semantic-worker/protocol';

export type LoadTimings = { downloadMs: number; initMs: number; fromCache: boolean };

export type SemanticEngine = {
  supported: boolean;
  /** El manifiesto publicado, o `null` si esta compilación no incluye el modelo. */
  manifest(): Promise<SemanticManifest | null>;
  /** Si el modelo de este manifiesto ya está guardado en el dispositivo. */
  isDownloaded(manifest: SemanticManifest): Promise<boolean>;
  load(
    manifest: SemanticManifest,
    onProgress: (loaded: number, total: number) => void,
  ): Promise<LoadTimings | null>;
  embed(texts: string[]): Promise<{ vectors: Float32Array; dimensions: number }>;
  /** Borra el modelo del dispositivo y cierra el worker. */
  removeDownload(): Promise<void>;
};

export class SemanticEngineError extends Error {
  readonly code: WorkerErrorCode | 'crashed';

  constructor(code: WorkerErrorCode | 'crashed') {
    super(code);
    this.code = code;
  }
}
