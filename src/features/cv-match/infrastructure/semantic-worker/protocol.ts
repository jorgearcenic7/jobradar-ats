/*
Contrato entre la página y el worker semántico, y forma del manifiesto que genera
`scripts/prepare-semantic-model.cjs`. Solo contiene tipos: lo importan tanto el código de la app
como el worker, que se sirve sin pasar por Metro.
*/

export type ManifestFile = { path: string; size: number; sha256: string };

export type SemanticManifest = {
  version: string;
  model: {
    name: string;
    source: string;
    license: string;
    parts: ManifestFile[];
    sha256: string;
  };
  tokenizer: ManifestFile;
  tokenizerConfig: ManifestFile;
  runtime: ManifestFile[];
  /** Bytes que descarga el navegador la primera vez. */
  downloadBytes: number;
};

export type WorkerRequest =
  { type: 'load'; manifest: SemanticManifest } | { type: 'embed'; id: number; texts: string[] };

/**
 * - `download`: un archivo no se ha podido descargar.
 * - `integrity`: un archivo no coincide con su SHA-256.
 * - `not-loaded`: se ha pedido un cálculo antes de cargar el modelo.
 * - `unknown`: cualquier otro fallo del runtime.
 */
export type WorkerErrorCode = 'download' | 'integrity' | 'not-loaded' | 'unknown';

export type WorkerResponse =
  | { type: 'progress'; loaded: number; total: number }
  | {
      type: 'ready';
      /** `null` cuando el modelo ya estaba cargado en este worker. */
      timings: { downloadMs: number; initMs: number; fromCache: boolean } | null;
    }
  | { type: 'embedded'; id: number; vectors: Float32Array; dimensions: number; ms: number }
  | { type: 'error'; id?: number; code: WorkerErrorCode };
