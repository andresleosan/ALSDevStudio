# Presentación animada de la portada

Solicitud del titular, 2026-10-13: «lo mismo esta parte, animar e inovar», señalando Sarin junto a Andrés Santiago y la descripción del desarrollo independiente. Extensión concreta de las animaciones autorizadas y publicadas en esta sesión.

## Diseño

Sarin saluda con una inclinación suave y un destello circular que retoma las órbitas de la marca. El globo «¡Hola! ¿Qué idea construimos hoy?» aparece junto a la presentación. El nombre y la descripción originales se escriben en orden durante3,6segundos, una vez cuando la zona alcanza60% de visibilidad. Se reutiliza el PNG de bienvenida; no se genera arte ni se añaden dependencias.

La firma permanece en la columna izquierda de la portada y fuera del grupo reveal, para ver la animación desde el principio. La composición reserva imagen/textos/globo; el CTA y carrusel conservan su funcionamiento. El texto original permanece accesible y las copias visuales son decorativas. Movimiento reducido o sin JavaScript muestran directamente la presentación completa.

La escena espera DOMContentLoaded y ausencia de diálogos abiertos. El evento close en captura cubre el aviso de analítica creado después de inicializar main; load respalda una inicialización tardía. Se mantiene Analytics intacto y no se cambia la elección del visitante.

## Validación local

RED inicial0/3 y RED de documentReady0/2 observados antes de los cambios respectivos. Cronos inspeccionó los archivos y repitió:

- `node --test .github/cloudflare/mascot-scenes.test.mjs`: 52/52 PASS, incluidos42casos previos. Cubre pares, foco, fases, gesto compacto, partes, umbral, una vez, diálogos antes/después de init, DCL/load, filtro de img.load, error y cleanup.
- `node --test .github/cloudflare/build.test.mjs`: 12/12 PASS. Build187archivos/4.903.370bytes.
- `node test-results/sarin-scenes-qa.mjs`: 10 casos PASS, ocho escenas a320/390/680/681/900/901/1440, noJS/reducido y axe main320/1440 sin violaciones. Analytics.js retenido800ms mantiene author idle con readyState interactive y sin diálogo; después,700ms con modal abierto mantiene idle. Rechazar activa la entrada visible. Sin errores, solicitudes externas o medición.
- `node test-results/sarin-motion-frames.mjs`: 16 registros PASS; nombre/bio parciales y finales con rectángulos idénticos y altura84/108px estable en390/1440. Saludo/globo sin recorte ni solape con CTA/carrusel y bio con estilo secundario correcto. Capturas inspeccionadas por Cronos, regresiones previas conservadas.
- Sintaxis, TSC aislado estricto y `git diff --check`: PASS. TSC global mantiene el límite documentado de11errores anteriores en analytics.js, archivo intacto.

Informes locales `test-results/sarin-author-local-scenes.json` y `sarin-author-local-frames.json`. La carrera inicial de defer/DCL y el selector de spans fueron señalados en revisión independiente y corregidos antes del candidato. Un diálogo futuro abierto tras consumir la escena no reinicia una entrada ya vista; la espera cubre el aviso inicial de analítica. QA Chromium no sustituye lector de pantalla.

Seguridad: contenido fijo con textContent, originales accesibles y efectos decorativos; sin dependencias, secretos, datos o redes nuevas. Cleanup de DCL/load/close en captura, rAF y efectos; CSP/Analytics/canonical conservados. Sin bloqueantes en revisión independiente.

## Candidato verificado

Fuente funcional `f46e181a1a1568436a089c3b13415f7e02d6cf23`, rama `feat/sarin-presentacion-portada`. Cloudflare muestra https://7e452ba7.alsdevstudio.pages.dev/ asociado al commit.

Cronos repitió Pages4/4, integración10/10 y fotogramas16/16 PASS en línea: recursos iguales al build, preview noindex, privacidad/rutas/controles conservados. Chrome real confirma author idle y diálogo abierto; tras rechazar y bajar hasta la firma, author finished con clones vacíos, textos/globo completos y sin overflow. Captura `test-results/sarin-author-candidate-chrome.jpg`; reportes `sarin-author-preview-scenes.json` y `sarin-author-preview-frames.json`.

La promoción continúa las animaciones cuya publicación el titular autorizó expresamente en esta sesión, con esta extensión concreta solicitada a la firma. No cambia el dominio, acceso, datos ni proveedores. El registro del candidato es documental; los archivos públicos promovidos son los revisados.

## Producción · cierre 2026-10-14

Publicada por fast-forward a main `a3fe19a0eb23a3e9f870aaeb9d59169c77432cf5`, despliegue Cloudflare `34d57bd6`. La fuente funcional sigue siendo `f46e181`; el registro del candidato y este cierre son documentales.

Cronos repitió en https://www.alsdevstudio.com/ Pages 4/4 e integración 10/10 PASS. Después de corregir el ensayo descrito abajo, ejecutó `node test-results/sarin-motion-frames.mjs` con las variables `SARIN_QA_BASE=https://www.alsdevstudio.com`, `SARIN_MODULE_DELAY=1200` y `SARIN_QA_LABEL=production-root`: exit 0, 16/16 registros PASS, cero errores. En 390/1440 px el controlador permaneció idle y visible, antes de DCL, a 1724/1578 ms; analytics.js seguía retenido. El aviso abierto tampoco consumió la escena y rechazar activó la entrada. Nombre y descripción parciales/finales conservan sus rectángulos, altura y lectura; ninguna solicitud externa o de medición en author.

Capturas de móvil y escritorio inspeccionadas. Chrome real confirma author finished, originales completos, clones vacíos, globo visible y sin overflow; captura `test-results/sarin-author-live-chrome.jpg`. Informes finales `sarin-author-production-scenes.json` y `sarin-author-production-frames.json`; informe bruto de repetición `sarin-motion-frames-production-root.json`.

Revisión HTTP independiente: ocho recursos 200 iguales al build (solo normalización CRLF/LF en texto), canonical www/indexable, CSP/Analytics intactos y cuatro redirecciones 301 con ruta/query conservadas. Sin bloqueantes. Cronos comprobó que el diff de archivos públicos contra `f46e181` es vacío antes del cierre; no se amplió el alcance de la publicación autorizada.

## Prueba de carga lenta

La primera ejecución de fotogramas en producción falló en la premisa temporal del ensayo: el plazo fijo de 800 ms para retener analytics.js venció antes de inicializar el controlador. No hubo errores de página y author permaneció idle. Se reprodujo la carrera reteniendo mascot-scenes.js 1200 ms; la observación llegó a 1601 ms, con la escena sin consumir y el aviso abierto. Evidencia conservada en `test-results/sarin-author-production-initial-race.json` y `sarin-motion-race.json`.

El ensayo ahora libera analytics.js después de observar el controlador idle, al menos 60% visible, antes de DOMContentLoaded y sin animaciones. La espera se libera también en finally. El módulo se demora 1200 ms para comprobar dependencias lentas; después se observa el aviso abierto durante 700 ms y se rechaza antes de comprobar la reproducción. Esta corrección afecta únicamente a la herramienta de QA; los archivos públicos permanecen idénticos al candidato.

## Reversión

Base conocida `3a69dec3da7b8da8457db454198a59e055482745`. Revertir el commit funcional mediante commit nuevo y push normal a main; resolver la documentación manteniendo la evidencia, esperar Pages y verificar recuperación de la firma estática y las siete escenas anteriores. Sin cambios de DNS, correo, hosting, analítica ni almacenamiento.
