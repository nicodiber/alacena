/* global google */
// Adaptador de sesión de Google (Google Identity Services, modelo de token, sin servidor). Cumple PuertoSesion
// (puertos/sincronizacion.js). Todavía NO está conectado a la interfaz ni al arranque.
//
// Adaptado de la sesión de Google de otra app del mismo autor, con un solo permiso: `drive.file`, que
// solo deja ver los archivos que la propia app creó.
//
// Al conectarlo hay que: completar CLIENT_ID, abrir la política de seguridad de index.html (script-src de
// https://accounts.google.com/gsi/client, connect-src de https://www.googleapis.com, frame-src de https://accounts.google.com)
// y actualizar la regla de red de AGENTS.md y de pruebas/navegador/sin-conexion.test.js.
import { nombreConCanal } from './canal.js';

// ID de cliente OAuth (público, no es un secreto). Se completa cuando exista el cliente OAuth de Alacena en Google Cloud.
export const CLIENT_ID = '';

export const SCOPE_DRIVE = 'https://www.googleapis.com/auth/drive.file';
const URL_SCRIPT_GOOGLE = 'https://accounts.google.com/gsi/client';
const MARGEN_VENCIMIENTO_MS = 60 * 1000;
const ESPERA_SILENCIOSA_MS = 20000;

const soportaGoogle = () => typeof google !== 'undefined' && !!google.accounts && !!google.accounts.oauth2;

/**
 * @param {{ instanteMs: () => number, clienteId?: string, ruta?: string }} dependencias
 *   `instanteMs` viene del puerto Reloj (nadie más lee la hora del sistema); `clienteId` y `ruta` permiten probarlo.
 * @returns {import('../puertos/sincronizacion.js').PuertoSesion & { obtenerToken: () => (string|null), invalidarToken: (motivo?: string) => void, cuentaRecordada: () => string }}
 */
export function crearGoogleAuth({ instanteMs, clienteId = CLIENT_ID, ruta } = {}) {
  const claveConectado = nombreConCanal('google-conectado', ruta);
  const claveCuenta = nombreConCanal('google-cuenta', ruta);
  let token = null; // { accessToken, venceEn }
  let clienteToken = null;
  let manejarRespuesta = null;
  let manejarError = null;
  let rechazarPendiente = null;
  let alPerder = null;
  let cargandoScript = null;

  const leer = (clave) => { try { return localStorage.getItem(clave); } catch { return null; } };
  const guardar = (clave, valor) => { try { localStorage.setItem(clave, valor); } catch { /* solo una ayuda */ } };
  const olvidar = (clave) => { try { localStorage.removeItem(clave); } catch { /* solo una ayuda */ } };

  const hayToken = () => !!token && instanteMs() < token.venceEn;

  // El script de Google se pide recién al conectar, no al abrir la app.
  const cargarScript = () => {
    if (soportaGoogle()) return Promise.resolve(true);
    cargandoScript ??= new Promise((resolver) => {
      const script = document.createElement('script');
      script.src = URL_SCRIPT_GOOGLE;
      script.async = true;
      script.onload = () => { cargandoScript = null; resolver(soportaGoogle()); };
      script.onerror = () => { cargandoScript = null; script.remove(); resolver(false); };
      document.head.appendChild(script);
    });
    return cargandoScript;
  };

  // Email de la cuenta recién conectada (Drive `about`, permitido con `drive.file`), como pista para renovar en silencio
  // aunque haya varias cuentas abiertas en el navegador. Falla en silencio: es solo una ayuda.
  const recordarCuenta = async (accessToken) => {
    try {
      const respuesta = await fetch('https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)', { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!respuesta.ok) return;
      const email = (await respuesta.json())?.user?.emailAddress;
      if (email) guardar(claveCuenta, email);
    } catch { /* solo una ayuda */ }
  };

  // El TokenClient de Google es un singleton: sus callbacks delegan en manejarRespuesta/manejarError, que cada llamada
  // reasigna a su propia promesa (si cerraran sobre la primera, una reconexión posterior quedaría colgada).
  const pedirToken = ({ silencioso }) => new Promise((resolver, rechazar) => {
    if (rechazarPendiente) rechazarPendiente(new Error('Se pidió una nueva conexión mientras había otra en curso.'));
    rechazarPendiente = rechazar;
    // Un intento silencioso que Google nunca contesta no puede quedar colgado para siempre.
    const espera = silencioso ? setTimeout(() => {
      if (rechazarPendiente !== rechazar) return;
      rechazarPendiente = null;
      rechazar(new Error('Hace falta volver a autorizar el acceso a Google.'));
    }, ESPERA_SILENCIOSA_MS) : null;
    const terminar = () => {
      if (espera) clearTimeout(espera);
      if (rechazarPendiente === rechazar) rechazarPendiente = null;
    };
    manejarRespuesta = (respuesta) => {
      terminar();
      if (respuesta.error) {
        rechazar(new Error(silencioso ? 'Hace falta volver a autorizar el acceso a Google.' : 'No se pudo conectar con Google.'));
        return;
      }
      token = { accessToken: respuesta.access_token, venceEn: instanteMs() + (Number(respuesta.expires_in) || 3600) * 1000 - MARGEN_VENCIMIENTO_MS };
      guardar(claveConectado, '1');
      recordarCuenta(respuesta.access_token);
      resolver();
    };
    manejarError = (error) => {
      terminar();
      rechazar(new Error(error?.type === 'popup_closed' ? 'Cerraste la ventana de Google antes de terminar.' : 'No se pudo abrir la ventana de Google.'));
    };
    clienteToken ??= google.accounts.oauth2.initTokenClient({
      client_id: clienteId,
      scope: SCOPE_DRIVE,
      callback: (respuesta) => manejarRespuesta(respuesta),
      error_callback: (error) => manejarError(error),
    });
    const cuenta = leer(claveCuenta) || '';
    clienteToken.requestAccessToken({ prompt: silencioso ? 'none' : '', ...(cuenta ? { hint: cuenta } : {}) });
  });

  return {
    disponible: () => clienteId !== '' && typeof document !== 'undefined',
    conectada: hayToken,
    obtenerToken: () => (hayToken() ? token.accessToken : null),
    cuentaRecordada: () => leer(claveCuenta) || '',
    alPerderSesion: (funcion) => { alPerder = funcion; },
    /** Descarta el token (por ejemplo, Google respondió 401) y avisa a quien se suscribió con `alPerderSesion`. */
    invalidarToken() {
      const teniaToken = !!token;
      token = null;
      if (teniaToken && alPerder) alPerder();
    },
    async conectar({ silencioso = false } = {}) {
      if (clienteId === '') throw new Error('Todavía no hay un cliente OAuth configurado para Alacena.');
      if (!soportaGoogle() && !(await cargarScript())) throw new Error('No se pudo cargar Google Identity Services. Revisá tu conexión e intentá de nuevo.');
      return pedirToken({ silencioso });
    },
    /** Revoca el permiso del token actual, lo descarta y olvida la cuenta: la próxima conexión pide elegir cuenta. No toca datos. */
    cerrarSesion() {
      const accessToken = token?.accessToken;
      token = null;
      try {
        if (accessToken && soportaGoogle()) google.accounts.oauth2.revoke(accessToken, () => {});
      } catch { /* si no se pudo revocar, el token vence solo en menos de una hora */ }
      olvidar(claveCuenta);
      olvidar(claveConectado);
    },
    /** true si alguna vez se conectó en este navegador: sirve para intentar la reconexión silenciosa al abrir. */
    conectadoAlgunaVez: () => leer(claveConectado) === '1',
  };
}
