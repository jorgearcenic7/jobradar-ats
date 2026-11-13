/*
En la app nativa no hay análisis semántico: el modelo se ejecuta con el runtime WebAssembly de
la web. El analizador funciona igual sin él.
*/
import type { SemanticEngine } from './semantic-engine-types';

export const semanticEngine: SemanticEngine = {
  supported: false,
  manifest: async () => null,
  isDownloaded: async () => false,
  load: async () => null,
  embed: async () => ({ vectors: new Float32Array(0), dimensions: 0 }),
  removeDownload: async () => {},
};
