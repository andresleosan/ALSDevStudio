# Tareas — ALS DevStudio

- [x] Auditoría de landing heredada y definición de alcance.
- [x] Consulta de assets de marca en `F:\Proyectos\ALS DevStudio\Img`.
- [x] Consulta pública de repositorios y demos de `andresleosan`.
- [x] Definir Design DNA en `STACK.md`.
- [x] Implementar rebranding, portafolio curado e interacciones.
- [x] Verificar sintaxis, rutas de assets, responsive y reduced motion.
- [x] Auditoría final de seguridad y QA con evidencia.

## Evidencia de cierre
- `node --check` sobre el JavaScript embebido: PASS.
- Validación de landing y assets: HTML publicado en Vercel `200`; 9 capturas de proyecto y 2 assets de marca presentes.
- Conteo verificado: 6 proyectos con imagen, 4 filtros, 6 slides de proyectos en el hero, marquesina a 14s y 20 enlaces externos seguros.
- Escaneo de seguridad estática: PASS sin secretos, `javascript:` ni `target="_blank"` sin `noopener`.

- [x] Refinar carrusel: logo de navegación, proporción de capturas, contacto por WhatsApp y limpieza del correo temporal.

## QA de esta iteración
- JavaScript embebido: sintaxis PASS.
- 6 tarjetas y 6 capturas verificadas; proporción 16:10 y altura mínima 420px.
- 15 enlaces externos seguros, cero URLs javascript: y correo temporal ausente.

- [x] Rediseñar contacto como mini brief interactivo con mensajes dinámicos de WhatsApp.

## QA de esta iteración
- JavaScript embebido: sintaxis PASS.
- Mini brief con 3 opciones, mensaje dinámico y enlace al +57 314 643 2135.
- Correo ausente; 15 enlaces externos conservan rel="noopener"; cero URLs javascript:.

- [x] Rediseñar proyectos con dos columnas equilibradas, capturas grandes y tarjetas completas clicables.

## QA de esta iteración
- JavaScript embebido: sintaxis PASS.
- 6 tarjetas con imagen y enlace directo a cada proyecto.
- Cero textos Demo/Código dentro de las tarjetas; 9 enlaces externos seguros.

- [x] Incorporar los 19 proyectos públicos restantes, excluyendo exactamente HTML-CSS, layoutresponsive, prueba2, ejercicio-react, performai, Analista y Fullstack-Challenge---E-commerce.

## QA de esta iteración
- 19 capturas de Chromium integradas en el carrusel inicial y la grilla.
- 19 tarjetas completas clicables; capturas de GitHub usadas solo cuando no existe demo pública verificada.

- [x] Validar y limpiar la sección de proyectos: retirar Cronos, ALS DevStudio y las demos sin sitio publicado; usar capturas web verificadas y enlaces directos a demos.

## QA de esta iteración
- `node --check` sobre el JavaScript embebido: PASS.
- 15 tarjetas y 15 slides visibles; 0 overlays `project-code`/`project-type`; 0 destinos GitHub en tarjetas.
- 15 assets locales verificados; 6 capturas web regeneradas desde demos públicas.
- 15 destinos web comprobados con HTTP 200; SurtiFacil y Coctelsops-F- se excluyeron porque sus demos declaradas respondieron HTTP 404.
- Auditoría estática: sin URLs `javascript:`, sin secretos nuevos y enlaces externos con `rel="noopener"`.

- [x] Consolidar la entrada única de la landing en `index.html` y retirar el HTML duplicado del repositorio.

## QA de esta iteración
- Hash SHA256 de ambos HTML idéntico antes de la eliminación.
- `STACK.md` actualizado; no quedan referencias al archivo eliminado.
- `node --check`, auditoría estática y comprobación de enlaces ejecutadas con PASS.

- [x] Actualizar captura web de Hachi Grecia Spa y conservar su enlace directo a la demo.

## QA de esta iteración
- Web `https://hachi-greciaspa.vercel.app/`: HTTP 200.
- Captura reemplazada: `assets/projects/hachi-greciaspa.png`, 2560×1600.
- `node --check`, auditoría estática y `git diff --check`: PASS.

