import 'react-native';

/*
React Native Web acepta `onKeyDown` en `Pressable` y lo entrega al DOM junto a su propia gestión de
Intro y Espacio, pero los tipos de React Native no lo declaran. Esta ampliación solo añade el tipo:
iOS y Android no emiten ese evento, así que allí la propiedad se ignora.
*/
declare module 'react-native' {
  interface PressableProps {
    /** Solo web: tecla pulsada mientras el control tiene el foco. */
    onKeyDown?: (event: { key: string; preventDefault: () => void }) => void;
  }
}
