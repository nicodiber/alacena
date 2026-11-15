# Historial de cambios

Una entrada por versión, la más nueva arriba. Formato: lo que cambió para quien usa la app y, aparte, lo técnico.

## 0.0.1 · HU-00 · Base instalable

### Para quien la usa
- Alacena se abre en el navegador, se puede instalar como app y abre sin conexión.
- Seis pantallas en la barra de navegación, todavía vacías con un aviso de que llegan más adelante: Plan semanal, Recetas, Compras, Despensa y Precios. Barra inferior en el celular y barra lateral en la PC.
- Ajustes: tema claro, oscuro o como el sistema; instalación; modo prueba con fecha simulada; estado del almacenamiento del dispositivo; versión.
- La versión a probar (`/prueba/`) tiene su propio ícono, nombre y datos, separados de la versión real.

### Técnico
- PWA con módulos ES nativos, sin frameworks ni compilación. Arquitectura hexagonal: `src/dominio`, `src/aplicacion`, `src/puertos`, `src/adaptadores`, `src/ui`.
- Datos en IndexedDB (`alacena`, `alacena-prueba`, `alacena-dev`, `alacena-dev-prueba`) y preferencias en `localStorage` con el mismo prefijo.
- Puerto `Sincronizacion` y adaptadores de Google (`google-auth.js`, `drive-sync.js`): permiso `drive.file`, archivo `alacena-datos.json` en la carpeta «Alacena» del Drive. **No están conectados** a la interfaz y el ID de cliente OAuth queda vacío hasta que exista.
- Puerto `Reloj` con `instanteMs` para las diferencias de tiempo.
- Acciones de GitHub: Pruebas (lint y `npm test`), Publicar (`main` en `/app/`, `develop` en `/prueba/`), Privacidad y Spec (el PR cita `Resuelve HU-NN` y trae la tabla de evidencia).
- Pruebas: reglas de arquitectura y de nombres, dominio, aplicación, adaptadores de Google con red simulada y recorridos en navegador (celular 390 × 844 y escritorio) con axe-core.
