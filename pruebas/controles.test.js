// Pruebas de los controles del repo («Spec» y «Privacidad»).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { revisarCuerpo } from '../.github/scripts/control-spec.mjs';
import { revisar } from '../.github/scripts/control-privacidad.mjs';

const TABLA = '| CA | Evidencia |\n|---|---|\n| CA-1 | prueba `x.test.js` › «HU-01 CA-1» |\n';

test('un PR con su historia y la evidencia completa pasa', () => {
  assert.deepEqual(revisarCuerpo(`Resuelve HU-01\n\n${TABLA}`), []);
  assert.deepEqual(revisarCuerpo(`Parte de HU-12\n\n${TABLA}`), []);
  assert.deepEqual(revisarCuerpo(`resuelve hu-01\n\n${TABLA}`), []);
});

test('un PR sin historia falla y dice qué falta', () => {
  const errores = revisarCuerpo(TABLA);
  assert.equal(errores.length, 1);
  assert.match(errores[0], /no cita su historia/);
  assert.match(revisarCuerpo(`Resuelve HU-\n\n${TABLA}`).join(), /no cita su historia/);
  assert.match(revisarCuerpo(`Habla de HU-01\n\n${TABLA}`).join(), /no cita su historia/);
});

test('un PR sin tabla o con un CA sin evidencia falla', () => {
  assert.match(revisarCuerpo('Resuelve HU-01').join(), /Falta la tabla/);
  assert.deepEqual(revisarCuerpo(`Resuelve HU-01\n\n${TABLA}| CA-2 | … |\n`), ['CA-2 no tiene evidencia.']);
  assert.deepEqual(revisarCuerpo(`Resuelve HU-01\n\n${TABLA}| CA-3 |  |\n`), ['CA-3 no tiene evidencia.']);
});

test('un término prohibido falla sin mostrar el término', () => {
  const errores = revisar([{ ruta: 'src/a.js', contenido: 'const barrio = "Barrio Inventado";' }], ['barrio inventado']);
  assert.equal(errores.length, 1);
  assert.doesNotMatch(errores[0], /inventado/i);
  assert.match(errores[0], /src\/a\.js:1/);
});

test('sin términos prohibidos (falta el secreto), el control no falla por eso', () => {
  assert.deepEqual(revisar([{ ruta: 'src/a.js', contenido: 'const x = 1;' }], []), []);
});

test('un email personal falla; los genéricos no', () => {
  const personal = ['persona', 'gmail.com'].join('@');
  assert.equal(revisar([{ ruta: 'a.md', contenido: `contacto ${personal}` }]).length, 1);
  assert.deepEqual(revisar([{ ruta: 'a.md', contenido: 'Claude <noreply@anthropic.com>' }]), []);
});

test('una planilla o un respaldo fuera de datos-demo falla; dentro, no', () => {
  assert.equal(revisar([{ ruta: 'mis-datos.csv', contenido: null }]).length, 1);
  assert.equal(revisar([{ ruta: 'respaldo-2026.json', contenido: '{}' }]).length, 1);
  assert.deepEqual(revisar([{ ruta: 'datos-demo/ejemplo.csv', contenido: null }]), []);
});
