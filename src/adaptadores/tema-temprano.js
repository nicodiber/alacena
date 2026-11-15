// Se carga sin «defer» en el <head>, antes de dibujar: pone el tema elegido en <html> para que la
// pantalla no aparezca un instante con el tema equivocado, y marca el modo
// prueba para que el lugar de la franja quede reservado desde el primer dibujo. También pone
// el manifiesto y los íconos del canal: la versión a probar es «Alacena prueba», con su ícono.
// Script clásico (no módulo): repite en pocas líneas la clave de canal.js y el criterio de dominio/tema.js;
// las pruebas en navegador de tema y modo prueba comprueban que coincidan.
(function () {
  var prefijo = /\/prueba\//.test(location.pathname) ? 'alacena-dev-' : 'alacena-';
  var tema = null;
  var modoPrueba = null;
  try { tema = localStorage.getItem(prefijo + 'tema'); modoPrueba = localStorage.getItem(prefijo + 'modo-prueba'); } catch { /* sin almacenamiento */ }
  if (tema === 'claro' || tema === 'oscuro') document.documentElement.setAttribute('data-tema', tema);
  if (modoPrueba === 'si') document.documentElement.setAttribute('data-modo-prueba', '');
  var dev = prefijo === 'alacena-dev-';
  var iconos = dev ? 'iconos/prueba/' : 'iconos/';
  var enlaces = [
    ['manifest', dev ? 'manifest-prueba.webmanifest' : 'manifest.webmanifest'],
    ['icon', iconos + 'icono.svg', 'image/svg+xml'],
    ['icon', iconos + 'icono-32.png', 'image/png', '32x32'],
    ['apple-touch-icon', iconos + 'icono-192.png'],
  ];
  for (var i = 0; i < enlaces.length; i += 1) {
    var enlace = document.createElement('link');
    enlace.rel = enlaces[i][0];
    enlace.href = enlaces[i][1];
    if (enlaces[i][2]) enlace.type = enlaces[i][2];
    if (enlaces[i][3]) enlace.sizes = enlaces[i][3];
    document.head.appendChild(enlace);
  }
})();
