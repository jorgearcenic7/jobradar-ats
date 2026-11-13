/*
Tokenizer Unigram con poca memoria para el vocabulario de XLM-RoBERTa (250.002 piezas).

El Unigram de @huggingface/tokenizers guarda el vocabulario en un trie con un `Map` por nodo:
con este vocabulario ocupa unos 200 MiB, que en un iPhone pueden bastar para que Safari cierre
la página. Aquí las piezas se buscan en un único `Map` probando los prefijos de cada posición,
hasta la longitud de la pieza más larga.

El resultado es el mismo que el de la biblioteca: se insertan los mismos candidatos en el
mismo orden (de más corto a más largo, y la pieza desconocida cuando no hay una de un
carácter) y Viterbi elige con la misma regla, así que los empates se resuelven igual. El resto
del proceso (normalización, pretokenización, tokens especiales y plantilla) sigue siendo el de
la biblioteca, que se construye con un vocabulario mínimo para no levantar el trie.

Sin dependencias en tiempo de ejecución: las clases de la biblioteca llegan como parámetros,
porque en el worker se cargan con un `import()` del archivo servido por la propia web.
*/
import type { Model, Tokenizer } from '@huggingface/tokenizers';

export type UnigramModelJson = {
  type: 'Unigram';
  unk_id: number;
  vocab: [string, number][];
};

export type TokenizerJson = {
  model: UnigramModelJson;
  added_tokens: { id: number; content: string }[];
};

type TokenizerLibrary = {
  Tokenizer: typeof Tokenizer;
  Model: typeof Model;
};

export function createCompactTokenizer(
  library: TokenizerLibrary,
  json: TokenizerJson,
  config: { eos_token?: string } & Record<string, unknown>,
): Tokenizer {
  const unkId = json.model.unk_id;

  // El vocabulario llega por parámetro: si el constructor lo leyera de `json`, la clase lo
  // retendría en su clausura (unos 70 MiB de pares) mientras exista el tokenizer.
  class CompactUnigram extends library.Model {
    private readonly scores: Float64Array;
    private readonly unkScore: number;
    private readonly maxPieceLength: number;

    constructor(model: UnigramModelJson) {
      super({ ...model, vocab: [] });
      const { vocab } = model;
      this.vocab = new Array(vocab.length);
      this.scores = new Float64Array(vocab.length);
      let minScore = Infinity;
      let maxPieceLength = 1;
      for (let id = 0; id < vocab.length; id += 1) {
        const [piece, score] = vocab[id];
        this.vocab[id] = piece;
        this.scores[id] = score;
        if (score < minScore) minScore = score;
        // Longitud en puntos de código, como los caracteres del retículo.
        const length = Array.from(piece).length;
        if (length > maxPieceLength) maxPieceLength = length;
      }
      this.tokens_to_ids = new Map(this.vocab.map((piece, id) => [piece, id]));
      this.unk_token_id = unkId;
      this.unk_token = this.vocab[unkId];
      this.unkScore = minScore - 10;
      this.scores[unkId] = this.unkScore;
      this.maxPieceLength = maxPieceLength;
      this.fuse_unk = true;
    }

    private tokenize(text: string): string[] {
      const chars = Array.from(text);
      const length = chars.length;
      const position: number[] = [0, length];
      const size: number[] = [0, 0];
      const score: number[] = [0, 0];
      const backtrace: number[] = [0, 0];
      const previous: number[] = [-1, -1];
      // Nodo 0: inicio, que termina en la posición 0. Nodo 1: fin, que empieza en la última.
      const beginNodes: number[][] = Array.from({ length: length + 1 }, () => []);
      const endNodes: number[][] = Array.from({ length: length + 1 }, () => []);
      beginNodes[length].push(1);
      endNodes[0].push(0);
      const insert = (begin: number, pieceLength: number, pieceScore: number) => {
        const node = position.length;
        position.push(begin);
        size.push(pieceLength);
        score.push(pieceScore);
        backtrace.push(0);
        previous.push(-1);
        beginNodes[begin].push(node);
        endNodes[begin + pieceLength].push(node);
      };

      for (let begin = 0; begin < length; begin += 1) {
        let piece = '';
        let hasSingle = false;
        const limit = Math.min(this.maxPieceLength, length - begin);
        for (let pieceLength = 1; pieceLength <= limit; pieceLength += 1) {
          piece += chars[begin + pieceLength - 1];
          const id = this.tokens_to_ids.get(piece);
          if (id === undefined) continue;
          insert(begin, pieceLength, this.scores[id]);
          if (pieceLength === 1) hasSingle = true;
        }
        if (!hasSingle) insert(begin, 1, this.unkScore);
      }

      for (let pos = 0; pos <= length; pos += 1) {
        if (beginNodes[pos].length === 0) return [];
        for (const right of beginNodes[pos]) {
          let best = -1;
          let bestScore = 0;
          for (const left of endNodes[pos]) {
            const candidate = backtrace[left] + score[right];
            if (best === -1 || candidate > bestScore) {
              best = left;
              bestScore = candidate;
            }
          }
          if (best === -1) return [];
          previous[right] = best;
          backtrace[right] = bestScore;
        }
      }

      const pieces: string[] = [];
      for (let node = previous[1]; node > 0 && previous[node] !== -1; node = previous[node]) {
        pieces.push(chars.slice(position[node], position[node] + size[node]).join(''));
      }
      return pieces.reverse();
    }

    encode(tokens: string[]): string[] {
      return tokens.flatMap((token) => this.tokenize(token));
    }
  }

  // El tokenizer guarda el JSON que recibe: se le pasa sin el vocabulario completo.
  const light = { ...json, model: { ...json.model, vocab: json.model.vocab.slice(0, unkId + 1) } };
  const tokenizer = new library.Tokenizer(light, config);
  const model = new CompactUnigram(json.model);
  for (const token of json.added_tokens) {
    model.tokens_to_ids.set(token.content, token.id);
    model.vocab[token.id] = token.content;
  }
  tokenizer.model = model;
  return tokenizer;
}
