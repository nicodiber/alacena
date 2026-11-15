// Sugerir la instalación. Funciones puras: no saben nada del navegador.

/** La tarjeta de la primera pantalla aparece desde el navegador hasta instalar Alacena o tocar «Ahora no». */
export function debeSugerirInstalacion({ instalada, sugerencia }) {
  return !instalada && sugerencia !== 'descartada';
}

/**
 * Qué ofrecer: nada (ya es la app instalada), el pedido del navegador con un toque,
 * o los pasos a mano según el dispositivo.
 */
export function formaDeInstalar({ instalada, conUnToque, dispositivo }) {
  if (instalada) return 'instalada';
  if (conUnToque) return 'un-toque';
  return dispositivo === 'celular' ? 'pasos-celular' : 'pasos-pc';
}
