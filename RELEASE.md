# Release — ALS DevStudio

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
