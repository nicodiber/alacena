// Puerto Reloj: la única forma de saber «hoy». En modo prueba devuelve la fecha simulada.

/**
 * @typedef {Object} PuertoReloj
 * @property {() => string} hoy  Fecha AAAA-MM-DD en America/Argentina/Buenos_Aires.
 * @property {() => string} ahora  Hora HH:MM de 24 h en America/Argentina/Buenos_Aires (en modo prueba, la hora real).
 * @property {() => number} instanteMs  Milisegundos desde 1970 (siempre el instante real, también en modo prueba): para vencimientos y diferencias de tiempo.
 */

export const METODOS_RELOJ = Object.freeze(['hoy', 'ahora', 'instanteMs']);
