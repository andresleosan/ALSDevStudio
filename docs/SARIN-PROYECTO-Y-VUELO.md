# Sarin Bot en el catálogo y vuelo con cinco mensajes

Solicitud del titular, 2026-10-14: añadir `https://sarinbotsaas.pages.dev/` a la landing y cambiar el vuelo de Sarin por recorridos de ida y vuelta, paradas y cinco textos distintos. El titular confirma que los textos deben hablar de los servicios de ALS DevStudio.

## Catálogo

Sarin Bot se añade como proyecto19 después de Vigia, en Producto, tanto en galería como en carrusel. Estado Próximamente y descripción «Producto en preparación para organizar las citas y la agenda de un negocio». El sitio público declara que el registro, las reservas y los chats aún no están disponibles; no se presentan como funcionalidades ya lanzadas.

Fuente revisada en Chrome: `https://sarinbotsaas.pages.dev/`, título «Sarin Bot — Menos mensajes. Más citas en orden. Próximamente». Captura real mediante `node .github/capturas/capturar.mjs --solo sarinbotsaas`, 1440×900, movimiento reducido. JPEG original y seis variantes AVIF/WebP480/768/1200; total161.301bytes. Se conserva el pipeline existente y la carga local diferida, sin iframe ni conexión automática nueva.

## Vuelo

Sarin viaja hasta el centro, se detiene, muestra un mensaje, sigue hasta el borde, gira y regresa. Los cinco textos se alternan en ese recorrido continuo:

1. Una buena idea puede llegar lejos. Le damos forma contigo.
2. Tu negocio merece una web clara, útil y fácil de recorrer.
3. Tus productos pueden llegar más lejos con una tienda virtual.
4. Una aplicación a medida puede hacer más simple tu trabajo.
5. Definimos, construimos y revisamos contigo antes de publicar.

Poses existentes, globo con tamaño reservado para el texto más alto, primer mensaje estático sin JavaScript o con movimiento reducido. No agregar controles manuales: el titular ya confirmó seguir el ciclo normal. Conservar suspensión fuera de pantalla/pestaña y limpieza de efectos. El límite de pausa manual de WCAG registrado en `SARIN-SIN-ICONO.md` continúa; no se afirma auditoría completa WCAG.

## Verificación

Cronos repitió módulo60/60 PASS, build tests12/12 PASS, TSC aislado/sintaxis/diff-check PASS; build final198 archivos / 5.197.345bytes. Revisión independiente del catálogo/HTML/CSS y lifecycle/continuidad del controlador sin bloqueantes. Contenido y nodos estáticos, sin nuevas entradas, conexiones, permisos, dependencias, timers o rAF del vuelo; CSP/Analytics intactos.

QA integrada10/10 en320/390/680/681/900/901/1440, noJS/reducido/axe; fotogramas18/18 con diez trayectos, cinco mensajes, giros y continuidad, geometría estable y otras escenas conservadas. Catálogo6/6 en320/1440 normal/reducido/noJS: orden de18 anteriores, nuevo19, ocho Productos, teclado, navegación19→1, destino externo/noopener y siete imágenes/dimensiones. Se corrigió una expectativa del ensayo nuevo que comparaba la URL inicial del hero sin normalizar la barra final; producto intacto. Capturas de cinco mensajes y ambos giros inspeccionadas.

Informes: `test-results/sarin-catalog-flight-local-scenes.json`, `sarin-motion-frames-catalog-flight-local.json` y `catalog-qa-catalog-flight-local.json`. TSC global conserva su límite previo en Analytics; no se afirma auditoría completa de lectores de pantalla/WCAG.

Candidato `610652e6` de `663503b`: Cronos repitió Pages4/4 y catálogo6/6 PASS en línea. HTTP focal8/8 PASS: controlador exacto y siete capturas/variantes idénticas a dist con MIME correcto. El ensayo Pages verifica artefactos, canonical/cabeceras/noindex y ausencia de conexiones al rechazar Analytics. Chrome real confirma flight playing, cinco mensajes, selección que avanza en el ciclo, giro visible, cero controles de vuelo y sin overflow. Captura del proyecto en `catalog-card-sarin-normal-1440-catalog-flight-preview.png` y giro en `sarin-catalog-flight-preview-chrome.jpg`; candidato abierto como entregable. Informes `catalog-qa-catalog-flight-preview.json` y `sarin-catalog-flight-http-preview.json`.

Producción pendiente: la autorización previa cubría las animaciones; esta publicación también añade un nuevo proyecto al portafolio, así que se presenta el candidato concreto antes de pedir confirmación del conjunto. No se promueve main hasta recibirla.

## Reversión

Base conocida `6ef732f`. Revertir el commit funcional mediante commit nuevo y push normal a main; esperar Pages y verificar retorno de18 proyectos y vuelo anterior. Sin migraciones, DNS, planes, correo, secretos o datos nuevos. La lista pública de archivos retira los siete assets nuevos cuando se revierte el código y los archivos del catálogo.
