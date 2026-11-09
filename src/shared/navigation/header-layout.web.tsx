/*
En la web, CSS centra la navegación entre la marca y el bloque de la derecha, y en pantallas
estrechas deja que cada grupo pase a otra línea. Como en Resultados, la distribución no consulta
la ventana en el render, así que el HTML del servidor y el del cliente coinciden.
*/
import type { HeaderLayoutProps, HeaderShellProps } from './header-layout';

import './header-layout.css';

export function HeaderShell({ backgroundColor, borderColor, children }: HeaderShellProps) {
  return (
    <div
      className="app-header-sticky"
      // Columna flexible, como las vistas de React Native, para que el contenido se centre.
      style={{
        display: 'flex',
        flexDirection: 'column',
        backgroundColor,
        borderBottom: `1px solid ${borderColor}`,
      }}>
      {children}
    </div>
  );
}

export function HeaderLayout({ brand, nav, note, action }: HeaderLayoutProps) {
  return (
    <div className="app-header-layout">
      {brand}
      {nav}
      <div className="app-header-aside">
        <div className="app-header-note">{note}</div>
        {action}
      </div>
    </div>
  );
}
