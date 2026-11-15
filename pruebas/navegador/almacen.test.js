// HU-00 CA-3: base de datos del dispositivo con la configuración, separada por modo; «Datos de este dispositivo».
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prepararEntorno, abrir, textoPrincipal } from './comun.mjs';

let entorno;
before(async () => { entorno = await prepararEntorno(); });
after(async () => { await entorno.cerrar(); });

const leerConfig = (pagina, base) => pagina.evaluate((nombre) => new Promise((ok) => {
  const p = indexedDB.open(nombre);
  p.onsuccess = () => {
    const db = p.result;
    if (!db.objectStoreNames.contains('configuracion')) { db.close(); ok(null); return; }
    const g = db.transaction('configuracion').objectStore('configuracion').get('config');
    g.onsuccess = () => { db.close(); ok(g.result ?? null); };
  };
}), base);
const bases = (pagina) => pagina.evaluate(async () => (await indexedDB.databases()).map((b) => b.name).filter((n) => n.startsWith('alacena')).sort());
const esperarDatos = (pagina) => pagina.waitForFunction(() => /Tus datos se guardan|No se pueden guardar/.test(document.querySelector('main').innerText));

test('HU-00 CA-3 · la primera vez se crea alacena-dev con la configuración por defecto', async () => {
  const { contexto, pagina, errores } = await abrir(entorno.navegador, entorno.servidor, {}, '#ajustes');
  await esperarDatos(pagina);
  assert.deepEqual(await bases(pagina), ['alacena-dev']);
  const c = await leerConfig(pagina, 'alacena-dev');
  assert.deepEqual(
    [c.id, c.moneda, c.inicioSemana],
    ['config', 'ARS', 1],
  );
  assert.deepEqual(errores, []);
  await contexto.close();
});

test('HU-00 · en modo prueba la configuración va a alacena-dev-prueba y alacena-dev no cambia', async () => {
  const { contexto, pagina, errores } = await abrir(entorno.navegador, entorno.servidor, {}, '#ajustes');
  await esperarDatos(pagina);
  const antes = await leerConfig(pagina, 'alacena-dev');
  await pagina.getByRole('switch', { name: 'Modo prueba' }).click();
  await pagina.waitForFunction(async () => (await indexedDB.databases()).some((b) => b.name === 'alacena-dev-prueba'));
  await pagina.reload();
  await esperarDatos(pagina);
  await pagina.waitForTimeout(300);
  assert.equal((await leerConfig(pagina, 'alacena-dev-prueba')).moneda, 'ARS');
  assert.deepEqual(await leerConfig(pagina, 'alacena-dev'), antes);
  assert.deepEqual(errores, []);
  await contexto.close();
});

test('HU-00 CA-3 · sin conexión, la configuración se lee igual', async () => {
  const { contexto, pagina, errores } = await abrir(entorno.navegador, entorno.servidor, {}, '#ajustes');
  await esperarDatos(pagina);
  await pagina.evaluate(() => navigator.serviceWorker.ready);
  await contexto.setOffline(true);
  await pagina.reload();
  await esperarDatos(pagina);
  assert.match(await textoPrincipal(pagina), /Tus datos se guardan en este dispositivo\./);
  assert.equal((await leerConfig(pagina, 'alacena-dev')).id, 'config');
  await contexto.setOffline(false);
  assert.deepEqual(errores, []);
  await contexto.close();
});

for (const [conserva, texto] of [[true, 'El navegador no los borra aunque le falte espacio.'], [false, 'El navegador podría borrarlos si se queda sin espacio.']]) {
  test(`HU-00 · Ajustes dice si el navegador conserva los datos (${conserva ? 'sí' : 'no'})`, async () => {
    const contexto = await entorno.navegador.newContext();
    // Se simula la respuesta del navegador: Chromium decide solo si concede el almacenamiento persistente.
    await contexto.addInitScript((c) => {
      Object.defineProperty(navigator, 'storage', { value: { persisted: async () => c, persist: async () => c, estimate: async () => ({}) } });
    }, conserva);
    const pagina = await contexto.newPage();
    await pagina.goto(entorno.servidor.url + '#ajustes');
    await esperarDatos(pagina);
    // Mientras se comprueba, Ajustes dice «Comprobando…»: se espera el resultado (la base ahora prepara más cosas).
    await pagina.waitForFunction((esperado) => document.querySelector('main').innerText.includes(esperado), texto);
    const t = await textoPrincipal(pagina);
    assert.ok(t.includes('Tus datos se guardan en este dispositivo.') && t.includes(texto), t);
    await contexto.close();
  });
}

test('HU-00 · si el navegador no deja guardar, Alacena abre igual y lo dice', async () => {
  const contexto = await entorno.navegador.newContext();
  await contexto.addInitScript(() => { Object.defineProperty(window, 'indexedDB', { value: undefined }); });
  const pagina = await contexto.newPage();
  const errores = [];
  pagina.on('pageerror', (e) => errores.push(e.message));
  await pagina.goto(entorno.servidor.url + '#ajustes');
  await esperarDatos(pagina);
  assert.match(await textoPrincipal(pagina), /No se pueden guardar datos en este dispositivo\./);
  assert.deepEqual(errores, []);
  await contexto.close();
});
