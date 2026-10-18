# Stack — ALS DevStudio

### YCloud Free para Sarin comercial · 2026-10-17 · preparación local

El titular eligió conectar el WhatsApp Business móvil existente de ALS por Coexistencia con YCloud Free. Confirmados Free y `Connected` para el número terminado en 8047, elegido por el titular; verificación empresarial pendiente. El transporte vanilla autenticado tiene pruebas locales (147 iniciales + 206 regresiones), sin dependencias ni envíos reales. Se prepara recepción durable D1 del piloto y núcleo comercial compartido: endpoint exacto cerrado por defecto, capturas separadas de sesiones web, deduplicación, pausa, caducidad y recuperación. No se han revelado claves, creado webhooks ni aplicado migraciones o despliegues WhatsApp remotos. [Estado, límites, costos y fuentes](docs/SARIN-WHATSAPP-EVALUACION.md), [contrato del piloto](docs/superpowers/specs/2026-10-17-sarin-whatsapp-ingress-design.md).

YCloud publica US$0 de suscripción Free; mensajería Meta, IA y otros consumos no quedan cubiertos por ese precio. No se activaron saldo, recarga automática ni alertas del proveedor. No se cambió la retención publicada de ALS; la retención del proveedor debe resolverse antes de tráfico real.

Continuación local lista: 616 pruebas aprobadas, canal nuevo con TSC estricto, Functions y Worker de retención compilados y bundle completo probado con workerd/D1 local, sin llamadas salientes. Piloto confirmado 2135→8047, borrador de webhook sin guardar y receptor apagado. Respaldo privado verificado; migración sólo ensayada localmente. [Operación, reversión y límites](docs/SARIN-WHATSAPP-PILOTO.md). Sin P1/P2 abiertos en revisión independiente; el TSC global de backend conserva deuda anterior, sin diagnósticos nuevos en los archivos añadidos/revisados.

### Adaptación de referencias Mobbin · 2026-10-17 · publicado

