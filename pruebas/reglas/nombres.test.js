// El repo es público: no puede nombrar al proyecto del que salió la base ni traer datos personales.
// El nombre del proyecto anterior se arma por partes para que esta prueba no lo nombre a su vez.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { revisar } from '../../.github/scripts/control-privacidad.mjs';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const IGNORAR = new Set(['node_modules', '.git', 'package-lock.json']);
const BINARIO = /\.(png|jpg|jpeg|gif|webp|ico|woff2?|xlsx)$/i;

async function archivos(dir) {
  const salida = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (IGNORAR.has(e.name)) continue;
    const ruta = join(dir, e.name);
    if (e.isDirectory()) salida.push(...await archivos(ruta));
    else salida.push(ruta);
  }
  return salida;
}
const todos = await Promise.all((await archivos(RAIZ)).map(async (r) => ({ ruta: relative(RAIZ, r).replaceAll('\\', '/'), contenido: BINARIO.test(r) ? null : await readFile(r, 'utf8') })));
const PROYECTO_ANTERIOR = new RegExp(['a', 'fp'].join(''), 'i');
const TERMINOS_DE_FINANZAS = /\b(movimientos?|partida doble|egresos?|ingresos?|arqueo|saldos?)\b/i;

test('HU-00 CA-5 · ningún archivo del repo nombra al proyecto anterior', () => {
  assert.ok(todos.length > 20, 'se revisan los archivos del repo');
  for (const { ruta, contenido } of todos) {
    assert.doesNotMatch(ruta, PROYECTO_ANTERIOR, ruta);
    if (contenido != null) assert.doesNotMatch(contenido, PROYECTO_ANTERIOR, ruta);
  }
});

test('HU-00 CA-5 · ningún archivo del repo trae emails personales ni planillas de datos', () => {
  assert.deepEqual(revisar(todos), []);
});

test('HU-00 CA-5 · el código de src/ no arrastra el vocabulario de finanzas del proyecto anterior', () => {
  for (const { ruta, contenido } of todos.filter((a) => a.ruta.startsWith('src/'))) assert.doesNotMatch(contenido, TERMINOS_DE_FINANZAS, ruta);
});
