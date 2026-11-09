import { installPromiseWithResolvers } from '@/features/cv-import/infrastructure/promise-with-resolvers';

const native = Promise.withResolvers;

function restoreNative() {
  Object.defineProperty(Promise, 'withResolvers', {
    value: native,
    writable: true,
    configurable: true,
  });
}

describe('installPromiseWithResolvers', () => {
  afterEach(restoreNative);

  it('keeps the native implementation when the browser has one', () => {
    installPromiseWithResolvers();

    expect(Promise.withResolvers).toBe(native);
  });

  describe('in a browser without Promise.withResolvers', () => {
    beforeEach(() => {
      // @ts-expect-error: simula un navegador sin la API (Safari < 17.4, Chrome < 119).
      delete Promise.withResolvers;
      installPromiseWithResolvers();
    });

    it('adds it as a non-enumerable method, like the native one', () => {
      expect(Promise.withResolvers).not.toBe(native);
      expect(Object.keys(Promise)).not.toContain('withResolvers');
    });

    it('returns a promise that its resolve function settles', async () => {
      const { promise, resolve } = Promise.withResolvers<string>();
      resolve('leído');

      await expect(promise).resolves.toBe('leído');
    });

    it('returns a promise that its reject function rejects', async () => {
      const { promise, reject } = Promise.withResolvers<string>();
      reject(new Error('PDF dañado'));

      await expect(promise).rejects.toThrow('PDF dañado');
    });
  });
});
