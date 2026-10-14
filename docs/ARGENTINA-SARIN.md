# Argentina y proceso con Sarin bot

Fecha: 2026-10-13. Base de producción: `0dc7d74b6a90fb5981ce33fd0f8743f89e4c527a`.

El titular pidió añadir a la entrega WhatsApp a la izquierda y correo a la derecha. Después respondió «Sí, publicar los cambios» a la autorización pendiente. Se incorpora el ajuste solicitado al mismo release, con QA adicional antes de promover a `main`.

## Cambio

- Argentina se incorpora después de Brasil: ocho ubicaciones ilustrativas, con botón, coordenadas, marcador, ruta y silueta sincronizados. Punto de referencia: 34° S, 64° W.
- El recorrido del mapa pasa a 2000 ms. Conserva la pausa explícita, la selección manual, la suspensión por hover/visibilidad y la navegación manual en móvil o con movimiento reducido.
- Sarin bot explica definir, construir y entregar mediante tres poses y globos HTML. El operador eligió texto, sin voz. Los títulos y compromisos del proceso se conservan.
- Contacto: WhatsApp primero en HTML, izquierda en escritorio y arriba hasta 900 px; correo/presentación a la derecha o debajo. Columnas y divisor reflejados; encabezado común accesible «Contacto» y ambos subtítulos en nivel3. Sin cambios en la lógica, mensajes ni destinos de contacto.
- Nueva pose `assets/brand/mascot-review.png`: 320×480, 47.047 bytes, alfa real. Generada con la herramienta integrada imagegen a partir de los dos PNG existentes; optimizada con Sharp conservando el alfa. Prompt y procedencia en `assets/brand/mascot-sources.json`, que no se publica.

## Verificación local

- `node --test .github/cloudflare/build.test.mjs`: 12/12 PASS; allowlist actualizada y exclusión de material interno comprobada.
- `node .github/cloudflare/build.mjs`: 183 archivos públicos, 4.756.468 bytes; referencias locales válidas.
- `node --check scripts/modules/global-map.js` y `git diff --check`: PASS.
- `node test-results/map-autoplay-qa.mjs`: PASS, repetido por Cronos. Diez comprobaciones: ocho países, corte fresco Brasil a 1999 ms/Argentina a 2000 ms, ciclo completo y sincronización, pausa/manual/foco, temporizador único, hover, salida/regreso al viewport, móvil y movimiento reducido. Axe sin violaciones; sin errores ni red externa. `document.hidden` y el evento MQL `change` se simulan explícitamente en el emulador; el primer avance a México también se comprueba con tiempo real.
- `node test-results/process-design-qa.mjs`: PASS, repetido por Cronos. Anchos 320/390/680/681/900/901/1440; tres PNG/globos, proporciones y contenido, sin overflow ni solapamientos. Axe sin violaciones a 320/1440, lectura sin JavaScript y movimiento reducido correctos. Sin errores de consola/página ni solicitudes externas.
- Revisión estática independiente y de Cronos: sin hallazgos críticos. Imágenes decorativas, lista ordenada, textos accesibles, contenido local y sin nueva lógica/servicios en el proceso.
- Tras el cambio de contacto: build12/12PASS, 183 archivos/4.756.598 bytes. Verificación de navegador a 320/390/900/901/1440: orden visual y Tab/Shift+Tab correctos; tres selecciones por Espacio sincronizan estado/mensaje/número, mailto íntegro. Axe del contacto sin violaciones a320/1440, sin overflow/errores/red externa y lectura/enlace inicial sinJS. Capturas `test-results/contact-order-*.png` y reporte `test-results/contact-order-results.json`. Revisión estática final independiente sin bloqueantes.

Los reportes y capturas de QA quedan en `test-results/` (ignorado por Git y fuera del build público). El rendimiento se revisa proporcionalmente: se reutilizan dos imágenes y se añade una imagen de 47 KB con carga diferida; no se añade JavaScript para Sarin.

La fixture antigua del mapa se adaptó al consentimiento actual, ocho países y el intervalo nuevo. Se corrigieron esperas de layout sujetas al reloj virtual y el paso final de pausa por foco. Esas correcciones afectan solo al arnés de pruebas; no requirieron cambios en la lógica pública de pausa.

## Publicación y reversión

Rama `design/sarin-argentina`, commit funcional `7c981e10fe1732ce7eb853c7ce4a5e0721b1a5bf`. Preview verificado: https://8f2ced74.alsdevstudio.pages.dev/ (despliegue `8f2ced74-33e9-482f-9dad-947e70bed670`).

Ese hostname fue retirado posteriormente a petición del titular: ahora301haciawww, conservando rutas/query. Las comprobaciones de preview siguientes registran el estado anterior a ese ajuste; ver `PAGES-CANONICAL.md`.

- `PAGES_QA_BASE=https://8f2ced74.alsdevstudio.pages.dev node --test .github/cloudflare/pages.test.mjs`: 4/4 PASS. Artefactos, cabeceras, noindex de preview, enlaces/404, consentimiento, mapa y lectura legal a 320/1440 y sin JavaScript correctos.
- Los tres PNG publicados coinciden byte a byte con `dist`. SVG y módulo del mapa coinciden como texto normalizando exclusivamente CRLF/LF del checkout Windows/Git; la comparación binaria inicial detectó solo cuatro CR adicionales en el SVG.
- Chrome del operador: Sarin con tres poses/globos y Argentina seleccionada con coordenadas y silueta correctas. Evidencia: `test-results/sarin-preview-chrome.jpg` y `test-results/argentina-preview-chrome.jpg`.
- `https://alsdevstudio.pages.dev/?qa=sarin`: 301 a `https://www.alsdevstudio.com/?qa=sarin`, conservado.

