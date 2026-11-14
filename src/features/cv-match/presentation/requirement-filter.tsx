/*
Filtro de los requisitos por estado: un selector segmentado compacto con el recuento de cada
opción. Los recuentos y la selección los controla la lista de resultados.

Es una elección exclusiva, así que se anuncia como grupo de botones de opción. En el móvil las
cuatro opciones forman dos filas de dos, sin desbordar la pantalla.
*/
import type { RequirementStatus } from '@/features/cv-match/domain/types';
import { SegmentedControl } from '@/shared/ui/segmented-control';

export type RequirementFilter = 'all' | Exclude<RequirementStatus, 'not-evaluable'>;

const options = [
  { value: 'all', label: 'Todos' },
  { value: 'missing', label: 'No acreditados' },
  { value: 'mentioned', label: 'Sin evidencia suficiente' },
  { value: 'supported', label: 'Respaldados' },
] as const;

type RequirementFilterControlProps = {
  counts: Record<RequirementFilter, number>;
  value: RequirementFilter;
  onChange: (value: RequirementFilter) => void;
  /** Recibe la opción «Todos», para devolverle el foco al volver a ver todos los requisitos. */
  allRef: (node: { focus: () => void } | null) => void;
};

export function RequirementFilterControl({
  counts,
  value,
  onChange,
  allRef,
}: RequirementFilterControlProps) {
  return (
    <SegmentedControl
      accessibilityLabel="Filtrar requisitos por estado"
      size="compact"
      options={options.map((option) => ({ ...option, count: counts[option.value] }))}
      value={value}
      onChange={onChange}
      optionRef={(option, node) => {
        if (option === 'all') allRef(node);
      }}
    />
  );
}
