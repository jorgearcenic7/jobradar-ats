/*
Privacidad (`/privacidad`): quién trata los datos, cuáles, para qué, dónde, cuánto tiempo y cómo
consultarlos, eliminarlos o ejercer los derechos de protección de datos.

Describe solo lo que hace el código: el análisis local, la sesión, el guardado voluntario de
«Mis CV» y la baja de cuenta. Si cambia alguno de esos comportamientos, este texto debe cambiar
con él (ver `docs/mis-cv.md`).

La base jurídica y las transferencias internacionales aparecen como pendientes a propósito: las
debe decidir o verificar el responsable, y bloquean la publicación (ver `docs/roadmap.md`).
*/
import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppNavigation } from '@/shared/navigation/app-navigation';
import { layout, space } from '@/shared/theme';
import { Card } from '@/shared/ui/card';
import { Screen } from '@/shared/ui/screen';
import { Heading, ThemedText } from '@/shared/ui/themed-text';

const contactEmail = 'jorgearcenic7@gmail.com';
const updatedOn = '11 de noviembre de 2026';

type Section = {
  title: string;
  paragraphs: string[];
  /** Muestra el email de contacto como enlace al final de la sección. */
  contact?: boolean;
};

const sections: Section[] = [
  {
    title: 'Responsable',
    paragraphs: [
      'JobRadar ATS es un servicio gratuito y no comercial. El responsable de los datos que trata es Jorge Arce Nicolás. Para cualquier consulta sobre privacidad, escribe a:',
    ],
    contact: true,
  },
  {
    title: 'Qué datos se tratan y para qué',
    paragraphs: [
      'Sin cuenta, JobRadar no recoge datos tuyos: el CV y la oferta que analizas no salen de tu dispositivo. Al servir la web, el proveedor de alojamiento trata datos técnicos de la visita (ver «Proveedores»).',
      'Con cuenta, tu email, para identificarte y enviarte los correos de confirmación y de recuperación de contraseña. Las credenciales las gestiona Supabase Auth (ver «Tu cuenta»).',
      'En «Mis CV», solo si decides guardar un CV, el archivo y su texto, para que puedas reutilizarlo en otros dispositivos.',
      'Para crear una cuenta necesitas un email y una contraseña. Si prefieres no darlos, puedes usar el analizador sin cuenta.',
      'JobRadar no comparte ni vende estos datos, no los usa para publicidad ni para entrenar modelos de IA, y no usa herramientas de analítica.',
    ],
  },
  {
    title: 'Base jurídica',
    paragraphs: [
      'Pendiente de confirmar por el responsable. Aquí se indicará la base jurídica de cada finalidad: la cuenta y sus correos de acceso, y «Mis CV».',
    ],
  },
  {
    title: 'El análisis se hace en tu dispositivo',
    paragraphs: [
      'El CV y la oferta se leen y se comparan en tu dispositivo. No se envían a ningún servidor ni se guardan: desaparecen al salir del analizador, recargar la página o cerrar la app. Esto es así tengas cuenta o no.',
      'El resultado del análisis solo lo ves tú, en tu dispositivo. JobRadar no lo recibe ni lo usa para tomar decisiones sobre ti.',
    ],
  },
  {
    title: 'Tu cuenta',
    paragraphs: [
      'Las credenciales las gestiona Supabase Auth, que también envía los correos de confirmación y de recuperación. La contraseña que escribes se envía directamente a Supabase Auth, que guarda solo un hash: una huella de la que no se puede recuperar. JobRadar no guarda tu contraseña ni tiene acceso a ella.',
      'Para mantener la sesión iniciada, tu dispositivo guarda un token de sesión: en el navegador, en su almacenamiento local; en la app, en el almacenamiento seguro del sistema. Al cerrar sesión se retira de ese dispositivo.',
    ],
  },
  {
    title: 'Mis CV',
    paragraphs: [
      'Un CV solo se guarda en tu cuenta si pulsas «Guardar en Mis CV» y lo confirmas. Antes de guardarlo, la app te muestra la cuenta de destino.',
      'De cada CV guardado se conservan el archivo original (PDF o Word), el texto extraído que se analiza (o la versión que corregiste), el nombre que le das y datos del archivo: nombre, formato, tamaño, páginas y fecha.',
      'Se guardan en Supabase, en su base de datos y en un almacenamiento de archivos privado, asociados a tu cuenta. Las reglas de acceso están configuradas para que solo tu cuenta pueda verlos, renombrarlos o eliminarlos.',
    ],
  },
  {
    title: 'Proveedores',
    paragraphs: [
      'Supabase: autenticación, base de datos y almacenamiento de archivos de los CV guardados. Los datos del proyecto están en la región eu-west-1 (Irlanda, Unión Europea). Al usar tu cuenta, Supabase también puede registrar datos técnicos de las peticiones, como la dirección IP.',
      'Cloudflare Pages: alojamiento principal de la web. Vercel: alojamiento de respaldo temporal, que sirve la misma web mientras dura la migración. Al servir las páginas, ambos pueden registrar datos técnicos de las visitas, como la dirección IP o el navegador, aunque no uses una cuenta.',
      'Estos datos técnicos los tratan los proveedores para prestar su servicio. No incluyen tu CV ni la oferta que analizas.',
      'Supabase, Cloudflare y Vercel son empresas de Estados Unidos. La información sobre posibles transferencias internacionales de datos y sus garantías está pendiente de verificar por el responsable: aquí solo se indicarán las garantías que se hayan comprobado.',
    ],
  },
  {
    title: 'Cuánto tiempo se conservan',
    paragraphs: [
      'Tus CV se conservan mientras los mantengas guardados, y tu cuenta mientras no la elimines, salvo que una obligación legal aplicable exija conservarlos más tiempo. Las copias de seguridad de Supabase pueden conservar datos borrados durante un tiempo limitado, según su política.',
    ],
  },
  {
    title: 'Consultar y eliminar tus CV',
    paragraphs: [
      'En «Mis CV» ves tus CV guardados con su nombre, archivo, formato, tamaño y fecha. «Analizar» abre su texto en el analizador. La app no permite descargar el archivo original: si necesitas una copia, solicítala por email.',
      'Puedes cambiar el nombre de un CV con «Renombrar». El texto guardado no se edita: para cambiarlo, elimina el CV y guarda una versión nueva.',
      '«Eliminar», tras confirmarlo, borra de tu cuenta el archivo y el texto de ese CV.',
    ],
  },
  {
    title: 'Eliminar tu cuenta',
    paragraphs: [
      'En «Mi cuenta», «Eliminar mi cuenta» borra primero todos los archivos de tus CV, después sus datos y por último tu cuenta. Para confirmarlo hay que escribir el email de la cuenta.',
      'Si el proceso se detiene a mitad, la app te dice qué se ha borrado y qué no, y puedes repetirlo. El análisis sin cuenta sigue disponible después.',
    ],
  },
  {
    title: 'Tus derechos',
    paragraphs: [
      'Puedes solicitar el acceso a tus datos, su rectificación o su supresión, y ejercer los demás derechos de protección de datos que te correspondan, escribiendo al email de contacto. Indica el email de tu cuenta para poder localizar tus datos.',
      'Si consideras que el tratamiento de tus datos no es correcto, también puedes presentar una reclamación ante la autoridad de protección de datos competente.',
    ],
    contact: true,
  },
];

