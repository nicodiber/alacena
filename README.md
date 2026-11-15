# Alacena

App web instalable (PWA) para planificar qué comer en la semana, saber cuánto cuesta cada plato por porción y armar la lista de compras.

- `/app/`: versión real (rama `main`).
- `/prueba/`: versión a probar (rama `develop`).

El sitio se publica con GitHub Pages mediante `.github/workflows/publicar.yml`: solo copia archivos, sin compilar.

## Estado

Versión `0.0.1`: la base instalable. Navegación con seis pantallas (Plan semanal, Recetas, Compras, Despensa, Precios y Ajustes), todavía vacías salvo Ajustes (tema, instalación y modo prueba). Los datos viven en el dispositivo (IndexedDB). La sincronización con Google Drive está escrita como adaptadores pero todavía no está conectada.

La base técnica (estructura, arquitectura y pruebas) salió de un proyecto anterior del mismo autor.

## Cómo se trabaja

Las reglas del repo están en [`AGENTS.md`](AGENTS.md): arquitectura, método por historias de usuario (`HU-NN`), definición de terminado y límites. La documentación funcional del proyecto vive en un repositorio privado aparte.

## Pruebas

```
npm ci
npm run lint
npm test
```

`npm test` corre las pruebas unitarias y los recorridos en navegador (Playwright con Chromium; si falta, `npx playwright install chromium`). La acción «Pruebas» las corre en cada envío y en cada PR.

Este repo no contiene datos personales. Todos los derechos reservados: el código se puede ver, pero no copiar ni reutilizar sin permiso.
