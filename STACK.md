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

### Publicación legal · 2026-10-13
- Documentos HTML estáticos y enlaces de contacto, sin agregar formulario, analítica ni proveedores nuevos. La política de cancelaciones se integra en términos.
- Al regresar a una portada conservada en memoria, el carrusel relee la preferencia de pausa para aplicar el restablecimiento efectuado en cookies.
- Dirección y NIT aportados para los HTML; reenvío Porkbun observado por DNS y destino Gmail/acceso exclusivo confirmados por el titular. Retención de consultas: revisión mensual y eliminación tras seis meses sin actividad, adoptada expresamente; otros documentos por necesidad legal/contractual y revisión al cierre. La configuración privada de proveedores mantiene sus límites de verificación.
- Gestión manual documentada en `docs/legal/OPERACION-Y-SOLICITUDES.md`; no se añade CRM, formulario ni envío automático. Canonical y sitemap para las tres páginas, enlaces legales y SIC, cancelaciones dentro de términos.

### Hover de proyectos · 2026-10-13
- Reutilizar el modo de puntero de `depth.js` para las tarjetas: inclinación máxima de 7 grados como en el efecto anterior, elevación de 8 px y brillo contenido en la captura. Una lectura de posición por frame para inclinación y brillo.
- Conservar galería, tipografía y contenido actuales. Activar solo en escritorio con puntero fino y movimiento permitido; limpiar variables y clases al cambiar de modo. Móvil, movimiento reducido y teclado conservan enlaces y foco estable. Sin dependencias, marcos externos ni almacenamiento nuevo.

### Recorrido automático del mapa · 2026-10-13
- Intervalo anterior de 4200 ms, con un solo temporizador. La API start/stop sigue coordinada por main.js y respeta pausa elegida en memoria, visibilidad, hover y lowPowerMotion. No guardar preferencias nuevas en el navegador.
- Botón nativo antes de la lista para pausar o reanudar. Elegir un país o enfocar sus controles detiene el recorrido hasta reanudación explícita. Solo las elecciones manuales se anuncian; los avances no mueven foco ni producen anuncios periódicos.
- Mantener animaciones decorativas del mapa desactivadas. Rotación solo mientras la sección es visible, en escritorio con movimiento permitido; en móvil y movimiento reducido se conserva la selección manual.

### Recorrido del proceso · 2026-10-13
- Tres etapas dentro de una superficie continua, conectadas por una línea de lectura. Ilustraciones SVG propias de conversación, construcción y revisión; su función es distinguir las fases reales del servicio. Lista ordenada con títulos y texto siempre visibles, también sin JavaScript.
- Conservar tinta/blanco/menta de ALS y tipografías actuales: Space Grotesk para títulos, IBM Plex Mono para fases y números. Fondo sólido más oscuro para separar esta secuencia de las capturas de proyectos; sin sombras ni efectos que sugieran botones.
- Tres columnas desde 901 px; recorrido vertical en tablet y móvil, con ilustración junto al texto cuando cabe. CSS/HTML acotados a proceso, sin dependencias, animación automática, nuevos compromisos comerciales ni conexiones externas.

### Banner de servicios · 2026-10-13
- Ocho frases diferentes en dos grupos idénticos: el segundo mantiene la continuidad del desplazamiento CSS lineal. Separación adaptable y grupos de al menos un viewport para evitar huecos en pantallas anchas.
- Movimiento habilitado solo con JavaScript y sin preferencia de movimiento reducido. Botón nativo de pausa/reanudación fuera del área en movimiento; hover detiene temporalmente. Un único grupo expuesto como lista de servicios a tecnologías de asistencia. Sin JS o con movimiento reducido se muestra un único grupo estático, con salto de línea.
- Estado de pausa en memoria mediante clase CSS; sin temporizadores, almacenamiento, dependencias ni solicitudes nuevas. Tipografía y colores existentes, control de 44 px mínimo y anchos reservados para que cambiar su etiqueta no provoque saltos.

