/*
Campo de radar de Inicio (solo web), dibujado en un canvas 2D (sin WebGL ni dependencias).

Anillos concéntricos alrededor de un centro. El puntero actúa como una lente: curva los anillos
cercanos hacia él y los ilumina. Cada pulso es una onda que sale de un punto, recorre el campo y
avisa cuando alcanza un requisito (`onReach`), que entonces revela su estado: es la metáfora del
producto, la búsqueda de evidencias, no un efecto decorativo.

Rendimiento: el bucle de dibujo solo corre mientras algo se mueve (el puntero se asienta o hay
pulsos en curso) y el canvas está a la vista; en reposo no consume nada. La densidad de píxeles se
limita a 2. Con «reducir movimiento» se dibuja una sola vez, sin lente ni pulsos.
*/

export type RadarLayout = { cx: number; cy: number; step: number; width: number; height: number };

export type RadarTarget = { id: string; angle: number; ring: number };

type RadarOptions = {
  /** Centro y separación de los anillos para un tamaño de canvas dado. */
  layout: (width: number, height: number) => Omit<RadarLayout, 'width' | 'height'>;
  targets: readonly RadarTarget[];
  onLayout: (layout: RadarLayout) => void;
  onReach: (id: string) => void;
  reducedMotion: boolean;
};

type Ping = { x: number; y: number; start: number; reached: Set<string> };

const PING_DURATION = 1700;
// La onda frena al final, como un sonido que se apaga.
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

