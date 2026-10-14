# Sarin sin botón circular de pausa

Solicitud del titular, 2026-10-14: retirar el icono circular de pausa señalado junto al vuelo. Se conserva el recorrido repetido con parada central, saludo y continuación. Corrección de las animaciones cuya publicación fue autorizada expresamente en esta sesión.

## Diseño

Se retiran el button circular y sus siete reglas CSS exclusivas. Su referencia pasa a ser opcional en las dos validaciones del controlador, para continuar el vuelo sin pausa manual. No se añade ningún control visual junto a Sarin ni se vincula el botón de la franja. El banner, sus atributos y módulo permanecen iguales a la base.

La revisión independiente señaló que retirar toda pausa manual del bucle automático pierde el mecanismo de [WCAG 2.2.2](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html). Se consultó la fuente primaria y se presentó una alternativa. El titular respondió explícitamente «no quiero que aparezca ni ue se pause, debe seguir el ciclo normal»; esa instrucción prevalece sobre la recomendación. El borrador compartido se retiró antes de cualquier publicación. Este límite de accesibilidad queda registrado y no se afirma conformidad completa; no hay un hallazgo crítico de seguridad.

Se conservan las suspensiones automáticas al salir de pantalla u ocultar la pestaña, y la fase al redimensionar. Movimiento reducido, falta de APIs o sin JavaScript mantienen la pose estática. El recorrido conserva su detención central y saludo como partes del ciclo normal solicitado.

## Verificación

RED inicial observado: el caso sin botón daba static frente a idle. Cronos revisó la retirada final y repitió `node --test .github/cloudflare/mascot-scenes.test.mjs`: 52/52 PASS, incluido el caso actualizado sin botón, suspensión/reanudación y movimiento reducido. Build tests 12/12 PASS; build final 187 archivos / 4.901.633 bytes. TSC aislado estricto del módulo y diff-check PASS; permanece el límite de errores globales de Analytics ya registrado, archivo intacto.

`node test-results/sarin-no-icon-qa.mjs`: seis casos PASS en 390/1440, sin errores ni solicitudes externas. Ausencia del botón en DOM, bucle Infinity, detención real/saludo, continuación, pausa al salir de viewport, reanudación, reducido y noJS estáticos. Capturas inspeccionadas; reporte `test-results/sarin-no-icon-local.json`. Revisión independiente confirma diff público exacto: un botón, siete reglas CSS, dos guardas; ningún bus compartido, cambio de banner, secreto o red nueva.

QA Chromium no equivale a una auditoría completa de lectores de pantalla o conformidad WCAG.

## Candidato verificado

Fuente funcional `645a8e13a2fffc7fb125b5b0df6639dc53f8562b`, rama `feat/sarin-sin-icono-pausa`, preview https://5f9682d3.alsdevstudio.pages.dev/. Cronos repitió Pages 4/4 y QA focal 6/6 PASS en línea, inspeccionó la captura de escritorio y confirmó el resultado sin errores o redes externas. Revisión HTTP independiente: cinco recursos iguales a dist, sin círculo ni vínculo compartido; noindex/canonical/CSP/analytics y cuatro redirecciones 301 conservadas. Informes `sarin-no-icon-preview.json` y `sarin-no-icon-http-preview.json`.

Promoción dentro de la corrección solicitada sobre las animaciones publicadas y autorizadas expresamente en la sesión, incorporando la aclaración del titular de no añadir pausa manual. Este registro es documental y conserva los archivos públicos del candidato.

## Producción verificada

Publicada en main `8a1c866e99f309e003d6db9ae73e4f1986c90f16`, despliegue `641a174b`, con la misma fuente pública `645a8e1`. Cronos repitió en www Pages 4/4 y QA focal 6/6 PASS, sin errores o solicitudes externas. Chrome real confirma flight playing, cero botones de vuelo, cero vínculo compartido, banner controlando solo services-banner y sin overflow. Captura `test-results/sarin-no-icon-live-chrome.jpg`.

Revisión HTTP independiente: cinco recursos 200 idénticos a dist normalizando CRLF/LF, módulo revisado, WWW indexable/canonical, CSP/analytics intactos y cuatro redirecciones 301 conservadas. Informes `test-results/sarin-no-icon-production.json` y `sarin-no-icon-http-production.json`. El cierre es documental; el diff público contra la fuente funcional permanece vacío.

## Reversión

Base conocida `933256b`. Revertir el commit funcional mediante commit nuevo y push normal a main, conservar este registro y esperar Pages. Verificar restauración del botón circular, pausa propia del vuelo y control original del banner. Sin cambios de DNS, correo, hosting, analítica, almacenamiento ni plan.
