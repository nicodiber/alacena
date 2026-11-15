// HU-00 CA-2: las seis pantallas se recorren en la PC y en el celular (390 × 844).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prepararEntorno, abrir, CELULAR, ESCRITORIO, textoPrincipal } from './comun.mjs';

let entorno;
before(async () => { entorno = await prepararEntorno(); });
after(async () => { await entorno.cerrar(); });

const PANTALLAS = [
  { destino: 'plan', nombre: 'Plan semanal', texto: 'Acá vas a armar qué comer cada día de la semana.' },
  { destino: 'recetas', nombre: 'Recetas', texto: 'Acá vas a guardar tus recetas y ver cuánto cuesta cada porción.' },
  { destino: 'compras', nombre: 'Compras', texto: 'Acá vas a ver la lista de compras de la semana.' },
  { destino: 'despensa', nombre: 'Despensa', texto: 'Acá vas a anotar lo que ya tenés en casa.' },
  { destino: 'precios', nombre: 'Precios', texto: 'Acá vas a llevar los precios de los ingredientes.' },
  { destino: 'ajustes', nombre: 'Ajustes' },
];
const marcados = (pagina) => pagina.locator('.nav-lista a[aria-current="page"] .nav-nombre').allTextContents();

for (const [dispositivo, viewport] of [['celular 390 × 844', CELULAR], ['escritorio', ESCRITORIO]]) {
  test(`HU-00 CA-2 · se recorren las seis pantallas con la barra (${dispositivo})`, async () => {
    const { contexto, pagina, errores } = await abrir(entorno.navegador, entorno.servidor, { viewport });
    const nav = pagina.getByRole('navigation', { name: 'Principal' });
    for (const { destino, nombre, texto } of [...PANTALLAS, PANTALLAS[0]]) {
      await nav.getByRole('link', { name: nombre }).click();
      await pagina.waitForFunction((t) => document.querySelector('main h1')?.textContent === t, nombre);
      assert.equal(new URL(pagina.url()).hash, `#${destino}`);
      assert.equal(await pagina.title(), `${nombre} · Alacena`);
      assert.deepEqual(await marcados(pagina), [nombre], 'solo el destino actual está marcado');
      if (texto) {
        assert.match(await textoPrincipal(pagina), new RegExp(texto.replaceAll('.', '\\.')));
        assert.match(await textoPrincipal(pagina), /Esta parte llega en una próxima entrega\./);
      } else {
        for (const t of ['Tema', 'Instalación', 'Modo prueba', 'Datos de este dispositivo', 'Acerca de']) await pagina.getByRole('heading', { name: t, level: 2 }).waitFor();
      }
      assert.equal(await pagina.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0, `${nombre}: sin desplazamiento horizontal`);
      const dentro = await pagina.locator('main h1').evaluate((h) => { const r = h.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0; });
      assert.ok(dentro, `${nombre}: el título se ve entero`);
    }
    assert.deepEqual(errores, []);
    await contexto.close();
  });

  test(`HU-00 CA-2 · se abre cada pantalla por su dirección y una desconocida lleva al plan semanal (${dispositivo})`, async () => {
    const { contexto, pagina, errores } = await abrir(entorno.navegador, entorno.servidor, { viewport });
    for (const { destino, nombre } of PANTALLAS) {
      await pagina.goto(`${entorno.servidor.url}#${destino}`);
      await pagina.waitForFunction((t) => document.querySelector('main h1')?.textContent === t, nombre);
      assert.deepEqual(await marcados(pagina), [nombre]);
    }
    await pagina.goto(`${entorno.servidor.url}#no-existe`);
    await pagina.waitForFunction(() => document.querySelector('main h1')?.textContent === 'Plan semanal');
    assert.deepEqual(await marcados(pagina), ['Plan semanal']);
    assert.deepEqual(errores, []);
    await contexto.close();
  });
}

test('HU-00 CA-2 · «Volver al plan semanal» lleva a la primera pantalla desde las que todavía no existen', async () => {
  const { contexto, pagina, errores } = await abrir(entorno.navegador, entorno.servidor, {}, '#recetas');
  await pagina.getByRole('link', { name: 'Volver al plan semanal' }).click();
  await pagina.waitForFunction(() => document.querySelector('main h1')?.textContent === 'Plan semanal');
  assert.equal(await pagina.getByRole('link', { name: 'Volver al plan semanal' }).count(), 0, 'el plan no se vuelve a sí mismo');
  assert.deepEqual(errores, []);
  await contexto.close();
});
