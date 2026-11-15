// HU-00 CA-1 y CA-2: la app abre, se puede instalar y se ve bien en el celular y en la PC; «Acerca de» y manifiesto.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { prepararEntorno, abrir, CELULAR, ESCRITORIO, textoPrincipal } from './comun.mjs';
import { VERSION } from '../../src/version.js';

let entorno;
before(async () => { entorno = await prepararEntorno(); });
after(async () => { await entorno.cerrar(); });

const DESTINOS = ['Plan semanal', 'Recetas', 'Compras', 'Despensa', 'Precios', 'Ajustes'];

test('HU-00 CA-2 · en el celular: logotipo, barra inferior con los seis destinos a la vista, Plan semanal marcado', async () => {
  const { contexto, pagina, errores } = await abrir(entorno.navegador, entorno.servidor);
  const cabecera = pagina.locator('header');
  assert.equal((await cabecera.innerText()).trim(), 'Alacena');
  assert.ok(await cabecera.locator('img').isVisible(), 'se ve el ícono del frasco');

  const nav = pagina.getByRole('navigation', { name: 'Principal' });
  const caja = await nav.boundingBox();
  assert.ok(caja.y + caja.height >= CELULAR.height - 2 && caja.y > CELULAR.height / 2, 'la barra está abajo');
  // Orden visual de izquierda a derecha y cada destino entero dentro de la pantalla.
  const visuales = await nav.getByRole('link').evaluateAll((enlaces) => enlaces
    .map((a) => ({ nombre: a.innerText.trim(), x: a.getBoundingClientRect().x, derecha: a.getBoundingClientRect().right, desborda: a.scrollWidth > a.clientWidth + 1 }))
    .sort((a, b) => a.x - b.x));
  assert.deepEqual(visuales.map((v) => v.nombre), DESTINOS);
  for (const v of visuales) {
    assert.ok(v.x >= 0 && v.derecha <= CELULAR.width, `${v.nombre} entra en el ancho de la pantalla`);
    assert.equal(v.desborda, false, `${v.nombre}: el texto no se sale de su lugar`);
  }
  for (const nombre of DESTINOS) assert.ok(await nav.getByRole('link', { name: nombre }).isVisible(), nombre);

  const actual = nav.getByRole('link', { name: 'Plan semanal' });
  assert.equal(await actual.getAttribute('aria-current'), 'page');
  const pastilla = await actual.locator('.nav-icono').evaluate((e) => getComputedStyle(e).backgroundColor);
  assert.notEqual(pastilla, 'rgba(0, 0, 0, 0)', 'pastilla de color detrás del ícono del destino actual');
  const sinPastilla = await nav.getByRole('link', { name: 'Recetas' }).locator('.nav-icono').evaluate((e) => getComputedStyle(e).backgroundColor);
  assert.equal(sinPastilla, 'rgba(0, 0, 0, 0)');

  assert.match(await textoPrincipal(pagina), /Acá vas a armar qué comer cada día de la semana\./);
  assert.equal(await pagina.title(), 'Plan semanal · Alacena');
  assert.equal(await pagina.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0, 'sin desplazamiento horizontal');
  assert.deepEqual(errores, []);
  await contexto.close();
});

test('HU-00 CA-2 · Ajustes → «Acerca de» muestra el nombre y la versión', async () => {
  const { contexto, pagina, errores } = await abrir(entorno.navegador, entorno.servidor);
  await pagina.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Ajustes' }).click();
  await pagina.getByRole('heading', { name: 'Acerca de' }).waitFor();
  const texto = await textoPrincipal(pagina);
  assert.match(texto, /^Alacena$/m);
  assert.ok(texto.split('\n').includes(`Versión ${VERSION}`), 'versión de la entrega actual');
  assert.deepEqual(errores, []);
  await contexto.close();
});

