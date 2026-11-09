import 'react-native';

// React Native Web forwards style properties it doesn't know to the DOM as CSS, so this one works
// on web without any conversion. It only widens the type; iOS and Android never receive it,
// because the text field applies it on web alone.
declare module 'react-native' {
  interface TextStyle {
    /** Web only: `content` lets a multiline field grow with its text (CSS `field-sizing`). */
    fieldSizing?: 'fixed' | 'content';
  }
}
