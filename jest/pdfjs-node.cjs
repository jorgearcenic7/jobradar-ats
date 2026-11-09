// Runs `pdfjs-text-items.mjs` in a separate Node process for the cv-import integration test:
// Jest cannot load PDF.js, which is published only as ES modules.
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const runner = path.join(__dirname, 'pdfjs-text-items.mjs');

/**
 * Raw PDF.js text items of every page, or the error PDF.js raised. `environment` simulates a
 * browser without `Promise.withResolvers`, with or without the app's polyfill.
 */
function extractPdfTextItems(bytes, options, environment = {}) {
  const env = { ...process.env };
  if (environment.withoutPromiseWithResolvers) env.PDFJS_WITHOUT_PROMISE_WITH_RESOLVERS = '1';
  if (environment.installPolyfill) env.PDFJS_INSTALL_POLYFILL = '1';
  // Node 22.13 a 22.17 (admitidos por el proyecto) solo eliminan tipos con esta opción.
  const flags = environment.installPolyfill ? ['--experimental-strip-types'] : [];
  const output = execFileSync(process.execPath, [...flags, runner, JSON.stringify(options)], {
    input: Buffer.from(bytes),
    env,
    // Node avisa por stderr al eliminar los tipos del polyfill; el resultado va por stdout.
    stdio: ['pipe', 'pipe', 'pipe'],
    maxBuffer: 64 * 1024 * 1024,
  });
  return JSON.parse(output.toString('utf8'));
}

module.exports = { extractPdfTextItems };
