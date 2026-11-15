/*
Paleta del tema como variables CSS, para las pantallas web que dibujan con DOM y CSS propios
(Inicio y el marco de Preparar).

Se generan las dos paletas con una consulta `prefers-color-scheme`, igual que hace la app al seguir
el tema del sistema. Así el HTML estático ya sale con los colores correctos, antes de hidratar, y
los valores nunca se repiten fuera de `colors.ts`.
*/
import { palettes, type Palette } from './colors';

const declarations = (p: Palette) =>
  [
    `--bg:${p.background}`,
    `--surface:${p.surface}`,
    `--text:${p.text}`,
    `--text-2:${p.textSecondary}`,
    `--text-3:${p.textTertiary}`,
    `--border:${p.border}`,
    `--divider:${p.divider}`,
    `--input:${p.inputBorder}`,
    `--accent:${p.primary}`,
    `--accent-press:${p.primaryPressed}`,
    `--on-accent:${p.onPrimary}`,
    `--accent-text:${p.accentText}`,
    `--accent-subtle:${p.accentSubtle}`,
    `--ok:${p.successDot}`,
    `--ok-text:${p.success}`,
    `--warn:${p.warningDot}`,
    `--warn-text:${p.warning}`,
    `--bad:${p.dangerDot}`,
    `--bad-text:${p.danger}`,
    `--focus:${p.focusRing}`,
    `--logo:${p.logoMark}`,
    `--radar-ring:${p.borderStrong}`,
    `--radar-accent:${p.primary}`,
  ].join(';');

/** Hoja de estilos que define la paleta en `selector`, en claro y, si el sistema lo pide, en oscuro. */
export function themeVariablesCss(selector: string) {
  return `${selector}{${declarations(palettes.light)}}@media (prefers-color-scheme: dark){${selector}{${declarations(palettes.dark)}}}`;
}
