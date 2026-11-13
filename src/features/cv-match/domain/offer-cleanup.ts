/*
Limpieza mínima de ofertas copiadas de una página completa de LinkedIn.

Al seleccionar toda la página se pegan también el menú, los botones, otras ofertas y la
publicidad, y el motor las muestra como requisitos no evaluables. Recortar la oferta por
encabezados («Acerca del empleo», «Acerca de la empresa»…) resultó peligroso: esos encabezados
también aparecen dentro de descripciones reales y el recorte eliminaba todos los requisitos. Por
eso aquí no se recorta nada:

- solo se actúa si el texto tiene al menos dos marcas que únicamente usa la página completa
  (menú, «Solicitud sencilla», «Empleos similares», el número de solicitudes…). Una descripción
  copiada sola no las tiene y se analiza tal cual;
- se quitan únicamente las líneas que coinciden enteras con botones y menús conocidos, nunca por
  palabras sueltas;
- si quitarlas cambiara cualquier requisito reconocido (cuál es o con qué importancia), se
  analiza el texto original sin tocar;
- siempre que se detecta una página completa, se pide al usuario que revise el texto, porque
  otras ofertas o la publicidad siguen ahí.

El texto que escribió el usuario no se modifica: la limpieza solo cambia lo que se analiza.
*/
import { extractOfferRequirements } from './offer-requirements';
import { normalize } from './text';

export type OfferCleanup = {
  /** Texto que se analiza. Igual al original salvo líneas exactas de botones y menús. */
  text: string;
  /** Líneas de botones y menús que se han dejado fuera del análisis. */
  removedLines: number;
  /** `linkedin` cuando parece una página completa de LinkedIn: hay que revisar el texto. */
  source: 'linkedin' | null;
};

// Botones, menús y avisos de la página que nunca son parte de una oferta.
const interfaceLines = [
  'inicio',
  'mi red',
  'empleos',
  'mensajes',
  'notificaciones',
  'yo',
  'para negocios',
  'solicitar',
  'solicitud sencilla',
  'guardar',
  'guardado',
  'compartir',
  'promocionado',
  'mostrar mas',
  'mostrar menos',
  '…mas',
  '... mas',
  'ver mas',
  'ver todo',
  'seguir',
  'mensaje',
  'denunciar este empleo',
  'home',
  'my network',
  'jobs',
  'messaging',
  'notifications',
  'me',
  'for business',
  'apply',
  'easy apply',
  'save',
  'saved',
  'share',
  'promoted',
  'show more',
  'show less',
  '…more',
  '... more',
  'see more',
  'see all',
  'follow',
  'message',
  'report this job',
];

/*
Marcas que solo aparecen en la página completa, no en la descripción de una oferta. Los
encabezados «Acerca del empleo» y «Acerca de la empresa» no cuentan: una descripción copiada
sola suele incluirlos.
*/
const pageMarkers = [
  'mi red',
  'para negocios',
  'solicitud sencilla',
  'promocionado',
  'conoce al equipo de contratacion',
  'mas empleos para ti',
  'empleos similares',
  'personas que tambien vieron',
  'establece una alerta para empleos similares',
  'my network',
  'for business',
  'easy apply',
  'promoted',
  'meet the hiring team',
  'more jobs for you',
  'similar jobs',
  'people also viewed',
  'set alert for similar jobs',
];
const applicantsLine =
  /(?:mas de \d+ solicitudes|over \d+ applicants|\d+\+? applicants|\d+ solicitudes)/;

const comparable = (line: string) =>
  normalize(line.trim())
    .replace(/[:.]+$/, '')
    .replace(/\s+/g, ' ');

/** Requisitos reconocidos con su importancia, para comprobar que la limpieza no los cambia. */
function recognizedRequirements(text: string) {
  return JSON.stringify(
    extractOfferRequirements(text)
      .filter((requirement) => requirement.kind !== 'unrecognized' && requirement.kind !== 'review')
      .map((requirement) => [requirement.id, requirement.importance]),
  );
}

export function cleanOfferText(offerText: string): OfferCleanup {
  const lines = offerText.split(/\r?\n/);
  const keys = lines.map(comparable);
  const markers = new Set(keys.filter((key) => pageMarkers.includes(key)));
  if (keys.some((key) => applicantsLine.test(key))) markers.add('applicants');
  if (markers.size < 2) return { text: offerText, removedLines: 0, source: null };

  const kept = lines.filter((_line, index) => !interfaceLines.includes(keys[index]));
  const text = kept.join('\n');
  if (recognizedRequirements(text) !== recognizedRequirements(offerText)) {
    return { text: offerText, removedLines: 0, source: 'linkedin' };
  }
  return { text, removedLines: lines.length - kept.length, source: 'linkedin' };
}