### Revisión privada de Vercel · 2026-10-13
- Inspección mediante sesión autenticada del navegador, sin acceder a credenciales ni exportar registros de visitantes. Proyecto `alsdevstudio`, plan Hobby. Distinguir los servicios opcionales de los datos técnicos necesarios para alojar y proteger la web.
- Exclusión de entrenamiento opcional aplicada únicamente al proyecto y comprobada tras recargar. Sin cambiar ajustes globales, servicios, plan, DNS ni despliegue.
- Actualizar los textos locales de privacidad/cookies y documentar evidencia, fuentes, límites y pendientes en `docs/VERCEL-PRIVACIDAD.md`. No sustituir ventanas de consulta por una garantía de borrado de todos los datos del proveedor.

### Analítica opcional · 2026-10-13
- Vercel Web Analytics para páginas conocidas en los dominios canónicos; carga del script propio `/_vercel/insights/script.js` únicamente tras aceptar. Sin paquetes de build, secretos ni nuevas aperturas de CSP. Seguimiento automático deshabilitado; una vista por documento aceptado, sin contar anclas, clics ni formularios.
- Hook oficial `beforeSend` comprueba autorización, limita rutas, elimina query/fragmento y descarta referencias entrantes con consultas, fragmentos o rutas externas no mínimas. Se conserva Referrer-Policy no-referrer. No se afirma que el hook permita modificar document.referrer.
- Elección versionada en localStorage durante 180 días; solo preferencia y fecha, sin identificador. Si falla la escritura, no se mide esa página y el aviso permanece visible. Retirar intenta eliminar una aceptación anterior si no puede guardar rechazo; si ambas operaciones fallan, informa cómo borrar los datos desde el navegador antes de navegar. Un diálogo nativo accesible y dos acciones equivalentes permiten elegir; botón permanente de preferencias en cada pie. Escape no acepta. Otras pestañas y restauración del historial releen la elección; el hook también la relee antes de enviar y bloquea nuevos eventos tras retirada, sin prometer cancelar solicitudes ya enviadas.
- Costo: 50.000 eventos/mes incluidos en Hobby, compartidos en el equipo, sin cargos por excedentes; el proveedor limita/pausa la captura. Sin Pro, Plus ni eventos personalizados. Fuentes verificadas: https://vercel.com/docs/analytics/limits-and-pricing y https://vercel.com/docs/analytics/privacy-policy. La restricción comercial de Hobby sigue pendiente.
- Registrar evidencia de autorización y aviso versionado en el dispositivo no equivale a una prueba central durable del responsable. Mantener esa limitación jurídica documentada; no se crea backend ni una base de datos de visitantes.
- Identificación del aviso: ALS DevStudio en el párrafo principal; nombre completo del responsable y correo en el bloque secundario `.analytics-contact`, con estilos existentes y enlaces a la información legal.

### Migración candidata a Cloudflare · 2026-10-13
- Se conserva Nivel 1 y HTML/CSS/JS vanilla. Cloudflare Pages con GitHub, comando `node .github/cloudflare/build.mjs` y salida `dist`; sin backend ni dependencias de build del sitio.
- Proyecto `alsdevstudio`, `NODE_VERSION=22`; preparación en `migration/cloudflare` y rama final de producción `main`. Candidato público construido y verificado inicialmente en `98dd612`: https://alsdevstudio.pages.dev/.
- Corte autorizado completado: Pages construye automáticamente `main`; `www` CNAME `alsdevstudio.pages.dev`, apex ALIAS `uixie.porkbun.com` con redirección Porkbun301 hacia `www`, conservando URI/query y sin wildcard. Dominio Active / SSL enabled y QA real/recepción de Analytics comprobadas. Vercel conserva temporalmente `c6a6436`, con automatización desactivada para este proyecto.
- La salida publica solo HTML, estilos, scripts y assets permitidos. `_headers` traslada CSP, Referrer-Policy, Permissions-Policy, X-Frame-Options y nosniff; `404.html` evita el fallback de una SPA. Pages normaliza las páginas `.html` a rutas sin extensión: el build adapta enlaces, canonicals y sitemap manteniendo las redirecciones del proveedor.
- DNS y correo continúan en Porkbun: CNAME de `www` hacia Pages y redirección HTTPS del apex a `www`, preservando rutas. El registro del dominio, nameservers, MX y TXT de correo permanecen en su proveedor actual.
- Web Analytics manual, con `spa: false`; inserción automática desactivada. Elección propia y específica de Cloudflare por 180 días. No reutilizar aceptación de Vercel. Bloquear nuevas conexiones de medición mediante una CSP adicional antes de recargar al revocar; no cancelar retroactivamente solicitudes iniciadas.
- Costo previsto: USD 0/mes en Pages Free y Web Analytics, dentro de los límites vigentes (500 builds/mes, 20.000 archivos, 25 MiB por archivo). No se contrata plan ni se habilitan Functions/R2. Dominio y correo conservan sus costos existentes.
- Motivo de Pages frente a Workers Static Assets: integración GitHub ya disponible y posibilidad de usar `www` con DNS externo; Workers es la recomendación general para proyectos nuevos, pero requeriría trasladar la zona DNS para Custom Domains. Decisión y reversión en `docs/MIGRACION-CLOUDFLARE.md`.

