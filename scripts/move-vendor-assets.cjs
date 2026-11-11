/*
Paso posterior a `expo export --platform web` para Cloudflare Pages.

Metro publica los recursos de las dependencias (la fuente Material Symbols de los iconos y las
imágenes de expo-router) en `dist/assets/node_modules/...`. Cloudflare Pages no publica esa
carpeta: en el despliegue esas rutas devuelven el HTML de la portada y los iconos no cargan.
Vercel sí la sirve, así que solo es un problema de Cloudflare.

El script mueve la carpeta a `dist/assets/vendor/` y sustituye la ruta en los archivos de texto
de la exportación, donde Metro la escribe como `/assets/node_modules/`. Termina con error si
queda alguna referencia o alguna carpeta `node_modules` sin mover, para que el despliegue no
salga roto en silencio.
*/
const fs = require('node:fs');
const path = require('node:path');

const dist = path.resolve(process.argv[2] ?? 'dist');
const from = path.join(dist, 'assets', 'node_modules');
const to = path.join(dist, 'assets', 'vendor');
const textFile = /\.(html|js|css|json|map)$/;

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

if (!fs.existsSync(dist)) {
  console.error(`No existe ${dist}: ejecuta antes expo export.`);
  process.exit(1);
}

if (fs.existsSync(from)) {
  if (fs.existsSync(to)) fs.rmSync(to, { recursive: true });
  fs.renameSync(from, to);
}

let replaced = 0;
for (const file of walk(dist).filter((name) => textFile.test(name))) {
  const content = fs.readFileSync(file, 'utf8');
  if (!content.includes('/assets/node_modules/')) continue;
  fs.writeFileSync(file, content.replaceAll('/assets/node_modules/', '/assets/vendor/'));
  replaced += 1;
}

const leftovers = walk(dist).filter(
  (name) =>
    name.split(path.sep).includes('node_modules') ||
    (textFile.test(name) && fs.readFileSync(name, 'utf8').includes('/assets/node_modules/')),
);
if (leftovers.length > 0) {
  console.error('Quedan recursos en node_modules:', leftovers.slice(0, 5));
  process.exit(1);
}
console.log(`Recursos de dependencias en assets/vendor; ${replaced} archivos actualizados.`);
