/*
Mide el análisis semántico de la v1.4 con el modelo real, en Node y sin navegador.

Para cada CV ficticio de `jest/semantic-corpus.ts` construye un resultado con los requisitos del
corpus como no reconocidos, obtiene las consultas y frases con `semanticTargets` (el mismo
filtrado que la app) y calcula los embeddings con `embedder.ts` y el tokenizer compacto.
Después:

1. Calibra `floor`, `margin` y `maxPerRequirement` con la mitad `dev`: entre las combinaciones
   sin ningún falso positivo, la de mayor exhaustividad; a igualdad, la más exigente.
2. Informa de aciertos, falsos positivos y falsos negativos en `dev` y en `test` con los valores
   calibrados y con los de `defaultSemanticRules`, junto al motor determinista solo, que en estos
   requisitos no propone nada.
3. Mide el tiempo de cálculo de embeddings.

Requiere haber preparado antes el modelo:
  node scripts/prepare-semantic-model.cjs node_modules/.cache/semantic-model
  node scripts/semantic-benchmark.mjs node_modules/.cache/semantic-model
*/
import fs from 'node:fs';
import path from 'node:path';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';

// Los módulos del dominio importan sin extensión, como en la app: se resuelven a `.ts`.
registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (!specifier.startsWith('.')) throw error;
      return nextResolve(`${specifier}.ts`, context);
    }
  },
});

const root = path.resolve(import.meta.dirname, '..');
const modelDir = path.resolve(process.argv[2] ?? 'node_modules/.cache/semantic-model');
const load = (file) => import(pathToFileURL(path.join(root, file)).href);

const ort = await import('onnxruntime-web');
const tokenizers = await import('@huggingface/tokenizers');
const { createCompactTokenizer } = await load(
  'src/features/cv-match/infrastructure/semantic-worker/compact-unigram.ts',
);
const { createEmbedder } = await load(
  'src/features/cv-match/infrastructure/semantic-worker/embedder.ts',
);
const semantic = await load('src/features/cv-match/domain/semantic-candidates.ts');
const { semanticCases, semanticCvs } = await load('jest/semantic-corpus.ts');

const manifest = JSON.parse(fs.readFileSync(path.join(modelDir, 'manifest.json'), 'utf8'));
const versionDir = path.join(modelDir, manifest.version);
const read = (file) => fs.readFileSync(path.join(versionDir, file));

ort.env.wasm.numThreads = 1;
const initStart = performance.now();
const tokenizer = createCompactTokenizer(
  tokenizers,
  JSON.parse(read(manifest.tokenizer.path).toString('utf8')),
  JSON.parse(read(manifest.tokenizerConfig.path).toString('utf8')),
);
const model = new Uint8Array(Buffer.concat(manifest.model.parts.map((part) => read(part.path))));
const embedder = await createEmbedder({ ort, tokenizer, model });
const initMs = performance.now() - initStart;

// Similitudes por CV: una matriz consultas × frases, con los casos en el orden de las consultas.
const groups = [];
let embedMs = 0;
let embeddedTexts = 0;
for (const cv of Object.keys(semanticCvs)) {
  const cases = semanticCases.filter((item) => item.cv === cv);
  const result = {
    requirements: cases.map((item, index) => ({
      requirement: {
        kind: 'unrecognized',
        id: `unrecognized:${index + 1}`,
        label: item.requirement,
        importance: 'required',
        sources: [item.requirement],
      },
      status: 'not-evaluable',
      reason: '',
      evidence: [],
      contribution: null,
    })),
  };
  const targets = semantic.semanticTargets(semanticCvs[cv], result);
  const started = performance.now();
  const queries = await embedder.embed(targets.queries.map((q) => semantic.e5Query(q.text)));
  const passages = await embedder.embed(targets.passages.map((p) => semantic.e5Passage(p.text)));
  embedMs += performance.now() - started;
  embeddedTexts += targets.queries.length + targets.passages.length;
  const { dimensions } = queries;
  const matrix = targets.queries.map((_, q) =>
    targets.passages.map((_, p) =>
      semantic.cosine(queries.vectors, q, passages.vectors, p, dimensions),
    ),
  );
  groups.push({ cv, cases, targets, matrix });
}

