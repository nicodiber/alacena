// Pantallas que todavía no existen: el título, qué va a haber ahí y un aviso de que llega más adelante.
import { crear } from '../dom.js';

/** Qué va a tener cada destino. */
export const DESCRIPCIONES = {
  plan: 'Acá vas a armar qué comer cada día de la semana.',
  recetas: 'Acá vas a guardar tus recetas y ver cuánto cuesta cada porción.',
  compras: 'Acá vas a ver la lista de compras de la semana.',
  despensa: 'Acá vas a anotar lo que ya tenés en casa.',
  precios: 'Acá vas a llevar los precios de los ingredientes.',
};

/** `antes` son tarjetas que van arriba (por ejemplo, la sugerencia de instalar). */
export function pantallaProximamente({ titulo, destino, antes = [] }) {
  return [
    crear('h1', { class: 'titulo', tabindex: '-1', texto: titulo }),
    ...antes,
    crear('div', { class: 'vacio' }, [
      crear('p', { texto: DESCRIPCIONES[destino] }),
      crear('p', { class: 'apoyo', texto: 'Esta parte llega en una próxima entrega.' }),
      ...(destino === 'plan' ? [] : [crear('a', { class: 'boton-texto', href: '#plan', texto: 'Volver al plan semanal' })]),
    ]),
  ];
}
