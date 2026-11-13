// https://docs.expo.dev/guides/customizing-metro/
const fs = require('node:fs');
const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

/*
En desarrollo (`npm run web`) el modelo semántico se sirve en `/semantic/` desde la carpeta que
prepara `npm run semantic:dev`, dentro de `node_modules/.cache`: así no se copia a `public/` ni
puede acabar en Git. La exportación web no pasa por aquí; `build:web` lo prepara en `dist/`.

`enhanceMiddleware` está marcado como obsoleto en Metro, pero Expo CLI 58 lo sigue aplicando.
Solo se atienden rutas dentro de la carpeta; lo demás sigue su curso normal.
*/
const semanticDir = path.join(__dirname, 'node_modules', '.cache', 'semantic-model');
const types = {
  '.json': 'application/json',
  '.mjs': 'text/javascript',
  '.wasm': 'application/wasm',
};

config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => (req, res, next) => {
    const url = (req.url ?? '').split('?')[0];
    if (!url.startsWith('/semantic/')) return middleware(req, res, next);
    const file = path.resolve(semanticDir, decodeURIComponent(url.slice('/semantic/'.length)));
    if (!file.startsWith(semanticDir + path.sep) || !fs.existsSync(file)) {
      res.statusCode = 404;
      res.end();
      return;
    }
    res.setHeader('Content-Type', types[path.extname(file)] ?? 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  },
};

module.exports = config;
