// Puerto de las preferencias del dispositivo (PreferenciasDispositivo).
// No se sincronizan: viven solo en el dispositivo.

/**
 * @typedef {Object} PuertoPreferencias
 * @property {() => (string|null)} leerTema  El tema guardado, o null si nunca se eligió.
 * @property {(tema: 'claro'|'oscuro'|'sistema') => void} guardarTema
 * @property {() => (string|null)} leerSugerenciaInstalacion  'pendiente', 'descartada' o null.
 * @property {(valor: 'pendiente'|'descartada') => void} guardarSugerenciaInstalacion
 * @property {() => (string|null)} leerModoPrueba  'si' o null.
 * @property {(valor: string|null) => void} guardarModoPrueba  'si' para activar; null para desactivar.
 * @property {() => (string|null)} leerFechaSimulada  AAAA-MM-DD o null.
 * @property {(valor: string) => void} guardarFechaSimulada
 */

/** Métodos que tiene que ofrecer todo adaptador de este puerto. */
export const METODOS_PREFERENCIAS = Object.freeze(['leerTema', 'guardarTema', 'leerSugerenciaInstalacion', 'guardarSugerenciaInstalacion',
  'leerModoPrueba', 'guardarModoPrueba', 'leerFechaSimulada', 'guardarFechaSimulada']);
