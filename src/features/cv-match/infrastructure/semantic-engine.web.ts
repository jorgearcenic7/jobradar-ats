/*
Conexión entre la página y el worker semántico (solo web).

El modelo y el runtime se sirven desde `/semantic/`, en el propio dominio: el manifiesto dice qué
versión usar y cuánto ocupa, para informar antes de descargar nada. Hay un único worker por
página, que se crea al activar el análisis semántico y conserva el modelo cargado mientras la
página siga abierta.

Si el navegador no tiene lo necesario (Web Workers de tipo módulo, WebAssembly con SIMD y
`crypto.subtle`), el motor se declara no disponible y el analizador sigue igual.
*/
import {
  SemanticEngineError,
  type LoadTimings,
  type SemanticEngine,
  type SemanticManifest,
} from './semantic-engine-types';
import type { WorkerRequest, WorkerResponse } from './semantic-worker/protocol';

const BASE = '/semantic/';
const CACHE_NAME = 'jobradar-semantic';

// Módulo mínimo con una instrucción SIMD: el runtime de ONNX que se publica la necesita.
const simdProbe = new Uint8Array([
  0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15,
  253, 98, 11,
]);

function isSupported(): boolean {
  try {
    return (
      typeof Worker !== 'undefined' &&
      typeof WebAssembly === 'object' &&
      WebAssembly.validate(simdProbe) &&
      typeof globalThis.crypto?.subtle?.digest === 'function'
    );
  } catch {
    return false;
  }
}

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<
  number,
  {
    resolve: (value: { vectors: Float32Array; dimensions: number }) => void;
    reject: (error: Error) => void;
  }
>();
let loadRequest: {
  resolve: (timings: LoadTimings | null) => void;
  reject: (error: Error) => void;
  onProgress: (loaded: number, total: number) => void;
} | null = null;

function failAll(error: Error) {
  loadRequest?.reject(error);
  loadRequest = null;
  for (const request of pending.values()) request.reject(error);
  pending.clear();
}

function workerFor(manifest: SemanticManifest): Worker {
  if (worker) return worker;
  const created = new Worker(`${BASE}${manifest.version}/worker.mjs`, { type: 'module' });
  created.onmessage = ({ data }: MessageEvent<WorkerResponse>) => {
    switch (data.type) {
      case 'progress':
        loadRequest?.onProgress(data.loaded, data.total);
        break;
      case 'ready':
        loadRequest?.resolve(data.timings);
        loadRequest = null;
        break;
      case 'embedded':
        pending.get(data.id)?.resolve({ vectors: data.vectors, dimensions: data.dimensions });
        pending.delete(data.id);
        break;
      case 'error':
        if (data.id === undefined) {
          loadRequest?.reject(new SemanticEngineError(data.code));
          loadRequest = null;
        } else {
          pending.get(data.id)?.reject(new SemanticEngineError(data.code));
          pending.delete(data.id);
        }
        break;
    }
  };
  // Un fallo del propio worker (por ejemplo, sin memoria) invalida todo lo pendiente.
  created.onerror = () => {
    failAll(new SemanticEngineError('crashed'));
    created.terminate();
    if (worker === created) worker = null;
  };
  worker = created;
  return created;
}

const post = (target: Worker, message: WorkerRequest) => target.postMessage(message);

export const semanticEngine: SemanticEngine = {
  supported: isSupported(),

  async manifest() {
    try {
      const response = await fetch(`${BASE}manifest.json`, { cache: 'no-cache' });
      if (!response.ok) return null;
      return (await response.json()) as SemanticManifest;
    } catch {
      return null;
    }
  },

  async isDownloaded(manifest) {
    try {
      const cache = await caches.open(CACHE_NAME);
      const parts = [...manifest.model.parts, manifest.tokenizer];
      const found = await Promise.all(
        parts.map((part) =>
          cache.match(new URL(`${BASE}${manifest.version}/${part.path}`, location.href).href),
        ),
      );
      return found.every(Boolean);
    } catch {
      return false;
    }
  },

  load(manifest, onProgress) {
    const target = workerFor(manifest);
    return new Promise((resolve, reject) => {
      loadRequest = { resolve, reject, onProgress };
      post(target, { type: 'load', manifest });
    });
  },

  embed(texts) {
    if (!worker) return Promise.reject(new SemanticEngineError('not-loaded'));
    const id = nextId++;
    const target = worker;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      post(target, { type: 'embed', id, texts });
    });
  },

  async removeDownload() {
    failAll(new SemanticEngineError('not-loaded'));
    worker?.terminate();
    worker = null;
    try {
      await caches.delete(CACHE_NAME);
    } catch {
      // Sin Cache API no había nada guardado.
    }
  },
};
