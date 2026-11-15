// Canal de la versión que corre: la versión a probar se publica en /prueba/  y sus nombres de
// almacenamiento llevan «dev» para no tocar nunca los de la versión real.
export function canal(ruta = location.pathname) {
  return /\/prueba\//.test(ruta) ? 'dev' : 'real';
}

/** Base de datos según el canal y el modo prueba. */
export function nombreDeBase({ modoPrueba, ruta }) {
  return nombreConCanal(modoPrueba ? 'prueba' : '', ruta).replace(/-$/, '');
}

/** Nombre de una clave o base del navegador para este canal: «alacena-tema» o «alacena-dev-tema». */
export function nombreConCanal(nombre, ruta) {
  return canal(ruta) === 'dev' ? `alacena-dev-${nombre}` : `alacena-${nombre}`;
}
