# Alacena

App web instalable (PWA) para planificar qué comer en la semana, costear cada receta por porción y armar la lista de compras. Sin servidor propio y sin costo: los datos viven en el dispositivo (IndexedDB) y, más adelante, se sincronizan con un archivo JSON en la carpeta «Alacena» del Google Drive de la persona.

**Está en desarrollo, sin usuarios reales todavía.** Este repo (`nicodiber/alacena`) es **público** y tiene solo el código. Ver [Privacidad](#privacidad) y [Límites](#límites) antes de tocar algo.

**Etapa actual:** `v0.0.1`, la base instalable (HU-00): seis pantallas vacías (Plan semanal, Recetas, Compras, Despensa, Precios y Ajustes), tema, instalación, modo prueba y los adaptadores de Google escritos pero sin conectar.

## Dónde está la verdad del proyecto

La documentación funcional (qué debe hacer Alacena, reglas de negocio, glosario, decisiones, backlog de historias y su tablero) vive en un **repositorio privado de harness**: `nicodiber/alacena-harness` (nombre provisorio; todavía no está creado). Este repo no la copia.

Mientras no exista, la verdad de lo ya construido es este código y su `CHANGELOG.md`. **Regla:** si una decisión de negocio o de arquitectura se toma en una conversación, se documenta en el harness (o, hasta que exista, se anota en el PR y en `CHANGELOG.md`). El código no alcanza como registro.

## Stack

| Capa | Tecnología |
|---|---|
| App | JavaScript con módulos ES nativos, sin frameworks ni compilación |
| Datos | IndexedDB en el dispositivo; archivo JSON `alacena-datos.json` en la carpeta «Alacena» de Google Drive (`drive.file`), todavía sin conectar |
| Inicio de sesión | Google Identity Services, modelo de token, sin servidor (todavía sin conectar) |
| Pruebas | `node --test` y Playwright en Chromium; axe-core para accesibilidad |
| Publicación | GitHub Pages con una acción: `main` en `/app/`, `develop` en `/prueba/`; la raíz lleva a `/app/` |

## Estructura

```
AGENTS.md / CLAUDE.md          este mapa (CLAUDE.md lo importa)
index.html, sw.js              página única y service worker (abre sin conexión)
manifest*.webmanifest          app real y app de prueba, con íconos distintos
css/                           tokens.css (colores, tipografía, espaciado) y app.css
fuentes/                       Figtree (licencia OFL incluida)
iconos/                        ícono del frasco; iconos/prueba/ lleva la franja ámbar
publicacion/                   página de la raíz del sitio (lleva a /app/)
src/arranque.js                elige los adaptadores y une las capas
src/dominio/                   reglas puras: fecha, formato, tema, instalación, configuración, texto
src/aplicacion/                casos de uso: preferencias, instalación, modo prueba, datos del dispositivo
src/puertos/                   contratos (JSDoc): almacén, instalación, preferencias, reloj, sincronización
src/adaptadores/               lo único que toca el navegador y la red: IndexedDB, localStorage, reloj, canal,
                               service worker, Google (auth y Drive)
src/ui/                        armazón, pantallas, ventanas y componentes
pruebas/                       unitarias, de arquitectura y recorridos en navegador
.github/                       acciones (Pruebas, Publicar, Privacidad, Spec) y sus scripts
.claude/                       permisos, hook de lint y servidor estático de Claude
```

## Arquitectura hexagonal

- **El dominio** no importa nada de fuera de `src/dominio/`: son funciones puras, sin navegador ni almacenamiento.
- **Solo los adaptadores** (y `arranque.js`) usan `indexedDB`, `localStorage`, `fetch` y `google`. La aplicación, los puertos y la interfaz no hacen pedidos de red.
- **Solo el adaptador de reloj** lee la fecha del sistema (`Date.now()`, `new Date()`). «Hoy» sale siempre del puerto `Reloj`; en modo prueba es la fecha simulada (`2026-11-16` por defecto).
- **Texto del usuario** al DOM siempre con `textContent`, nunca como HTML (el lint lo impide).
- **Las capas se unen en `arranque.js`:** una capa nueva entra como puerto + adaptador + caso de uso.
- Lo revisa `pruebas/reglas/arquitectura.test.js`.

## Cómo encarar un cambio

Método ágil: **rebanadas verticales, historias de usuario y programación en pareja con IA**.

1. **Historia:** cada pedido es una historia atómica «Como… quiero… para…» (`HU-NN`) con 2 a 4 criterios «Dado / Cuando / Entonces» (`CA-1`…`CA-4`) y el «dale» explícito del responsable. Las historias viven en el repo de harness. **No se implementa sin historia aprobada.**
2. **Opciones visuales:** si cambia algo visible, primero se muestran opciones y el responsable elige.
3. **Rebanada vertical:** se programa la funcionalidad completa (pantalla, lógica y guardado) para que se pueda usar. Rama `hu/<NN>-<nombre>` (por ejemplo, `hu/00-base-instalable`) y PR a `develop` con `Resuelve HU-NN` y la tabla de evidencia.
4. **Probar:** con la versión publicada en `/prueba/`, el responsable la usa y aprueba. Si algo no anda, se corrige en la misma historia.
5. **Documentar:** con su OK se actualiza el harness y `CHANGELOG.md`.

Dentro de cada tarea: **reproducir** (ver la falla o el comportamiento actual con una prueba) → **atribuir** a una capa → **corregir** en esa capa (la lógica va al dominio, no a la interfaz) → **verificar** criterio por criterio → **reportar** qué cambió, qué se corrió y con qué resultado, y **qué no se corrió y por qué**.

Si aparece un caso que la historia no cubre, o dos criterios que chocan, **se frena y se pregunta** con opciones. No se decide en el código.

## Definición de terminado

«Debería andar» no es evidencia.

| Si el cambio toca… | Evidencia |
|---|---|
| Una historia | Cada `CA-n` con su evidencia en la tabla del PR: una prueba que lo cita, un recorrido en navegador o una verificación descrita. |
| Cualquier código | `npm run lint` y `npm test` en verde. |
| Lógica de dominio | Una prueba nueva que falla sin el cambio, con valores esperados que no salen del código que se prueba. |
| Un dato guardado | Migración del esquema de IndexedDB si corresponde (sube `VERSION_ESQUEMA`), con su prueba. |
| Una pantalla | Recorrido en navegador en escritorio y en 390 × 844, con y sin conexión, y axe-core sin problemas graves. |
| Un archivo nuevo en `src/` | Está en la lista de `sw.js` y, si lo usa el arranque, en las precargas de `index.html` (lo revisa `pruebas/version.test.js`). |
| Una versión nueva | `src/version.js`, `VERSION` de `sw.js` y `CHANGELOG.md` con el mismo número. |
| Un error que se puede repetir | Una prueba que lo reproduce y, si es de otra clase, una entrada en el harness. |

Las acciones de GitHub corren solas en cada envío y en cada PR: **Pruebas** (lint y `npm test`), **Privacidad**, **Spec** (el PR cita `Resuelve HU-NN` o `Parte de HU-NN` y trae la tabla `| CA | Evidencia |` completa) y **Publicar**.

## Convenciones rápidas

- **Idioma:** español rioplatense, con voseo, en todo: código, comentarios, mensajes de commit e interfaz.
- **Dinero:** enteros en centavos, nunca números con coma flotante. Cotizaciones y cantidades decimales, como texto.
- **Fecha:** formato `AAAA-MM-DD` en los datos y `DD/MM/AAAA` en pantalla; «hoy» por el puerto `Reloj`.
- **Nombres:** las bases y claves del navegador llevan el prefijo `alacena` (`alacena-dev` en `/prueba/`, y con `-prueba` en modo prueba), así la versión real, la de prueba y el modo prueba nunca se mezclan.
- **Red:** solo Google, cuando se conecte la sincronización; sin analítica ni CDNs. Hoy todos los pedidos van al mismo origen (lo revisa `pruebas/navegador/sin-conexion.test.js`).
- **Estilos:** solo con las variables de `css/tokens.css`; un cambio de tokens necesita la aprobación del responsable.
- **Accesibilidad:** contraste, foco visible, objetivos táctiles de 44 px y nombres accesibles en todo.

## Sincronización con Google Drive (sin conectar)

`src/puertos/sincronizacion.js` documenta el contrato; `src/adaptadores/google-auth.js` (sesión) y `src/adaptadores/drive-sync.js` (archivo) lo cumplen. Permiso solo `drive.file`; archivo `alacena-datos.json` dentro de una carpeta «Alacena». `CLIENT_ID` está vacío hasta que exista el cliente OAuth. **No se conectan a la interfaz** sin su propia historia: al hacerlo hay que abrir la política de seguridad de `index.html`, actualizar la regla de red de arriba y borrar la prueba que dice que no están conectados.

## Privacidad

**El repo es público: no puede tener nada personal ni que permita deducirlo.** Eso incluye nombres de personas, barrios, ciudades o direcciones, montos reales, hábitos de compra o de comida, emails, y cualquier dato de una persona real. Los datos de ejemplo son siempre ficticios y viven en `datos-demo/`.

- La acción **Privacidad** busca emails y planillas, y los términos del secreto `NOMBRES_PROHIBIDOS` (uno por línea; nunca se muestran). Si el secreto no existe, el control avisa en el log y pasa.
- `pruebas/reglas/nombres.test.js` revisa lo mismo en local.
- Los commits, PR y mensajes no llevan datos personales.
- El **ID de cliente OAuth es público** y es la **única credencial** que puede ir en el código. Nunca un secreto, un token, una contraseña ni una clave de API.

## Límites

- **Nada se mezcla ni se envía a `main`** sin que el responsable confirme explícitamente que probó. `main` es la versión real. Los PR van a `develop`.
- **Nunca `push --force`**, salvo pedido explícito del responsable (por ejemplo, borrar datos personales del historial), y entonces con `--force-with-lease`.
- **No implementar sin historia aprobada:** una historia sin el «dale» anotado se puede escribir o investigar, no programar. Se anota una aprobación solo cuando se dio con palabras explícitas.
- **No debilitar pruebas para que pasen:** no borrar aserciones, no agregar `skip` ni relajar valores esperados sin explicar en el PR por qué la expectativa estaba mal.
- **Claude nunca pide ni maneja contraseñas ni tokens** del responsable.
- **Lo decidido no se vuelve a proponer**, salvo que el responsable lo pida.
- `.claude/settings.json` aplica parte de estos límites como permisos.

## Usuario

- Una sola persona en la v1. Aprueba cada historia con un «dale» y la prueba usándola; prefiere no avanzar sin validar cada etapa y priorizar velocidad: probar primero, documentar después.
- Prefiere preguntas con opciones de respuesta y una explicación de cada una cuando hay que decidir algo, y pasos manuales detallados uno por uno.
- Usa un celular para cargar y una computadora para planificar y revisar.
