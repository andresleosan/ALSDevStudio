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
