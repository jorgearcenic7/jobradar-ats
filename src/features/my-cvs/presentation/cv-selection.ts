/*
Traspaso de un CV guardado al analizador.

«Analizar» en «Mis CV» deja aquí el texto y abre `/analisis`, cuya sesión lo recoge al montarse.
Vive solo en memoria y se vacía en cuanto el analizador lo recoge: el texto no pasa por la URL,
el historial ni el almacenamiento del navegador.
*/

export type SelectedCv = { title: string; text: string };

let selected: SelectedCv | null = null;

export function selectCvForAnalysis(cv: SelectedCv) {
  selected = cv;
}

/** El CV pendiente de analizar, sin retirarlo (se puede llamar varias veces al montar). */
export function peekCvSelection(): SelectedCv | null {
  return selected;
}

export function clearCvSelection() {
  selected = null;
}
