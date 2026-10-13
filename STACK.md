# Stack — ALS DevStudio

## Estado actual
- HTML5 estático en `index.html`.
- CSS externo en `styles/main.css`, organizado por secciones numeradas.
- JavaScript vanilla en módulos ES: `scripts/main.js` es el punto de entrada y cada sección vive en `scripts/modules/`. Con `@ts-check` y JSDoc; `jsconfig.json` permite `tsc` en modo estricto sin build.
- Assets de marca en `assets/brand/`, incluido `world-map.svg` que se inyecta con `fetch`.
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
- **Firma:** el “ALS orbit” — un anillo orbital inclinado en 3D que sigue el puntero en escritorio y se inclina con el scroll y el giroscopio en móvil, conectando la idea con la solución.
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

### Capa de profundidad 3D — DEPTH-01
- **Principio:** la profundidad la aporta el CSS (`perspective`, `transform-style:preserve-3d`, variables `--tilt-*`, `--rx`, `--ry`, `--px`, `--py`); el JavaScript solo escribe números. Sin librerías, porque la CSP es `script-src 'self'`.
- **Escritorio:** inclinación y brillo especular siguiendo el puntero, parallax de los chips de profundidad, órbita magnética y botones magnéticos.
- **Móvil y tablet:** inclinación dirigida por el scroll (cada bloque gira según su distancia al centro del viewport) y por el giroscopio. Android concede el permiso solo; iOS lo exige tras un gesto, por eso existe el botón «3D» del hero.
- **Límites:** todo se apaga con `prefers-reduced-motion`. Los bloques con `overflow:hidden` usan `transform-style:flat` para no romper el recorte, y la órbita lleva `pointer-events:none` para no capturar clics.

### Previsualización en vivo — LIVE-01
- **Principio:** la captura estática nunca se retira. Es lo que pinta el LCP, lo que se ve mientras el iframe carga y el respaldo si el sitio no se deja embeber.
- **Cuándo se monta:** en cuanto la tarjeta entra en pantalla, sin esperar al puntero. Tope de marcos simultáneos: 4 en escritorio y 2 en táctil, priorizando las más cercanas al centro del viewport y siempre la señalada por el puntero o el foco. Los montajes se escalonan 200 ms.
- **Cuándo se desmonta:** al salir de pantalla, al quedar fuera del cupo, al filtrar proyectos, al ocultarse la pestaña o al apagar el interruptor.
- **Encuadre:** el iframe se renderiza a 1440×900 y se escala con `transform:scale(--live-scale)`. Las capturas estáticas se generan al **mismo** viewport 1440×900, así que llenan la tarjeta sin barras y el relevo de captura a marco vivo es imperceptible.
- **Alcance:** las tarjetas de proyecto y la diapositiva activa del carrusel del hero. En el hero solo hay un marco a la vez y se espera 900 ms antes de montarlo; con la rotación automática cada 6 s, un sitio lento puede no llegar a mostrarse antes del siguiente cambio.
- **Regenerar las capturas:** hay un job semanal (`.github/workflows/capturas.yml`) y se puede lanzar a mano desde Actions. Para hacerlo en local: `npm ci && npx playwright install chromium` dentro de `.github/capturas/`, y después `node .github/capturas/capturar.mjs [--solo clave1,clave2]` desde la raíz. La herramienta vive fuera de la raíz a propósito: un `package.json` en la raíz haría que Vercel intentara compilar el sitio.
- **Cómo se generan:** Playwright a 1440×900 con `deviceScaleFactor: 2` y `reducedMotion: 'reduce'`, esperando a `networkidle`, a las fuentes y a que decodifiquen las imágenes diferidas; después sharp produce la base `.jpg` y las variantes AVIF/WebP a 480, 768 y 1200. Hay que rehacerlas cuando un proyecto cambie de diseño, o la tarjeta mostrará el estado antiguo hasta que cargue el marco vivo.
- **Contención:** `inert`, `aria-hidden`, `tabindex="-1"`, `pointer-events:none`, `sandbox="allow-scripts allow-same-origin"`, `allow=""` y `referrerpolicy="no-referrer"`.
- **Coste:** se respeta `prefers-reduced-data` y el ahorro de datos del sistema, y hay un interruptor visible con preferencia persistida.
- **Requisito por proyecto:** el sitio embebido no puede responder `X-Frame-Options` ni `frame-ancestors` restrictivo, y su origen debe estar en el `frame-src` de `vercel.json`. Los que no cumplen se marcan con `data-live="off"`.

### Ampliación del portafolio — 2026-10-12
- Se conserva el diseño actual y la cuadrícula de dos columnas; Hampton Estates sigue a BPT. Dialon y Vigia se añaden juntos al final, en la categoría Producto, con una etiqueta textual «En construcción».
- Galería y carrusel comparten los 18 proyectos y capturas responsivas del pipeline existente.
- BPT (`X-Frame-Options: SAMEORIGIN`, `frame-ancestors 'self'`) y Vigia (`frame-ancestors 'none'`) rechazan el embebido: usan `data-live="off"`, captura estática y enlace externo. Hampton Estates y Dialon se autorizan explícitamente en `frame-src`.

