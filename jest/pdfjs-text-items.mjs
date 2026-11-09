// Runs PDF.js (legacy build) in plain Node for the cv-import integration test, since Jest
// cannot load its ES modules. Reads a PDF from stdin, takes the getDocument options as JSON
// in the first argument and prints the raw text items of every page as JSON.
//
// Con `PDFJS_WITHOUT_PROMISE_WITH_RESOLVERS` simula un navegador sin `Promise.withResolvers`, y
// con `PDFJS_INSTALL_POLYFILL` carga antes el polyfill de la app (Node elimina sus tipos al
// importarlo). PDF.js se importa después, igual que en la web.
if (process.env.PDFJS_WITHOUT_PROMISE_WITH_RESOLVERS) delete Promise.withResolvers;
if (process.env.PDFJS_INSTALL_POLYFILL) {
  const { installPromiseWithResolvers } =
    await import('../src/features/cv-import/infrastructure/promise-with-resolvers.ts');
  installPromiseWithResolvers();
}
const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');

const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
const data = new Uint8Array(Buffer.concat(chunks));
const options = JSON.parse(process.argv[2] ?? '{}');

try {
  const task = getDocument({ ...options, data });
  const document = await task.promise;
  const pages = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
    const content = await (await document.getPage(pageNumber)).getTextContent();
    pages.push({ pageNumber, items: content.items });
  }
  await task.destroy();
  process.stdout.write(JSON.stringify({ pageCount: document.numPages, pages }));
} catch (error) {
  process.stdout.write(JSON.stringify({ error: { name: error?.name, message: error?.message } }));
}
