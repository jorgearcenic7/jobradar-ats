import { Alert } from 'react-native';

export function confirmAnalysisExit(message: string, onConfirm: () => void) {
  Alert.alert('¿Salir del analizador?', message, [
    { text: 'Seguir analizando', style: 'cancel' },
    { text: 'Salir al inicio', style: 'destructive', onPress: onConfirm },
  ]);
}