- [x] Mejorar la captura de Hachi Grecia Spa para mostrar el hero real con logo central y navegación visible.

## QA de esta iteración
- Asset PNG actualizado en assets/projects/hachi-greciaspa.png, 1657×949.
- Carrusel local verificado: la captura se carga, el slide cambia a Hachi y la etiqueta Hachi Grecia Spa / pet care aparece correctamente.
- Tarjeta de proyecto verificada en el DOM con enlace directo a https://hachi-greciaspa.vercel.app/.
- Consola del navegador local: 0 errores.

- [x] Añadir fondo generativo reactivo y puntero personalizado con el logo ALS.

## QA de esta iteración
- node --check sobre el JavaScript embebido: PASS.
- Navegador local: canvas de fondo activo a 1680×949, puntero ALS visible en puntero fino y logo cargado desde favicon.svg.
- Interacción verificada: el puntero actualiza su posición, el fondo responde con halo y la landing conserva su navegación.
- prefers-reduced-motion: la rama estática evita la animación y desactiva el cursor personalizado.
- Consola del navegador local: 0 errores.
- Seguridad del código nuevo: sin eval, red, almacenamiento, cookies ni secretos.

- [x] Reducir el puntero personalizado con el isotipo ALS manteniendo su posición centrada.

## QA de esta iteración
- Puntero ALS reducido de 46×46 px a 36×36 px; isotipo de 28×28 px a 21×21 px.
- Navegador local: cursor visible con puntero fino, centrado y cargando favicon.svg; fondo reactivo continúa activo.
- prefers-reduced-motion y fallback táctil conservados.
- node --check: PASS; consola del navegador local: 0 errores.

- [x] Actualizar las vistas de Mercado Inteligente, PintuMaster y Coctels OPS con las capturas entregadas.

## QA de esta iteración
- Assets reemplazados: mercadointeligente.png, pintumaster.png y coctelsops.png.
- Carrusel y tarjetas reutilizan las rutas existentes; no se modificaron enlaces externos.
- Se actualizaron nombres y textos alternativos para Mercado Inteligente y Coctels OPS.

- [x] Priorizar el orden visual de proyectos solicitado en carrusel y galería.

## QA de esta iteración
- Primeros seis en carrusel y galería: Multiogar, tecnifullgas, BPT-Jersey, SiliconeSolutions, La Parada y The Coco Club.
- El resto conserva su orden relativo después de ese bloque prioritario.
- Enlaces, categorías, imágenes y filtros se mantienen sin cambios funcionales.

- [x] Retirar efectos decorativos de las capturas del portafolio.

## QA de esta iteración
- Eliminados los aros decorativos superpuestos sobre las capturas.
- Eliminados el zoom y el filtro de imagen al pasar el cursor; las interfaces permanecen fieles a sus capturas.
- La navegación, los enlaces y los filtros de proyectos permanecen intactos.

- [x] Ajustar el segundo bloque prioritario después de The Coco Club.

## QA de esta iteración
- Después de The Coco Club aparecen: Mundo Celular, Hachi Grecia Spa, PintuMaster y Coctels OPS.
- Los proyectos restantes conservan su orden relativo después del bloque prioritario.

- [x] Separar CSS y JavaScript del HTML y ordenar la estructura de recursos.

## QA de esta iteración
- `index.html` conserva únicamente la estructura y enlaza `styles/main.css` y `scripts/main.js`.
- CSS y JavaScript extraídos sin cambios funcionales; assets existentes permanecen en `assets/brand` y `assets/projects`.
- Estructura final: `index.html`, `styles/main.css`, `scripts/main.js` y `assets/`.

- [x] Añadir imagen social Open Graph y metadatos de preview para compartir ALS DevStudio.

## QA de esta iteración
- Imagen social generada en assets/brand/og-image.png con tamaño 1200×630 px.
- Añadidos metadatos og:*, twitter:* y canonical con la URL pública de ALS DevStudio.
- La imagen utiliza la identidad visual de la portada ALS y está optimizada como PNG.

- [x] Rediseñar el mini brief de contacto con rutas de Landing page, tienda virtual y solución web.

