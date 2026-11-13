// Middleware de desarrollo que sirve el modelo semántico desde node_modules/.cache.
// eslint-disable-next-line @typescript-eslint/no-require-imports -- metro.config.js es CommonJS
const config = require('../metro.config.js');

type FakeResponse = {
  statusCode: number;
  headers: Record<string, string>;
  setHeader: (name: string, value: string) => void;
  end: jest.Mock;
};

function response(): FakeResponse {
  const res: FakeResponse = {
    statusCode: 200,
    headers: {},
    setHeader: (name: string, value: string) => {
      res.headers[name] = value;
    },
    end: jest.fn(),
  };
  return res;
}

const metro = jest.fn();
const handler = config.server.enhanceMiddleware(metro, {});

describe('semantic model middleware for development', () => {
  beforeEach(() => metro.mockClear());

  it('passes every other route to Metro', () => {
    handler({ url: '/analisis' }, response(), jest.fn());
    expect(metro).toHaveBeenCalledTimes(1);
  });

  it('does not serve files outside the prepared folder', () => {
    const res = response();
    handler({ url: '/semantic/..%2F..%2F..%2Fpackage.json' }, res, jest.fn());
    expect(res.statusCode).toBe(404);
    expect(metro).not.toHaveBeenCalled();
  });

  it('answers 404 when the model has not been prepared', () => {
    const res = response();
    handler({ url: '/semantic/no-existe/worker.mjs' }, res, jest.fn());
    expect(res.statusCode).toBe(404);
  });
});