test('HU-00 CA-2 · en la PC: barra lateral compacta que se expande con el mouse o el teclado, y con menos de 720 px pasa abajo', async () => {
  const { contexto, pagina, errores } = await abrir(entorno.navegador, entorno.servidor, { viewport: ESCRITORIO });
  const nav = pagina.getByRole('navigation', { name: 'Principal' });
  // Playwright arranca con el puntero en (0, 0), encima de la barra: se lo corre al contenido.
  await pagina.mouse.move(ESCRITORIO.width - 10, ESCRITORIO.height / 2);
  const compacta = await nav.boundingBox();
  assert.equal(compacta.x, 0, 'la barra está a la izquierda');
  assert.ok(compacta.width <= 96, `barra compacta (${compacta.width} px)`);
  assert.ok(compacta.height >= ESCRITORIO.height - 1, 'ocupa todo el alto');
  for (const nombre of DESTINOS) assert.equal(await nav.getByRole('link', { name: nombre }).count(), 1, `nombre accesible ${nombre}`);
  const nombreVisible = () => nav.locator('.nav-nombre').first().evaluate((e) => e.getBoundingClientRect().width > 1);
  assert.equal(await nombreVisible(), false, 'compacta: sin nombres a la vista');
  // Los destinos de arriba hacia abajo, con Ajustes al final.
  const ys = await nav.getByRole('link').evaluateAll((enlaces) => enlaces.map((a) => [a.querySelector('.nav-nombre').textContent.trim(), a.getBoundingClientRect().y]));
  assert.deepEqual(ys.sort((a, b) => a[1] - b[1]).map(([n]) => n), DESTINOS);

  await nav.hover();
  await pagina.waitForFunction(() => document.querySelector('nav').getBoundingClientRect().width > 200);
  assert.equal(await nombreVisible(), true, 'con el mouse: nombres a la vista');

  await pagina.mouse.move(ESCRITORIO.width - 10, ESCRITORIO.height / 2);
  await pagina.waitForFunction(() => document.querySelector('nav').getBoundingClientRect().width <= 96);
  await pagina.getByRole('link', { name: 'Plan semanal' }).focus();
  await pagina.keyboard.press('Tab');
  await pagina.waitForFunction(() => document.querySelector('nav').getBoundingClientRect().width > 200);
  assert.equal(await nombreVisible(), true, 'con el teclado: nombres a la vista');

  await pagina.setViewportSize({ width: 700, height: 800 });
  const angosta = await nav.boundingBox();
  assert.ok(angosta.y > 400 && angosta.width >= 699, 'con menos de 720 px, barra inferior');
  assert.deepEqual(errores, []);
  await contexto.close();
});

// La versión a probar y la real son dos apps distintas: la de prueba se llama «Alacena prueba» y usa los íconos con
// la franja ámbar; la real se llama «Alacena» y está en /app/.
for (const caso of [
  { nombre: 'HU-00 CA-1 · versión a probar', url: () => entorno.servidor.url, alcance: '/prueba/',
    nombreLargo: 'Alacena prueba', nombreCorto: 'Alacena prueba', iconos: 'iconos/prueba/' },
  { nombre: 'HU-00 CA-1 · versión real en /app/', url: () => entorno.servidor.urlReal, alcance: '/app/',
    nombreLargo: 'Alacena', nombreCorto: 'Alacena', iconos: 'iconos/' },
]) test(`${caso.nombre}: manifiesto válido y sin errores de instalabilidad`, async () => {
  const perfil = await mkdtemp(join(tmpdir(), 'alacena-instalable-'));
  const contexto = await chromium.launchPersistentContext(perfil, { viewport: CELULAR });
  try {
    const pagina = await contexto.newPage();
    await pagina.goto(caso.url());
    await pagina.waitForSelector('main h1');
    const manifiesto = await pagina.evaluate(async () => {
      const enlace = document.querySelector('link[rel="manifest"]');
      const datos = await (await fetch(enlace.href)).json();
      const absoluta = (u) => new URL(u, enlace.href).pathname;
      return { ...datos, scope: absoluta(datos.scope), start_url: absoluta(datos.start_url) };
    });
    assert.equal(manifiesto.name, caso.nombreLargo);
    assert.equal(manifiesto.short_name, caso.nombreCorto);
    assert.equal(manifiesto.display, 'standalone');
    assert.equal(manifiesto.scope, caso.alcance, 'alcance: la carpeta de esa versión en GitHub Pages');
    for (const icono of manifiesto.icons) assert.ok(icono.src.startsWith(caso.iconos) && !icono.src.slice(caso.iconos.length).includes('/'), `ícono de ${caso.iconos}: ${icono.src}`);
    const pestana = await pagina.evaluate(() => [...document.querySelectorAll('link[rel="icon"]')].map((l) => l.getAttribute('href')));
    assert.ok(pestana.length > 0 && pestana.every((h) => h.startsWith(caso.iconos) && !h.slice(caso.iconos.length).includes('/')), `pestaña con ${caso.iconos}: ${pestana}`);
    assert.ok(manifiesto.icons.some((i) => i.sizes === '512x512' && (i.purpose ?? 'any').split(' ').includes('any')), 'ícono de 512 px');
    assert.ok(manifiesto.icons.some((i) => i.sizes === '512x512' && (i.purpose ?? '').split(' ').includes('maskable')), 'ícono maskable');
    await pagina.evaluate(() => navigator.serviceWorker.ready);
    const cdp = await contexto.newCDPSession(pagina);
    const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors');
    assert.deepEqual(installabilityErrors, []);
  } finally {
    await contexto.close();
    await rm(perfil, { recursive: true, force: true });
  }
});

test('HU-00 CA-1 · la raíz del sitio lleva a la versión real en /app/', async () => {
  const contexto = await entorno.navegador.newContext({ viewport: CELULAR, serviceWorkers: 'block' });
  try {
    const pagina = await contexto.newPage();
    await pagina.goto(entorno.servidor.urlRaiz);
    await pagina.waitForURL(entorno.servidor.urlReal);
    await pagina.waitForSelector('main h1');
    assert.equal(await pagina.title(), 'Plan semanal · Alacena');
  } finally {
    await contexto.close();
  }
});
