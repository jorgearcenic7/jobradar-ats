/*
Marca de la zona de subida en la web: la diana del radar de la v1.6.

Cuatro anillos alrededor del icono. Al pasar el puntero se tiñen de violeta y, cuando un archivo
se arrastra encima, se contraen hacia el centro y el núcleo crece, para confirmar que soltarlo
funcionará. Con un error de validación los anillos toman el color de peligro, junto al mensaje.

Es decorativa: la zona ya es un botón con su nombre. Los colores llegan como variables desde el
tema, porque la zona también se usa fuera de Preparar («Mis CV»).
*/
import type { CSSProperties } from 'react';

import { useTheme } from '@/hooks/use-theme';
import { Icon } from '@/shared/ui/icon';

import type { DropzoneMarkProps } from './dropzone-mark';

import './dropzone-mark.css';

export function DropzoneMark({ dragging, active, invalid }: DropzoneMarkProps) {
  const theme = useTheme();
  const colors = {
    '--dz-ring': theme.dropzoneBorder,
    '--dz-accent': theme.primary,
    '--dz-danger': theme.danger,
    '--dz-core': theme.accentSubtle,
  } as CSSProperties;

  return (
    <span
      className="dropzone-mark"
      data-dragging={dragging}
      data-active={active}
      data-invalid={invalid}
      style={colors}
      aria-hidden>
      <i />
      <i />
      <i />
      <i />
      <span className="dropzone-mark-core">
        <Icon name="uploadFile" size="lg" color="onAccentSubtle" />
      </span>
    </span>
  );
}
