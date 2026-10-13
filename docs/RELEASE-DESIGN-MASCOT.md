# Release de diseño y mascota ALS

13 de octubre de 2026. Push solicitado expresamente por el titular después de revisar la integración local. Base: `e95585f0f7abc38d4897d11cf34bc68fab56136a`.

## Alcance

- Refinamiento de portada, galería, proceso y contacto con Antislop y referencias Mobbin.
- Mascota transparente en la firma y pose con laptop debajo del correo, adaptadas a móvil.
- Conservación de los 18 proyectos, destinos, filtros, carrusel, correo y WhatsApp.
- Correcciones técnicas ya verificadas de privacidad: fuentes locales con licencias OFL, retirada de marcos externos, limpieza de la preferencia antigua y cabeceras restrictivas.
- Los borradores de privacidad, términos y cookies, los informes legales internos y los enlaces a esos borradores permanecen en local. La nota del contacto conserva los hechos confirmados por el titular; no se publica como una política completa.

Los informes de implementación `DESIGN-01-REVISION.md` y `MASCOT-01-REVISION.md` describen la revisión local anterior a esta autorización. Esta nota registra la publicación posterior y sus diferencias de alcance.

## Verificación

La copia exacta del índice se exportó en `test-results/release-design-mascot` y se comprobó antes del commit con las cabeceras de la release:

- `design-qa.mjs`: PASS en 19 comprobaciones; 18 proyectos, controles, teclado, correo, WhatsApp, movimiento reducido y comportamiento sin JavaScript. Cero errores de consola/HTTP, solicitudes automáticas a terceros o cookies en la visita local. Axe sin violaciones automáticas en 320 y 1440 px; contraste complejo mantiene los límites manuales ya registrados.
- `mascot-qa.mjs`: PASS en ocho anchos de 320 a 1440 px; proporción, carga y ausencia de solapamiento/desbordamiento. Captura final del contacto inspeccionada.
- `release-static-check.mjs`: PASS; JSON-LD válido, referencias locales existentes, hashes de fuentes coincidentes y borradores legales ausentes de la copia. `node --check` en scripts: PASS.
- `git diff --cached --check`: PASS. Se retiró un espacio final de cada licencia OFL sin modificar su texto.

La revisión de seguridad y la revisión independiente de dependencias no encontraron hallazgos críticos ni vínculos a borradores en la release. Evidencia regenerable y capturas en la carpeta local de la copia; los resultados no se incluyen como archivos públicos.

## Reversión

Revertir el commit con título `feat: refinar portafolio e integrar mascota ALS` mediante `git revert <hash-del-commit>` y publicar el commit de reversión con `git push origin main`. Usar un árbol de trabajo limpio o una copia aislada para preservar los borradores locales. No usar force push: la reversión conserva la historia. No hay bases de datos, migraciones ni datos de clientes que restaurar. La reversión completa también restituye la configuración anterior de vistas externas y fuentes; revisar ese efecto si se necesita revertir solo el diseño.
