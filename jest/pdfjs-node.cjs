// Runs `pdfjs-text-items.mjs` in a separate Node process for the cv-import integration test:
// Jest cannot load PDF.js, which is published only as ES modules.
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const runner = path.join(__dirname, 'pdfjs-text-items.mjs');

/** Raw PDF.js text items of every page, or the error PDF.js raised. */
function extractPdfTextItems(bytes, options) {
  const output = execFileSync(process.execPath, [runner, JSON.stringify(options)], {
    input: Buffer.from(bytes),
    maxBuffer: 64 * 1024 * 1024,
  });
  return JSON.parse(output.toString('utf8'));
}

module.exports = { extractPdfTextItems };