### Nueva mascota ilustrada · 2026-10-13
- Dos PNG locales transparentes del mismo robot, generados mediante `imagegen` integrado a partir de la referencia del titular. Mantener los nombres `mascot-welcome.png` y `mascot-laptop.png`, ya permitidos por el build de Pages.
- Renderizado suave (`image-rendering: auto`) para la nueva ilustración. Reservar la proporción real en HTML y conservar los tamaños y posiciones existentes de portada/contacto; sin animación, dependencias de cliente ni conexiones adicionales.

### Redirección del dominio Pages · 2026-10-13
- Bulk Redirect de Cloudflare a nivel de cuenta: origen exacto `alsdevstudio.pages.dev/` sin esquema, destino `https://www.alsdevstudio.com/`, 301. Conservar query, matching de subrutas y sufijo de ruta; no incluir subdominios para conservar los previews.
- Configuración de plataforma, sin Functions ni cambios de DNS o código cliente. `_redirects` conserva las rutas históricas; no admite este cambio por hostname. Reversión: deshabilitar la regla dedicada, conservando la lista y el proyecto.

### Argentina y Sarin bot · 2026-10-13
- Ocho ubicaciones sincronizadas en HTML, datos JS, marcador y resaltado del SVG local. Argentina se coloca después de Brasil. Intervalo de mapa 2000 ms, con las guardas actuales de visibilidad, pausa, foco y movimiento reducido.
- Proceso: mantener lista ordenada y tres etapas. Sarin bot como guía visual, con bienvenida, portátil y pose de revisión; PNG transparentes locales y textos HTML en globos. Usar tipografías/paleta y breakpoints actuales, imágenes decorativas con proporción reservada y lectura completa sin JavaScript.
- El operador eligió personaje con globos de texto, sin lectura en voz alta. No se añade JavaScript ni servicio externo para las explicaciones.
- Contacto: reordenar los bloques en HTML y reflejar las columnas/divisor en CSS; mantener el orden visual, DOM y teclado. Encabezado común accesible de contacto y dos subtítulos, sin modificar los enlaces ni la lógica de selección de WhatsApp.

### Vista previa compartida hacia www · 2026-10-13
- Añadir el origen exacto `8f2ced74.alsdevstudio.pages.dev/` a la lista Bulk Redirect existente `als_pages_to_www`, con destino fijo www, 301 y query/subpath/path suffix activados. Include subdomains desactivado, igual que en la entrada raíz existente.
- Configuración de cuenta, sin cambios de código/DNS/correo/plan. Reversión: retirar únicamente la entrada de8f2ced74, conservando la entrada raíz y la regla activa. QA HTTP antes/después y otro preview conocido fuera del alcance.

### Globos de proceso iguales · 2026-10-13
- CSS Grid con filas adaptativas para alinear los globos por su contenido más alto. Mantener tres columnas en escritorio, personaje/texto a dos columnas hasta900 y apilado hasta680. Igualar alturas sin JavaScript ni altura fija, con texto íntegro y proporción reservada de las poses.
