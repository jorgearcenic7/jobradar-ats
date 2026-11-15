/*
Analizar del prototipo inmersivo (solo web): la llegada desde Inicio y las etapas del análisis.

Muestra las interacciones, no ejecuta el análisis. El archivo elegido solo aporta su nombre y su
tamaño, que nunca salen del navegador, y el ejemplo ficticio se etiqueta como tal. Al pulsar
«Analizar», un barrido recorre el CV y la oferta y el prototipo lleva al analizador actual,
donde se hace el análisis real.

Movimiento:
- El carril de etapas avanza a la primera que falta, con un indicador que se desliza.
- La diana del CV se contrae hacia el centro al arrastrar un archivo encima, y el archivo
  «aterriza» en ella con una onda al soltarlo o elegirlo.
- El barrido acompaña la transición hacia Resultados.
*/
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type DragEvent,
} from 'react';

import { Arrow, type Origin } from './home-view';
import { useMagnetic } from './use-magnetic';

type CvSource = { kind: 'file'; name: string; size: number } | { kind: 'text'; text: string };

const sampleCv =
  'Ana Ejemplo · Desarrolladora backend (CV ficticio)\nExperiencia: 3 años desarrollando APIs con Python y FastAPI.\nSprints de dos semanas en un equipo de seis.\nIdiomas: inglés C1.';
const sampleOffer =
  'Desarrollador/a backend (oferta ficticia)\nRequisitos: experiencia con Python, metodologías ágiles (Scrum), inglés C1 y certificación AWS.';

const stages = ['Tu CV', 'La oferta', 'Resultados'] as const;

const formatSize = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;

type AnalyzeViewProps = {
  onBack: (origin: Origin) => void;
  reducedMotion: boolean;
};

