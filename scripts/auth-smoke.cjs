// Production export smoke test. Playwright is a test tool, not an app dependency.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(process.env.AUTH_SMOKE_DIST || '.expo/auth-smoke-dist');
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};
const server = http.createServer((req, res) => {
  let file = path.resolve(
    root,
    `.${decodeURIComponent(new URL(req.url, 'http://localhost').pathname)}`,
  );
  if (file !== root && !file.startsWith(root + path.sep)) {
    res.writeHead(403).end();
    return;
  }
  if (file === root) file = path.join(root, 'index.html');
  else if (!path.extname(file)) file += '.html';
  fs.readFile(file, (error, data) => {
    if (error) {
      res.writeHead(404).end();
      return;
    }
    res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
    res.end(data);
  });
});

async function main() {
  await new Promise((resolve) => server.listen(4173, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:4173';
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
      : {}),
  });
  try {
    const context = await browser.newContext();
    context.setDefaultTimeout(15000);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) =>
      errors.push(
        `Unhandled browser error: ${error.message
          .replace(/https?:\/\/\S+/g, '[url]')
          .replace(/[A-Za-z0-9_-]{40,}/g, '[redacted]')
          .slice(0, 900)}`,
      ),
    );
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push('Browser console error');
    });
    if (process.env.AUTH_SMOKE_UNCONFIGURED === '1') {
      await page.goto(`${origin}/acceso`);
      await page.getByText(/Falta configurar Supabase/).waitFor();
      assert(await page.getByRole('button', { name: 'Entrar', exact: true }).isDisabled());
      await page.getByRole('link', { name: 'Continuar sin cuenta' }).click();
      await page.getByRole('heading', { name: 'Analizar CV y oferta' }).waitFor();
      assert.deepEqual(errors, []);
      console.log('PASS: missing configuration and anonymous analysis in production export');
      return;
    }
    // Every Auth response is controlled; no real accounts, emails or credentials are used.
    const user = {
      id: '00000000-0000-4000-8000-000000000001',
      email: 'smoke@example.test',
      aud: 'authenticated',
      role: 'authenticated',
      email_confirmed_at: new Date().toISOString(),
      app_metadata: { provider: 'email' },
      user_metadata: {},
      created_at: new Date().toISOString(),
    };
    const jwtPart = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
    const token = `${jwtPart({ alg: 'HS256', typ: 'JWT' })}.${jwtPart({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600, aud: 'authenticated' })}.${Buffer.from('fixture-signature').toString('base64url')}`;
    const session = {
      access_token: token,
      refresh_token: 'fixture-refresh',
      token_type: 'bearer',
      expires_in: 3600,
      user,
    };
    const calls = [];
    let loginFails = true;
    let updated = false;
    await context.route('https://**/auth/v1/**', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const endpoint = url.pathname.split('/').at(-1);
      calls.push(endpoint);
      let body = {};
      let status = 200;
      if (endpoint === 'signup') {
        assert.equal(new URL(url.searchParams.get('redirect_to')).pathname, '/auth/callback');
        body = user;
      } else if (endpoint === 'token') {
        if (loginFails) {
          status = 400;
          body = {
            code: 'invalid_credentials',
            error_code: 'invalid_credentials',
            msg: 'Invalid login credentials',
          };
        } else body = session;
      } else if (endpoint === 'user') {
        if (request.method() === 'PUT') {
          assert.equal(request.postDataJSON().password, 'Changed-pass123');
          updated = true;
        }
        body = user;
      } else if (endpoint === 'recover') {
        assert.equal(
          new URL(url.searchParams.get('redirect_to')).searchParams.get('flow'),
          'recovery',
        );
      } else if (endpoint === 'logout') {
        status = 204;
      } else if (endpoint !== 'resend') throw new Error('Unexpected Auth endpoint');
      await route.fulfill({
        status,
        headers: {
          'X-Supabase-Api-Version': '2024-01-01',
          'Access-Control-Expose-Headers': 'X-Supabase-Api-Version',
        },
        contentType: 'application/json',
        body: status === 204 ? '' : JSON.stringify(body),
      });
    });
    await page.goto(`${origin}/registro`);
    console.log('Checking signup');
    await page.getByLabel('Email', { exact: true }).fill(user.email);
    await page.getByLabel('Contraseña', { exact: true }).fill('Example-pass123');
    await page.getByLabel('Repite la contraseña', { exact: true }).fill('Example-pass123');
    await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click();
    await page.getByText(/Revisa tu correo y abre el enlace/).waitFor();
    console.log('Checking confirmation and persistence');
    await page.getByRole('button', { name: 'Reenviar confirmación' }).click();
    await page.getByText(/Si la cuenta necesita confirmación/).waitFor();
    await page.goto(
      `${origin}/auth/callback#access_token=${token}&refresh_token=fixture-refresh&type=signup`,
    );
    await page.getByText('Sesión iniciada', { exact: true }).waitFor();
    assert.equal(new URL(page.url()).hash, '');
    await page.reload();
    await page.getByText('Sesión iniciada', { exact: true }).waitFor();
    // A new tab restores the persisted session without sharing React state.
    const second = await context.newPage();
    await second.goto(`${origin}/mi-cuenta`);
    await second.getByText('Sesión iniciada', { exact: true }).waitFor();
    await second.close();
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    console.log('Checking login and recovery');
    await page.getByRole('button', { name: 'Entrar', exact: true }).waitFor();
    await page.reload();
    await page.getByRole('button', { name: 'Entrar', exact: true }).waitFor();
    await page.getByLabel('Email', { exact: true }).fill(user.email);
    await page.getByLabel('Contraseña', { exact: true }).fill('Wrong-pass123');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await page.getByText('Email o contraseña incorrectos.').waitFor();
    loginFails = false;
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await page.getByText('Sesión iniciada', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await page.getByRole('button', { name: 'Entrar', exact: true }).waitFor();
    await page.goto(`${origin}/recuperar`);
    await page.getByLabel('Email', { exact: true }).fill(user.email);
    await page.getByRole('button', { name: 'Enviar enlace de recuperación' }).click();
    await page.getByText(/Si existe una cuenta/).waitFor();
    await page.goto(
      `${origin}/auth/callback?flow=recovery#access_token=${token}&refresh_token=fixture-refresh&type=recovery`,
    );
    await page.getByLabel('Nueva contraseña', { exact: true }).waitFor();
    assert.equal(new URL(page.url()).hash, '');
    await page.reload();
    await page.getByLabel('Nueva contraseña', { exact: true }).fill('Changed-pass123');
    await page.getByLabel('Repite la contraseña', { exact: true }).fill('Changed-pass123');
    await page.getByRole('button', { name: 'Guardar contraseña' }).click();
    await page.getByText('Tu contraseña se ha actualizado.').waitFor();
    assert(updated);
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await page.goto(`${origin}/auth/callback#error=access_denied&error_code=otp_expired`);
    await page.getByText(/El enlace no es válido o ha caducado/).waitFor();
    assert.equal(new URL(page.url()).hash, '');
    await page.goto(`${origin}/auth/callback`);
    await page.getByText(/El enlace no es válido o ha caducado/).waitFor();
    await page.goto(`${origin}/mi-cuenta`);
    await page.getByRole('button', { name: 'Entrar', exact: true }).waitFor();
    // Verify responsive access and analysis without horizontal overflow.
    for (const width of [320, 390, 900, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(`${origin}/acceso`);
      await page.getByRole('button', { name: 'Entrar', exact: true }).waitFor();
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    }
    await page.screenshot({ path: path.join(root, 'auth-desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(root, 'auth-mobile.png'), fullPage: true });
    await page.getByRole('link', { name: 'Continuar sin cuenta' }).click();
    await page.getByRole('heading', { name: 'Analizar CV y oferta' }).waitFor();
    assert(
      calls.includes('signup') &&
        calls.includes('resend') &&
        calls.includes('recover') &&
        calls.includes('logout'),
    );
    // Invalid login intentionally emits a browser network error.
    assert.deepEqual(
      errors.filter((error) => error.startsWith('Unhandled browser error')),
      [],
    );
    console.log(
      'PASS: signup, resend, confirmation, login/error, persistence, logout, recovery/update, expired links, responsive UI and anonymous analysis (mocked Auth)',
    );
  } finally {
    await browser.close();
  }
}
main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => server.close());
