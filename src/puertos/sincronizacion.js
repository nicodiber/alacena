// Puerto Sincronizacion: guardar y leer los datos de Alacena en un archivo JSON del Drive de la persona.
// Es el único canal de sincronización: sin servidor propio. El adaptador que lo cumple (el de Drive,
// con el de la sesión de Google) todavía no está conectado a la interfaz.

/**
 * @typedef {Object} ArchivoRemoto
 * @property {string} id  Identificador del archivo en Drive.
 * @property {string} modifiedTime  Última modificación, ISO 8601, según Drive.
 * @property {string} createdTime  Creación, ISO 8601, según Drive.
 * @property {number} duplicados  Cuántos archivos más con el mismo nombre hay en la carpeta (0 lo normal). Se usa el más antiguo.
 *
 * @typedef {Object} ResultadoGuardado
 * @property {string} id
 * @property {string} modifiedTime  La hora que Drive asignó a esta escritura.
 * @property {number} desfaseRelojMs  Cuánto se adelanta (+) o atrasa (−) el reloj de este dispositivo respecto del de Drive.
 *
 * @typedef {Object} PuertoSesion
 * @property {() => boolean} disponible  Hay un ID de cliente configurado y el navegador puede abrir la sesión de Google.
 * @property {(opciones?: { silencioso?: boolean }) => Promise<void>} conectar  Pide el permiso `drive.file`; en silencioso no abre ventanas y falla si hace falta interacción.
 * @property {() => boolean} conectada  Hay una sesión vigente.
 * @property {() => void} cerrarSesion  Revoca el permiso y olvida la cuenta recordada. No toca datos.
 * @property {(funcion: () => void) => void} alPerderSesion  Avisa cuando la sesión deja de servir (por ejemplo, Google responde 401).
 *
 * @typedef {Object} PuertoSincronizacion
 * @property {() => Promise<ArchivoRemoto|null>} buscarArchivo  null si todavía no existe en la carpeta «Alacena».
 * @property {(id: string) => Promise<object>} leerArchivo  Los datos guardados.
 * @property {(datos: object) => Promise<ResultadoGuardado>} guardarArchivo  Crea la carpeta y el archivo la primera vez; después actualiza.
 */

export const METODOS_SESION = Object.freeze(['disponible', 'conectar', 'conectada', 'cerrarSesion', 'alPerderSesion']);
export const METODOS_SINCRONIZACION = Object.freeze(['buscarArchivo', 'leerArchivo', 'guardarArchivo']);

/** Códigos de ErrorSincronizacion: lo que la interfaz usa para decidir qué mostrar. */
export const CODIGOS_ERROR = Object.freeze(['sin-sesion', 'sesion-vencida', 'sin-conexion', 'no-encontrado', 'otro']);

/**
 * Error de comunicación con el destino de la sincronización, con un `codigo` de CODIGOS_ERROR:
 * `sin-sesion` (no hay token), `sesion-vencida` (401), `sin-conexion` (no hubo red), `no-encontrado` (404) u `otro`.
 */
export class ErrorSincronizacion extends Error {
  constructor(codigo, mensaje) {
    super(mensaje);
    this.name = 'ErrorSincronizacion';
    this.codigo = codigo;
  }
}
