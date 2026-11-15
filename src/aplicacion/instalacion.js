// Casos de uso de la sugerencia de instalación.
import { debeSugerirInstalacion, formaDeInstalar } from '../dominio/instalacion.js';

export function crearCasosInstalacion({ instalacion, preferencias }) {
  // Instalada desde el menú del navegador (sin pasar por Alacena): la tarjeta tampoco vuelve.
  instalacion.alInstalarse(() => preferencias.guardarSugerenciaInstalacion('descartada'));
  const estado = () => {
    const instalada = instalacion.estaInstalada();
    return {
      sugerirEnPlan: debeSugerirInstalacion({ instalada, sugerencia: preferencias.leerSugerenciaInstalacion() }),
      forma: formaDeInstalar({ instalada, conUnToque: instalacion.puedeConUnToque(), dispositivo: instalacion.dispositivo() }),
    };
  };
  return {
    estado,
    async instalar() {
      const aceptada = await instalacion.instalar();
      if (aceptada) preferencias.guardarSugerenciaInstalacion('descartada');
      return aceptada;
    },
    descartar: () => preferencias.guardarSugerenciaInstalacion('descartada'),
    alCambiar: (funcion) => instalacion.alCambiar(funcion),
  };
}
