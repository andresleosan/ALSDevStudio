# Stack — ALS DevStudio

## Estado actual
- HTML5 estático en `index.html`.
- CSS externo en `styles/main.css` y JavaScript vanilla externo en `scripts/main.js`.
- Assets de marca en `assets/brand/`.
- Sin base de datos, API ni secretos.

## Nivel
Nivel 1 — landing/portafolio. El workflow completo de Superpowers y las pruebas de nivel 3 no aplican. Sí aplican responsive, accesibilidad básica, seguridad de contenido estático y verificación real en navegador cuando esté disponible.

## Identidad visual (Design DNA)

### Referencias consultadas
- Infia Studios: portafolio como casa digital y playground interactivo.
- Studio Parallel: casos de estudio anclados en problema, solución y resultado.
- Pravile Software Studio: portafolio de software con interacción y exploración por capacidades.

### Decisiones
- **Paleta:** azul tinta `#071a2f` para profundidad y confianza; blanco niebla `#f5f8fb` para lectura; azul ALS `#1364c4` para tecnología y enlaces; verde solución `#62c798` para acciones y estados positivos; gris pizarra `#536477` para metadata.
- **Tipografía:** `Space Grotesk` para titulares geométricos y `DM Sans` para lectura continua; `IBM Plex Mono` para etiquetas de sistema y datos técnicos.
- **Layout:** una narrativa editorial con una órbita visual que conecta marca, servicios y proyectos; las tarjetas funcionan como módulos de producto, no como una grilla decorativa.
- **Firma:** el “ALS orbit” — una línea orbital que sigue el puntero en escritorio y una constelación estática en móvil, conectando la idea con la solución.
- **Tono:** técnico, directo, humano.
- **Evitar:** el coral heredado de Santel, bloques de agencia genéricos y numeración decorativa sin significado.

### Hero y carrusel responsive — OPT-01 / OPT-02
- **Composición:** la captura permanece limpia dentro de una superficie 16:10; nombre, contador, controles y CTA viven en un footer editorial oscuro que forma parte del flujo del `figure`.
- **Interacción:** controles HTML nativos, visibles y de al menos 44×44 px; contador sincronizado, pausa persistente durante la sesión, navegación anterior/siguiente, teclado y swipe con alternativa de un solo puntero.
- **Accesibilidad:** sin patrón ARIA de tabs; una sola diapositiva activa en el árbol accesible y una región de estado exclusiva para cambios iniciados por el usuario.
- **Responsive:** entre 320 y 430 px, acciones y metadata usan composiciones explícitas en lugar de depender de `flex-wrap`; la órbita se conserva como firma decorativa detrás del card.
- **Movimiento:** autoplay más lento y suspendido al perder visibilidad, hover o foco; `prefers-reduced-motion` impide su inicio. La estrategia estática del canvas móvil continúa pendiente de OPT-05.

### Imágenes responsive y carga progresiva — OPT-03
- **Derivados:** cada una de las 15 capturas publicadas conserva su fuente original como fallback y añade variantes AVIF y WebP de 480, 768 y 1200 px en `assets/projects/responsive/<ancho>/` sin recorte ni cambio de proporción. Siete fuentes que contenían JPEG bajo extensión `.png` se renombran a `.jpg` sin recomprimir para corregir el MIME.
- **Codificación:** AVIF calidad 62/esfuerzo 6 y WebP calidad 80/esfuerzo 6 con preset para texto; se elimina metadata no necesaria y se preserva el detalle de interfaces.
- **Selección:** hero y galería usan `picture`, `srcset`, `sizes` y dimensiones intrínsecas; AVIF tiene prioridad, WebP es la segunda opción y la fuente original (PNG/JPEG) queda como fallback. Un listener temprano degrada por etapas AVIF → WebP → original ante fallos HTTP o de decodificación.
- **Carga inicial:** el primer slide es descubrible por el parser, `eager` y `fetchpriority="high"`; JavaScript hidrata únicamente el slide activo y su sucesor. Los otros 13 mantienen un placeholder local hasta ser activos o sucesores.
- **Galería:** las tarjetas conservan `loading="lazy"`, `decoding="async"` y prioridad baja con sus fuentes responsive declaradas desde HTML; no dependen del carrusel para cargarse.

## Verificación
- Sintaxis y referencias locales con PowerShell.
- Prueba visual manual en navegador local si el navegador conectado está disponible.