## QA de esta iteración
- Las opciones 01, 02 y 03 ahora representan Landing page, Tienda virtual y App o solución web.
- Cada ruta tiene copy propio y actualiza el mensaje de WhatsApp mediante data-message.
- Se añadió aria-pressed para comunicar la selección a tecnologías asistivas.

- [x] Refinar la sección de contacto y el mini brief para mejorar jerarquía, espaciado y conversión.

## QA de esta iteración
- El contacto ahora comunica una promesa más concreta y muestra tres pasos de inicio para reducir fricción.
- El mini brief usa títulos más escaneables, CTA más directo y una proporción de columnas con mejor balance visual.
- Añadido foco visible al selector y role region al panel para conservar una interacción accesible.
- QA real: node --check scripts/main.js PASS; git diff --check PASS; 36 referencias locales verificadas sin faltantes; sin eval, almacenamiento local, red nueva ni secretos en los archivos tocados.

- [x] Mostrar proyectos sin retraso al entrar en la sección.

## QA de esta iteración
- Retirado el atributo data-reveal del contenedor global de proyectos para evitar que toda la grilla permanezca invisible mientras espera al IntersectionObserver.
- Las imágenes mantienen loading lazy y decoding async para cargar progresivamente sin bloquear la aparición de las tarjetas.

- [x] Ocultar barra incrustada en la captura de Mundo Celular.

## QA de esta iteración
- El encuadre de Mundo Celular ahora prioriza la esquina superior izquierda y deja fuera la barra del navegador incluida en el screenshot.
- No se modificaron el enlace, el asset original ni el comportamiento global de las tarjetas.

- [x] Actualizar captura de PintuMaster con el dashboard entregado.

## QA de esta iteración
- Reemplazado assets/projects/pintumaster.png conservando la ruta usada por la tarjeta.
- La captura muestra el dashboard de PintuMaster y mantiene el enlace público del proyecto.

- [x] Actualizar captura de Coctels OPS con la vista de domicilio y Los más TOP.

## QA de esta iteración
- Reemplazado assets/projects/coctelsops.png conservando la ruta consumida por la tarjeta.
- La nueva captura muestra la navegación, el bloque de domicilio y la sección de productos destacados.

- [x] Actualizar captura de Mercado Inteligente con la vista de presupuesto y compras.

## QA de esta iteración
- Reemplazado assets/projects/mercadointeligente.png conservando la ruta consumida por la tarjeta.
- La nueva captura muestra Presupuesto diario y Registrar compra, con el enlace del proyecto intacto.

- [x] Corregir acentos dañados por codificación incorrecta.

## QA de esta iteración
- Corregidos los textos de Mercado Inteligente, AUDITORIA.md y tasks.md.
- Escaneo UTF-8 sobre archivos de texto: 0 coincidencias de mojibake; node --check PASS y git diff --check PASS.

- [x] Corregir encuadre de PintuMaster para mostrar el dashboard completo.

## QA de esta iteración
- La tarjeta respeta la proporción panorámica real de la captura y evita cortar el dashboard lateralmente.
- El ajuste es específico de PintuMaster; las demás tarjetas mantienen su proporción visual.

- [x] Elevar el lenguaje visual e interactivo de la landing completa.

## QA de esta iteración
- Refinada la jerarquía tipográfica y el contraste de selección/hover sin cambiar la identidad documentada.
- Añadida barra de progreso de lectura, navegación activa subrayada, botones magnéticos y halo direccional para tarjetas.
- Añadidas microinteracciones en capacidades, proceso y hero; las capturas no reciben zoom ni filtros invasivos.
- Conservado el fallback de prefers-reduced-motion; seguridad, sintaxis y referencias validadas con resultado limpio.

- [x] Crear mapa global interactivo para representar el alcance internacional de ALS.

## QA de esta iteración
- Añadida la sección 01 / alcance global con Estados Unidos, México, Colombia, Venezuela, Brasil, España y Jersey.
- Los puntos del mapa y los botones laterales comparten selección, estado accesible y mensaje contextual.
- Añadidas rutas animadas, pulsos de ubicación, rotación automática pausada al interactuar y soporte de teclado.

- [x] Rediseñar composición del mapa global para mejorar reconocimiento y balance visual.

