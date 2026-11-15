/*
Recorrido sobre la exportación web: Inicio, formulario, Resultados y reutilización de Mis CV.
Playwright se aporta desde el entorno, sin instalar dependencias. Todas las peticiones externas
se interceptan y las respuestas de cuenta y biblioteca son ficticias: no se envía ningún CV.
Uso: PLAYWRIGHT_MODULE=<ruta a playwright> node jest/v17-web-smoke.cjs
*/
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const root = path.resolve('dist');
const artifacts = path.resolve('.expo/v17-web-smoke');
fs.mkdirSync(artifacts, { recursive: true });
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
};
const server = http.createServer((req, res) => {
  let file = path.resolve(
    root,
    `.${decodeURIComponent(new URL(req.url, 'http://localhost').pathname)}`,
  );
  if (file !== root && !file.startsWith(root + path.sep)) return res.writeHead(403).end();
  if (file === root) file = path.join(root, 'index.html');
  else if (!path.extname(file)) file += '.html';
  fs.readFile(file, (error, data) => {
    if (error) return res.writeHead(404).end();
    res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
    res.end(data);
  });
});

const cv = 'Candidata ficticia\nEXPERIENCIA\nElaboré informes mensuales con Excel.';
const user = {
  id: '00000000-0000-4000-8000-000000000017',
  email: 'v17@example.test',
  aud: 'authenticated',
  role: 'authenticated',
  email_confirmed_at: '2026-11-15T00:00:00Z',
  app_metadata: { provider: 'email' },
  user_metadata: {},
  created_at: '2026-11-15T00:00:00Z',
};
const jwtPart = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const session = {
  access_token: `${jwtPart({ alg: 'HS256', typ: 'JWT' })}.${jwtPart({ sub: user.id, aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })}.fixture`,
  refresh_token: 'fixture-refresh',
  token_type: 'bearer',
  expires_in: 3600,
  user,
};
const saved = {
  id: '00000000-0000-4000-8000-000000000018',
  title: 'CV ficticio v1.7',
  file_name: 'ficticio.pdf',
  format: 'pdf',
  byte_size: 1200,
  page_count: 1,
  file_path: `${user.id}/ficticio.pdf`,
  created_at: '2026-11-15T00:00:00Z',
};

async function main() {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
      : {}),
  });
  try {
    for (const width of [390, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 844 } });
      context.setDefaultTimeout(15000);
      const errors = [];
      const unexpected = [];
      const calls = [];
      await context.route('**/*', async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        if (url.origin === origin) return route.continue();
        calls.push(`${request.method()} ${url.pathname}`);
        let body;
        if (url.pathname === '/auth/v1/token' && request.method() === 'POST') body = session;
        else if (url.pathname === '/auth/v1/user' && request.method() === 'GET') body = user;
        else if (url.pathname === '/rest/v1/cvs' && request.method() === 'GET') {
          body = url.searchParams.get('select') === 'cv_text' ? { cv_text: cv } : [saved];
        } else {
          unexpected.push(`${request.method()} ${url.pathname}`);
          return route.abort();
        }
        return route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
      });
      const page = await context.newPage();
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('response', (response) => {
        if (response.status() >= 400)
          errors.push(`HTTP ${response.status()}: ${new URL(response.url()).pathname}`);
      });
      page.on('console', (message) => {
        if (message.type() === 'error' || message.type() === 'warning') errors.push(message.text());
      });
      try {
        await page.goto(origin);
        await page.getByRole('button', { name: 'Analizar mi CV', exact: true }).first().click();
        await page.getByRole('heading', { name: 'Analizar CV y oferta' }).waitFor();
        await page.getByRole('button', { name: 'Analizar', exact: true }).click();
        assert.equal(new URL(page.url()).pathname, '/analisis');
        await page.getByText('Pegar texto', { exact: true }).click();
        await page.getByLabel('Texto del CV', { exact: true }).fill(cv);
        await page
          .getByLabel('Texto de la oferta', { exact: true })
          .fill(
            'Requisitos:\n- Excel.\n- Disponibilidad para viajar.\n- Carnet de manipulador de alimentos.\n- Disponibilidad para turnos.',
          );
        await page.getByRole('button', { name: 'Analizar', exact: true }).click();
        await page.getByRole('heading', { name: 'Resultados del análisis' }).waitFor();
        await page.getByText('Cobertura parcial: solo una parte de la oferta').waitFor();
        await page.getByText(/El porcentaje solo se calcula con 1 de los 4/).waitFor();
        await page
          .getByText(/El porcentaje solo se calcula con 1 de los 4/)
          .scrollIntoViewIfNeeded();
        await page.screenshot({
          path: path.join(artifacts, `summary-${width}.png`),
          fullPage: true,
        });
        await page.getByRole('button', { name: /^Excel\./ }).click();
        await page.getByText('Elaboré informes mensuales con Excel.', { exact: true }).waitFor();
        assert.equal(calls.length, 0, 'El análisis anónimo debe ser local');
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        await page.screenshot({
          path: path.join(artifacts, `results-${width}.png`),
          fullPage: true,
        });
        await page.getByRole('button', { name: 'Editar CV u oferta', exact: true }).click();
        await page
          .getByLabel('Texto de la oferta', { exact: true })
          .fill('Requisitos:\n- Disponibilidad para viajar.');
        await page.getByRole('button', { name: 'Analizar', exact: true }).click();
        await page.getByText(/No se ha podido evaluar ningún requisito/).waitFor();

        // Nueva navegación descarta la sesión de análisis; el acceso usa solo respuestas locales.
        await page.goto(`${origin}/acceso`);
        await page.getByLabel('Email', { exact: true }).fill(user.email);
        await page.getByLabel('Contraseña', { exact: true }).fill('Fictional-pass123');
        await page.getByRole('button', { name: 'Entrar', exact: true }).click();
        await page.getByText('Sesión iniciada', { exact: true }).waitFor();
        await page
          .getByRole('navigation', { name: 'Navegación principal' })
          .getByRole('link', { name: 'Mis CV', exact: true })
          .click();
        const item = page.getByRole('group', { name: saved.title, exact: true });
        await item.waitFor();
        await item.getByRole('button', { name: 'Analizar', exact: true }).click();
        await page.getByLabel('Texto del CV', { exact: true }).waitFor();
        assert.equal(await page.getByLabel('Texto del CV', { exact: true }).inputValue(), cv);
        await page.getByLabel('Texto de la oferta', { exact: true }).fill('Requisitos:\n- Excel.');
        await page.getByRole('button', { name: 'Analizar', exact: true }).click();
        await page.getByRole('heading', { name: 'Resultados del análisis' }).waitFor();
        await page.getByText(/Es una muestra pequeña de requisitos/).waitFor();
        assert.deepEqual(unexpected, []);
        assert.deepEqual(errors, []);
        console.log(
          `PASS ${width}px: Inicio, validación, análisis local, evidencias, representatividad, cero evaluables y Mis CV con respuestas ficticias; sin errores de consola`,
        );
      } catch (error) {
        await page.screenshot({
          path: path.join(artifacts, `failure-${width}.png`),
          fullPage: true,
        });
        fs.writeFileSync(
          path.join(artifacts, `failure-${width}.txt`),
          await page.locator('body').innerText(),
        );
        throw error;
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
}
main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => server.close());
