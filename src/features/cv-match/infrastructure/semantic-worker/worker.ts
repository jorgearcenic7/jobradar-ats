/*
Worker del análisis semántico local. Se ejecuta fuera del hilo principal para que la descarga,
la carga del modelo y la inferencia no bloqueen la interfaz.

Solo pide archivos a su propio origen, en la carpeta versionada que prepara
`scripts/prepare-semantic-model.cjs`. Las partes del modelo, el tokenizer y el WASM se comprueban
con el SHA-256 del manifiesto antes de usarse, vengan de la red o de la Cache API. Al cambiar de
versión se borran los archivos de la anterior.

Los textos del CV y de la oferta solo llegan por mensajes desde la página y no salen del
dispositivo: el worker no hace ninguna petición con ellos.
*/
import { createCompactTokenizer, type TokenizerJson } from './compact-unigram';
import { createEmbedder, type Embedder } from './embedder';
import type {
  ManifestFile,
  SemanticManifest,
  WorkerErrorCode,
  WorkerRequest,
  WorkerResponse,
} from './protocol';

const CACHE_NAME = 'jobradar-semantic';
const base = new URL('./', import.meta.url);

let loading: Promise<Embedder> | null = null;

function post(message: WorkerResponse, transfer: Transferable[] = []) {
  self.postMessage(message, { transfer });
}

class WorkerError extends Error {
  readonly code: WorkerErrorCode;

  constructor(code: WorkerErrorCode) {
    super(code);
    this.code = code;
  }
}

async function openCache(): Promise<Cache | null> {
  try {
    return await caches.open(CACHE_NAME);
  } catch {
    // Sin Cache API (navegación privada, almacenamiento bloqueado) se descarga en cada carga.
    return null;
  }
}

async function removeOtherVersions(cache: Cache | null) {
  if (!cache) return;
  for (const request of await cache.keys()) {
    if (!request.url.startsWith(base.href)) await cache.delete(request);
  }
}

async function sha256(data: Uint8Array) {
  const hash = await crypto.subtle.digest('SHA-256', data as Uint8Array<ArrayBuffer>);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Descarga o lee de la caché un archivo y comprueba su tamaño y su SHA-256. */
async function fetchVerified(
  entry: ManifestFile,
  cache: Cache | null,
  onBytes: (bytes: number, fromCache: boolean) => void,
): Promise<Uint8Array> {
  const url = new URL(entry.path, base).href;
  const cached = cache ? await cache.match(url) : undefined;
  let response: Response;
  try {
    response = cached ?? (await fetch(url));
  } catch {
    throw new WorkerError('download');
  }
  if (!response.ok) throw new WorkerError('download');
  const data = new Uint8Array(await response.arrayBuffer());
  if (data.length !== entry.size || (await sha256(data)) !== entry.sha256) {
    if (cached) await cache?.delete(url);
    throw new WorkerError('integrity');
  }
  if (!cached && cache) {
    try {
      await cache.put(
        url,
        new Response(data as Uint8Array<ArrayBuffer>, {
          headers: { 'Content-Type': 'application/octet-stream' },
        }),
      );
    } catch {
      // Sin espacio, el análisis funciona igual: solo habrá que descargar de nuevo otro día.
    }
  }
  onBytes(data.length, Boolean(cached));
  return data;
}

async function load(manifest: SemanticManifest): Promise<Embedder> {
  const started = performance.now();
  const cache = await openCache();
  await removeOtherVersions(cache);

  const wasmEntry = manifest.runtime.find((file) => file.path.endsWith('.wasm'));
  if (!wasmEntry) throw new WorkerError('integrity');
  const entries = [
    wasmEntry,
    manifest.tokenizer,
    manifest.tokenizerConfig,
    ...manifest.model.parts,
  ];
  const total = entries.reduce((sum, entry) => sum + entry.size, 0);
  let loaded = 0;
  let fromCache = true;
  const onBytes = (bytes: number, cached: boolean) => {
    loaded += bytes;
    fromCache &&= cached;
    post({ type: 'progress', loaded, total });
  };

  const wasm = await fetchVerified(wasmEntry, cache, onBytes);
  const tokenizerBytes = await fetchVerified(manifest.tokenizer, cache, onBytes);
  const tokenizerConfigBytes = await fetchVerified(manifest.tokenizerConfig, cache, onBytes);
  // Cada parte se copia en el buffer final y se suelta: así en memoria solo coinciden el
  // modelo y una parte, no el modelo dos veces.
  const model = new Uint8Array(manifest.model.parts.reduce((sum, part) => sum + part.size, 0));
  let offset = 0;
  for (const part of manifest.model.parts) {
    model.set(await fetchVerified(part, cache, onBytes), offset);
    offset += part.size;
  }
  const downloaded = performance.now();

  const runtime = new URL('runtime/', base).href;
  const [ort, tokenizers]: [
    typeof import('onnxruntime-web'),
    typeof import('@huggingface/tokenizers'),
  ] = await Promise.all([
    import(`${runtime}ort.wasm.min.mjs`),
    import(`${runtime}tokenizers.min.mjs`),
  ]);
  // Sin aislamiento entre orígenes no hay SharedArrayBuffer: un solo hilo y sin proxy.
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.proxy = false;
  ort.env.wasm.wasmPaths = runtime;
  ort.env.wasm.wasmBinary = wasm;

  const decoder = new TextDecoder();
  const tokenizer = createCompactTokenizer(
    tokenizers,
    JSON.parse(decoder.decode(tokenizerBytes)) as TokenizerJson,
    JSON.parse(decoder.decode(tokenizerConfigBytes)) as Record<string, unknown>,
  );
  const embedder = await createEmbedder({ ort, tokenizer, model });
  post({
    type: 'ready',
    timings: {
      downloadMs: downloaded - started,
      initMs: performance.now() - downloaded,
      fromCache,
    },
  });
  return embedder;
}

const codeOf = (error: unknown): WorkerErrorCode =>
  error instanceof WorkerError ? error.code : 'unknown';

self.onmessage = async ({ data: message }: MessageEvent<WorkerRequest>) => {
  if (message.type === 'load') {
    const alreadyLoading = loading !== null;
    loading ??= load(message.manifest);
    try {
      await loading;
      if (alreadyLoading) post({ type: 'ready', timings: null });
    } catch (error) {
      loading = null;
      post({ type: 'error', code: codeOf(error) });
    }
    return;
  }
  try {
    if (!loading) throw new WorkerError('not-loaded');
    const embedder = await loading;
    const started = performance.now();
    const { vectors, dimensions } = await embedder.embed(message.texts);
    post(
      { type: 'embedded', id: message.id, vectors, dimensions, ms: performance.now() - started },
      [vectors.buffer],
    );
  } catch (error) {
    post({ type: 'error', id: message.id, code: codeOf(error) });
  }
};
