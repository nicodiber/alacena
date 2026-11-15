// Adaptador del puerto Sincronizacion con Google Drive (API v3, permiso `drive.file`). Todavía NO está conectado a la
// interfaz ni al arranque.
//
// Adaptado de la sincronización con Drive de otra app del mismo autor. Los datos viven en un único archivo
// JSON, `alacena-datos.json`, dentro de una carpeta «Alacena» del Drive de la persona. Con `drive.file` la app solo ve lo
// que ella misma creó, desde cualquier dispositivo.
import { ErrorSincronizacion } from '../puertos/sincronizacion.js';

export const NOMBRE_CARPETA = 'Alacena';
export const NOMBRE_ARCHIVO = 'alacena-datos.json';
const TIPO_CARPETA = 'application/vnd.google-apps.folder';
const API = 'https://www.googleapis.com/drive/v3';
const SUBIDA = 'https://www.googleapis.com/upload/drive/v3';
const LIMITE = 'alacena_limite';
const CAMPOS = 'id,modifiedTime,createdTime';

const literal = (texto) => texto.replaceAll('\\', '\\\\').replaceAll("'", "\\'");

/**
 * @param {{ auth: { obtenerToken: () => (string|null), invalidarToken: (motivo?: string) => void }, instanteMs: () => number,
 *   nombreArchivo?: string, nombreCarpeta?: string, pedir?: typeof fetch }} dependencias
 *   `auth` es el adaptador de google-auth.js; `instanteMs` viene del puerto Reloj; el nombre del archivo y de la carpeta
 *   permiten usar otros en pruebas; `pedir` permite probarlo sin red.
 * @returns {import('../puertos/sincronizacion.js').PuertoSincronizacion}
 */
export function crearDriveSync({ auth, instanteMs, nombreArchivo = NOMBRE_ARCHIVO, nombreCarpeta = NOMBRE_CARPETA, pedir = (...a) => fetch(...a) }) {
  let idCarpeta = null;
  let idArchivo = null;

  async function drive(url, opciones = {}) {
    const accessToken = auth.obtenerToken();
    if (!accessToken) throw new ErrorSincronizacion('sin-sesion', 'No hay una sesión de Google activa.');
    let respuesta;
    try {
      respuesta = await pedir(url, { ...opciones, headers: { ...opciones.headers, Authorization: `Bearer ${accessToken}` } });
    } catch {
      throw new ErrorSincronizacion('sin-conexion', 'No hay conexión con Google Drive.');
    }
    if (!respuesta.ok) {
      if (respuesta.status === 401) {
        auth.invalidarToken('Drive respondió 401');
        throw new ErrorSincronizacion('sesion-vencida', 'La sesión de Google venció.');
      }
      if (respuesta.status === 404) throw new ErrorSincronizacion('no-encontrado', 'No se encontró el archivo en Drive.');
      throw new ErrorSincronizacion('otro', 'No se pudo comunicar con Google Drive.');
    }
    return respuesta;
  }

  const listar = async (consulta, campos) => {
    const params = new URLSearchParams({ q: consulta, fields: `files(${campos})`, orderBy: 'createdTime', spaces: 'drive' });
    return ((await (await drive(`${API}/files?${params}`)).json()).files) || [];
  };

  // La carpeta «Alacena»: se busca (la más antigua, si por una carrera entre dispositivos hubiera dos) y, si hace falta, se crea.
  async function carpeta({ crear }) {
    if (idCarpeta) return idCarpeta;
    const hallada = (await listar(`name='${literal(nombreCarpeta)}' and mimeType='${TIPO_CARPETA}' and trashed=false`, 'id'))[0];
    if (hallada) { idCarpeta = hallada.id; return idCarpeta; }
    if (!crear) return null;
    const respuesta = await drive(`${API}/files?fields=id`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nombreCarpeta, mimeType: TIPO_CARPETA }),
    });
    idCarpeta = (await respuesta.json()).id;
    return idCarpeta;
  }

  return {
    async buscarArchivo() {
      if (idArchivo) {
        try {
          const respuesta = await drive(`${API}/files/${idArchivo}?fields=${CAMPOS}`);
          return { ...(await respuesta.json()), duplicados: 0 };
        } catch (error) {
          if (error.codigo !== 'no-encontrado') throw error;
          idArchivo = null;
        }
      }
      const padre = await carpeta({ crear: false });
      if (!padre) return null;
      const archivos = await listar(`name='${literal(nombreArchivo)}' and '${padre}' in parents and trashed=false`, CAMPOS);
      if (archivos.length === 0) return null;
      idArchivo = archivos[0].id;
      return { ...archivos[0], duplicados: archivos.length - 1 };
    },

    async leerArchivo(id) {
      return (await drive(`${API}/files/${id}?alt=media`)).json();
    },

    async guardarArchivo(datos) {
      const contenido = JSON.stringify(datos, null, 2);
      let resultado;
      if (idArchivo) {
        const respuesta = await drive(`${SUBIDA}/files/${idArchivo}?uploadType=media&fields=id,modifiedTime`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: contenido,
        });
        resultado = await respuesta.json();
      } else {
        const padre = await carpeta({ crear: true });
        const metadatos = JSON.stringify({ name: nombreArchivo, mimeType: 'application/json', parents: [padre] });
        const cuerpo = `--${LIMITE}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadatos}\r\n`
          + `--${LIMITE}\r\nContent-Type: application/json\r\n\r\n${contenido}\r\n--${LIMITE}--`;
        const respuesta = await drive(`${SUBIDA}/files?uploadType=multipart&fields=id,modifiedTime`, {
          method: 'POST',
          headers: { 'Content-Type': `multipart/related; boundary=${LIMITE}` },
          body: cuerpo,
        });
        resultado = await respuesta.json();
        idArchivo = resultado.id;
      }
      return { ...resultado, desfaseRelojMs: instanteMs() - new Date(resultado.modifiedTime).getTime() };
    },
  };
}
