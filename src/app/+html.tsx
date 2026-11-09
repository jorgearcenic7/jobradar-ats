/*
HTML raíz de todas las páginas web, generado en Node al exportar (sin acceso al DOM).

Parte de la plantilla de Expo Router y conserva su reinicio de scroll. Añade el idioma del
documento y los metadatos para «Añadir a pantalla de inicio» en iPhone. El manifiesto no
registra ningún service worker: la app no funciona sin conexión.
*/
import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

import { palettes } from '@/shared/theme';

export default function Root({ children }: PropsWithChildren) {
  // Expo Router 58 exige pintar estos nodos al renderizar en estático: incluyen CSS, fuentes y scripts.
  const { headNodes, bodyNodes, htmlAttributes, bodyAttributes } = useServerDocumentContext();

  return (
    <html lang="es" {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <title>JobRadar ATS</title>
        <meta name="description" content="Compara tu CV con una oferta, requisito a requisito." />
        <meta name="application-name" content="JobRadar ATS" />
        <meta name="apple-mobile-web-app-title" content="JobRadar ATS" />
        {/* El color de la barra del navegador sigue el fondo de cada tema. */}
        <meta
          name="theme-color"
          media="(prefers-color-scheme: light)"
          content={palettes.light.background}
        />
        <meta
          name="theme-color"
          media="(prefers-color-scheme: dark)"
          content={palettes.dark.background}
        />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />

        {/* Sin scroll en el body, como en nativo: cada pantalla se desplaza con su ScrollView. */}
        <ScrollViewStyleReset />

        {headNodes}
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}
