/*
Prepara los archivos del análisis semántico local para servirlos desde el propio dominio.

Descarga de Hugging Face una revisión fija de multilingual-e5-small (conversión ONNX de Xenova,
licencia MIT del modelo original de intfloat), comprueba el SHA-256 de cada archivo y trocea el
modelo en partes de menos de 25 MiB, el máximo por archivo de Cloudflare Pages. Copia junto a él
el runtime WASM de onnxruntime-web, el tokenizador y el worker de JobRadar.

Todo va a `<salida>/<versión>/`, cuyo nombre cambia con cualquier contenido, y
`<salida>/manifest.json` indica la versión vigente, los tamaños y los SHA-256 de cada parte. El
navegador comprueba esos SHA-256 antes de usar el modelo.

Los pesos no se guardan en Git: se descargan al compilar y se reutilizan desde
`node_modules/.cache/jobradar-semantic/`.

Uso: node scripts/prepare-semantic-model.cjs [carpeta de salida, por defecto dist/semantic]
*/
const crypto = require('node:crypto');
const fs = require('node:fs');
const { stripTypeScriptTypes } = require('node:module');
const path = require('node:path');

const repository = 'Xenova/multilingual-e5-small';
const revision = '761b726dd34fb83930e26aab4e9ac3899aa1fa78';
const sources = {
  model: {
    file: 'onnx/model_quantized.onnx',
    size: 118308185,
    sha256: 'f80102d3f2a1229f387d3c81909990d8945513e347b0eab049f7de3c6f98c193',
  },
  tokenizer: {
    file: 'tokenizer.json',
    size: 17082730,
    sha256: '0b44a9d7b51c3c62626640cda0e2c2f70fdacdc25bbbd68038369d14ebdf4c39',
  },
  tokenizerConfig: {
    file: 'tokenizer_config.json',
    size: 443,
    sha256: null,
  },
};
// Margen respecto al límite de 25 MiB de Cloudflare Pages.
const partSize = 20 * 1024 * 1024;

const root = path.resolve(__dirname, '..');
const out = path.resolve(process.argv[2] ?? path.join(root, 'dist', 'semantic'));
const cache = path.join(root, 'node_modules', '.cache', 'jobradar-semantic', revision);
const ortDist = path.join(root, 'node_modules', 'onnxruntime-web', 'dist');
const runtimeFiles = [
  [path.join(ortDist, 'ort.wasm.min.mjs'), 'runtime/ort.wasm.min.mjs'],
  [path.join(ortDist, 'ort-wasm-simd-threaded.mjs'), 'runtime/ort-wasm-simd-threaded.mjs'],
  [path.join(ortDist, 'ort-wasm-simd-threaded.wasm'), 'runtime/ort-wasm-simd-threaded.wasm'],
  [
    path.join(root, 'node_modules', '@huggingface', 'tokenizers', 'dist', 'tokenizers.min.mjs'),
    'runtime/tokenizers.min.mjs',
  ],
];

// El worker está escrito en TypeScript sin sintaxis que necesite compilarse: basta con quitar los
// tipos y añadir la extensión a las importaciones relativas, que el navegador exige.
const workerDir = path.join(
  root,
  'src',
  'features',
  'cv-match',
  'infrastructure',
  'semantic-worker',
);
const workerModules = ['worker', 'embedder', 'compact-unigram'];

function workerModule(name) {
  if (typeof stripTypeScriptTypes !== 'function') {
    throw new Error('Se necesita Node 22.13 o posterior para preparar el worker semántico.');
  }
  const source = fs.readFileSync(path.join(workerDir, `${name}.ts`), 'utf8');
  const code = stripTypeScriptTypes(source, { mode: 'strip' }).replace(
    /(from\s+'\.\/[\w-]+)'/g,
    "$1.mjs'",
  );
  return Buffer.from(code);
}

const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');

async function download({ file, size, sha256: expected }) {
  const target = path.join(cache, file);
  if (fs.existsSync(target)) {
    const data = fs.readFileSync(target);
    if (data.length === size && (!expected || sha256(data) === expected)) return data;
  }
  const url = `https://huggingface.co/${repository}/resolve/${revision}/${file}`;
  console.log(`Descargando ${url}`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${file}: respuesta ${response.status}`);
  const data = Buffer.from(await response.arrayBuffer());
  // Una descarga distinta de la fijada detiene la compilación en lugar de publicar otro modelo.
  if (data.length !== size) throw new Error(`${file}: ${data.length} bytes, se esperaban ${size}`);
  if (expected && sha256(data) !== expected) throw new Error(`${file}: SHA-256 inesperado`);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, data);
  return data;
}

async function main() {
  const model = await download(sources.model);
  const tokenizer = await download(sources.tokenizer);
  const tokenizerConfig = await download(sources.tokenizerConfig);

  const files = [];
  for (let offset = 0, index = 0; offset < model.length; offset += partSize, index += 1) {
    files.push({
      path: `model/model.onnx.part${index}`,
      data: model.subarray(offset, offset + partSize),
    });
  }
  files.push({ path: 'model/tokenizer.json', data: tokenizer });
  files.push({ path: 'model/tokenizer_config.json', data: tokenizerConfig });
  for (const [from, to] of runtimeFiles) files.push({ path: to, data: fs.readFileSync(from) });
  for (const name of workerModules) files.push({ path: `${name}.mjs`, data: workerModule(name) });

  for (const file of files) {
    if (file.data.length >= 25 * 1024 * 1024) throw new Error(`${file.path} supera 25 MiB`);
    file.sha256 = sha256(file.data);
  }
  // La versión resume todo el contenido: si cambia un archivo, cambia la carpeta y la caché.
  const version = `e5-small-${sha256(files.map((file) => file.sha256).join('')).slice(0, 12)}`;

  fs.rmSync(out, { recursive: true, force: true });
  for (const file of files) {
    const target = path.join(out, version, file.path);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, file.data);
  }

  const describe = (file) => ({ path: file.path, size: file.data.length, sha256: file.sha256 });
  const modelParts = files.filter((file) => file.path.startsWith('model/model.onnx.part'));
  const manifest = {
    version,
    model: {
      name: 'multilingual-e5-small',
      source: `https://huggingface.co/${repository}/tree/${revision}`,
      license: 'MIT',
      parts: modelParts.map(describe),
      sha256: sources.model.sha256,
    },
    tokenizer: describe(files.find((file) => file.path === 'model/tokenizer.json')),
    tokenizerConfig: describe(files.find((file) => file.path === 'model/tokenizer_config.json')),
    runtime: files.filter((file) => !file.path.startsWith('model/')).map(describe),
    // Lo que descarga el navegador la primera vez que se activa el análisis semántico.
    downloadBytes: files.reduce((total, file) => total + file.data.length, 0),
  };
  fs.writeFileSync(path.join(out, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(
    `Modelo semántico preparado en ${path.relative(root, out)}/${version} ` +
      `(${(manifest.downloadBytes / 1048576).toFixed(1)} MiB, ${files.length} archivos).`,
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
