// Puerto Almacen: los datos del dispositivo. Hoy guarda la configuración; los almacenes de recetas,
// ingredientes, plan, compras, despensa y precios se suman con sus historias.

/**
 * @typedef {never} NombreAlmacen  Nombres de los almacenes de registros; todavía no hay ninguno.
 * @typedef {Object} PuertoAlmacen
 * @property {() => boolean} disponible
 * @property {() => Promise<object|null>} leerConfiguracion  null si todavía no hay.
 * @property {(configuracion: object) => Promise<void>} guardarConfiguracion
 * @property {(almacen: NombreAlmacen) => Promise<object[]>} listar
 * @property {(almacen: NombreAlmacen, registros: object|object[]) => Promise<void>} guardar  Crea o reemplaza por id.
 * @property {(almacen: NombreAlmacen, id: string) => Promise<void>} borrar
 * @property {(datos: Partial<Record<NombreAlmacen, object[]>>) => Promise<void>} reemplazar  Todo junto o nada.
 * @property {() => Promise<('persistente'|'puede-borrarse'|'desconocido'|'sin-almacenamiento')>} persistencia
 */

export const METODOS_ALMACEN = Object.freeze(['disponible', 'leerConfiguracion', 'guardarConfiguracion', 'listar', 'guardar', 'borrar', 'reemplazar', 'persistencia']);