export function AnalyzeView({ onBack, reducedMotion }: AnalyzeViewProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [cv, setCv] = useState<CvSource | null>(null);
  const [pasteMode, setPasteMode] = useState(false);
  const [pasted, setPasted] = useState('');
  const [offer, setOffer] = useState('');
  const [dragging, setDragging] = useState(false);
  // Cambia en cada llegada de un CV, para repetir la animación de aterrizaje.
  const [landing, setLanding] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [done, setDone] = useState(false);
  const [missing, setMissing] = useState(false);
  const magnet = useMagnetic();

  // Al llegar desde Inicio, el foco pasa al título de la nueva pantalla.
  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
  }, []);

  const cvReady = cv !== null || pasted.trim().length > 0;
  const offerReady = offer.trim().length > 0;
  const completed = [cvReady, offerReady, done];
  const current = Math.max(0, completed.indexOf(false));

  const receive = (file: File | undefined) => {
    if (!file) return;
    setCv({ kind: 'file', name: file.name, size: file.size });
    setPasteMode(false);
    setLanding((value) => value + 1);
    setDone(false);
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    receive(event.dataTransfer.files[0]);
  };

  const loadSample = () => {
    setPasteMode(true);
    setCv(null);
    setPasted(sampleCv);
    setOffer(sampleOffer);
    setLanding((value) => value + 1);
    setDone(false);
  };

  const analyze = () => {
    if (!cvReady || !offerReady) {
      setMissing(true);
      return;
    }
    setMissing(false);
    if (reducedMotion) {
      setDone(true);
      return;
    }
    setScanning(true);
    window.setTimeout(() => {
      setScanning(false);
      setDone(true);
    }, 900);
  };

  const missingText = !cvReady
    ? !offerReady
      ? 'Falta añadir tu CV y la oferta'
      : 'Falta añadir tu CV'
    : 'Falta añadir la oferta';

  return (
    <main className="pr-analyze" data-scanning={scanning}>
      <header className="pr-analyze-head">
        <button
          type="button"
          className="pr-back"
          onClick={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            onBack({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
          }}>
          <Arrow />
          <span>Inicio</span>
        </button>
        <h1 ref={titleRef} tabIndex={-1} className="pr-analyze-title">
          Analizar CV y oferta
        </h1>
        <ol
          className="pr-stages"
          aria-label="Etapas del análisis"
          style={{ '--stage': current } as CSSProperties}>
          {stages.map((stage, index) => {
            const state = completed[index]
              ? 'completada'
              : index === current
                ? 'en curso'
                : 'pendiente';
            return (
              <li
                key={stage}
                data-state={completed[index] ? 'done' : index === current ? 'current' : 'pending'}
                aria-label={`${stage}: ${state}`}>
                <span className="pr-stage-number" aria-hidden>
                  {completed[index] ? <Check /> : index + 1}
                </span>
                {stage}
              </li>
            );
          })}
        </ol>
      </header>

      <div className="pr-inputs">
        <section className="pr-cv" aria-labelledby="pr-cv-title">
          <div className="pr-field-head">
            <h2 id="pr-cv-title">Tu CV</h2>
            <button
              type="button"
              className="pr-text-link"
              onClick={() => setPasteMode((value) => !value)}>
              {pasteMode ? 'Elegir un archivo' : 'Pegar el texto'}
            </button>
          </div>
          {pasteMode ? (
            <label className="pr-textarea">
              <span>Texto del CV</span>
              <textarea
                value={pasted}
                onChange={(event) => setPasted(event.target.value)}
                rows={9}
                placeholder="Pega aquí el texto completo de tu CV…"
              />
            </label>
          ) : (
            <div
              className="pr-target"
              data-dragging={dragging}
              data-ready={cv?.kind === 'file'}
              onDragEnter={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false);
              }}
              onDrop={onDrop}>
              {/* Los anillos van en su propio bloque: ninguna línea cruza el texto de debajo. */}
              <div className="pr-target-rings" aria-hidden>
                <i />
                <i />
                <i />
                <i />
                <span key={landing} className="pr-target-core">
                  {cv?.kind === 'file' ? <Check /> : <Upload />}
                </span>
              </div>
              <input
                ref={fileRef}
                className="pr-sr-only"
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  receive(event.target.files?.[0])
                }
                tabIndex={-1}
                aria-hidden
              />
              {cv?.kind === 'file' ? (
                <div key={landing} className="pr-landed" aria-live="polite">
                  <b>{cv.name}</b>
                  <small>{formatSize(cv.size)} · se leerá en tu dispositivo</small>
                </div>
              ) : null}
              <button
                type="button"
                className="pr-target-button"
                onClick={() => fileRef.current?.click()}>
                {cv?.kind === 'file' ? 'Cambiar el archivo' : 'Arrastra tu CV o selecciónalo'}
                <small>PDF con texto o Word (.docx)</small>
              </button>
            </div>
          )}
        </section>

        <section className="pr-offer" aria-labelledby="pr-offer-title">
          <div className="pr-field-head">
            <h2 id="pr-offer-title">La oferta</h2>
            <span className="pr-count">{offer.length.toLocaleString('es-ES')} caracteres</span>
          </div>
          <label className="pr-textarea is-tall">
            <span>Texto de la oferta</span>
            <textarea
              value={offer}
              onChange={(event) => setOffer(event.target.value)}
              rows={12}
              placeholder="Pega aquí la descripción completa del puesto…"
            />
          </label>
        </section>
        <span className="pr-scan" aria-hidden>
          <i />
        </span>
      </div>

      <footer className="pr-submit">
        <p className="pr-note">El análisis se hace en este dispositivo: el texto no se envía.</p>
        <button type="button" className="pr-text-link" onClick={loadSample}>
          Cargar ejemplo ficticio
        </button>
        <span className="pr-magnet" ref={magnet}>
          <button
            type="button"
            className="pr-primary"
            data-ready={cvReady && offerReady}
            onClick={analyze}>
            <span data-magnetic-label>Analizar</span>
            <Arrow />
          </button>
        </span>
        <p className="pr-submit-status" aria-live="polite">
          {done ? (
            <>
              Prototipo: aquí se abriría Resultados con el análisis real.{' '}
              <a href="/analisis">Abrir el analizador actual</a>
            </>
          ) : missing || !(cvReady && offerReady) ? (
            missingText
          ) : (
            'Listo para analizar'
          )}
        </p>
      </footer>
    </main>
  );
}

function Check() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M5 12.5 10 17.5 19 7" />
    </svg>
  );
}

function Upload() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M12 15V4.5M7.5 9 12 4.5 16.5 9M5 15.5v2.5a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5v-2.5" />
    </svg>
  );
}
