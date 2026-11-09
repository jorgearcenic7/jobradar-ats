import type { ReactNode } from 'react';

import type { DroppedFile } from '../domain/readers';

export type DropTargetProps = {
  children: ReactNode;
  disabled: boolean;
  /** Avisa cuando un archivo entra en la zona o sale de ella, para resaltarla. */
  onDragChange: (active: boolean) => void;
  onDrop: (file: DroppedFile) => void;
};

// iOS y Android no tienen arrastrar y soltar archivos: la zona solo responde al toque.
export function DropTarget({ children }: DropTargetProps) {
  return <>{children}</>;
}
