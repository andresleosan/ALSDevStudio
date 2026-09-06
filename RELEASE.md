# Release — ALS DevStudio

## 2026-09-06 · Hero en vivo, fuera Capacidades y recaptura semanal

### El carrusel del hero también en vivo

- La diapositiva activa monta un `<iframe>` con el sitio real, igual que las tarjetas. El distintivo «LIVE / ALS PORTFOLIO» que ya llevaba el card pasa a ser literal.
- Un solo marco a la vez, el de la diapositiva visible. Al cambiar de proyecto se retira de inmediato —durante el cruce solo se ve la captura— y el nuevo entra ya montado sobre el proyecto correcto.
- Se espera 900 ms antes de montar, así navegar deprisa entre proyectos no carga ninguno. Solo se monta con el hero en pantalla, la pestaña visible y el interruptor de vista en vivo activado.
- Contrapartida asumida: con la rotación automática cada 6 s, un sitio lento puede no llegar a mostrarse antes del siguiente cambio y su carga queda abortada. Pausando el carrusel o dejando el puntero encima, la diapositiva se queda quieta y siempre da tiempo.

### Sección «Capacidades» retirada

- Retirada la sección completa: encabezado, las cuatro pestañas y el panel. Con ella se van `scripts/modules/capabilities.js`, sus 23 reglas de CSS, el keyframe `panel-flip` y las reglas de `.tag`, que solo usaba ese panel.
- Retirado su enlace en la navegación y en el menú móvil, y renumeradas las secciones siguientes: proyectos pasa de 03 a 02, proceso de 04 a 03 y contacto de 05 a 04.
- Conservadas las reglas que compartía con otros bloques y que habrían caído con ella: `transform-style:flat` de contacto, mapa y proceso, el foco visible de filtros, ubicaciones y menú móvil, y el colapso a una columna de `.hero-grid` y `.contact-card` a ≤900 px.

### Recaptura automática semanal

- `.github/workflows/capturas.yml` rehace las capturas cada lunes, y también a mano desde la pestaña Actions, con la opción de regenerar solo algunas claves.
- `.github/capturas/capturar.mjs` lee las tarjetas de `index.html`, fotografía cada sitio a 1440×900 con Playwright y produce la base `.jpg` más las variantes AVIF/WebP con sharp. Si un sitio falla, conserva su captura anterior en vez de romper la ejecución; solo falla el job si fallan todos.
- El `package.json` de la herramienta vive en `.github/capturas/`, **no en la raíz**, para que Vercel siga viendo un sitio estático sin build.
- Probado de extremo a extremo en local: regenera, escribe los archivos y deja el árbol con cambios que el paso de commit detecta.

### Verificación

- `tsc` estricto sin errores tras retirar el módulo de capacidades.
- Estructura resultante: secciones `inicio, alcance, proyectos, proceso, contacto`; navegación y menú móvil sin el enlace muerto; eyebrows renumerados; 0 elementos con clase de capacidades.
- Hero: monta el marco de La Parada, lo retira al pasar a la siguiente y monta el de tecnifullgas; inclinación 3D del hero intacta con movimiento real de puntero.
- Las 15 capturas cargan sin 404 y todas dan 16:10; 4 marcos vivos en la rejilla; axe sin violaciones en escritorio y móvil; sin desborde horizontal entre 320 y 1920 px.

## 2026-09-06 · Capturas al día, encuadre unificado y retirada de GitHub

### Capturas regeneradas

- Las 15 capturas de proyecto estaban desactualizadas: al recargar se veía el estado antiguo del sitio hasta que entraba el marco en vivo. Regeneradas todas contra el sitio real.
- **Encuadre unificado a 1440×900**, exactamente el mismo viewport que simula el `<iframe>` de la vista en vivo. Antes las proporciones iban de 1,477 a 2,368 sobre un contenedor 16:10, así que la captura salía con barras y el relevo hacia el marco vivo se notaba. Ahora la imagen llena la tarjeta y el cambio es imperceptible.
- Base unificada a `.jpg` (mozjpeg, calidad 82, sin submuestreo de croma) más variantes AVIF y WebP a 480, 768 y 1200. **`assets/projects` baja de 10 784 KB a 2 764 KB (74 % menos).**
- Esto arregla a la vez la rejilla de proyectos y el carrusel del hero, porque comparten los mismos archivos, y también lo que se ve con la vista en vivo apagada, sin JavaScript o con «reducir movimiento».

