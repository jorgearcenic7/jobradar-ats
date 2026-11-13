/*
Aviso sobre una oferta copiada de una página completa de LinkedIn. Siempre pide revisar el texto:
solo se quitan líneas exactas de botones y menús, así que otras ofertas o la publicidad pueden
seguir ahí. Sin rastro de una página completa no muestra nada.
*/
import type { OfferCleanup } from '@/features/cv-match/domain/offer-cleanup';
import { Notice } from '@/shared/ui/notice';

type OfferCleanupNoticeProps = {
  cleanup: OfferCleanup | null;
  /** `before`: en Preparar, antes de analizar. `after`: en Resultados. */
  moment: 'before' | 'after';
};

export function OfferCleanupNotice({ cleanup, moment }: OfferCleanupNoticeProps) {
  if (!cleanup || cleanup.source !== 'linkedin') return null;
  const removed =
    cleanup.removedLines > 0
      ? ` Se ${cleanup.removedLines === 1 ? 'ha quitado 1 línea' : `han quitado ${cleanup.removedLines} líneas`} de botones y menús; el resto se analiza tal cual.`
      : '';
  return (
    <Notice tone="warning" title="Revisa el texto de la oferta">
      {moment === 'before'
        ? `Parece copiado de una página completa de LinkedIn.${removed} Deja solo el texto de la oferta antes de analizar: otras ofertas o la publicidad aparecerían como requisitos no evaluables.`
        : `La oferta parece copiada de una página completa de LinkedIn.${removed} Algunos requisitos no evaluables pueden ser otras ofertas o publicidad.`}
    </Notice>
  );
}
