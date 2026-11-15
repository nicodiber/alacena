// Puerto de la instalación como app.

/**
 * @typedef {Object} PuertoInstalacion
 * @property {() => boolean} estaInstalada  Alacena se abrió como app instalada.
 * @property {() => boolean} puedeConUnToque  El navegador ofrece instalar con un toque.
 * @property {() => ('celular'|'pc')} dispositivo
 * @property {() => Promise<boolean>} instalar  Abre el pedido del navegador; true si se aceptó.
 * @property {(funcion: () => void) => void} alCambiar  Avisa cuando cambia lo de arriba.
 * @property {(funcion: () => void) => void} alInstalarse  Avisa cuando el navegador terminó de instalar Alacena.
 */

export const METODOS_INSTALACION = Object.freeze(['estaInstalada', 'puedeConUnToque', 'dispositivo', 'instalar', 'alCambiar', 'alInstalarse']);
