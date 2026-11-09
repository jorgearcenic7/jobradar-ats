/* Coincidencia literal de puestos explícitos; no contiene sinónimos, traducciones ni jerarquías. */
import { containsAny, normalize } from './text';

export function explicitExperienceRole(text: string): string | null {
  const match =
    /\bexperiencia(?:\s+(?:profesional|laboral|previa))*\s+como\s+([^.!?;]+)[.!?;]*$/u.exec(
      normalize(text),
    );
  const role = match?.[1].trim().replace(/\s+/g, ' ');
  if (
    !role ||
    !/^\p{L}+(?:-\p{L}+)*(?:\s+\p{L}+(?:-\p{L}+)*){1,4}$/u.test(role) ||
    containsAny(role, ['y', 'o', 'con', 'en', 'para', 'similar', 'similares', 'afines'])
  )
    return null;
  return role;
}

/** Solo una cabecera delimitada o el campo Puesto/Cargo, nunca una mención dentro de prosa. */
export function isRoleHeader(text: string, role: string): boolean {
  return normalize(text)
    .split(/[·|]|\s[–—-]\s/u)
    .some(
      (part) =>
        part
          .replace(/^\s*(?:puesto|cargo)\s*:\s*/, '')
          .replace(/^[\s()[\].:]+|[\s()[\].:]+$/g, '')
          .replace(/\s+/g, ' ') === role,
    );
}