function evaluate(rules, split) {
  const totals = { tp: 0, fp: 0, fn: 0, trapFp: 0, expected: 0, proposals: [] };
  for (const { cases, targets, matrix } of groups) {
    const review = semantic.selectSemanticCandidates(targets, (q, p) => matrix[q][p], rules);
    cases.forEach((item, index) => {
      if (split && item.split !== split) return;
      const proposed = review[`unrecognized:${index + 1}`] ?? [];
      const isExpected = (text) => item.expected.some((fragment) => text.includes(fragment));
      const found = item.expected.filter((fragment) =>
        proposed.some((candidate) => candidate.text.includes(fragment)),
      );
      totals.expected += item.expected.length;
      totals.tp += found.length;
      totals.fn += item.expected.length - found.length;
      for (const candidate of proposed) {
        if (isExpected(candidate.text)) continue;
        totals.fp += 1;
        const trap = item.traps.find((t) => candidate.text.includes(t.text));
        if (trap) totals.trapFp += 1;
        totals.proposals.push(
          `  FP ${trap ? `[trampa ${trap.kind}] ` : ''}«${item.requirement}» → «${candidate.text}»`,
        );
      }
    });
  }
  const precision = totals.tp + totals.fp ? totals.tp / (totals.tp + totals.fp) : 1;
  const recall = totals.expected ? totals.tp / totals.expected : 1;
  const beta2 = 0.25;
  const f05 =
    precision + recall ? ((1 + beta2) * precision * recall) / (beta2 * precision + recall) : 0;
  return { ...totals, precision, recall, f05 };
}

let best = null;
for (const maxPerRequirement of [1, 2]) {
  for (let floor = 0.8; floor <= 0.9001; floor += 0.005) {
    for (let margin = 0; margin <= 0.1001; margin += 0.005) {
      const rules = { floor: +floor.toFixed(3), margin: +margin.toFixed(3), maxPerRequirement };
      const score = evaluate(rules, 'dev');
      if (score.fp > 0) continue;
      // Con la misma exhaustividad gana la combinación más exigente (se recorren en orden creciente).
      if (!best || score.recall >= best.score.recall) best = { rules, score };
    }
  }
}

const line = (name, s) =>
  `${name.padEnd(34)} TP ${String(s.tp).padStart(2)}  FP ${String(s.fp).padStart(2)} (trampas ${s.trapFp})  FN ${String(s.fn).padStart(2)}  precisión ${(s.precision * 100).toFixed(0)} %  exhaustividad ${(s.recall * 100).toFixed(0)} %`;
const deterministic = (split) => {
  const cases = semanticCases.filter((item) => item.split === split);
  const expected = cases.reduce((total, item) => total + item.expected.length, 0);
  return { tp: 0, fp: 0, trapFp: 0, fn: expected, precision: 1, recall: 0 };
};

console.log(`Modelo ${manifest.model.name} (${manifest.version}); ${semanticCases.length} casos.`);
console.log(
  `Inicialización ${initMs.toFixed(0)} ms; ${embeddedTexts} textos en ${embedMs.toFixed(0)} ms (${(embedMs / embeddedTexts).toFixed(1)} ms por texto).`,
);
console.log(
  `\nCalibrado en dev: floor ${best.rules.floor}, margin ${best.rules.margin}, máximo ${best.rules.maxPerRequirement} por requisito`,
);
for (const split of ['dev', 'test']) {
  console.log(`\n[${split}]`);
  console.log(line('Motor determinista solo', deterministic(split)));
  console.log(line('Híbrido, valores calibrados', evaluate(best.rules, split)));
  const current = evaluate(semantic.defaultSemanticRules, split);
  console.log(line('Híbrido, defaultSemanticRules', current));
  for (const proposal of current.proposals) console.log(proposal);
}
const all = evaluate(semantic.defaultSemanticRules);
console.log(`\n[todo] ${line('defaultSemanticRules', all)}`);
await embedder.dispose();