Dirección aprobada al retomar la propuesta acotada: acceso centrado, bandeja administrativa de lista/mensajes/contexto y landing con proyectos antes del mapa, encabezados compactos y un único título de contacto. Referencias estructurales, no copias de contenido: [Gumloop, acceso](https://mobbin.com/screens/4dd9332d-aa55-4cce-a84e-c968ef13f263), [Intercom, bandeja](https://mobbin.com/screens/51e34cc2-3be7-4d97-8cf0-e487b14656a5) y [Cloudstudio, trabajos](https://mobbin.com/sites/sections/48890788-7d16-4887-baaa-5b22583ef055).

- Paleta existente: navy profundo `#041224` como fondo operacional, panel `#0d2746` para jerarquía, menta `#65d49d` para acción/selección, blanco `#f5f8fb` para texto, gris azulado `#b0c1d3` para apoyo y azul claro `#91c2ff` para enlaces legibles. Se conserva el vocabulario visual de ALS, sin tema ni proveedor nuevos.
- Tipografía: Chakra Petch en títulos y marca, DM Sans en lectura/formularios, IBM Plex Mono sólo en referencias y datos. Jerarquía compacta para dar prioridad a personas y mensajes, no a UUID o encabezados grandes.
- Composición: acceso de 480–560 px centrado; escritorio administrativo con lista compacta, conversación flexible y contexto lateral; dos/una columna al reducir el ancho, sin texto o datos ocultos por falta de espacio. Controles de 44 px, foco visible y movimiento reducido.
- Firma: Sarin y las capturas reales existentes. Evitar menús/estadísticas de relleno, métricas globales inferidas de una página parcial, bloques bento ornamentales y cambios de autenticación/API. Mantener 20 proyectos, Sarin cuarto y Dialon séptimo.
- Implementación vanilla sin dependencias nuevas ni cambios de API, autenticación o datos. Escritorio con regiones desplazables accesibles y tarjetas de altura intrínseca; tablet/móvil con lectura natural. Revisión independiente sin P1/P2 pendientes; corregidos estiramiento/compresión de tarjetas, foco recortado y desconexión de observadores al retirar contexto privado. Recuperación visual desde `d6e9460`, sin reversión de Firebase ni D1.
- Medición de peso con el build de archivos LF de Git: 222 recursos y 5.401.740 bytes frente a 222 y 5.396.586 en la versión anterior (+5.154 bytes, aproximadamente 0,096 %). Sin imágenes, fuentes ni dependencias nuevas; no se atribuye mejora de velocidad a esta medición de tamaño.
- Publicación funcional `1ef2a01` / Pages `0d68cc02-b520-41ec-b02a-75a821b875dd`, revisión LF `6421d4e1892f0a14`. Producción: Pages 5 aprobadas / 1 omitida para no crear sesiones; HTML/CSS/JS de Staff contrastados 3/3 con el artefacto revisado y API anónima cerrada. Sin acceso a conversaciones reales durante QA.
- QA visual independiente en producción 320/1440: navegación, páginas 1/2/5, carrusel 04/07, contacto y acceso anónimo correctos, sin desbordamientos ni errores JS; axe estable sin incidencias y sin P1/P2 pendientes. Autenticación real previa conservada, sin volver a abrir la cuenta ni consultar datos privados para esta revisión visual.

### Datos de contacto de Sarin · 2026-10-17 · publicado

Nombre, apellido y correo obligatorios antes de crear nuevas sesiones; datos declarados visibles sólo en Staff, sin verificación de correo y sin añadirlos automáticamente a IA/analítica/resumen. Validador compartido vanilla, tabla D1 1:1 `sarin_leads` con FK/cascada, batch atómico y capacidad UTF-8; retención de la conversación 30 días/24 horas vacía. Históricos `lead:null`, sin backfill; Firebase/Google y cuotas monetarias no cambian. Aviso v6, privacidad v5, términos v4. Sin dependencias ni proveedor nuevo; 429 regresiones, 40 UI, 6 Pages locales y 6 del respaldo aprobadas. Backup privado verificado y `0003` aplicada sin alterar conteos. Código `9011bd8` / Pages `ea44f40a` publicado por autorización expresa; revisión LF `4206991de17e8ec8`. Producción: Pages 5 PASS/1 omitida para no crear sesiones, auditoría HTTP 23/23 y UI cinco anchos 5/5. [Verificaciones, estado y reversión](docs/SARIN-CONTACTO.md).

### Firebase Authentication para Staff · 2026-10-17 · publicado

Por nueva solicitud y autorización de producción del titular, Firebase Authentication con Google sustituye Access únicamente en la administración. Publicación inicial `5247000`; corrección de transporte `de87219` e inicio de sesión real confirmado por el titular el 17/10/2026. SDK modular aislado de la portada, firma/claims y UID/correo exclusivo comprobados por el servidor, estado actual del usuario consultado por petición, cookie HttpOnly/Strict y límite de seis horas desde autenticación. App web existente recuperada, usuario rehabilitado y dominio `www` autorizado; aplicación Access de Sarin eliminada tras confirmación, otras dos y política reutilizable conservadas. D1, retención, cuotas y APIs del chat no se migran. No se restaura el antiguo sistema Firebase ni su facturación. La verificación TOTP de Access deja de formar parte del nuevo flujo: los desafíos de Google dependen de su cuenta. [Estado y comprobaciones finales](docs/SARIN-OPERACION.md), [decisión y reversión](docs/adr/002-firebase-auth-staff.md). Las secciones inferiores son registros históricos.

### Apertura pública de Sarin · 2026-10-16

La producción publicada en `952d2cb` / Pages `53e29312` habilita `SARIN_ENABLED` y `SARIN_HISTORY_ENABLED` juntas. El CLI de build solo muestra el widget cuando ambas variables son exactamente `true`; la API `build()` y el lanzador local siguen cerrados por defecto, y preview conserva sus cuatro flags apagadas, sin D1 ni secretos. Se mantiene Access exclusivo del titular para administración y prueba privada. Consentimiento v3 informa y solicita el envío internacional; no se cambian proveedor, esquema ni topes de gasto. [Estado de publicación y reversión](docs/SARIN-OPERACION.md). Las revisiones inferiores registran las fases anteriores.

### Revisión actual de privacidad, accesibilidad y caché · 2026-10-16

Producción funcional `81784d3`, Pages `7f36ae7e-7543-49cb-ae17-3ec5bbc2515c`; políticas v2, flags públicas apagadas y administración/prueba privada activas. No cambia el stack, el esquema, Access, los secretos ni el proveedor DeepSeek. El build propaga una revisión común de recursos públicos a HTML, JS/imports y CSS para evitar módulos legales antiguos en caché; no deriva de datos privados ni identifica visitantes. HSTS de 180 días solo host, correo `mailto` excluido puntualmente de ofuscación, beacon bloqueado en prueba privada, pausa y foco accesibles. Chakra OFL oficial y procedencia comprobadas.

Verificación inicial 370/370, nueva regresión de correo, build 18/18 y Pages versionadas 6/6; 12/12 axe y 14/14 HTTP finales. Chrome normal confirma v2 y sesión lista, y el panel conserva seis mensajes de la prueba ficticia café/Mundial/retorno con una señal fuera de alcance y cero errores. La revisión jurídica de proveedores para visitantes y los permisos documentales de recursos siguen pendientes. [Cierre, límites y fuentes](docs/PRIVACIDAD-Y-CUMPLIMIENTO.md).

### Primera publicación privada · registro anterior de 2026-10-16

- Estado: el titular autorizó la prueba privada en la misma web con datos ficticios. Pages publicó correctamente el despliegue canónico `03625efb-fe06-4678-b847-b7cbfac6ebe1`, commit `828bdd5`; chat e historial públicos permanecen apagados. Sesión real del titular, inferencia e historial privados comprobados en Chrome. Candidato aprobado con 282/282 pruebas, 6/6 de Pages, compilación y 14/14 HTTP independientes en preview y 14/14 en producción. La fase anterior de panel vacío corresponde a `658f002` / `9ab95b55-6214-4b76-a0b8-126b468cc537`. [Operación y activación](docs/SARIN-OPERACION.md).
- Frontend HTML/CSS/JS Vanilla, diálogo nativo, tokens y fuentes existentes; autorización previa sin premarcar, referencia y resumen editable hasta 1800 caracteres para WhatsApp manual. No persistir contenido en el navegador ni enviarlo a analítica. Chat público oculto por defecto en fuente y artefacto; el atributo explícito `true` habilita su vista pública solo en build local `--live`. La query privada exige primero bootstrap autorizado con permiso exacto; por sí sola no muestra el chat ni crea sesión. Es un control visual; las flags y validaciones del servidor mantienen el límite de acceso.
- Pages Functions `/api/sarin/session` y `/api/sarin`: DeepSeek único proveedor, `deepseek-flash`, pensamiento desactivado, JSON completo sin streaming/reintentos. Sesión de 24 h con cookie HttpOnly/Secure/Strict y hash en D1; contexto exclusivamente del servidor, hasta cuatro pares, idempotencia por UUID.
- D1 añade historial y autorización de 30 días desde primer mensaje, sin ampliar plazo. Cuotas por IP transformada y rechazos de 48 h, auditoría de acciones de 30 días, globales y reservas de 35 días; sin IP ni pseudónimo de 48 h en transcripciones. Capacidad lógica de 64 MiB y 2000 conversaciones; datos de respaldo y tamaño físico se supervisan aparte.
- Panel `/control-sarin/` y API privados: plugin oficial Access 1.0.5 aislado en `.github/sarin/`, firma/claims/correo titular y CSRF/origen/JSON para acciones. Consulta, filtros, revisión, bloqueo de 24 h y eliminación sin reiniciar dinero. Prueba mediante POST `/api/control-sarin/test/session` y `/api/control-sarin/test/message`, con la misma identidad exclusiva, flag exacto y CSRF renovado antes de cada POST. Cookie `__Host-sarin-test-session` de 24 h, HttpOnly/Secure/Strict, hash separado del público incluso ante token renombrado. Reutiliza motor, cuotas y retención mediante configuración interna por petición, sin cambiar las flags públicas. Fallo de configuración cierra acceso; no bypass local ni Firebase.
- Worker separado comparte D1 y purga por cron horario, máximo de 20 lotes de 100, sin HTTP público. Entorno `production` desplegado como `als-sarin-retention`, versión `fc6b4b0f-3aad-4559-a3fc-17a0aae1be9c`, cron `0 * * * *`, retención activa, sin `workers.dev` ni URLs de preview. Primera ejecución remota correcta: `2026-10-17T03:00:34.515Z`, equivalente al 16 de octubre a las `22:00:34.515` Colombia; último error nulo y cero pendientes. Vencidos invisibles antes de purga. Recuperación conservadora borra todo historial restaurado y concilia capacidad sin restablecer presupuesto. Fecha de compatibilidad 2026-10-13 compartida con Pages.
- Límites de servidor: 10 mensajes/min y 50/día por IP transformada; 15 turnos/conversación; 5 sesiones/min y 20/día. Reservas atómicas antes de red, incertidumbre retiene gasto, sin reintentos. Producción remota: `SARIN_ADMIN_ENABLED=true`, `SARIN_PRIVATE_TEST_ENABLED=true`, `SARIN_ENABLED=false`, `SARIN_HISTORY_ENABLED=false`. Preview conserva las cuatro flags apagadas, sin D1 ni secretos. Retención apagada por defecto y activa únicamente en el entorno explícito `production`; launcher `--live` habilita únicamente chat/historial locales con D1 simulada, administración y prueba privada apagadas.
- D1 exclusiva `alsdevstudio-sarin`, UUID `ba6d723c-57fb-472d-b9c0-1308c24912e3`, jurisdicción `us`/ubicación ENAM; migraciones 0001/0002 aplicadas y respaldo vacío restaurado en prueba. Pages de producción y purga comparten esa base. Lectura de metadatos previa a la prueba privada: cero conversaciones y mensajes, sin pendientes ni último error de purga. La consulta CLI requirió indicar el ID de cuenta explícitamente, sin renovar autenticación. Preview sin D1 ni secretos; desarrollo conserva UUID simulado 002. [ADR-001](docs/adr/001-sarin-d1-y-entornos.md).
- Access operativo para los dos prefijos privados en `www`, `alsdevstudio.pages.dev` y sus previews: solo titular mediante One-time PIN, sesión 6 h y TOTP requerido cada 6 h. Credencial TOTP registrada y desafío completado directamente por el titular, sin lectura de QR, secreto ni código por el agente. En la publicación inicial, el panel mostró la identidad del titular, listado vacío y limpieza de las 22:00 Colombia; evidencia local excluida de Git: `test-results/sarin-remote/panel-produccion.jpg`. App Launcher usa la misma política del titular; no se cambió MFA global de otras aplicaciones. CNAME `www` permanece Proxied conservando destino y demás DNS.
- Prueba privada real en Chrome: aviso de datos ficticios y autorización explícita; dos turnos HTTP 200 de tienda y tarjetas, con MundoCelular/CoctelsOPS y sin inventar pasarela. Panel: dos turnos/cuatro mensajes, autorización registrada, vencimiento el 15 de noviembre de 2026 a las 23:03 Colombia y limpieza más reciente a las 23:00. Consumo verificado de 0,001232 USD, cero retenido. Resumen editable de 836 caracteres con referencia y destinatario WhatsApp correctos; no se abrió ni envió WhatsApp. Conversación ficticia disponible para el titular, capturas locales excluidas de Git: `test-results/sarin-remote/sarin-www-prueba.jpg` y `sarin-www-historial.jpg`.
- Separación comprobada en producción, 14/14: portada, `/?sarin=prueba` y tres políticas `200` sin beacons automáticos; ambas portadas conservan el atributo público apagado. UI privada, bootstrap y POST de prueba anónimos `302` a Access con `no-store`; internos `404`; sesión pública con consentimiento válido `503` sin cookie de Sarin. Estas comprobaciones no crearon conversaciones ni llamaron a IA. Preview `https://cd64f7c1.alsdevstudio.pages.dev/`, commit `828bdd5`: 14/14, páginas públicas con `noindex`, cuatro flags apagadas, sin D1 ni secretos. Registro histórico: preview `f2dd9eee` precedió al panel vacío y a la actual prueba privada; la producción inicial `38c298b7` fue sustituida tras autorización.
- Producción conserva seis secretos provisionados privadamente y el enlace D1 correcto; ningún valor se incluye en artefactos ni informes. Build de Git/Pages aprobado con `npm ci --prefix .github/sarin && node .github/cloudflare/build.mjs`, salida `dist`. SQL, backend, Worker, dependencias y secretos excluidos del artefacto público. La revisión legal del 16 de octubre está publicada. Condiciones efectivas de API, entrenamiento/retención y tratamiento internacional de DeepSeek siguen pendientes para admitir visitantes. La fase publicada se limita a la prueba privada autorizada del titular con datos ficticios. Consultar el panel no llama al proveedor; enviar en la prueba privada sí utiliza el motor real bajo sus controles.
- Caché observada durante esta publicación: assets sin huella conservaban `max-age=14400`; recargar sin caché en Chrome permitió ver el código nuevo y su aviso privado. No se alteraron de forma persistente caché ni seguridad.
- Analítica: resuelto el hallazgo P2 de inyección automática RUM con la regla activa `8c5eb63c31fc477c8cff625f25835e81`, «ALS - Analítica solo con consentimiento»: expresión exacta `(http.host eq "www.alsdevstudio.com")`, único ajuste `disable_rum=true`. No se cambiaron otras opciones. Verificación independiente: cero beacons automáticos en portada y tres políticas. Prueba de navegador: aceptación previa cargó un script manual, rechazo dejó cero, nueva aceptación cargó uno y se restauró la elección original.

**Costo.** Consultar el historial o revisar conversaciones no añade llamadas de IA; la prueba privada conserva las cuotas y reservas del motor real. No se contrataron planes de pago. Precios de cálculo conservados: 0,30/1,20 USD por millón de tokens entrada/salida; topes internos de 1 USD/día y 10 USD/mes UTC, sin garantía sobre factura ni tarifa futura. Escenario orientativo de 100 conversaciones/mes × 5 turnos, cada turno con 2000 tokens de entrada y 300 de salida combinados entre sus dos llamadas: unos 0,48 USD/mes de IA; el gasto depende del uso y respuestas reales. Cloudflare previsto: 0 USD adicional con tráfico pequeño dentro de Free y Access de un titular; plan/capacidad/CPU y consumo de la cuenta deben comprobarse antes de activar. D1 Free incluye 5 millones de filas leídas/día, 100000 escritas/día y 5 GB totales; índices/triggers cuentan y los 64 MiB lógicos no son el tamaño físico. Fuentes verificadas:[D1](https://developers.cloudflare.com/d1/platform/pricing/),[Workers](https://developers.cloudflare.com/workers/platform/pricing/),[Access](https://www.cloudflare.com/plans/zero-trust-services/). Hallazgo de costo medio: límites/alertas de cuenta DeepSeek no verificados; los contadores de aplicación no sustituyen esos controles. No se afirma que exista un límite de facturación configurado.

### Vistas y capturas dos veces al día · 2026-10-16
- Cuatro proyectos recapturados y SemanControl enlazado en galería/carrusel: 20 proyectos con variantes AVIF/WebP. Vigia abre `/demo/`; descripciones y estados revisados contra las páginas públicas.
- Workflow existente: cron `0 5,17 * * *` (00:00 y 12:00 Colombia), ejecución manual conservada, input aislado del shell y build verificado antes del commit. Sin nuevas dependencias ni servicios de pago. [Evidencia y reversión](docs/CAPTURAS-PROYECTOS.md).

### Retirada del panel administrativo · 2026-10-15

- Se conserva la landing estática en Cloudflare Pages y el dominio canónico `https://www.alsdevstudio.com/`. Retirados el enlace Administración, su página, estilos, rutas y módulo independiente con sus dependencias. Los cambios recientes del mapa permanecen.
- No hay backend administrativo ni SDK Firebase en el sitio. [Retirada, verificación y recuperación](docs/RETIRADA-PANEL.md).

### Retirada de la franja de contadores · 2026-10-15

- Eliminados los contadores y el botón «Pausar recorrido», junto con su código exclusivo. El recorrido conserva las pausas por hover, foco, selección manual y visibilidad, además de respetar movimiento reducido.
- Build 12/12; QA de ciclo, teclado, visibilidad y selección aprobada. Cinco anchos 320–1440 px sin overflow, axe 0 y sin errores; no-JS verificado. Reversión pública a `59a8692` mediante commit nuevo.

### Ficha de ubicación del mapa · 2026-10-15

- Banda unificada con país, mensaje sincronizado desde `LOCATIONS` y coordenadas en un `dl` semántico. Jerarquía más legible y disposición vertical en móvil, con espacio reservado para evitar saltos. Conserva el anuncio manual y el recorrido existentes.
- Build 12/12 y QA del mapa 10 comprobaciones, axe 0; nueve anchos 320–1440 y ocho ubicaciones sin variación de altura ni desbordamiento. Reversión pública a `e7eaee3` mediante commit nuevo.

### Limpieza de rótulos del mapa · 2026-10-15

- Alcance empieza directamente por su título y mapa: retirados los tres grupos de textos señalados y sus estilos exclusivos, con márgenes recompuestos. Selección de países y recorrido intactos. Build 12/12 y QA del mapa 10 comprobaciones aprobadas, axe 0, móvil/reducido/no-JS verificados; reversión pública a `ef214fb` mediante commit nuevo.

### Placeholder SemanControl y registro de fotogramas · 2026-10-14
- Tarjeta20 mediante article.project-card--pending, categoríaProducto y estadoEn construcción. Visual HTML/CSS local con proporción16:10 y textos honestos; sin href/foco/CTA. Galería20; carrusel/capturas conservan19 proyectos con demos disponibles. Excluir article de flecha, subrayado y tilt mediante selectores de enlaces.
- Corrección localizada de registro: translateX(12.5%) del fotograma B de Proceso, equivalente a40/320 del canvas. No editar PNG ni modificar temporización/controlador; bbox alfa del contenido permanece dentro del actor. Verificar cabeza/patas de ambos estados, noJS/reducido y texto, en320/390/1440.

### Catálogo Sarin Bot y vuelo de ida y vuelta · 2026-10-14
- Conservar la galería/carrusel estáticos y su diseño existente. Proyecto19, clave `sarinbotsaas`, URL externa HTTPS con noopener/noreferrer, estado Próximamente. Captura real mediante el pipeline existente a1440×900 y variantes AVIF/WebP480/768/1200, sin iframe ni conexiones automáticas nuevas.
- Vuelo con pose de giro en los extremos y parada central en ambas direcciones; cinco mensajes locales de servicios. Reservar el tamaño del globo para el mensaje más alto, conservar poses y WAAPI con cleanup. No agregar dependencias, datos o cambios de proveedor.

## Estado actual del sitio público
- HTML5 estático en `index.html`.
- CSS externo en `styles/main.css`, organizado por secciones numeradas.
- JavaScript vanilla en módulos ES: `scripts/main.js` es el punto de entrada y cada sección vive en `scripts/modules/`. Con `@ts-check` y JSDoc; `jsconfig.json` permite `tsc` en modo estricto sin build.
- Assets de marca en `assets/brand/`, incluido `world-map.svg` que se inyecta con `fetch`.
- La landing pública conserva HTML/CSS/JS nativos. El panel privado y sus Functions/D1 ya están publicados; el chat y la creación pública de historial permanecen desactivados, según el estado del inicio.

## Nivel
El sitio es Nivel 1: landing/portafolio con responsive, accesibilidad, seguridad de contenido y QA real en navegador.

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
- **Regenerar las capturas:** hay un job diario a las 00:00 y 12:00 de Colombia (`.github/workflows/capturas.yml`) y se puede lanzar a mano desde Actions. Para hacerlo en local: `npm ci && npx playwright install chromium` dentro de `.github/capturas/`, y después `node .github/capturas/capturar.mjs [--solo clave1,clave2]` desde la raíz. La herramienta vive fuera de la raíz a propósito: un `package.json` en la raíz haría que Vercel intentara compilar el sitio.
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

### Retirar etiquetas de sección · 2026-10-13
- Eliminar solo los cinco nodos solicitados del HTML y el wrapper de «Por WhatsApp». Quitar los márgenes superiores de títulos asociados a esas etiquetas. Mantener encabezados semánticos, anclas, controles y el resto de etiquetas de marca; sin cambios de scripts ni assets.

### Escenas breves de Sarin · 2026-10-13
- Nivel 1, HTML/CSS/JS vanilla. IntersectionObserver y Web Animations API para transform/opacity finitas, 2400–2600 ms en escritorio y 2200 ms con móvil/puntero grueso/ahorro de datos. Una ejecución por escena y documento, sin bucles ni dependencias nuevas.
- CSS muestra la composición final de base y reserva la geometría. Decoración aria-hidden, imágenes con alt vacío y sin controles/foco. Reutilizar welcome y laptop; generar una única pose transparente flight con imagegen integrado y optimizarla con Sharp disponible, conservando alfa.
- El módulo propio consume la escena antes de reproducir; finalizar y liberar animaciones al salir de viewport, ocultar documento o activar movimiento reducido. Fallback estático si faltan las APIs; movimiento reducido desactiva desde el inicio. No confundir la entrada suave móvil con lowPowerMotion, que desactiva otros adornos del sitio.
- Vuelo acotado al hueco anterior a Alcance, con aterrizaje welcome; presentador y ventana decorativa junto a Proyectos; portátil y líneas decorativas en la ubicación actual de Contacto. Se anima el personaje completo, sin simular articulaciones inexistentes en el PNG.
- Reveal progresivo: el contenido HTML es visible de base, y `.reveal-ready` prepara la aparición solo tras inicializar el observer. Evitar ancestros reveal en las escenas; conservar lectura sin JS y regla de movimiento reducido con la misma especificidad CSS.

### Vuelo repetido y escritura en Proyectos · 2026-10-13
- Vuelo WAAPI local de ~4400 ms (3600 compacto), con avance, parada real de ~20% del ciclo y continuación; opacidad0 en el reinicio evita saltos visibles. Pausa/reanudación por visibilidad, pestaña y botón nativo fuera del contenedor aria-hidden. Movimiento reducido cancela y muestra welcome quieto; sin APIs/JS, estático.
- Proyectos: dos PNG de Sarin sentado con portátil, con manos en estados alternos, generados mediante imagegen integrado a partir de la pose local. Exportar ambos frames conservando transparencia, sin dependencias nuevas de frontend. Animación finita de3000 ms al entrar, con texto actual que aparece progresivamente y vuelve completo al terminar/cancelar.
- Texto original en span accesible sin aria-live; copia visual aria-hidden y overlay reservado. Un rAF acotado al reloj WAAPI actualiza solo esa copia, sin modificar contenido semántico ni recomponer altura. Cleanup de rAF, efectos y clases en todos los finales. Contacto permanece una vez y no cambia.
### Saludo y proceso · 2026-10-13
- Reutilizar PNG de bienvenida y los dos fotogramas de tecleo existentes. Cuarta escena `process` usa el mecanismo finito y semántico de `projects`; sin dependencias, generación de assets, datos ni conexiones nuevas.
- Vuelo WAAPI con reloj compartido de 8,8 s (8 s compacto), posición fija entre 27–72% y globo durante 29–70%. Poses/estela/saludo sincronizados; conserva fase al salir, ocultar pestaña, pausar o redimensionar. Control nativo por icono, 44 px, nombre accesible y foco; sin «Pausar vuelo» visible. Fallback estático y teardown existentes.
- Reversión por commit nuevo del cambio funcional, tomando `69d4b7a` como base conocida. Candidato Pages y QA antes de promover dentro de la revisión de animaciones autorizada en la sesión.
### Animación de tarjetas de proceso · 2026-10-13
- Tres escenas finitas `step-define`, `step-build`, `step-deliver` en los `li` existentes; actor e icono decorativos y cada título/párrafo con original accesible y copia visual absoluta. Un reloj/rAF por tarjeta escribe título y explicación en orden, con geometría reservada; completa/restaura todos los pares ante salida, error, cambio de tamaño o movimiento reducido.
- Duración 3,6 s; umbral de entrada 60% para mostrar personaje y globo juntos. Reusar PNG welcome, typing-a/b y review; aprobación SVG local. Movimientos de transform/opacity, móviles más leves, sin dependencias ni recursos nuevos. Paleta, tipografía y layout existentes.
- Preparar candidato Pages y verificar antes de continuar publicación autorizada. Reversión por nuevo commit del cambio funcional, base pública `f007f93`; sin cambios de hosting, analítica, DNS ni datos.
### Firma animada de portada · 2026-10-13
- Octava escena `author`, finita 3,6 s y umbral60%. Dos pares semánticos reutilizan escritura nombre→bio. Saludo de transform leve, halo circular de marca y globo decorativo; PNG welcome existente. Paleta y tipografías actuales, sin nuevas dependencias o assets.
- Firma fuera del ancestro reveal, dentro de la misma columna mediante wrapper `hero-intro`. Reservar proporciones72×108/56×84 del actor y alturas de texto; globo sobre metadatos, sin cubrir CTA o carrusel. Clases de nombre/bio para evitar que selectores de spans afecten los originales internos.
- Gate hasta DOMContentLoaded (load de respaldo para init tardío) y ausencia de dialog[open]. Listener close en captura reintenta una entrada no consumida tras el consentimiento; limpieza en teardown. No modificar Analytics ni su autorización. Candidato y QA antes de continuar publicación autorizada; reversión por commit nuevo, base `3a69dec`.
### Vuelo sin botón circular · 2026-10-14
- Retirar el button circular del vuelo y sus reglas CSS exclusivas. La referencia a su control es opcional en las dos validaciones del controlador. Conservar efectos, duración y textos, así como suspensión por viewport/hidden/reducido. El banner y sus controles mantienen su comportamiento original; no hay pausa manual alternativa para Sarin, por elección explícita del titular.
- Verificar comportamiento sin botón y suspensión/reanudación/reducido, suite existente y build; revisión visual local/publicada en móvil y escritorio. Reversión mediante commit normal del cambio funcional, base `933256b`.
### Dos poses de tecleo para encabezados · 2026-10-14
- Añadir novena escena finita `global` al mecanismo de escritura y fotogramas existente. Encabezado de Alcance con actor/globo fuera del reveal del título; originales semánticos y copia decorativa conservan altura y lectura. Proceso usa el mismo mecanismo con una nueva pose, sin cambios al contenido.
- Generar dos láminas transparentes de dos fotogramas mediante imagegen integrado, con los PNG propios como referencia de identidad; exportar cuatro PNG alineados a 320×384 manteniendo alfa. Assets nuevos versionados por sección; ningún archivo existente se sobrescribe ni dependencia nueva se instala.
- QA de identidad/siluetas diferentes, manos alternas/alineación, tecleo y geometría en móvil/escritorio, reducido/noJS, build y candidato antes de continuar publicación autorizada. Reversión por commit nuevo, base `5a8c880`.
