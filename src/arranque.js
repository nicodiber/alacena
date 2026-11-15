// Arranque de Alacena: elige los adaptadores y une las capas.
import { VERSION } from './version.js';
import { crearPreferenciasLocales } from './adaptadores/preferencias-local.js';
import { registrarServiceWorker } from './adaptadores/actualizaciones.js';
import { crearInstalacionNavegador } from './adaptadores/instalacion-navegador.js';
import { crearRelojDelDispositivo } from './adaptadores/reloj.js';
import { crearAlmacenIndexedDB } from './adaptadores/almacen-indexeddb.js';
import { nombreDeBase } from './adaptadores/canal.js';
import { crearCasosPreferencias } from './aplicacion/preferencias.js';
import { crearCasosInstalacion } from './aplicacion/instalacion.js';
import { crearCasosModoPrueba } from './aplicacion/modo-prueba.js';
import { crearCasosDatosDispositivo } from './aplicacion/datos-dispositivo.js';
import { iniciarInterfaz, avisarVersionNueva } from './ui/app.js';

// La sincronización con Google Drive todavía no se conecta acá: sus adaptadores esperan su propia historia (ver AGENTS.md).
const almacen = crearPreferenciasLocales();
const preferencias = crearCasosPreferencias(almacen);
const instalacion = crearCasosInstalacion({ instalacion: crearInstalacionNavegador(), preferencias: almacen });
// El reloj de toda la app: la fecha simulada en modo prueba, la del dispositivo fuera de él.
const modoPrueba = crearCasosModoPrueba({ preferencias: almacen, relojDelDispositivo: crearRelojDelDispositivo() });
// La base del dispositivo depende del canal y del modo prueba; al cambiar el modo prueba se cambia toda.
const basePara = () => {
  const almacenDatos = crearAlmacenIndexedDB(nombreDeBase({ modoPrueba: modoPrueba.estado().activo, ruta: location.pathname }));
  return { dispositivo: crearCasosDatosDispositivo(almacenDatos) };
};
let base = basePara();
const datosParaInterfaz = { estado: () => base.dispositivo.estado() };
// Se redibuja apenas se sabe el estado de la base.
const preparar = async (alAvanzar) => {
  await base.dispositivo.preparar();
  alAvanzar();
};
const interfaz = iniciarInterfaz({
  preferencias, instalacion, modoPrueba, datosDispositivo: datosParaInterfaz, version: VERSION,
  alCambiarModoPrueba: () => { base = basePara(); preparar(() => interfaz.refrescar()); },
});
preparar(() => interfaz.refrescar());
registrarServiceWorker({ alHaberVersionNueva: avisarVersionNueva });
