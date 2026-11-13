import { render, screen } from '@testing-library/react-native';

import { analyzeMatch } from '@/features/cv-match/domain/analyze-match';
import { cleanOfferText } from '@/features/cv-match/domain/offer-cleanup';
import { OfferCleanupNotice } from '@/features/cv-match/presentation/offer-cleanup-notice';

// Página de LinkedIn copiada entera, con empresa, personas y ofertas ficticias.
const jobDescription = `Acerca del empleo
Buscamos una persona para el equipo de producto de una empresa ficticia.

Requisitos
- Experiencia con React y TypeScript.
- Inglés B2.
- 3 años de experiencia profesional.
- Seguir procedimientos de calidad del equipo.
- Mostrar iniciativa para proponer mejoras.

Se valorará
- Experiencia con Docker.`;

const linkedinPage = `Inicio
Mi red
Empleos
Mensajes
Notificaciones
Yo
Para negocios
Prueba Premium por 0 EUR
Desarrollador/a Frontend
Empresa Ficticia S.L. · Madrid · hace 2 días · Más de 100 solicitudes
Promocionado
Solicitud sencilla
Guardar
${jobDescription}
…más
Establece una alerta para empleos similares
Acerca de la empresa
Empresa Ficticia S.L.
12.345 seguidores
Seguir
Empresa de software con sede en una ciudad ficticia.
Más empleos para ti
Desarrollador Backend Java
Otra Empresa Ficticia · Barcelona
Promocionado
Analista de datos senior
Tercera Empresa Ficticia · Remoto
Publicidad
Consigue tu certificado en la nube en 30 días
Ayuda
Privacidad y condiciones
LinkedIn Corporation © 2026`;

const englishPage = `Home
My Network
Jobs
Senior Frontend Engineer
Sample Corp · Remote · Over 100 applicants
Easy Apply
Save
About the job
Requirements
- Experience with React.
- Strong communication skills.
Show more
Meet the hiring team
Alex Sample
Message
More jobs for you
Backend Developer · Another Sample Inc.`;

const cv = 'Experiencia\nDesarrollé interfaces con React y TypeScript durante tres años.';
const recognized = (offer: string) =>
  analyzeMatch(cv, offer)
    .requirements.filter((item) => item.status !== 'not-evaluable')
    .map((item) => [item.requirement.id, item.requirement.importance]);

// Descripción sola, como se copia del apartado de la oferta en LinkedIn. Incluye los encabezados
// que antes provocaban el recorte y dejaban 0 requisitos.
const descriptionOnly = `Acerca del empleo
Acerca de la empresa:
Somos una consultora tecnológica ficticia con proyectos en varios sectores.

Responsabilidades
- Diseñar arquitecturas en la nube para nuestros clientes.

Requisitos
- Experiencia con Azure.
- Experiencia con AWS.
- Conocimientos de Google Cloud.
- Accesibilidad web (WCAG).
…más`;

describe('cleanOfferText: clean offers', () => {
  it.each([
    ['a description copied alone from LinkedIn', descriptionOnly],
    ['an ordinary offer', 'Requisitos\n- Experiencia con React.\n- Guardar la documentación.'],
    ['an offer that mentions LinkedIn', 'Requisitos\n- Perfil de LinkedIn actualizado.\n- React.'],
  ])('leaves %s untouched', (_name, offer) => {
    expect(cleanOfferText(offer)).toEqual({ text: offer, removedLines: 0, source: null });
  });

  it('keeps every requirement of the description copied alone', () => {
    const ids = analyzeMatch(cv, cleanOfferText(descriptionOnly).text)
      .requirements.filter((item) => item.requirement.kind === 'concept')
      .map((item) => item.requirement.id);
    expect(ids).toEqual(['concept:azure', 'concept:aws', 'concept:gcp', 'concept:accessibility']);
  });
});

describe('cleanOfferText: full LinkedIn pages', () => {
  it.each([
    ['Spanish', linkedinPage],
    ['English', englishPage],
  ])('flags a full %s page for review and removes only exact buttons and menus', (_name, page) => {
    const cleanup = cleanOfferText(page);
    expect(cleanup.source).toBe('linkedin');
    expect(cleanup.removedLines).toBeGreaterThan(0);
    // No se recorta nada más: cada línea que queda estaba en el original, en el mismo orden.
    const kept = cleanup.text.split('\n');
    const original = page.split('\n');
    expect(kept.length).toBe(original.length - cleanup.removedLines);
    expect(original.filter((line) => kept.includes(line))).toEqual(kept);
  });

  it('assesses the recognized requirements exactly as the original page', () => {
    expect(recognized(cleanOfferText(linkedinPage).text)).toEqual(recognized(linkedinPage));
    expect(recognized(cleanOfferText(englishPage).text)).toEqual(recognized(englishPage));
  });

  it('keeps requirements that only contain words of buttons', () => {
    const text = cleanOfferText(linkedinPage).text;
    expect(text).toContain('- Seguir procedimientos de calidad del equipo.');
    expect(text).toContain('- Mostrar iniciativa para proponer mejoras.');
    expect(text).not.toMatch(/^Mi red$/m);
  });

  it('keeps the whole description even when it opens with «Acerca de la empresa»', () => {
    const page = linkedinPage.replace(
      jobDescription.replace('Acerca del empleo\n', ''),
      descriptionOnly.replace('Acerca del empleo\n', ''),
    );
    const text = cleanOfferText(page).text;
    for (const requirement of ['Azure', 'AWS', 'Google Cloud', 'Accesibilidad web']) {
      expect(text).toContain(requirement);
    }
  });

  it('keeps the original text when removing a line would change a recognized requirement', () => {
    // «Empleos» funciona aquí como encabezado de la lista: quitarlo cambiaría la importancia.
    const page =
      'Mi red\nSolicitud sencilla\nRequisitos\n- React.\nEmpleos\nSe valorará\n- Docker.';
    const cleanup = cleanOfferText(page);
    expect(cleanup.source).toBe('linkedin');
    expect(recognized(cleanup.text)).toEqual(recognized(page));
  });
});

describe('OfferCleanupNotice', () => {
  it('shows nothing for a clean offer', async () => {
    await render(<OfferCleanupNotice cleanup={cleanOfferText(descriptionOnly)} moment="before" />);
    expect(screen.queryByText('Revisa el texto de la oferta')).toBeNull();
  });

  it('asks to review a full page and never presents the cleanup as correct', async () => {
    await render(<OfferCleanupNotice cleanup={cleanOfferText(linkedinPage)} moment="after" />);
    expect(screen.getByText('Revisa el texto de la oferta')).toBeTruthy();
    expect(screen.getByText(/de botones y menús; el resto se analiza tal cual/)).toBeTruthy();
    expect(screen.queryByText(/Solo se ha analizado/)).toBeNull();
  });
});
