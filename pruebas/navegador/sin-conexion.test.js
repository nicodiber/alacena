// HU-00 CA-3: abre sin conexión y no pide nada fuera del propio sitio.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prepararEntorno, abrir, CELULAR, ESCRITORIO, colorDeFondo, textoPrincipal } from './comun.mjs';

let entorno;
before(async () => { entorno = await prepararEntorno(); });
after(async () => { await entorno.cerrar(); });

for (const [nombre, viewport] of [['celular', CELULAR], ['escritorio', ESCRITORIO]]) {
  test(`HU-00 CA-3 · abre sin conexión, en el tema elegido y con las seis pantallas (${nombre})`, async () => {
    const { contexto, pagina, errores } = await abrir(entorno.navegador, entorno.servidor, { viewport, colorScheme: 'light' }, '#ajustes');
    await pagina.evaluate(() => navigator.serviceWorker.ready);
    await pagina.getByRole('button', { name: 'Oscuro' }).click();
    await contexto.setOffline(true);
    await pagina.goto(entorno.servidor.url);
    await pagina.waitForSelector('main h1');
    assert.match(await textoPrincipal(pagina), /Acá vas a armar qué comer cada día de la semana\./);
    assert.equal(await colorDeFondo(pagina), 'rgb(26, 20, 16)');
    assert.equal(await pagina.evaluate(() => getComputedStyle(document.body).fontFamily.split(',')[0].replace(/['"]/g, '')), 'Figtree');
    assert.equal(await pagina.evaluate(async () => { await document.fonts.ready; return document.fonts.check('16px Figtree'); }), true, 'la tipografía también está guardada');
    const nav = pagina.getByRole('navigation', { name: 'Principal' });
    for (const nombre of ['Recetas', 'Compras', 'Despensa', 'Precios']) {
      await nav.getByRole('link', { name: nombre }).click();
      await pagina.waitForFunction((t) => document.querySelector('main h1')?.textContent === t, nombre);
    }
    await nav.getByRole('link', { name: 'Ajustes' }).click();
    await pagina.getByRole('heading', { name: 'Acerca de' }).waitFor();
    await contexto.setOffline(false);
    assert.deepEqual(errores, []);
    await contexto.close();
  });
}

test('HU-00 CA-3 · todos los pedidos van al mismo origen', async () => {
  const { contexto, pagina, pedidos, errores } = await abrir(entorno.navegador, entorno.servidor);
  await pagina.evaluate(() => navigator.serviceWorker.ready);
  const nav = pagina.getByRole('navigation', { name: 'Principal' });
  for (const nombre of ['Recetas', 'Compras', 'Despensa', 'Precios', 'Ajustes', 'Plan semanal']) {
    await nav.getByRole('link', { name: nombre }).click();
    await pagina.waitForFunction((t) => document.querySelector('main h1')?.textContent === t, nombre);
  }
  await pagina.reload();
  await pagina.waitForSelector('main h1');
  const origen = new URL(entorno.servidor.url).origin;
  const externos = pedidos.filter((u) => !u.startsWith('data:') && new URL(u).origin !== origen);
  assert.ok(pedidos.length > 0);
  assert.deepEqual(externos, []);
  assert.deepEqual(errores, []);
  await contexto.close();
});
