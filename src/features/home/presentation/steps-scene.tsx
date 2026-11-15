/*
Escena de «Tres pasos» en Inicio (solo web, SVG del DOM): un CV ficticio frente a los requisitos de
una oferta.

El avance de cada paso llega como variables CSS (`--p1`…`--p3`) desde el desplazamiento: las líneas
del CV aparecen, llegan los requisitos y se trazan las evidencias que los unen. Sin desplazamiento,
o con «reducir movimiento», la escena se muestra completa.
*/
import type { CSSProperties } from 'react';

import {
  exampleCvLines,
  exampleRequirements,
  shortStatusLabels,
  statusLabels,
} from './example-data';

/*
Medidas en sus dos variantes: ancha (escritorio) y estrecha (móvil, con textos más cortos y más
grandes en proporción para que sigan siendo legibles al escalar el SVG).
*/
const scenes = {
  wide: {
    width: 640,
    height: 400,
    cvSize: 15,
    lineGap: 44,
    lineTop: 72,
    pathStart: 268,
    reqX: 400,
    reqTop: 92,
    reqGap: 76,
    nameSize: 20,
    statusSize: 13,
    labels: statusLabels,
  },
  narrow: {
    width: 360,
    height: 330,
    cvSize: 13.5,
    lineGap: 38,
    lineTop: 64,
    pathStart: 200,
    reqX: 244,
    reqTop: 78,
    reqGap: 64,
    nameSize: 15,
    statusSize: 11.5,
    labels: shortStatusLabels,
  },
} as const;

export function StepsScene({ variant }: { variant: keyof typeof scenes }) {
  const scene = scenes[variant];
  const lineY = (index: number) => scene.lineTop + index * scene.lineGap;
  const requirementY = (index: number) => scene.reqTop + index * scene.reqGap;
  return (
    <svg
      className={`im-scene-svg is-${variant}`}
      viewBox={`0 0 ${scene.width} ${scene.height}`}
      aria-hidden>
      <text className="im-scene-label" x="0" y="24">
        Tu CV
      </text>
      <text className="im-scene-label" x={scene.reqX} y="24">
        La oferta
      </text>
      {exampleCvLines.map((line, index) => {
        const evidence = exampleRequirements.some((item) => item.evidenceLine === index);
        const heading = line === 'Experiencia' || line === 'Idiomas';
        return (
          <text
            key={line}
            className={`im-cv-line${evidence ? ' is-evidence' : ''}${heading ? ' is-heading' : ''}`}
            x="0"
            y={lineY(index)}
            fontSize={heading ? scene.cvSize - 2 : scene.cvSize}
            style={{ '--i': index } as CSSProperties}>
            {line}
          </text>
        );
      })}
      {exampleRequirements.map((item, index) => {
        if (item.evidenceLine === null) return null;
        const from = lineY(item.evidenceLine) - scene.cvSize / 3;
        const to = requirementY(index) - scene.nameSize / 3;
        const middle = (scene.pathStart + scene.reqX) / 2;
        return (
          <path
            key={item.id}
            className="im-link-path"
            data-status={item.status}
            pathLength={1}
            d={`M ${scene.pathStart} ${from} C ${middle} ${from}, ${middle} ${to}, ${scene.reqX - 8} ${to}`}
            style={{ '--i': index } as CSSProperties}
          />
        );
      })}
      {exampleRequirements.map((item, index) => (
        <g
          key={item.id}
          className="im-requirement"
          data-status={item.status}
          style={{ '--i': index } as CSSProperties}>
          <circle cx={scene.reqX + 2} cy={requirementY(index) - scene.nameSize / 3} r="5" />
          <text x={scene.reqX + 16} y={requirementY(index)} fontSize={scene.nameSize}>
            {item.name}
          </text>
          <text
            className="im-requirement-status"
            x={scene.reqX + 16}
            y={requirementY(index) + scene.statusSize + 8}
            fontSize={scene.statusSize}>
            {item.evidenceLine === null && variant === 'wide'
              ? 'No aparece en el CV'
              : scene.labels[item.status]}
          </text>
        </g>
      ))}
    </svg>
  );
}
