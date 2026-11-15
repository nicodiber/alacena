// HU-00: nombre de la base de datos según el canal y el modo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nombreDeBase } from '../../src/adaptadores/canal.js';

test('HU-00 · cuatro bases separadas', () => {
  assert.equal(nombreDeBase({ modoPrueba: false, ruta: '/alacena/' }), 'alacena');
  assert.equal(nombreDeBase({ modoPrueba: true, ruta: '/alacena/' }), 'alacena-prueba');
  assert.equal(nombreDeBase({ modoPrueba: false, ruta: '/alacena/prueba/' }), 'alacena-dev');
  assert.equal(nombreDeBase({ modoPrueba: true, ruta: '/alacena/prueba/' }), 'alacena-dev-prueba');
});
