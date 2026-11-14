/*
Zona de subida en la web: acepta un archivo arrastrado desde el equipo, además del clic.

React Native Web no reenvía los eventos de arrastre a sus vistas, así que se escuchan en un
elemento propio que envuelve la zona. Solo se toma el primer archivo, como en el selector. Fuera
de esta zona el navegador conserva su comportamiento habitual.
*/
import { useRef, type DragEvent } from 'react';

import type { DropTargetProps } from './drop-target';

export function DropTarget({ children, disabled, onDragChange, onDrop }: DropTargetProps) {
  // `dragenter` y `dragleave` también saltan al pasar por los hijos: se cuenta la profundidad.
  const depth = useRef(0);

  const hasFiles = (event: DragEvent) => event.dataTransfer.types.includes('Files');

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}
      onDragEnter={(event) => {
        if (disabled || !hasFiles(event)) return;
        event.preventDefault();
        depth.current += 1;
        onDragChange(true);
      }}
      onDragOver={(event) => {
        if (disabled || !hasFiles(event)) return;
        // Sin esto el navegador abriría el archivo en lugar de entregarlo a la zona.
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
      }}
      onDragLeave={() => {
        depth.current = Math.max(0, depth.current - 1);
        if (depth.current === 0) onDragChange(false);
      }}
      onDrop={(event) => {
        if (disabled || !hasFiles(event)) return;
        event.preventDefault();
        depth.current = 0;
        onDragChange(false);
        const file = event.dataTransfer.files[0];
        if (file) onDrop(file);
      }}>
      {children}
    </div>
  );
}
