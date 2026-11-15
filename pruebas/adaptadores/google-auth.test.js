// Adaptador de sesión de Google (todavía sin conectar a la interfaz): permiso, ID de cliente vacío y vida del token.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { crearGoogleAuth, CLIENT_ID, SCOPE_DRIVE } from '../../src/adaptadores/google-auth.js';

let ahora;
const instanteMs = () => ahora;
let configuracion;
let pedidos;

beforeEach(() => {
  ahora = 1_000_000;
  configuracion = null;
  pedidos = [];
  globalThis.document = {};
  globalThis.google = {
    accounts: { oauth2: {
      initTokenClient: (config) => { configuracion = config; return { requestAccessToken: (opciones) => pedidos.push(opciones) }; },
      revoke: (token, fin) => { pedidos.push({ revocado: token }); fin(); },
    } },
  };
});
afterEach(() => { delete globalThis.document; delete globalThis.google; });

test('el permiso es solo drive.file', () => {
  assert.equal(SCOPE_DRIVE, 'https://www.googleapis.com/auth/drive.file');
});

test('el ID de cliente viene vacío hasta que exista el cliente OAuth de Alacena', async () => {
  assert.equal(CLIENT_ID, '');
  const auth = crearGoogleAuth({ instanteMs, ruta: '/alacena/' });
  assert.equal(auth.disponible(), false);
  await assert.rejects(auth.conectar(), /cliente OAuth/);
  assert.equal(configuracion, null, 'sin ID de cliente no se llega a pedir nada a Google');
});

test('con un ID de cliente, pide solo drive.file y guarda el token hasta que vence', async () => {
  const auth = crearGoogleAuth({ instanteMs, clienteId: 'cliente-de-prueba', ruta: '/alacena/' });
  assert.equal(auth.disponible(), true);
  const conexion = auth.conectar();
  assert.equal(configuracion.client_id, 'cliente-de-prueba');
  assert.equal(configuracion.scope, SCOPE_DRIVE);
  assert.deepEqual(pedidos, [{ prompt: '' }]);
  configuracion.callback({ access_token: 'token-1', expires_in: 3600 });
  await conexion;
  assert.equal(auth.conectada(), true);
  assert.equal(auth.obtenerToken(), 'token-1');
  ahora += 3600 * 1000; // pasó la hora: el margen de un minuto ya lo venció
  assert.equal(auth.conectada(), false);
  assert.equal(auth.obtenerToken(), null);
});

test('en silencio pide prompt «none»; si Google responde con error, falla con un aviso para reconectar', async () => {
  const auth = crearGoogleAuth({ instanteMs, clienteId: 'cliente-de-prueba', ruta: '/alacena/' });
  const conexion = auth.conectar({ silencioso: true });
  assert.deepEqual(pedidos, [{ prompt: 'none' }]);
  configuracion.callback({ error: 'interaction_required' });
  await assert.rejects(conexion, /volver a autorizar/);
  assert.equal(auth.conectada(), false);
});

test('cerrar la ventana de Google se explica con un mensaje propio', async () => {
  const auth = crearGoogleAuth({ instanteMs, clienteId: 'cliente-de-prueba', ruta: '/alacena/' });
  const conexion = auth.conectar();
  configuracion.error_callback({ type: 'popup_closed' });
  await assert.rejects(conexion, /Cerraste la ventana/);
});

test('invalidar el token avisa a quien se suscribió; cerrar la sesión revoca el permiso', async () => {
  const auth = crearGoogleAuth({ instanteMs, clienteId: 'cliente-de-prueba', ruta: '/alacena/' });
  let avisos = 0;
  auth.alPerderSesion(() => { avisos += 1; });
  const conexion = auth.conectar();
  configuracion.callback({ access_token: 'token-2', expires_in: 3600 });
  await conexion;
  auth.invalidarToken();
  assert.equal(avisos, 1);
  assert.equal(auth.conectada(), false);
  auth.invalidarToken();
  assert.equal(avisos, 1, 'sin token no hay nada que avisar');

  const otra = auth.conectar();
  configuracion.callback({ access_token: 'token-3', expires_in: 3600 });
  await otra;
  auth.cerrarSesion();
  assert.deepEqual(pedidos.at(-1), { revocado: 'token-3' });
  assert.equal(auth.conectada(), false);
});