## QA de esta iteración
- Sustituida la geometría rígida por una composición horizontal con continentes curvos y distribución más equilibrada.
- Conservados los 7 marcadores, las 6 rutas, la selección interactiva y el soporte de teclado.

- [x] Usar mapa geográfico real como base visual del alcance global.

## QA de esta iteración
- Añadido assets/brand/world-map.png con continentes reconocibles y fondo transparente.
- Sustituida la geometría SVG manual por el asset geográfico, conservando rutas, marcadores y selección interactiva.

- [x] Recalibrar el mapa con coordenadas geográficas y una composición más clara para las conexiones globales.
- Rutas y marcadores alineados con la nueva base geográfica.
- Panel del mapa ajustado para reducir espacio vacío y mejorar jerarquía visual.
- Añadida leyenda de conexiones verificadas y soporte responsive para el nuevo layout.
- Cada país cuenta ahora con una frontera vectorial real, un resaltado visible y un nombre completo para el punto seleccionado.
- La base cartográfica usa fronteras nacionales locales y excluye la Antártida del encuadre visual.
- Recompuesta la sección para eliminar el vacío inferior, añadir una señal contextual y reforzar la animación de red activa.

- [x] Unificar foco activo, coordenadas y señal global en una consola compacta del mapa.

## QA de esta iteración
- Coordenadas sincronizadas con los siete países y territorios activos.
- Consola responsive en dos columnas y una columna en móvil.
- Línea de nodos decorativa compatible con movimiento reducido.

- [x] Restaurar la rotación automática de países y compactar el espacio bajo el mapa.

## QA de esta iteración
- Eliminada la pausa por hover de toda la sección; la rotación continúa mientras el mapa está visible.
- La interacción manual reinicia el ciclo automático y el foco de teclado conserva la pausa accesible.
- Las ubicaciones pasan a una franja inferior compartida para equilibrar ambas columnas.
- [x] Igualar la tarjeta de PintuMaster con la altura visual de Coctels OPS.

## QA de esta iteración
- PintuMaster usa la misma proporción 16:10 y altura base que las demás tarjetas de proyecto.
- La captura conserva su encuadre completo mediante object-fit: contain y mantiene proporción fluida en móvil.
- Chrome headless: ambas tarjetas miden 579 × 477,625 px a 1280 px y 358 × 339,5 px a 390 px, sin desbordamiento horizontal.
- [x] Reubicar los países conectados dentro del espacio disponible de la columna izquierda del mapa.

## QA de esta iteración
- Chrome headless: la lista permanece dentro de .global-intro en escritorio, tableta y móvil, sin desbordamiento horizontal.
- Distribución verificada en 2 columnas a 1280 px, 4 columnas a 900 px y 2 columnas a 390 px.
- Selección sincronizada entre botón, país, marcador y etiqueta; rotación automática comprobada después de 4,4 segundos.

- [x] Actualizar la captura de La Parada e intercambiar su posición con Silicone Solutions en carrusel y galería.

## QA de esta iteración
- PNG adjunto aplicado byte a byte en `assets/projects/laparada.png`: 1626×952 px, SHA256 `888F0FDBA9F55BE9D589F37208E9F30C25CDF671647B4BD92C59706622C5C6C7`.
- Primeros seis del carrusel y la galería: Multiogar, Tecnifullgas, BPT-Jersey, La Parada, Silicone Solutions y The Coco Club.
- Chrome headless a 1238×912: BPT-Jersey y La Parada comparten la fila superior; Silicone Solutions ocupa la fila siguiente; las tres imágenes cargaron correctamente.
- `node --check scripts/main.js`, `git diff --check`, referencias locales y auditoría estática de enlaces/secretos: PASS.

- [x] Reemplazar la captura de La Parada por la versión final entregada.

## QA de esta iteración
- PNG final aplicado byte a byte en `assets/projects/laparada.png`: 1583×949 px, SHA256 `9821A8F4C7073F05DD7DAD6DEB0B755E4FFA17B56FF0B105214334CC60F59FCA`.
- Chrome headless a 1238×912: imagen cargada completamente con dimensiones naturales 1583×949; La Parada permanece en la posición 4 y Silicone Solutions en la 5.
- `node --check scripts/main.js`, `git diff --check`, referencias locales y auditoría estática de enlaces: PASS.

