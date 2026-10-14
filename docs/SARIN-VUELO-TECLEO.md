# Vuelo con pausas y Sarin escribiendo

Fecha: 2026-10-13. Revisión solicitada del componente publicado y autorizado en la sesión. El titular pide que el vuelo se detenga y continúe, y confirma expresamente «Repetir mientras la zona esté visible». En Proyectos pide portátil, escritura y aparición del texto.

## Resultado

- Vuelo de4400 ms en escritorio y3600 ms en móvil/puntero grueso/ahorro de datos, repetido mientras la zona está visible. Transform idéntico entre offsets .34–.53: parada real de836/684 ms, después continúa. El reinicio ocurre con opacidad0 para evitar un salto visible.
- Botón nativo «Pausar vuelo»/«Reanudar vuelo», fuera del contenedor decorativo aria-hidden. Pausa manual conserva foco y fase; salir de viewport u ocultar pestaña pausa automáticamente, y regresar reanuda cuando no está pausado por el usuario. Resize recalcula el recorrido y conserva fase/pausa.
- Proyectos: Sarin sentado con portátil, dos frames de manos con cambios discretos y cuerpo fijo. El texto existente aparece durante3000 ms en un globo; luego permanece completo. Original accesible intacto, copia visual aria-hidden y sin anuncios por carácter. Altura/posición reservadas; rAF finito ligado al reloj WAAPI, con limpieza/restauración en todos los finales y errores.
- Sin JS, falta de APIs, imágenes fallidas o movimiento reducido: pose y texto completos estáticos. Movimiento reducido dinámico cancela; pagehide libera efectos/listeners. Contacto conserva su animación finita anterior.

## Recursos y seguridad

`mascot-typing-a.png` y `mascot-typing-b.png`, 320×332 px, 35.819/35.439 bytes; alfa0–255 y esquinas transparentes. Generados mediante imagegen integrado tomando mascot-laptop como referencia, con limpieza integrada del fondo. Sharp exporta ambos con el mismo recorte y dimensiones para mantener registro. Las cajas visibles difieren1 px de origen, ~0,35 px al tamaño CSS112; inspección visual sin salto grande.

Prompt inicial, edición y procedencia en `assets/brand/mascot-sources.json`, fuera de la salida pública. Dos PNG añadidos a la allowlist existente; sin nuevas dependencias, solicitudes a terceros, almacenamiento, datos, redirecciones, servicios ni cambios de CSP. Solo texto fijo en la copia visual; sin HTML dinámico ni entrada nueva.

## Evidencia local

- `node --test .github/cloudflare/mascot-scenes.test.mjs`: 26/26 PASS repetidos por Cronos. Loop/parada, teclado/pausa, visibilidad/fase, resize, reducido, imágenes lentas/fallidas, ausencia de APIs/controles, fallback, copia intacta, cuerpo fijo y errores de reloj/callback; sin pageerrors, rechazos ni rAF pendientes tras terminar.
- `node .github/cloudflare/build.mjs`: 187 archivos, 4.888.291 bytes. `node --test .github/cloudflare/build.test.mjs`:12/12 PASS; incremento78.883 bytes respecto del build anterior, incluyendo los dos frames.
- QA integrada:10casos PASS, siete anchos320/390/680/681/900/901/1440, noJS3201440 y estados reales del main. Axe main3201440 sin violaciones automáticas; texto/controles/18proyectos/WhatsApp/mail conservados, sin overflow, errores o requests externos.
- Fotogramas y anclas:6registros PASS a390/1440; pausa medida en tiempo real y continuación, texto parcial al40–65%, altura reservada y control/personaje debajo del menú fijo. Se ajustó inset de la copia tras medir una diferencia de1px, para igualar coordenadas y ancho con el texto original.
- Sintaxis y TSC estricto aislado del módulo PASS, TypeScript ya disponible sin instalaciones. TSC global conserva los11errores previos de analytics documentados en la entrega anterior; no se declara aprobado.

Informes y capturas en `test-results/sarin-scenes-results.json`, `sarin-motion-frames.json` y sus PNG. El ensayo pausa WAAPI solo para inspeccionar fotogramas; no se añade código de QA al sitio público. Visibilidad/preferencias simuladas y axe no sustituyen lector de pantalla o preferencias nativas de todos los navegadores.

## Publicación y reversión

Candidato funcional `abe29f5630d1bf0b42956921a4245aae9ccadc72`: https://d4833e50.alsdevstudio.pages.dev/. Pages4/4, integración10/10 y pausa/tecleo/ancla6/6 PASS en línea, incluidos coordenadas/ancho idénticos del overlay. Chrome real confirma pausa nativa, etiqueta Reanudar vuelo, estado paused y sin overflow.

Esta es una corrección del componente cuya publicación se autorizó expresamente en la sesión («Sí, publicar las animaciones»), seguida de la petición de ajustar vuelo/tecleo y de la confirmación de repetición visible. Promoción por fast-forward sin cambios de archivos públicos. No se amplía infraestructura ni contratación. Producción pendiente de verificación tras el push.

Base pública: `8102a6a40a9dc7ec7c931b9452c4746e246ce4e4`. Revertir el commit funcional de esta revisión mediante un nuevo commit normal y push a main, sin reescribir historia. Restaurar módulo, HTML/CSS y allowlist, retirando solo los dos PNG de tecleo de la salida pública. Verificar www, texto/controles y las tres escenas originales después del rebuild; no modificar DNS, correo, analítica ni preferencias guardadas.