### Retirada de los enlaces a GitHub

- Retirado el botón «Ver GitHub» del hero, el pie de la sección de proyectos —existía solo para enlazar al perfil—, el canal de contacto «Ver GitHub y repositorios públicos» y la propiedad `sameAs` del JSON-LD de `Organization`.
- Retiradas también las reglas de `.projects-footer`, que quedaban muertas.

### Verificación

- Las 15 capturas cargan sin ningún 404 y todas dan proporción 16:10; con la vista en vivo apagada las tarjetas ya muestran el contenido actual.
- JSON-LD sigue siendo JSON válido tras quitar `sameAs`.
- 4 marcos vivos montados y listos en escritorio; 3D del hero y de las tarjetas intacto; hit-testing de tarjetas, carrusel y CTA correcto.
- Sin errores de consola ni peticiones fallidas; axe sin violaciones en escritorio y móvil; sin desborde horizontal entre 320 y 1920 px.

## 2026-09-06 · DEPTH-01 capa 3D y LIVE-01 previews en vivo

### Capa de profundidad 3D (portada desde ALS DevStudioMed)

- Escritorio: el hero se inclina siguiendo el puntero con brillo especular sobre la tarjeta, la órbita ALS pasa a ser un anillo inclinado en 3D real, los chips de profundidad hacen parallax y los botones se vuelven magnéticos.
- Inclinación 3D en tarjetas de proyecto, panel de capacidades (con flip al cambiar de pestaña), proceso, mini brief y mapa; los reveals entran con perspectiva.
- **Móvil y tablet:** la escena 3D deja de estar apagada. Las tarjetas y el hero se inclinan según su distancia al centro del viewport, y el giroscopio se activa solo en Android; en iOS aparece un botón «3D» porque el permiso exige un gesto.
- Todo se desactiva con `prefers-reduced-motion`.

### JavaScript en módulos ES

- `scripts/main.js` pasa a ser el punto de entrada y el comportamiento se reparte en `scripts/modules/` (env, dom, space, cursor, hero-carousel, capabilities, projects, global-map, nav, contact, depth, reveal, live-preview), con JSDoc y `@ts-check`.
- `jsconfig.json` permite verificar tipos con `tsc` en modo estricto sin build; el script del index pasa a `type="module"`.

### Mapa mundial fuera del HTML

- El SVG del mapa (135 KB) sale de `index.html` a `assets/brand/world-map.svg` y se inyecta con `fetch`. **`index.html` baja de 196 KB a 58 KB** y el mapa pasa a ser un recurso cacheable aparte. Sin JavaScript el hueco se oculta mediante la regla del `<noscript>`.

### LIVE-01 · Previsualización en vivo de los proyectos

- Cada tarjeta conserva su captura estática (es la que pinta el LCP y el respaldo si algo falla) y monta encima un `<iframe>` con el sitio real, de modo que la landing muestra el estado actual del proyecto y no una foto envejecida.
- **Las tarjetas que están en pantalla se ven en vivo desde el primer momento**, sin esperar al puntero. Como cada marco es un sitio completo hay un tope de marcos simultáneos —4 en escritorio, 2 en táctil—: quedan vivas las más cercanas al centro del viewport, la señalada por el puntero o el foco nunca se queda fuera del cupo, y los montajes se escalonan 200 ms para no lanzar varias cargas a la vez. Al salir de pantalla, al filtrar o al ocultarse la pestaña, los marcos se descargan.
- La inclinación 3D de la tarjeta con marco vivo se conserva en escritorio (solo se inclina la que tiene el puntero, así que el coste está acotado a una) y se congela en táctil, donde el scroll inclinaría todas las visibles a la vez. Medido con CPU 4×: inclinar una tarjeta con marco cuesta 2,40 s de recálculo de estilo frente a 1,13 s sin él.
- El iframe es decorativo: `inert`, `aria-hidden`, `tabindex="-1"`, `pointer-events:none`, `sandbox="allow-scripts allow-same-origin"`, `allow=""` y `referrerpolicy="no-referrer"`. La tarjeta sigue siendo un enlace normal.
- Interruptor «Vista en vivo / Vista estática» junto a los filtros, con preferencia persistida. No se ofrece con `prefers-reduced-data` ni con el ahorro de datos del sistema.
- `vercel.json` añade `frame-src` con los 13 orígenes de proyecto que aceptan ser embebidos.
- `field-hours.vercel.app` y `donacionesvenezuela.vercel.app` responden `X-Frame-Options: DENY` y `frame-ancestors 'none'`; quedan marcados con `data-live="off"` y conservan su captura. Para activarlos hay que cambiar la cabecera **en sus propios despliegues**: retirar `X-Frame-Options` y pasar su CSP a `frame-ancestors 'self' https://alsdevstudio.vercel.app`.

