/*
HTML raíz de todas las páginas web, generado en Node al exportar (sin acceso al DOM).

Parte de la plantilla de Expo Router y conserva su reinicio de scroll. Añade el idioma del
documento, las vistas previas sociales y los metadatos para «Añadir a pantalla de inicio» en
iPhone. El manifiesto no registra ningún service worker: la app no funciona sin conexión.
*/
import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

import { palettes } from '@/shared/theme';

const siteOrigin = 'https://jobradar-ats.pages.dev';
const siteDescription =
  'Compara tu CV con ofertas, evalúa requisitos y descubre mejoras con evidencias. Análisis ATS local en evolución.';
const socialImage = `${siteOrigin}/jobradar-cover.jpg`;

export default function Root({
  children,
  pathname = '/',
}: PropsWithChildren<{ pathname?: string }>) {
  // Expo Router 58 exige pintar estos nodos al renderizar en estático: incluyen CSS, fuentes y scripts.
  const { headNodes, bodyNodes, htmlAttributes, bodyAttributes } = useServerDocumentContext();
  const pageUrl = new URL(pathname, siteOrigin);
  pageUrl.search = '';
  pageUrl.hash = '';

  return (
    <html lang="es" {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <title>JobRadar ATS</title>
        <meta name="description" content={siteDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="JobRadar ATS" />
        <meta property="og:title" content="JobRadar ATS" />
        <meta property="og:description" content={siteDescription} />
        <meta property="og:locale" content="es_ES" />
        <meta property="og:url" content={pageUrl.href} />
        <meta property="og:image" content={socialImage} />
        <meta property="og:image:type" content="image/jpeg" />
        <meta property="og:image:width" content="1280" />
        <meta property="og:image:height" content="640" />
        <meta property="og:image:alt" content="JobRadar ATS: análisis de CV y ofertas de empleo" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="JobRadar ATS" />
        <meta name="twitter:description" content={siteDescription} />
        <meta name="twitter:image" content={socialImage} />
        <meta name="twitter:image:alt" content="JobRadar ATS: análisis de CV y ofertas de empleo" />
        <meta name="application-name" content="JobRadar ATS" />
        <meta name="apple-mobile-web-app-title" content="JobRadar ATS" />
        {/*
          La app sigue el tema del sistema. Así las barras de desplazamiento, la selección y los
          controles nativos del navegador también pasan a oscuro, no solo lo que pinta la app.
        */}
        <meta name="color-scheme" content="light dark" />
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
        {/* Logo vectorial para los navegadores que lo admiten; Expo añade el .ico de respaldo. */}
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
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
