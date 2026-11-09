export function authError(error: unknown): string {
  const code = error && typeof error === 'object' && 'code' in error ? error.code : null;
  switch (code) {
    case 'invalid_credentials':
      return 'Email o contraseña incorrectos.';
    case 'email_not_confirmed':
      return 'Confirma tu correo antes de entrar. Puedes solicitar otro enlace de confirmación.';
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'Demasiados intentos. Espera unos minutos y vuelve a probar.';
    case 'weak_password':
      return 'La contraseña no cumple los requisitos de seguridad del servicio.';
    case 'same_password':
      return 'Elige una contraseña diferente a la anterior.';
    default:
      return 'No se pudo completar la solicitud. Comprueba tu conexión y permite el almacenamiento de sesión antes de volver a intentarlo.';
  }
}
