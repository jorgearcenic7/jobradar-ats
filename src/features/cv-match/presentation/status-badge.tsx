import type { RequirementStatus } from '@/features/cv-match/domain/types';
import { Badge, badgeTones, type BadgeTone } from '@/shared/ui/badge';

import { statusLabels } from './labels';

// Cada estado del requisito se muestra con un tono del `Badge` compartido.
const statusBadgeTones: Record<RequirementStatus, BadgeTone> = {
  supported: 'success',
  mentioned: 'warning',
  missing: 'danger',
  'not-evaluable': 'neutral',
};

/** Icono y colores de cada estado, también para los recuentos de la cobertura. */
export const statusTones = {
  supported: badgeTones[statusBadgeTones.supported],
  mentioned: badgeTones[statusBadgeTones.mentioned],
  missing: badgeTones[statusBadgeTones.missing],
  'not-evaluable': badgeTones[statusBadgeTones['not-evaluable']],
} satisfies Record<RequirementStatus, (typeof badgeTones)[BadgeTone]>;

/** Status as icon plus text, never color alone. */
export function StatusBadge({ status }: { status: RequirementStatus }) {
  return <Badge tone={statusBadgeTones[status]} label={statusLabels[status]} />;
}