El candidato final con contacto, commit `eb484ee4c00a475dac554b2751dc93fd3be980d3`, fue verificado en https://123b8648.alsdevstudio.pages.dev/ (despliegue `123b8648-ae80-4bd5-96ff-13210026df9b`): Pages4/4PASS y revisión visual en Chrome. Captura `test-results/contact-order-preview-chrome.jpg`.

Producción autorizada por el operador y aplicada mediante fast-forward normal y push a `main`. Despliegue funcional `4603e875-5d45-4b89-86f0-67bf749fd6e1`, fuente `eb484ee4c00a475dac554b2751dc93fd3be980d3`. URL: https://www.alsdevstudio.com/.

- `PAGES_QA_BASE=https://www.alsdevstudio.com node --test .github/cloudflare/pages.test.mjs`: 4/4 PASS. HTML/CSS y documentos coinciden normalizando CRLF/LF; cabeceras, enlaces/404, consentimiento y navegación/lectura a320/1440 y sinJS correctos.
- Nueva pose PNG idéntica byte a byte; SVG y módulo del mapa iguales normalizando solo CRLF/LF. Assets de producción sin noindex. Pages301 hacia www con query conservada.
- Chrome del operador: contacto con WhatsApp izquierda y correo derecha; captura `test-results/contact-order-live-chrome.jpg`. Vista de producción dejada abierta.
- Los commits posteriores de cierre son exclusivamente documentales y conservan los archivos públicos verificados.

Si falla tras publicar, usar el rollback de Cloudflare Pages al despliegue base `ab94301e-9078-40ed-9912-574a677d7132`, y revertir los commits funcionales en orden inverso (`eb484ee`, después `7c981e1`) en `main` mediante nuevos commits normales. No usar force push ni reset remoto. Confirmar que el mapa vuelve a siete países/4200 ms, el proceso a sus tres ilustraciones anteriores y el contacto a correo izquierda/WhatsApp derecha. La regla Bulk Redirect del dominio Pages permanece independiente y no requiere reversión.

## Corrección de altura de los globos · 2026-10-13

El titular solicita retirar «Te cuento cómo cerramos:» e igualar los tres recuadros del componente Sarin ya autorizado para publicación en la sesión. Ajuste acotado en HTML/CSS: el párrafo inicia «Comprobamos», se conserva el resto y se usan filas adaptativas de Grid, manteniendo poses, lectura y breakpoints. En el apilado se reserva el mismo borde de1px en cada etapa para conservar la igualdad exacta.

Verificación por Cronos: build12/12PASS y183archivos/4.756.905bytes; `node test-results/process-design-qa.mjs` PASS en los siete anchos320/390/680/681/900/901/1440, con alturas de globo idénticas por ancho (252,6875px en1440;233,1875px en390), contenido restante, poses/proporciones, sin overflow/solapamiento ni errores/red externa. Axe320/1440sinviolaciones, reduced-motion y lectura sinJS correctos. Revisión estática independiente y de Cronos sin hallazgos críticos; no hay cambios de scripts, dependencias ni estilos de contacto/mapa. Reporte y capturas en `test-results/`.

Candidato https://39699e3a.alsdevstudio.pages.dev/ verificado200/noindex, HTML/CSS idénticos al build normalizando únicamente CRLF/LF. Fuente funcional `775512013b575d3bede713e99656918a51478ab9`, promovida a main y publicada en el despliegue `3649cae6-66ce-4338-b0d3-0b7e89071952`.

Producción https://www.alsdevstudio.com/#proceso:200/indexable, HTML/CSS iguales al build revisado. Chrome del operador, viewport1780px: frase retirada, tres globos252,6875px, sinoverflow. Captura `test-results/process-equal-live-chrome.jpg`; vista principal dejada abierta. Los commits de cierre documental no modifican el contenido público.

Reversión de esta corrección: revertir únicamente `7755120` mediante otro commit normal. Base previa `3de42d6`; no revertir Argentina/Sarin/contacto ni las redirecciones de cuenta. Verificar que regresa la frase y el comportamiento anterior de altura. Sin datos, dependencias, servicios ni gasto nuevos.

## Retirada de cinco etiquetas · 2026-10-13

El titular solicita quitar «01 / alcance global», «02 / proyectos», «03 / proceso», «Por WhatsApp» y «04 / contacto». Se eliminan sus nodos HTML y el wrapper de WhatsApp; los márgenes superiores de los títulos quedan0. Se conservan encabezados/IDs/anclas, controles, enlaces y otros rótulos de marca.

QA local de Cronos: build12/12PASS,183archivos/4.756.627bytes. Navegador320/390/900/901/1440PASS: títulos íntegros, ausencia de cinco etiquetas, márgenes0, globos iguales, sin overflow. MapaArgentina y opción WhatsApp porEspacio/Tab con número/mensaje correctos; mailto intacto. Axe main320/1440sinviolaciones, sin errores ni solicitudes externas. SinJS: encabezados HTML y enlaces nativos conservados. Reporte `test-results/section-labels-qa.json` y capturas `labels-*.png`. La comparación inline inicial de títulos se corrigió por la codificación del pipe Windows usando escapes Unicode; el contenido del sitio conservó sus acentos. Revisión estática independiente y de Cronos sin hallazgos críticos; sin cambios de scripts/assets/dependencias.

Reversión: revertir únicamente el nuevo commit funcional de esta retirada mediante commit normal; basef8d12e4. Confirmar que regresan las cinco etiquetas y sus márgenes. No revertir otros cambios del sitio ni redirecciones de cuenta.
