/*
Formato de cifras compartido por la interfaz: lo usan el contador de `TextField` y el
resumen del texto extraído de un CV importado.
*/

/**
 * Agrupa los miles con un punto, también en las cifras de cuatro dígitos («2.450»).
 *
 * No usa `Intl`: en español deja 2450 sin agrupar y su resultado puede variar entre el
 * servidor y el navegador, lo que rompería la hidratación del contador en web. Está pensada
 * para recuentos, es decir, enteros no negativos.
 */
export function formatCount(count: number): string {
  return String(count).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