### Endurecimiento y correcciones sobre el port

- **Rendimiento táctil:** el bucle de scroll de `depth.js` deja de leer el DOM (centros cacheados, invalidados por `ResizeObserver`, `resize`, `visualViewport` y `orientationchange`), las escrituras de variables se deduplican y `will-change` solo se pone en los elementos visibles. Medido con Chrome y CPU estrangulada 4×: el recálculo de estilo durante el scroll baja de 6,66 s a 5,42 s (**−19 %**) y el número de layouts un 18 % sin estrangular.
- El brillo radial de las tarjetas y el magnetismo de los botones pasan a una escritura por frame; antes leían `getBoundingClientRect()` en cada evento de puntero (principal riesgo de INP con 15 tarjetas y ratones de alta frecuencia).
- Giroscopio: filtro paso bajo, zona muerta, deriva lenta del punto neutro y reasignación de ejes según `screen.orientation.angle`, para que no tiemble en reposo ni se descuadre en apaisado.
- Nuevo tilt de pulsación en táctil, con todos los listeners pasivos, y congelación de la escena mientras el dedo arrastra el carrusel.
- Detección de gama baja (`deviceMemory`, `hardwareConcurrency` y un vigilante de frames real, porque iOS no expone `deviceMemory`): recorta los desenfoques y las animaciones infinitas vía `body.is-low-tier`. Se añade soporte de `prefers-reduced-transparency`.
- `contain:layout paint` se limita a `@media (hover:none)`: un portátil táctil informa `pointer:coarse` **y** tiene hover real, y la contención le recortaría la sombra de 70 px de `.project-card:hover`.
- Se retira `will-change:transform` de todos los botones y se deja solo en `.magnetic`, que únicamente existe en escritorio.
- La tarjeta que hospeda un iframe congela su inclinación 3D (`is-live-host`): transformar en 3D un ancestro del iframe obliga a re-rasterizar el documento anidado en cada frame.
- La vista en vivo tampoco se ofrece con `prefers-reduced-motion`: dentro del iframe corre el sitio real con sus animaciones y no se pueden silenciar desde fuera.
- Añadidos los `data-step` que faltaban en el bloque Proceso; sin ellos el numeral fantasma de DEPTH-01 no se renderizaba.
- Corregido el chip «02 / código», que se salía de la pantalla hasta 101 px entre 901 y 1520 px de ancho. Ahora queda dentro con 18 px de margen como mínimo en toda la banda.
- `global-map.js` ya no oculta el hueco del mapa si falla el `fetch`: el `aspect-ratio` ya lo reservó y ocultarlo provocaría un salto de layout tardío.
- Cada sección de `main.js` se inicializa aislada: un fallo en una no deja el resto de la página sin JavaScript.
- El interruptor de vista en vivo recibe `min-height:44px` en móvil, igual que los filtros (WCAG 2.2 · 2.5.8).

### Verificación

