/*
`Promise.withResolvers` para los navegadores que no la tienen.

PDF.js 6, también en su build «legacy», llama a `Promise.withResolvers()` al abrir cualquier
documento y no incluye un polyfill para ella. Sin la API, abrir el PDF lanza un `TypeError` y el
CV no se puede leer, sea cual sea el archivo. Falta en Safari anterior a 17.4 (iOS anterior a
17.4), Chrome anterior a 119 y Firefox anterior a 121.

Solo usa sintaxis de tipos que se puede borrar, para que la prueba de integración la cargue en
Node tal cual, delante del PDF.js real.
*/

/** Instala `Promise.withResolvers` si el entorno no la trae; nunca sustituye la nativa. */
export function installPromiseWithResolvers(): void {
  if (typeof Promise.withResolvers === 'function') return;
  // Como la nativa: no enumerable y creada con el constructor que la recibe.
  Object.defineProperty(Promise, 'withResolvers', {
    configurable: true,
    writable: true,
    value: function withResolvers<T>(this: PromiseConstructor) {
      let resolve!: (value: T | PromiseLike<T>) => void;
      let reject!: (reason?: unknown) => void;
      const promise = new this<T>((onResolve, onReject) => {
        resolve = onResolve;
        reject = onReject;
      });
      return { promise, resolve, reject };
    },
  });
}
