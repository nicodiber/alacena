// Adaptador de Drive (todavía sin conectar a la interfaz): carpeta «Alacena», archivo alacena-datos.json y errores.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearDriveSync, NOMBRE_ARCHIVO, NOMBRE_CARPETA } from '../../src/adaptadores/drive-sync.js';
import { ErrorSincronizacion } from '../../src/puertos/sincronizacion.js';

const json = (cuerpo, estado = 200) => ({ ok: estado < 400, status: estado, json: async () => cuerpo });

// Un Drive de mentira: guarda carpetas y archivos y responde a lo que pide el adaptador.
function drivePrueba({ token = 'token-de-prueba', carpetas = [], archivos = [] } = {}) {
  const estado = { pedidos: [], carpetas: [...carpetas], archivos: [...archivos], invalidaciones: 0, fallaRed: false, estadoForzado: null };
  const auth = { obtenerToken: () => token, invalidarToken: () => { estado.invalidaciones += 1; } };
  const pedir = async (url, opciones = {}) => {
    estado.pedidos.push({ url, ...opciones });
    if (estado.fallaRed) throw new TypeError('sin red');
    if (estado.estadoForzado) return json({}, estado.estadoForzado);
    const direccion = new URL(url);
    if (direccion.pathname === '/drive/v3/files' && !opciones.method) {
      const q = direccion.searchParams.get('q');
      return json({ files: q.includes('mimeType') ? estado.carpetas : estado.archivos });
    }
    if (direccion.pathname === '/drive/v3/files' && opciones.method === 'POST') {
      const nueva = { id: 'carpeta-1' };
      estado.carpetas.push(nueva);
      return json(nueva);
    }
    if (direccion.pathname === '/upload/drive/v3/files' && opciones.method === 'POST') {
      const nuevo = { id: 'archivo-1', modifiedTime: '2026-11-16T12:00:00.000Z', createdTime: '2026-11-16T12:00:00.000Z' };
      estado.archivos.push(nuevo);
      return json(nuevo);
    }
    if (opciones.method === 'PATCH') return json({ id: 'archivo-1', modifiedTime: '2026-11-16T12:05:00.000Z' });
    if (direccion.searchParams.get('alt') === 'media') return json({ version: 1 });
    return json(estado.archivos[0] ?? {}, estado.archivos.length ? 200 : 404);
  };
  return { estado, sync: crearDriveSync({ auth, instanteMs: () => Date.parse('2026-11-16T12:00:01.000Z'), pedir }) };
}

test('los nombres son la carpeta «Alacena» y el archivo alacena-datos.json', () => {
  assert.equal(NOMBRE_CARPETA, 'Alacena');
  assert.equal(NOMBRE_ARCHIVO, 'alacena-datos.json');
});

test('sin sesión, ningún pedido sale y el error lo dice', async () => {
  const { estado, sync } = drivePrueba({ token: null });
  await assert.rejects(sync.buscarArchivo(), (e) => e instanceof ErrorSincronizacion && e.codigo === 'sin-sesion');
  assert.equal(estado.pedidos.length, 0);
});

test('si todavía no existe la carpeta, no hay archivo y buscar no crea nada', async () => {
  const { estado, sync } = drivePrueba();
  assert.equal(await sync.buscarArchivo(), null);
  assert.equal(estado.pedidos.length, 1);
  assert.equal(estado.pedidos[0].headers.Authorization, 'Bearer token-de-prueba');
  assert.equal(estado.pedidos.some((p) => p.method === 'POST'), false);
});

test('la primera vez que guarda crea la carpeta «Alacena» y el archivo dentro de ella', async () => {
  const { estado, sync } = drivePrueba();
  const resultado = await sync.guardarArchivo({ version: 1 });
  const creacionCarpeta = estado.pedidos.find((p) => p.method === 'POST' && p.url.includes('/drive/v3/files'));
  assert.deepEqual(JSON.parse(creacionCarpeta.body), { name: 'Alacena', mimeType: 'application/vnd.google-apps.folder' });
  const subida = estado.pedidos.find((p) => p.url.includes('uploadType=multipart'));
  assert.match(subida.headers['Content-Type'], /^multipart\/related; boundary=/);
  assert.ok(subida.body.includes('"name":"alacena-datos.json"'));
  assert.ok(subida.body.includes('"parents":["carpeta-1"]'));
  assert.ok(subida.body.includes('"version": 1'));
  assert.equal(resultado.id, 'archivo-1');
  assert.equal(resultado.desfaseRelojMs, 1000, 'el reloj del dispositivo va un segundo adelante de Drive');
});

test('con la carpeta ya creada la reusa, y a partir de la segunda vez actualiza el mismo archivo', async () => {
  const { estado, sync } = drivePrueba({ carpetas: [{ id: 'carpeta-existente' }] });
  await sync.guardarArchivo({ version: 1 });
  assert.equal(estado.pedidos.some((p) => p.method === 'POST' && !p.url.includes('upload')), false, 'no crea otra carpeta');
  assert.ok(estado.pedidos.find((p) => p.url.includes('uploadType=multipart')).body.includes('"parents":["carpeta-existente"]'));
  await sync.guardarArchivo({ version: 2 });
  const actualizacion = estado.pedidos.at(-1);
  assert.equal(actualizacion.method, 'PATCH');
  assert.match(actualizacion.url, /files\/archivo-1\?uploadType=media/);
});

test('encuentra el archivo en la carpeta, avisa de los duplicados y lo lee', async () => {
  const antiguo = { id: 'a', modifiedTime: '2026-11-01T00:00:00.000Z', createdTime: '2026-11-01T00:00:00.000Z' };
  const { estado, sync } = drivePrueba({ carpetas: [{ id: 'carpeta-1' }], archivos: [antiguo, { ...antiguo, id: 'b' }] });
  const hallado = await sync.buscarArchivo();
  assert.equal(hallado.id, 'a');
  assert.equal(hallado.duplicados, 1);
  const consulta = new URL(estado.pedidos.at(-1).url).searchParams.get('q');
  assert.ok(consulta.includes("name='alacena-datos.json'") && consulta.includes("'carpeta-1' in parents") && consulta.includes('trashed=false'));
  assert.deepEqual(await sync.leerArchivo('a'), { version: 1 });
});

test('los errores de Drive se traducen: 401 invalida la sesión, 404, otros y falta de red', async () => {
  const { estado, sync } = drivePrueba();
  estado.estadoForzado = 401;
  await assert.rejects(sync.leerArchivo('x'), (e) => e.codigo === 'sesion-vencida');
  assert.equal(estado.invalidaciones, 1);
  estado.estadoForzado = 404;
  await assert.rejects(sync.leerArchivo('x'), (e) => e.codigo === 'no-encontrado');
  estado.estadoForzado = 500;
  await assert.rejects(sync.leerArchivo('x'), (e) => e.codigo === 'otro');
  estado.estadoForzado = null;
  estado.fallaRed = true;
  await assert.rejects(sync.leerArchivo('x'), (e) => e.codigo === 'sin-conexion');
});