- `tsc` en modo estricto sobre `scripts/**`: sin errores.
- Chrome real, 1440×900 y Pixel 7: 0 errores de consola y 0 solicitudes fallidas; 24 elementos reciben `tilt-3d`, el mapa se inyecta con sus 7 marcadores, las 15 tarjetas y las 15 diapositivas siguen presentes.
- 3D comprobado en funcionamiento: hero y tarjetas con `--tilt`/`--rx` reales en escritorio, inclinación por scroll en móvil, y `transform:none` con `prefers-reduced-motion`.
- Hit-testing: enlace de tarjeta, botones del carrusel y CTA del hero siguen recibiendo el clic; el carrusel avanza de 01 a 02.
- Vista en vivo: montaje y desmontaje correctos, respeto del interruptor, `data-live="off"` nunca monta, y una sola tarjeta viva en móvil.
- Regresión visual contra `13d528b` con animaciones apagadas: escritorio idéntico salvo el botón nuevo (0,01 %) y la corrección de contraste de contacto (0,19 %); alturas de sección sin cambios excepto el `+118 px` de la nueva barra de herramientas.
- axe (wcag2a/aa, wcag21aa, wcag22aa, best-practice): 0 violaciones en escritorio y móvil.

### Rollback de esta release

`git revert` del commit de esta release y push a `main`. Vercel redesplegará el estado anterior. Si solo molesta la vista en vivo, basta con retirar `initLivePreview()` de `scripts/main.js`; el 3D y el resto siguen funcionando. Si solo molesta el 3D, retirar `initDepth()`.

## 2026-08-30 · OPT-06 SEO, contacto y despliegue público

