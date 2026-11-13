import type { NoticeTone } from '@/shared/ui/notice';

import type { ExtractionFailure, ExtractionIssue, IssueLevel } from '../domain/types';

export function formatMegabytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

function listPages(pages: number[]) {
  const names = pages.map(String);
  const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} y ${names.at(-1)}` : names[0];
  return `${pages.length > 1 ? 'Las páginas' : 'La página'} ${list}`;
}

export function failureMessage(failure: ExtractionFailure): string {
  switch (failure.kind) {
    case 'unsupported-format':
      return failure.reason === 'empty'
        ? 'El archivo está vacío.'
        : 'Este archivo no es un PDF ni un Word (.docx) que JobRadar pueda leer. Guárdalo como PDF o .docx, o pega el texto.';
    case 'legacy-or-protected-word':
      return 'Parece un Word antiguo (.doc) o un documento protegido con contraseña. Guárdalo como .docx sin contraseña o como PDF, o pega el texto.';
    case 'password-protected':
      return 'El PDF está protegido con contraseña. Guarda una copia sin contraseña o pega el texto.';
    case 'corrupt':
      return 'El archivo está dañado o incompleto y no se puede leer.';
    case 'read-error':
      return 'No se ha podido leer el archivo. Prueba con otra copia o pega el texto.';
  }
}

export function issueMessage(issue: ExtractionIssue): string {
  switch (issue.code) {
    case 'no-text':
      return issue.possibleScan
        ? 'El PDF no contiene texto seleccionable: puede ser un documento escaneado o una imagen. JobRadar todavía no reconoce texto en imágenes (OCR). Pega o escribe el texto del CV.'
        : 'El documento no contiene texto. Pega o escribe el texto del CV.';
    case 'unreadable-characters':
      return issue.level === 'error'
        ? 'Gran parte del texto no se puede leer: el documento usa caracteres que no se han podido interpretar. Corrige el texto o pégalo.'
        : 'Algunos caracteres no se han podido leer. Revisa el texto antes de analizar.';
    case 'pages-without-text':
      return `${listPages(issue.pages)} no ${issue.pages.length > 1 ? 'contienen' : 'contiene'} texto. Si incluyen contenido escaneado, no se analizará.`;
    case 'reading-order':
      return `${listPages(issue.pages)} parece tener varias columnas: revisa que el texto esté en el orden correcto.`;
    case 'columns-reordered':
      return `${listPages(issue.pages)} tiene dos columnas que el PDF mezclaba línea a línea: JobRadar las ha leído una detrás de otra. Revisa que el texto esté completo y en orden.`;
    case 'fragmented-lines':
      return 'Muchas líneas del texto extraído tienen solo una o dos palabras: el diseño del documento puede haberse leído a trozos. Revisa el texto antes de analizar.';
    case 'little-text':
      return 'Se ha extraído poco texto. Si tu CV es breve es normal; si no, revisa que no falte nada.';
  }
}

// Tono del aviso según la gravedad de la incidencia; una duda se presenta como información.
export const issueTones: Record<IssueLevel, NoticeTone> = {
  error: 'danger',
  warning: 'warning',
  uncertain: 'info',
};

/** Shown with every imported document: extraction is never guaranteed to be complete. */
export const extractionCaution =
  'Al leer un documento pueden perderse los encabezados y pies de página de Word, o desordenarse los diseños complejos. Revisa el texto antes de analizar.';
