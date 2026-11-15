// HU-00 CA-2: barra lateral que corre el contenido en la PC, columna centrada y recorrido con el teclado.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prepararEntorno, abrir, ESCRITORIO } from './comun.mjs';

let entorno;
before(async () => { entorno = await prepararEntorno(); });
after(async () => { await entorno.cerrar(); });

const NOMBRES = ['Plan semanal', 'Recetas', 'Compras', 'Despensa', 'Precios', 'Ajustes'];
const anchoBarra = (pagina) => pagina.evaluate(() => document.querySelector('nav').getBoundingClientRect().width);
const xTitulo = (pagina) => pagina.evaluate(() => document.querySelector('main h1').getBoundingClientRect().x);

// Centro horizontal del título respecto del espacio a la derecha de la barra.
const desvioDelCentro = (pagina) => pagina.evaluate(() => {
  const barra = document.querySelector('nav').getBoundingClientRect();
  const columna = document.querySelector('main h1').getBoundingClientRect();
  return { desvio: columna.x + columna.width / 2 - (barra.right + (innerWidth - barra.right) / 2), libre: columna.x - barra.right };
});

for (const viewport of [ESCRITORIO, { width: 800, height: 800 }]) {
  test(`HU-00 CA-2 · en la PC (${viewport.width} px), la barra al abrirse corre el contenido, que queda centrado a su derecha, y al cerrarse vuelve`, async () => {
    const { contexto, pagina, errores } = await abrir(entorno.navegador, entorno.servidor, { viewport });
    const nav = pagina.getByRole('navigation', { name: 'Principal' });
    const lejos = () => pagina.mouse.move(viewport.width - 10, viewport.height / 2);
    await lejos();
    const barraCerrada = await anchoBarra(pagina);
    const tituloAntes = await xTitulo(pagina);
    const comprobarAbierta = async (como) => {
      await pagina.waitForFunction(() => document.querySelector('nav').getBoundingClientRect().width > 200);
      const { desvio, libre } = await desvioDelCentro(pagina);
      assert.ok(libre >= 0, `${como}: el contenido no queda debajo de la barra (${libre} px)`);
      assert.ok(Math.abs(desvio) <= 2, `${como}: centrado en el espacio que queda (desvío ${desvio} px)`);
      assert.ok(await xTitulo(pagina) > tituloAntes, `${como}: el contenido se corrió a la derecha`);
    };
    const comprobarCerrada = async (como) => {
      await pagina.waitForFunction((ancho) => document.querySelector('nav').getBoundingClientRect().width <= ancho, barraCerrada);
      assert.ok(Math.abs((await xTitulo(pagina)) - tituloAntes) <= 2, `${como}: vuelve a su lugar`);
    };

    await nav.hover();
    await comprobarAbierta('con el mouse');
    await lejos();
    await comprobarCerrada('con el mouse');

    await pagina.getByRole('link', { name: 'Ir al contenido' }).focus();
    await pagina.keyboard.press('Tab');
    await comprobarAbierta('con el teclado');
    await pagina.locator('main h1').focus();
    await comprobarCerrada('con el teclado');
    assert.deepEqual(errores, []);
    await contexto.close();
  });
}

test('HU-00 CA-2 · en la PC, el contenido va en una columna de hasta 480 px centrada a la derecha de la barra', async () => {
  const { contexto, pagina, errores } = await abrir(entorno.navegador, entorno.servidor, { viewport: ESCRITORIO });
  await pagina.mouse.move(ESCRITORIO.width - 10, ESCRITORIO.height / 2);
  const barra = await anchoBarra(pagina);
  const columna = await pagina.evaluate(() => [...document.querySelectorAll('main > *')].map((e) => e.getBoundingClientRect().width));
  assert.ok(columna.every((ancho) => ancho <= 480), `columna de hasta 480 px (${columna})`);
  const { desvio } = await desvioDelCentro(pagina);
  assert.ok(Math.abs(desvio) <= 2, `centrada (desvío ${desvio} px)`);
  assert.ok(barra < 100);
  assert.deepEqual(errores, []);
  await contexto.close();
});

test('HU-00 CA-2 · con Tab se recorre la barra en orden, el foco se ve y Enter navega', async () => {
  const { contexto, pagina } = await abrir(entorno.navegador, entorno.servidor, { viewport: ESCRITORIO });
  await pagina.locator('.saltar').focus();
  const recorrido = [];
  for (let i = 0; i < NOMBRES.length; i += 1) {
    await pagina.keyboard.press('Tab');
    recorrido.push(await pagina.evaluate(() => document.activeElement.querySelector('.nav-nombre')?.textContent));
  }
  assert.deepEqual(recorrido, NOMBRES);
  const contorno = await pagina.evaluate(() => { const e = getComputedStyle(document.activeElement); return e.outlineStyle !== 'none' && parseFloat(e.outlineWidth) >= 2; });
  assert.ok(contorno, 'el foco se ve');
  await pagina.keyboard.down('Shift');
  for (let i = 0; i < 4; i += 1) await pagina.keyboard.press('Tab');
  await pagina.keyboard.up('Shift');
  assert.equal(await pagina.evaluate(() => document.activeElement.querySelector('.nav-nombre').textContent), 'Recetas');
  await pagina.keyboard.press('Enter');
  await pagina.getByRole('heading', { name: 'Recetas', level: 1 }).waitFor();
  assert.equal(new URL(pagina.url()).hash, '#recetas');
  await contexto.close();
});