export function PrivacyScreen() {
  return (
    <Screen header={<AppNavigation section="privacy" />}>
      <View style={styles.container}>
        <View style={styles.intro}>
          <ThemedText step="title" accessibilityRole="header">
            Privacidad
          </ThemedText>
          <ThemedText color="textTertiary">
            Qué datos trata JobRadar ATS, para qué, dónde, cuánto tiempo y cómo consultarlos o
            eliminarlos.
          </ThemedText>
          <ThemedText step="footnote" color="textTertiary">
            {`Última actualización: ${updatedOn}.`}
          </ThemedText>
        </View>
        {sections.map((section) => (
          <Card key={section.title} style={styles.card}>
            <Heading level={2} step="headline">
              {section.title}
            </Heading>
            {section.paragraphs.map((paragraph) => (
              <ThemedText key={paragraph} color="textSecondary">
                {paragraph}
              </ThemedText>
            ))}
            {section.contact ? (
              <Link href={`mailto:${contactEmail}`}>
                <ThemedText color="primary" selectable>
                  {contactEmail}
                </ThemedText>
              </Link>
            ) : null}
          </Card>
        ))}
        <Link href="/mi-cuenta">
          <ThemedText color="primary">Ir a Mi cuenta</ThemedText>
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    gap: space[4],
    paddingTop: space[6],
    paddingBottom: layout.screenPadding,
  },
  intro: { gap: space[2] },
  card: { gap: space[3], padding: space[6] },
});
