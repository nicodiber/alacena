// Crea elementos con texto siempre como texto: nunca HTML.
export function crear(etiqueta, atributos = {}, hijos = []) {
  const elemento = document.createElement(etiqueta);
  for (const [nombre, valor] of Object.entries(atributos)) {
    if (nombre === 'texto') elemento.textContent = valor;
    else if (nombre === 'class') elemento.className = valor;
    else elemento.setAttribute(nombre, valor);
  }
  elemento.append(...hijos);
  return elemento;
}
