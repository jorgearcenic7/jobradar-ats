import 'react-native';

/*
React Native Web acepta estas propiedades y las pasa al DOM, pero los tipos de React Native no las
declaran. Esta ampliación solo añade los tipos: en iOS y Android nunca se aplican, porque quien las
usa lo hace únicamente en la web.
*/
declare module 'react-native' {
  interface ViewStyle {
    /** Solo web: propiedades CSS que se animan, como `background-color`. */
    transitionProperty?: string;
    /** Solo web: duración CSS, como `150ms`. */
    transitionDuration?: string;
    /** Solo web: curva CSS de la transición. */
    transitionTimingFunction?: string;
  }

  interface ViewProps {
    /** Solo web: se convierte en atributos `data-*`, que el CSS de la cabecera usa para adaptarse. */
    dataSet?: Record<string, string | number | boolean>;
  }
}