- Publicado el commit `5f4d009` en `main`; Vercel lo desplegó automáticamente en `https://alsdevstudio.vercel.app/`.
- Añadidos JSON-LD (`Organization` + `WebSite`), robots, sitemap y metadatos sociales reforzados.
- Añadido GitHub como canal alternativo confirmado junto a WhatsApp.
- Añadidas cabeceras Vercel de CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` y protección contra framing.
- Verificación pública: HTTP 200, recursos SEO válidos, 0 errores de consola, 0 solicitudes fallidas y sin overflow entre 320 y 1440 px.

### Rollback de esta release

Si la release presenta una regresión, ejecutar `git revert 5f4d009` y hacer push a `main`; la integración de Vercel volverá a desplegar el estado anterior. Validar después la URL pública, `robots.txt`, `sitemap.xml`, cabeceras y las vistas móviles antes de reabrir tráfico.

## 2026-08-27 · Mini brief orientado a soluciones

- Rediseñada la sección de contacto para guiar hacia una Landing page, una Tienda virtual o una App/solución web.
- Actualizados los textos de cada ruta y los mensajes de WhatsApp correspondientes.

## 2026-08-27 · Preview social de ALS DevStudio

- Añadida assets/brand/og-image.png en formato 1200×630 para previews de enlaces.
- Añadidos metadatos Open Graph y Twitter Card en index.html.

## 2026-08-27 · Estructura de frontend separada

- Extraídos los estilos a `styles/main.css` y el comportamiento a `scripts/main.js`.
- `index.html` queda enfocado en la estructura semántica y conserva las rutas de assets existentes.

## 2026-08-27 · Orden posterior a The Coco Club

- Reordenados Mundo Celular, Hachi Grecia Spa, PintuMaster y Coctels OPS para que sigan inmediatamente a The Coco Club.
- El ajuste se refleja en el carrusel y en la galería.

## 2026-08-27 · Capturas sin overlays

- Retirados los aros decorativos, zoom y filtros que se aplicaban sobre las capturas de los proyectos.
- Las vistas ahora se muestran limpias, manteniendo únicamente la interacción estructural de las tarjetas.

## 2026-08-27 · Orden prioritario de proyectos

- El carrusel y la galería ahora comienzan con Multiogar, Tecnifullgas, BPT, Silicone, La Parada y The Coco Club.
- El resto de proyectos queda después, manteniendo su orden relativo.

## 2026-08-27 · Nuevas vistas de proyectos

- Reemplazadas las capturas visuales de Mercado Inteligente, PintuMaster y Coctels OPS.
- Ajustados los nombres de proyecto y labels accesibles para reflejar las marcas mostradas.

## 2026-08-27 · Cursor ALS más pequeño

- Reducido el cursor de marca a 36 px para una presencia visual más discreta.
- El isotipo interno quedó en 21 px y conserva el aro orbital, halo y alineación al puntero.

## 2026-08-27 · Fondo generativo y cursor ALS

- Añadida una constelación de nodos y líneas orbitales con halo reactivo al puntero.
- Añadido un puntero de escritorio con el isotipo ALS, oculto en táctil y con movimiento reducido.
- Se mantiene el fallback accesible y el rendimiento acotado con requestAnimationFrame y máximo 44 nodos.

## 2026-08-27 · Captura Hachi actualizada

- Reemplazada la captura vacía en estado Cargando por una captura fiel del hero de Hachi & Grecia Spa.
- Se conserva el nombre, la etiqueta del carrusel, la tarjeta clicable y el enlace directo a la demo.
- Verificada en la landing local con el logo central y la navegación visibles.

## 2026-08-27 · Portfolio completo

- El carrusel del inicio y la grilla ahora muestran 19 proyectos públicos.
- Se excluyeron exactamente los 7 repositorios solicitados.
- Se tomaron capturas con Chromium: demos públicas cuando estuvieron disponibles y páginas de GitHub como respaldo verificable.
- Los puntos del carrusel se pueden desplazar horizontalmente para elegir entre todos los proyectos.


## 2026-08-27 · Tarjetas de proyectos directas

- La grilla usa dos columnas equilibradas y visuales 16:10 de mayor tamaño.
- Cada tarjeta completa abre directamente el proyecto correspondiente.
- Retirados los textos internos Demo y Código para reducir ruido visual.


## 2026-08-27 · Mini brief de contacto

- El bloque final ahora incluye una selección interactiva de tipo de proyecto.
- El resultado y el mensaje de WhatsApp se actualizan según la opción elegida.
- El layout aprovecha el espacio disponible con un panel oscuro de acción.


## 2026-08-27 · Carrusel directo

- Carrusel enderezado y controles manuales anterior/siguiente con puntos seleccionables.
- Se conserva el avance automático cada 2.6 segundos y se pausa al interactuar.
- Retirados Jobsite Jedi, SurtiFácil, Donaciones Venezuela y la portada ALS del carrusel/proyectos destacados.


## 2026-08-27 · 24fbf07

- Añadidas capturas de las 9 demos/proyectos públicos en assets/projects/.
- El hero rota la portada de marca y las capturas de proyectos cada 2.6 segundos.
- Las tarjetas muestran capturas reales con zoom suave al pasar el cursor.
- Eliminado el chip construir mejor.
- La marquesina pasó de 28s a 14s.
- Favicon SVG y entrypoint index.html se mantienen activos.

## Rollback

Si una publicación falla, revertir al commit anterior estable y volver a hacer push:

git revert 24fbf07

Después, verificar https://alsdevstudio.vercel.app/ y el estado del despliegue en Vercel.

## 2026-08-27 · Contacto más claro y accionable

- Reescrita la propuesta de valor para pasar de una idea suelta a un producto que avanza.
- Añadidos tres micro pasos que explican cómo empieza la conversación.
- Compactadas las opciones del mini brief y refinados sus textos para escanear mejor.
- Ajustados el espaciado, la proporción de columnas, el CTA y el foco visible del selector.

## 2026-08-27 · Proyectos visibles sin espera

- La grilla de proyectos ya no depende de una animación de entrada global para hacerse visible.
- Las tarjetas aparecen de inmediato y sus capturas continúan con carga diferida.

## 2026-08-27 · Barra de navegador fuera del encuadre

- Ajustado el object-position de la captura de Mundo Celular para que no se muestre la barra vertical incrustada en el screenshot.

## 2026-08-27 · Dashboard de PintuMaster

- Reemplazada la captura de login por la vista dashboard entregada para PintuMaster.
- Conservadas la tarjeta, la ruta del asset y el enlace público del proyecto.

## 2026-08-27 · Domicilios y Los más TOP

- Reemplazada la captura de Coctels OPS por la vista entregada con domicilio y productos destacados.
- Conservadas la tarjeta, la ruta del asset y el enlace público del proyecto.

## 2026-08-27 · Presupuesto y compras

- Reemplazada la captura de Mercado Inteligente por la vista de presupuesto diario y registro de compra.
- Conservadas la tarjeta, la ruta del asset y el enlace público del proyecto.

## 2026-08-27 · Acentos corregidos

- Reparados textos con codificación dañada para que los acentos se rendericen correctamente en la interfaz y la documentación.

## 2026-08-27 · Encuadre completo de PintuMaster

- Ajustada la proporción visual de la tarjeta para mostrar la captura panorámica del dashboard sin recortes laterales.

## 2026-08-27 · Firma interactiva ALS

- Elevada la jerarquía tipográfica y el sistema de estados de navegación, botones, capacidades y proceso.
- Añadidos progreso de lectura, botones magnéticos y halos direccionales en tarjetas para una interacción más expresiva.
- Añadidas animaciones de gradiente, escaneo de paneles y microseñales de hover respetando prefers-reduced-motion.

## 2026-08-27 · Mapa global interactivo

- Añadida una sección de alcance global con mapa SVG estilizado y siete puntos de conexión.
- Añadidas rutas luminosas desde Colombia, selección sincronizada, mensajes contextuales y rotación automática.
- Actualizada la navegación y numeración de secciones para integrar la nueva narrativa.

## 2026-08-27 · Atlas global refinado

- Rehecha la composición del mapa para mejorar la lectura geográfica, la distribución del espacio y la sensación de red internacional.
- Mantienen su funcionamiento los puntos interactivos, las rutas animadas y la selección contextual.

## 2026-08-27 · Mapa geográfico real

- Sustituida la silueta geométrica por un mapa mundial fiel a la referencia visual entregada.
- Conservadas la capa interactiva de rutas, los marcadores, la selección y las animaciones.

## 2026-08-28 · Refinamiento del mapa global

- Recalibradas las rutas y ubicaciones sobre la geografía real del mapa.
- Ajustada la escala, el contraste y la composición del panel para que el mapa tenga más presencia visual.
- Añadida una leyenda contextual y refinamiento responsive.

## 2026-08-28 · Países destacados en el mapa

- Añadidas fronteras nacionales vectoriales basadas en Natural Earth 1:110m y resaltado visual para los siete países y territorios conectados.
- Retirada la silueta raster anterior y excluida la Antártida para mantener un encuadre mundial limpio.
- Corregida la ambigüedad entre Colombia y Venezuela con marcadores separados y selección contextual.

- Fuente cartográfica: fronteras Natural Earth 1:110m, distribuidas como datos públicos.

## 2026-08-28 · Composición de alcance global

- Equilibrada la altura de la columna de introducción y el panel cartográfico.
- Convertido el espacio visual sobrante en un bloque contextual de red activa.
- Añadida una línea de escaneo sutil con compatibilidad para movimiento reducido.

## 2026-08-28 · Consola inferior del mapa

- Integrados foco activo y coordenadas en una sola tarjeta contextual.
- Añadida sincronización dinámica de coordenadas por ubicación.
- Reorganizada la señal global como panel complementario con una ruta visual de siete nodos.

## 2026-08-28 · Rotación y balance del mapa

- Restaurada la rotación automática al retirar la pausa global por hover.
- La selección manual reinicia el ciclo de 4,2 segundos.
- Reubicadas las tarjetas de países bajo ambas columnas y compactado el panel cartográfico.

## 2026-08-28 · Tarjetas de proyectos alineadas

- Igualada la altura visual de PintuMaster con Coctels OPS y el resto de la cuadrícula.
- Conservado el encuadre completo de la captura con comportamiento responsive.

## 2026-08-28 · Países integrados en la columna del mapa

- Reubicados los siete selectores de países dentro del espacio libre de la introducción global.
- Compactada la cuadrícula sin perder selección, rotación automática ni accesibilidad de las descripciones.
- Añadida una distribución específica para escritorio, tableta y móvil.
