// Interfaz de Alacena: rutas por «#destino», navegación, tema y aviso de versión nueva.
import { pantallaProximamente } from './pantallas/proximamente.js';
import { tarjetaInstalar } from './instalacion.js';
import { actualizarFranja } from './franja-prueba.js';
import { crear } from './dom.js';

// Los seis destinos, en el orden de la barra. El primero es la pantalla de inicio.
const DESTINOS = { plan: 'Plan semanal', recetas: 'Recetas', compras: 'Compras', despensa: 'Despensa', precios: 'Precios', ajustes: 'Ajustes' };
const INICIO = 'plan';
const PC = '(min-width: 720px)';
const SISTEMA_OSCURO = '(prefers-color-scheme: dark)';
// Ajustes se carga recién cuando se abre, para que la primera pantalla se dibuje antes.
let moduloAjustes = null;

export function iniciarInterfaz({ preferencias, instalacion, modoPrueba, datosDispositivo, alCambiarModoPrueba = () => {}, version }) {
  const principal = document.getElementById('contenido');
  const enlaces = [...document.querySelectorAll('.nav-lista a[data-destino]')];

  const aplicarTema = () => {
    const eleccion = preferencias.temaElegido();
    if (eleccion === 'sistema') delete document.documentElement.dataset.tema;
    else document.documentElement.dataset.tema = eleccion;
    const fondo = getComputedStyle(document.documentElement).getPropertyValue('--color-fondo').trim();
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', fondo);
  };

  const destinoActual = () => {
    const ruta = location.hash.slice(1);
    return Object.hasOwn(DESTINOS, ruta) ? ruta : INICIO;
  };
  const marcarNavegacion = () => {
    for (const enlace of enlaces) {
      if (enlace.dataset.destino === destinoActual()) enlace.setAttribute('aria-current', 'page');
      else enlace.removeAttribute('aria-current');
    }
  };

  const acciones = {
    alInstalar: () => instalacion.instalar().then(() => mostrar(false)),
    alDescartar: () => {
      instalacion.descartar();
      mostrar(false);
      principal.querySelector('h1')?.focus({ preventScroll: true });
    },
  };

  const mostrar = (moverFoco) => {
    const destino = destinoActual();
    const titulo = DESTINOS[destino];
    document.body.dataset.ruta = destino;
    if (destino === 'ajustes' && !moduloAjustes) {
      // Primera vez: se carga el módulo y se vuelve a dibujar (sin conexión, lo sirve el service worker).
      import('./pantallas/ajustes.js').then((modulo) => { moduloAjustes = modulo; if (destinoActual() === 'ajustes') mostrar(moverFoco); });
      principal.replaceChildren(crear('h1', { class: 'titulo', tabindex: '-1', texto: titulo }));
      document.title = `${titulo} · Alacena`;
      marcarNavegacion();
      return;
    }
    let pantalla;
    if (destino === 'ajustes') {
      pantalla = moduloAjustes.pantallaAjustes({
        preferencias, version, instalacion, alInstalar: acciones.alInstalar, modoPrueba, datosDispositivo,
        alCambiarModoPrueba: () => {
          actualizarFranja(modoPrueba.estado());
          alCambiarModoPrueba();
          const foco = document.activeElement?.id;
          mostrar(false);
          if (foco) document.getElementById(foco)?.focus();
        },
        alElegirTema: (tema) => { preferencias.elegirTema(tema); aplicarTema(); },
      });
    } else {
      // La sugerencia de instalar va arriba de la primera pantalla.
      const { sugerirEnPlan, forma } = instalacion.estado();
      const antes = destino === INICIO && sugerirEnPlan ? [tarjetaInstalar({ forma, ...acciones })] : [];
      pantalla = pantallaProximamente({ titulo, destino, antes });
    }
    principal.replaceChildren(...pantalla);
    document.title = `${titulo} · Alacena`;
    marcarNavegacion();
    if (moverFoco) principal.querySelector('h1')?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  };

  aplicarTema();
  actualizarFranja(modoPrueba.estado());
  marcarNavegacion();
  mostrar(false);
  // Al cambiar de pantalla (por ejemplo, con «Atrás» del celular), se cierra cualquier ventana abierta.
  window.addEventListener('hashchange', () => {
    for (const ventana of document.querySelectorAll('dialog[open]')) ventana.close();
    mostrar(true);
  });
  // Si el navegador pasa a ofrecer instalar con un toque (o termina de instalar), se actualiza la pantalla.
  instalacion.alCambiar(() => { if (['plan', 'ajustes'].includes(destinoActual())) mostrar(false); });
  matchMedia(SISTEMA_OSCURO).addEventListener('change', aplicarTema);
  matchMedia(PC).addEventListener('change', marcarNavegacion);
  return {
    // Vuelve a dibujar la pantalla cuando cambian los datos del dispositivo, sin perder el foco.
    refrescar() {
      const foco = document.activeElement?.id;
      mostrar(false);
      if (foco) document.getElementById(foco)?.focus();
    },
  };
}

/** Muestra «Hay una versión nueva · Actualizar». */
export function avisarVersionNueva(actualizar) {
  const aviso = document.querySelector('.aviso-version');
  aviso.hidden = false;
  document.getElementById('actualizar').addEventListener('click', actualizar, { once: true });
}