## Iteración pendiente — Optimización móvil, rendimiento, accesibilidad y descubrimiento

Orden de ejecución: OPT-01 → OPT-02 → OPT-03 → OPT-04 → OPT-05 → OPT-06. Ninguna tarea pasa a revisión o aprobación sin evidencia real de seguridad y QA.

- [x] **OPT-01 — Reestructurar el carrusel para móvil.**
  - **Alcance:** mover título, contador y controles fuera de la captura; añadir contador actual/total, controles anterior/pausa/siguiente de mínimo 44×44 px, swipe y CTA enlazado al proyecto activo.
  - **Aceptación:** cero solapamiento en 320, 360, 390 y 430 px; contador sincronizado con flechas, swipe, teclado y escritorio; pausa persistente y accesible; swipe sin bloquear el scroll vertical; CTA con URL verificada y protección `rel="noopener"`; escritorio sin regresiones.

- [x] **OPT-02 — Corregir altura, espaciado y wrapping del hero entre 320 y 430 px.**
  - **Dependencia:** OPT-01.
  - **Alcance:** recalibrar tipografía, gaps, metadata, CTA y altura de `.hero-visual` para adelantar el carrusel y hacer deliberados los cambios de línea.
  - **Aceptación:** borde superior del carrusel dentro del primer viewport móvil; espacio copy-carrusel máximo de 64 px; distribución estable en el barrido 320–430 px; cero recortes u overflow; Design DNA y jerarquía del H1 conservados.

### Evidencia de OPT-01 y OPT-02 — 2026-08-30

- Chrome headless/CDP: PASS en 320×568, 360×800, 390×844, 430×932, 768×1024 y 1440×900; cero overflow horizontal y cero solapamiento entre metadata, contador, controles y CTA.
- Barrido continuo 320–430 px cada 5 px: 23 anchos sin fallos; el carrusel comienza dentro del primer viewport móvil, el gap copy-carrusel es de 20 px y todos los controles miden al menos 44×44 px.
- Interacción: PASS para anterior/siguiente, `Home`, `End`, flechas de teclado, pausa/reanudación persistente, loop, swipe horizontal y conservación del scroll vertical; contador, nombre, región viva y CTA permanecen sincronizados.
- Movimiento reducido: autoplay detenido y control de pausa oculto; pausa ambiental verificada con foco, hover, visibilidad e intersección. La eliminación total del autoplay móvil continúa en OPT-05.
- Árbol accesible: una sola diapositiva del hero expuesta, 14 inertes y una única región viva; `axe-core` WCAG 2 A/AA y WCAG 2.2 AA en `.hero`: cero violaciones automáticas.
- Regresión técnica: `node --check scripts/main.js`, `git diff --check` sobre archivos propios, 47 referencias locales y consola/red del navegador: PASS, sin errores ni recursos fallidos. El único warning global es un espacio final del `SKILL.md` vendorizado de accesibilidad, preservado para mantener su hash de instalación.
- Revisión de seguridad: sin secretos, sinks de ejecución, entradas externas ni endpoints nuevos; el CTA reutiliza URLs internas existentes y conserva `rel="noopener noreferrer"`.

- [x] **OPT-03 — Implementar imágenes responsivas y carga progresiva.**
  - **Dependencia:** OPT-01; puede avanzar en paralelo con OPT-02 cuando la estructura sea estable.
  - **Alcance:** generar variantes AVIF/WebP de 480, 768 y 1200 px con fallback, dimensiones intrínsecas, `picture`, `srcset` y `sizes`; cargar solo la imagen activa y la siguiente.
  - **Aceptación:** primera imagen prioritaria; máximo dos imágenes del hero solicitadas inicialmente a 390 px; transferencia inicial de imágenes del hero no superior a 1,5 MiB con caché desactivada; cero imágenes rotas; encuadre útil sin recortar información esencial; galería inferior con lazy loading real.

### Evidencia de OPT-03 — 2026-08-30

