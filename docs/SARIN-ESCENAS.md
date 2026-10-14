# Sarin: escenas breves con scroll

Fecha: 2026-10-13. Diseño aprobado expresamente por el titular: vuelo antes de Alcance, presentación de Proyectos y portátil en Contacto.

## Comportamiento

- Una ejecución por zona y documento, al entrar en viewport; 2400–2600 ms en escritorio y 2200 ms en móvil/puntero grueso/ahorro de datos.
- Transform y opacidad de elementos decorativos mediante Web Animations API. El PNG mueve el personaje completo; no se añaden articulaciones ni voz.
- Cambio a movimiento reducido, salida de la zona u ocultación de pestaña cancela y deja la composición final quieta, sin reiniciar al regresar. Sin JavaScript o APIs disponibles, la composición estática conserva imágenes y geometría.
- Espacios reservados, sin mover foco, texto nuevo, enlaces ni controles. Los cinco rótulos retirados siguen ausentes; proceso, contacto y mapa mantienen sus funciones.
- Las escenas no comparten un ancestro que esté apareciendo con reveal, para conservar el inicio visible del gesto. Corrección de mejora progresiva detectada en QA: `data-reveal` es visible de base y solo se oculta después de que JavaScript prepare su entrada; así la página sigue legible sin JavaScript.

## Recursos

Welcome y laptop existentes reutilizados. Nuevo `assets/brand/mascot-flight.png`, 320 × 383 px, 35.431 bytes; fondo transparente, alfa 0–255 y cuatro esquinas alfa0. Herramienta integrada imagegen con las dos poses existentes como referencias; reducción/exportación con Sharp ya disponible, sin dependencia nueva del sitio. Prompt exacto y procedencia en `assets/brand/mascot-sources.json`, excluido del build público.

Sin nuevas solicitudes a terceros, almacenamiento, analítica, backend, pagos ni cambios de CSP/DNS/correo. Se incorpora solo el PNG y el módulo de escenas a la lista pública de empaquetado.

El PNG de vuelo se solicita anticipadamente con prioridad baja; las poses de las otras zonas conservan carga diferida. El controlador espera todas las imágenes antes de animar, con listeners load/error que libera al terminar. La geometría y la opacidad estática quedan en CSS y no requieren scripts para mostrarse.

## Validación

- `node --test .github/cloudflare/mascot-scenes.test.mjs`: 13/13 PASS. Una vez, fase de vuelo real a1800ms, aterrizaje, cancelación por viewport/visibilidad, imágenes lentas/fallidas, reducido inicial/dinámico, móvil/puntero grueso/ahorro de datos, ausencia de APIs y ausencia de JS. Fixtures Chromium locales, visibilidad/preferencias simuladas; no equivale a un lector de pantalla o una comprobación nativa de todas las configuraciones.
- `node --test .github/cloudflare/build.test.mjs`: 12/12 PASS. `node .github/cloudflare/build.mjs`: 185 archivos, 4.809.384 bytes; incremento de 52.757 bytes sobre la base conocida, sin dependencias nuevas de frontend.
- `node test-results/sarin-scenes-qa.mjs`: 10 casos PASS; siete anchos320/390/680/681/900/901/1440, lectura sinJS3201440 e integración normal de main. PNG/dimensiones, controles, 18 proyectos, globos iguales y WhatsApp/correo conservados. Axe main3201440 sin violaciones automáticas, cero errores/solicitudes externas en la prueba local.
- `node test-results/sarin-motion-frames.mjs`: seis fotogramas intermedios3901440 PASS, con pose de vuelo completa dentro del slot y sin overflow/errores. Pausa de WAAPI exclusivamente en el ensayo para inspeccionar capturas, sin controles ni código de QA en el sitio público.
- Sintaxis de main, mascot-scenes y reveal; `git diff --check`: PASS. Revisión estática de seguridad sin críticos: contenido fijo, APIs locales del navegador, sin entrada nueva, datos/secretos, dependencias ni aperturas de CSP.

Hallazgos resueltos con prueba: inicio escondido por reveal del ancestro, lectura sinJS, fase de vuelo demasiado corta por easing global, ascenso que recortaba cabeza y animación antes de cargar la imagen. Informes/capturas en `test-results/`; excluidos de publicación.

Candidato público y producción: pendientes de completar con URL y evidencia.

## Reversión

Base pública conocida: `cd0536ddcc09962cf6e7bea808c8e7809ec57716`.

Revertir el commit funcional de escenas mediante un commit normal y push a main. Pages reconstruirá la versión anterior; no reescribir historia. Restaurar conjuntamente HTML/CSS/main y las allowlists del build, retirando el módulo y el PNG nuevo de la salida pública. No modifica preferencias guardadas, reglas de redirección ni cuenta de Cloudflare. Confirmar en www el HTML/CSS anterior y la navegación/contacto tras el despliegue.
