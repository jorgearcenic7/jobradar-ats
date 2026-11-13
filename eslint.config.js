// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintConfigPrettier = require('eslint-config-prettier/flat');

module.exports = defineConfig([
  expoConfig,
  // Must stay last: turns off stylistic rules that conflict with Prettier.
  eslintConfigPrettier,
  {
    // Los puntos de entrada de las Edge Functions son Deno (`Deno`, importaciones `npm:`).
    ignores: [
      'dist/*',
      'web-build/*',
      '.expo/*',
      'ios/*',
      'android/*',
      'supabase/functions/*/index.ts',
      // Modelo y runtime semánticos copiados por scripts/prepare-semantic-model.cjs.
      'public/semantic/*',
    ],
  },
]);