- Pipeline: 45 AVIF y 45 WebP para 15 proyectos en 480, 768 y 1200 px; 90/90 derivados decodificados, con firmas, anchuras y proporciones válidas. Peso total generado: 1.816.752 bytes.
- HTML/SEO: 15 `picture` en hero y 15 en galería, 30 imágenes con `alt` y dimensiones intrínsecas, 110 referencias locales únicas y cero faltantes. Siete fuentes JPEG mal nombradas como PNG se corrigieron a `.jpg` sin recomprimir.
- Red fría a 390×844: de 15 solicitudes/9.229.146 bytes en el baseline a 2 AVIF/28.163 bytes en DPR 1; en DPR 3, 2 AVIF/100.897 bytes. Activa en `eager/high`, siguiente en `eager/low` y las otras 13 conservan placeholder sin URL de red.
- Carga progresiva: avanzar hidrata solo una imagen adicional; navegación `End` conserva contador y CTA correctos; antes de scroll no hay solicitudes exclusivas de la galería y, tras recorrerla, 15/15 imágenes tienen dimensiones naturales válidas.
- Resiliencia: bloqueo controlado de AVIF degrada a WebP; bloqueo de AVIF+WebP degrada a la fuente original tanto JPG como PNG. La misma recuperación fue verificada en galería, sin bucles ni imágenes rotas.
- Responsive/CDP: PASS en 320×568, 360×800, 390×844, 430×932, 768×1024 y 1440×900, además de 390×844 DPR 3; cero overflow horizontal, `object-fit: contain`, dos solicitudes iniciales y selección correcta de 480/768/1200. LCP de laboratorio entre 580 y 1.048 ms y CLS máximo 0,00003; no son métricas de campo.
- Regresión: `node --check` en ambos scripts, `git diff --check`, 45 firmas AVIF, 45 firmas WebP y `axe-core 4.13.0` WCAG 2 A/AA/2.2 AA en el hero: PASS, con cero violaciones.
- Seguridad: cero secretos o archivos sensibles rastreados, sinks de ejecución, entradas externas, endpoints o dependencias nuevas; el fallback solo acepta formatos permitidos y rutas declaradas en el HTML.

- [x] **OPT-04 — Corregir accesibilidad del carrusel, mapa, navegación y estados interactivos.**
  - **Dependencias:** OPT-01 y OPT-02.
  - **Alcance:** sanear árbol accesible, regiones vivas, contraste, navegación móvil, filtros, ubicaciones y progressive enhancement.
  - **Aceptación:** solo la slide activa expuesta; una sola región viva anuncia acciones del usuario; estados ARIA correctos; menú móvil operable con teclado y Escape, sin trampas de foco; recorrido completo por teclado; contraste normal mínimo 4,5:1; contenido utilizable sin JavaScript; estado inicial del mapa consistente.

### Evidencia de OPT-04 — 2026-08-30

- Menú móvil: `aria-expanded`, foco inicial en el primer enlace, cierre con `Escape` y retorno al botón; los enlaces siguen visibles sin JavaScript.
- Carrusel: una slide expuesta, 14 inertes y una sola región viva; filtros y capacidades sincronizan `aria-pressed`, `aria-selected`, `aria-controls` y `aria-labelledby`.
- Mapa: SVG visual no interactivo y lista de ubicaciones operable por teclado, sin controles anidados; estado inicial Estados Unidos consistente.
- Validación ejecutada: `node --check scripts/main.js`, `git diff --check`, axe WCAG 2 A/AA + WCAG 2.2 AA (0 violaciones), smoke Chromium de teclado/ARIA, barrido 320–430 px, movimiento reducido y navegación sin JavaScript.

- [x] **OPT-05 — Desactivar animación y autoplay innecesarios en dispositivos móviles.**
  - **Dependencias:** OPT-01 y OPT-04.
  - **Alcance:** hacer estático el canvas con puntero coarse, movimiento reducido o ahorro de datos; eliminar autoplay móvil y suspender trabajo fuera del viewport o con la pestaña oculta.
  - **Aceptación:** carrusel y mapa no avanzan automáticamente en móvil; canvas dibujado una sola vez; timers y `requestAnimationFrame` suspendidos cuando no corresponden; cambios de preferencia de movimiento aplicados sin recargar; firma orbital de escritorio conservada.

### Evidencia de OPT-05 — 2026-08-30