## Verificación
- Sintaxis y referencias locales con PowerShell.
- Prueba visual manual en navegador local si el navegador conectado está disponible.

### PRIV-01 — Privacidad por defecto — 2026-10-12
- Sustituye LIVE-01: se retiran marcos embebidos, inicializador y control; CSP frame-src none. Se conservan capturas locales y enlaces explícitos.
- Tipografías locales en assets/fonts con OFL y SOURCES.json; CSP restringida a estilos y fuentes propios. Referrer-Policy no-referrer.
- Sin analítica ni banner nuevo: se eliminan tecnologías opcionales. Solo preferencia de pausa por sesión tras elección; scripts/privacy.js elimina preferencia antigua y permite restablecer preferencias.
- Políticas y registro de pendientes en docs/legal y docs/PRIVACIDAD-Y-CUMPLIMIENTO.md. Sin despliegue autorizado.

### Correo de contacto — 2026-10-13
- Fila de correo en la columna introductoria, debajo de los pasos; conserva tipografía, colores y distribución del bloque actual. Enlace mailto nativo, sin formulario, JavaScript ni servicios adicionales.
- Dirección visible con salto permitido antes de @, objetivo de al menos 44 px y foco azul sobre fondo claro. Verificar teclado y anchos de 320 a 1440 px.

### Refinamiento visual con Antislop y Mobbin · 2026-10-13
- Lectura: portafolio de desarrollo independiente para empresas y particulares, con el lenguaje geométrico de ALS. ENERGY 2 / RHYTHM 2 / MOTION 3; profundidad reservada a la escena de marca y al mapa, controles y contenido estables. Movimiento reducido conserva acceso completo.
- Paleta: tinta y blanco existentes para lectura; verde para acciones y selección; azul para foco sobre blanco. Se sustituye el degradado del titular por un color sólido para estabilizar su contraste.
- Tipografía: se mantienen Space Grotesk en titulares y DM Sans en texto, vinculadas a la identidad ya adoptada; IBM Plex Mono queda en referencias breves, sin exagerar espaciado ni convertir párrafos en consola.
- Galería: dos columnas de capturas con texto fuera del marco, para que la evidencia del trabajo tenga prioridad sobre las superficies decorativas. Se conserva el orden requerido de proyectos y las fuentes responsive.
- Proceso: filas con fase, objetivo y explicación, para mostrar una secuencia real sin repetir la composición de la galería.
- Contacto: invitación breve, correo visible y opciones de servicio en filas con estado de selección explícito. Se conserva el aviso de privacidad y la acción WhatsApp existente.
- Motivo de identidad: órbita original en la portada; se retiran chips superpuestos y capas redundantes sobre la captura. La flecha indica apertura de un enlace, no selección de servicio.
- Referencias consultadas por MCP: [Büro](https://mobbin.com/sites/sections/2c741505-173b-4cfa-a885-ca4429184887), [Cloudstudio](https://mobbin.com/sites/sections/48890788-7d16-4887-baaa-5b22583ef055), [basement.studio](https://mobbin.com/sites/sections/a2f3898a-cd70-4d7d-b549-5f5dbb5a9fa6). Se toman criterios de jerarquía y presentación, sin copiar assets ni diseños completos.
- Antislop leído desde miqdadbadjuber/anti-slop, commit 9685ca7eac70283d083fc23baa9a88e7d3cd93c4. Lectura de archivos de referencia; sin ejecutar instaladores ni modificar reglas globales.

### Mascota ALS · 2026-10-13
- Mascota junto a la firma de la portada y en la introducción del contacto, dentro del flujo del documento. Sin dependencias, conexiones externas ni JavaScript adicional.
- Imágenes locales con dimensiones reservadas, bordes pixelados y proporción original. Uso decorativo junto a contenido equivalente: texto alternativo vacío, sin foco ni acciones implícitas.
- Prioridad de carga baja en portada y carga diferida en contacto; tamaños reducidos en móvil. Conservar el logo de navegación y los controles existentes.

### Release de diseño y mascota · 2026-10-13
- Push solicitado expresamente por el titular. La release incluye diseño, PNG transparentes, fuentes locales, eliminación de vistas externas y cabeceras restrictivas.
- Los borradores legales, sus enlaces y el control de restablecimiento aún no se publican. La versión de producción de scripts/privacy.js solo elimina la preferencia antigua de vistas externas.
- Notas y reversión: `docs/RELEASE-DESIGN-MASCOT.md`. No hay migraciones, servicios nuevos ni cambios de identidad Git.
