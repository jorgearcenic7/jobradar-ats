export function confirmAnalysisExit(message: string, onConfirm: () => void) {
  if (window.confirm(message)) onConfirm();
}