export function createRadarField(canvas: HTMLCanvasElement, options: RadarOptions) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const context = ctx;

  let layout: RadarLayout = { cx: 0, cy: 0, step: 56, width: 0, height: 0 };
  let ringColor = '#888';
  let accentColor = '#5B4BE8';
  const pointer = { x: 0, y: 0, targetX: 0, targetY: 0, strength: 0, targetStrength: 0 };
  const pings: Ping[] = [];
  let frame = 0;
  let last = 0;
  let visible = true;

  const readColors = () => {
    const style = getComputedStyle(canvas);
    ringColor = style.getPropertyValue('--radar-ring').trim() || ringColor;
    accentColor = style.getPropertyValue('--radar-accent').trim() || accentColor;
  };

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    layout = { ...options.layout(rect.width, rect.height), width: rect.width, height: rect.height };
    options.onLayout(layout);
    readColors();
    draw();
  };

  const targetPoint = (target: RadarTarget) => {
    const angle = (target.angle * Math.PI) / 180;
    const r = target.ring * layout.step;
    return { x: layout.cx + r * Math.cos(angle), y: layout.cy + r * Math.sin(angle) };
  };

  // Anillos hasta cubrir la esquina más lejana del canvas.
  const ringCount = () => {
    const corner = Math.max(
      Math.hypot(layout.cx, layout.cy),
      Math.hypot(layout.width - layout.cx, layout.cy),
      Math.hypot(layout.cx, layout.height - layout.cy),
      Math.hypot(layout.width - layout.cx, layout.height - layout.cy),
    );
    return Math.ceil(corner / layout.step);
  };

  function draw(now = performance.now()) {
    const { width, height, cx, cy, step } = layout;
    context.clearRect(0, 0, width, height);
    const count = ringCount();
    // Radio de la lente: unos tres anillos, para que se lea como una deformación local.
    const sigma = step * 1.4;
    const pull = 11 * pointer.strength;
    const pointerRadius = Math.hypot(pointer.x - cx, pointer.y - cy);

    for (let i = 1; i <= count; i++) {
      const r = i * step;
      context.beginPath();
      /*
      Solo los anillos que pasan cerca del puntero se deforman. Los demás son círculos exactos y
      se dibujan con un arco, mucho más barato que una línea de 160 puntos en pantallas grandes.
      */
      if (pull <= 0.01 || Math.abs(pointerRadius - r) > sigma * 3) {
        context.arc(cx, cy, r, 0, Math.PI * 2);
      } else {
        const segments = Math.min(160, 48 + i * 8);
        for (let k = 0; k <= segments; k++) {
          const theta = (k / segments) * Math.PI * 2;
          let x = cx + r * Math.cos(theta);
          let y = cy + r * Math.sin(theta);
          const dx = pointer.x - x;
          const dy = pointer.y - y;
          const distance = Math.hypot(dx, dy) || 1;
          const force = pull * Math.exp(-(distance * distance) / (2 * sigma * sigma));
          x += (dx / distance) * force;
          y += (dy / distance) * force;
          if (k === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        }
      }
      // Los anillos interiores pesan más: el centro es el origen de la señal.
      context.globalAlpha = 0.16 + 0.34 * Math.max(0, 1 - i / 7);
      context.strokeStyle = ringColor;
      context.lineWidth = 1;
      context.stroke();

      const ringDistance = Math.abs(pointerRadius - r);
      const glow = pointer.strength * Math.exp(-(ringDistance * ringDistance) / (2 * 40 * 40));
      if (glow > 0.03) {
        context.globalAlpha = glow * 0.7;
        context.strokeStyle = accentColor;
        context.lineWidth = 1.5;
        context.stroke();
      }
    }

    // Pulsos: una onda principal y un eco más débil detrás.
    for (const ping of pings) {
      const t = Math.min(1, (now - ping.start) / PING_DURATION);
      const reach = Math.max(width, height) * 1.1;
      const radius = easeOut(t) * reach;
      const fade = Math.pow(1 - t, 1.6);
      for (const [offset, weight] of [
        [0, 1],
        [-step * 0.6, 0.35],
      ] as const) {
        const ringRadius = radius + offset;
        if (ringRadius <= 0) continue;
        context.beginPath();
        context.arc(ping.x, ping.y, ringRadius, 0, Math.PI * 2);
        context.globalAlpha = fade * weight * 0.85;
        context.strokeStyle = accentColor;
        context.lineWidth = 2;
        context.stroke();
      }
      for (const target of options.targets) {
        if (ping.reached.has(target.id)) continue;
        const point = targetPoint(target);
        if (Math.hypot(point.x - ping.x, point.y - ping.y) <= radius) {
          ping.reached.add(target.id);
          options.onReach(target.id);
        }
      }
    }
    context.globalAlpha = 1;
  }

  const tick = (now: number) => {
    const dt = Math.min(48, now - (last || now)) / 1000;
    last = now;
    /*
    Seguimiento amortiguado del puntero, sin rebote. Con una constante de unos 30 ms la lente va
    pegada al cursor (con 70 ms se notaba arrastrada); la intensidad entra en unos 60 ms.
    */
    const follow = 1 - Math.exp(-dt * 34);
    pointer.x += (pointer.targetX - pointer.x) * follow;
    pointer.y += (pointer.targetY - pointer.y) * follow;
    pointer.strength += (pointer.targetStrength - pointer.strength) * (1 - Math.exp(-dt * 16));
    for (let i = pings.length - 1; i >= 0; i--) {
      if (now - pings[i].start > PING_DURATION) pings.splice(i, 1);
    }
    draw(now);
    const settled =
      Math.abs(pointer.targetX - pointer.x) < 0.3 &&
      Math.abs(pointer.targetY - pointer.y) < 0.3 &&
      Math.abs(pointer.targetStrength - pointer.strength) < 0.005;
    if (pings.length > 0 || !settled) frame = requestAnimationFrame(tick);
    else frame = 0;
  };

  const wake = () => {
    if (options.reducedMotion || !visible || frame) return;
    last = 0;
    frame = requestAnimationFrame(tick);
  };

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  const visibility = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) wake();
    else if (frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  });
  visibility.observe(canvas);
  const scheme = window.matchMedia('(prefers-color-scheme: dark)');
  const onScheme = () => {
    readColors();
    draw();
  };
  scheme.addEventListener('change', onScheme);
  resize();

  return {
    /** Coordenadas relativas al canvas. `null` cuando el puntero sale del campo. */
    setPointer(point: { x: number; y: number } | null) {
      if (point) {
        // Al entrar, la lente aparece donde está el puntero, sin recorrer el campo.
        if (pointer.targetStrength === 0 && pointer.strength < 0.05) {
          pointer.x = point.x;
          pointer.y = point.y;
        }
        pointer.targetX = point.x;
        pointer.targetY = point.y;
        pointer.targetStrength = 1;
      } else {
        pointer.targetStrength = 0;
      }
      wake();
    },
    /** Emite un pulso desde un punto del canvas, o desde el centro del radar. */
    ping(point?: { x: number; y: number }) {
      if (options.reducedMotion) {
        for (const target of options.targets) options.onReach(target.id);
        return;
      }
      pings.push({
        x: point?.x ?? layout.cx,
        y: point?.y ?? layout.cy,
        start: performance.now(),
        reached: new Set(),
      });
      // Como mucho tres ondas a la vez: más no se leen y solo cuestan.
      if (pings.length > 3) pings.shift();
      wake();
    },
    destroy() {
      if (frame) cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      visibility.disconnect();
      scheme.removeEventListener('change', onScheme);
    },
  };
}

export type RadarField = NonNullable<ReturnType<typeof createRadarField>>;
