// La J con las ondas del logo en SVG del DOM (solo web), a partir de `assets/branding/jobradar-mark.svg`.
export function LogoMark() {
  return (
    <svg viewBox="0 0 1024 1024" aria-hidden>
      <g
        transform="translate(512 512) scale(0.82) translate(-516 -464)"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round">
        <path d="M560 430 V680 A120 120 0 0 1 320 680" strokeWidth="96" />
        <circle cx="560" cy="280" r="58" fill="currentColor" stroke="none" />
        <path d="M560 170 A110 110 0 0 1 670 280" strokeWidth="40" />
        <path d="M560 100 A180 180 0 0 1 740 280" strokeWidth="40" />
      </g>
    </svg>
  );
}