- Política de bajo consumo para viewport móvil, puntero grueso, `prefers-reduced-motion`, `prefers-reduced-data` y `navigator.connection.saveData`.
- Medición Chromium: móvil 390 px = 0 `requestAnimationFrame`, 0 intervalos activos, canvas oculto y control de pausa oculto; escritorio = 145 `requestAnimationFrame` en 700 ms y 1 intervalo del mapa al entrar en viewport.
- Cambio de preferencia sin recarga: el canvas pasó de 47 a 48 frames al activar movimiento reducido y luego reanudó hasta 77 al volver a `no-preference`; autoplay también se detiene.
- Validación: `node --check scripts/main.js`, `git diff --check` y axe WCAG 2/2.2 AA (0 violaciones): PASS. Revisión de seguridad sin secretos ni dependencias nuevas.

- [x] **OPT-06 — Mejorar casos de estudio, contacto, SEO técnico y cabeceras.**
  - **Dependencias:** OPT-01 y OPT-03; cualquier canal nuevo requiere confirmación del operador.
  - **Alcance:** enriquecer destacados con contexto verificable; añadir un canal alternativo confirmado; crear `robots.txt`, `sitemap.xml`, JSON-LD y configuración de cabeceras para Vercel.
  - **Aceptación:** problema, solución y alcance verificables por destacado; cero afirmaciones o datos inventados; WhatsApp operativo y canal alternativo confirmado; robots, sitemap, canonical y JSON-LD válidos; metadatos sociales completos; CSP compatible, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` y protección contra framing sin romper recursos.

### Evidencia de OPT-06 — 2026-08-30

- La galería mantiene los 15 destacados con descripciones de producto existentes, categoría y demo pública enlazada; el encabezado de la sección explicita el criterio de problema, solución y alcance sin publicar métricas no verificadas.
- Contacto verificado en navegador móvil: WhatsApp operativo y GitHub público (`andresleosan`) como canal alternativo documentado en `BRIEF.md`.
- `robots.txt`, `sitemap.xml`, canonical y JSON-LD (`Organization` + `WebSite`) validados por parseo; metadatos Open Graph/Twitter y `og:locale` presentes.
- `vercel.json` validado: `Content-Security-Policy` compatible con fuentes Google y recursos locales, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options` y `frame-ancestors`.
- QA real: servidor local respondió 200 para HTML, robots, sitemap y configuración; Playwright móvil sin errores de consola; axe WCAG 2/2.2 AA = 0 violaciones; `node --check` y `git diff --check`: PASS; barrido de secretos: limpio.

### Pruebas obligatorias de la iteración

- `node --check scripts/main.js` y `git diff --check`: PASS.
- QA en navegador a 320×568, 360×800, 390×844, 430×932, 768×1024 y 1440×900; barrido continuo de 320 a 430 px.
- Probar flechas, swipe, teclado, pausa, loop del carrusel, zoom al 200 %, movimiento reducido, touch/coarse, pestaña oculta y ejecución sin JavaScript.
- Inspeccionar árbol de accesibilidad, nombres, roles, estados, orden de foco y regiones vivas; ejecutar auditoría WCAG automatizada y revisión manual.
- Registrar una traza de red con caché desactivada: solicitudes, bytes, rutas, errores y LCP de laboratorio, sin presentarlo como Core Web Vitals de campo.
- Validar JSON-LD, sitemap, robots, canonical, metadatos, enlaces, secretos, afirmaciones y cabeceras en un preview autorizado.

### Restricciones y criterio de cierre

- Usar durante la implementación las skills `frontend-design`, `accessibility` y `seo`, además del ciclo `self-critique-loop` de Cronos.
- Mantener los 15 proyectos en la galería; el hero puede reducirse a una selección curada de 3 a 5.
- No publicar resultados, métricas, ubicaciones, testimonios ni canales de contacto sin evidencia o confirmación del operador, conforme a `BRIEF.md`.
- Documentar en `STACK.md` cualquier cambio al Design DNA o a la estrategia de animación antes de implementarlo.
- La iteración requiere evidencia real, cero hallazgos críticos de seguridad, cero regresiones, errores de consola, solicitudes fallidas, rutas rotas u overflow horizontal.
- No desplegar a producción sin aprobación explícita del operador.
