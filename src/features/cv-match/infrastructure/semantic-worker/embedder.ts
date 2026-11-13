/*
Embeddings de frases con multilingual-e5-small, sin Transformers.js.

Reproduce su pipeline de extracción de características: tokeniza con el tokenizer del modelo,
ejecuta el modelo ONNX, promedia los estados ocultos de los tokens reales (sin el relleno) y
normaliza el vector para que el producto escalar sea la similitud coseno.

e5 espera prefijos: `query: ` para lo que se busca y `passage: ` para donde se busca. Los añade
quien llama, porque solo él sabe qué papel tiene cada texto.

Este archivo y los demás de la carpeta no entran en el bundle de Metro: el worker los carga
desde la carpeta que genera `scripts/prepare-semantic-model.cjs`, que les quita los tipos. Por
eso solo importan tipos y reciben el runtime como parámetro. También se usan desde Node para las
mediciones, así que no dependen de APIs del navegador.
*/
import type { Tensor } from 'onnxruntime-web';
import type { Tokenizer } from '@huggingface/tokenizers';

// Identificadores del tokenizer de XLM-RoBERTa, en el que se basa e5: `<pad>` y `</s>`.
const PAD_ID = 1;
const EOS_ID = 2;

export type EmbedResult = { vectors: Float32Array; dimensions: number };

export type Embedder = {
  /** Un vector normalizado por texto, en el mismo orden y concatenados. */
  embed(texts: string[]): Promise<EmbedResult>;
  dispose(): Promise<void>;
};

export type EmbedderOptions = {
  ort: typeof import('onnxruntime-web');
  tokenizer: Tokenizer;
  model: Uint8Array;
  /** Las frases de un CV o de una oferta caben de sobra en 128 tokens. */
  maxTokens?: number;
  /** Lotes pequeños para contener la memoria en móviles. */
  batchSize?: number;
};

export async function createEmbedder({
  ort,
  tokenizer,
  model,
  maxTokens = 128,
  batchSize = 8,
}: EmbedderOptions): Promise<Embedder> {
  const session = await ort.InferenceSession.create(model, {
    executionProviders: ['wasm'],
    graphOptimizationLevel: 'all',
  });
  const usesTokenTypes = session.inputNames.includes('token_type_ids');

  function encode(text: string): number[] {
    const { ids } = tokenizer.encode(text);
    // Se corta el final del texto, pero se conserva `</s>`, como hace la truncación del modelo.
    return ids.length <= maxTokens ? ids : [...ids.slice(0, maxTokens - 1), EOS_ID];
  }

  async function embedBatch(encoded: number[][]): Promise<EmbedResult> {
    const rows = encoded.length;
    const columns = Math.max(...encoded.map((ids) => ids.length));
    const inputIds = new BigInt64Array(rows * columns).fill(BigInt(PAD_ID));
    const mask = new BigInt64Array(rows * columns);
    encoded.forEach((ids, row) => {
      ids.forEach((id, column) => {
        inputIds[row * columns + column] = BigInt(id);
        mask[row * columns + column] = BigInt(1);
      });
    });
    const shape = [rows, columns];
    const feeds: Record<string, Tensor> = {
      input_ids: new ort.Tensor('int64', inputIds, shape),
      attention_mask: new ort.Tensor('int64', mask, shape),
    };
    if (usesTokenTypes) {
      feeds.token_type_ids = new ort.Tensor('int64', new BigInt64Array(rows * columns), shape);
    }
    const outputs = await session.run(feeds);
    const hidden = outputs.last_hidden_state ?? outputs[session.outputNames[0]];
    const dimensions = hidden.dims[2];
    const states = hidden.data as Float32Array;
    const vectors = new Float32Array(rows * dimensions);
    for (let row = 0; row < rows; row += 1) {
      const vector = vectors.subarray(row * dimensions, (row + 1) * dimensions);
      const tokens = encoded[row].length;
      for (let token = 0; token < tokens; token += 1) {
        const offset = (row * columns + token) * dimensions;
        for (let d = 0; d < dimensions; d += 1) vector[d] += states[offset + d];
      }
      let norm = 0;
      for (let d = 0; d < dimensions; d += 1) {
        vector[d] /= tokens;
        norm += vector[d] * vector[d];
      }
      norm = Math.sqrt(norm) || 1;
      for (let d = 0; d < dimensions; d += 1) vector[d] /= norm;
    }
    for (const output of Object.values(outputs)) output.dispose();
    return { vectors, dimensions };
  }

  return {
    // Agrupa frases de longitud parecida para no rellenar de más cada lote.
    async embed(texts) {
      const encoded = texts.map(encode);
      const order = encoded
        .map((_, index) => index)
        .sort((a, b) => encoded[a].length - encoded[b].length);
      let result: Float32Array | null = null;
      let dimensions = 0;
      for (let start = 0; start < order.length; start += batchSize) {
        const indices = order.slice(start, start + batchSize);
        const batch = await embedBatch(indices.map((index) => encoded[index]));
        dimensions = batch.dimensions;
        const target: Float32Array = (result ??= new Float32Array(texts.length * dimensions));
        indices.forEach((index, row) => {
          target.set(
            batch.vectors.subarray(row * dimensions, (row + 1) * dimensions),
            index * dimensions,
          );
        });
      }
      return { vectors: result ?? new Float32Array(0), dimensions };
    },
    async dispose() {
      await session.release();
    },
  };
}
