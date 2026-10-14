# Argentina y proceso con Sarin bot

Fecha: 2026-10-13. Base de producción: `0dc7d74b6a90fb5981ce33fd0f8743f89e4c527a`.

## Cambio

- Argentina se incorpora después de Brasil: ocho ubicaciones ilustrativas, con botón, coordenadas, marcador, ruta y silueta sincronizados. Punto de referencia: 34° S, 64° W.
- El recorrido del mapa pasa a 2000 ms. Conserva la pausa explícita, la selección manual, la suspensión por hover/visibilidad y la navegación manual en móvil o con movimiento reducido.
- Sarin bot explica definir, construir y entregar mediante tres poses y globos HTML. El operador eligió texto, sin voz. Los títulos y compromisos del proceso se conservan.
- Nueva pose `assets/brand/mascot-review.png`: 320×480, 47.047 bytes, alfa real. Generada con la herramienta integrada imagegen a partir de los dos PNG existentes; optimizada con Sharp conservando el alfa. Prompt y procedencia en `assets/brand/mascot-sources.json`, que no se publica.

## Verificación local

- `node --test .github/cloudflare/build.test.mjs`: 12/12 PASS; allowlist actualizada y exclusión de material interno comprobada.
- `node .github/cloudflare/build.mjs`: 183 archivos públicos, 4.756.468 bytes; referencias locales válidas.
- `node --check scripts/modules/global-map.js` y `git diff --check`: PASS.
- `node test-results/map-autoplay-qa.mjs`: PASS, repetido por Cronos. Diez comprobaciones: ocho países, corte fresco Brasil a 1999 ms/Argentina a 2000 ms, ciclo completo y sincronización, pausa/manual/foco, temporizador único, hover, salida/regreso al viewport, móvil y movimiento reducido. Axe sin violaciones; sin errores ni red externa. `document.hidden` y el evento MQL `change` se simulan explícitamente en el emulador; el primer avance a México también se comprueba con tiempo real.
- `node test-results/process-design-qa.mjs`: PASS, repetido por Cronos. Anchos 320/390/680/681/900/901/1440; tres PNG/globos, proporciones y contenido, sin overflow ni solapamientos. Axe sin violaciones a 320/1440, lectura sin JavaScript y movimiento reducido correctos. Sin errores de consola/página ni solicitudes externas.
- Revisión estática independiente y de Cronos: sin hallazgos críticos. Imágenes decorativas, lista ordenada, textos accesibles, contenido local y sin nueva lógica/servicios en el proceso.

Los reportes y capturas de QA quedan en `test-results/` (ignorado por Git y fuera del build público). El rendimiento se revisa proporcionalmente: se reutilizan dos imágenes y se añade una imagen de 47 KB con carga diferida; no se añade JavaScript para Sarin.

La fixture antigua del mapa se adaptó al consentimiento actual, ocho países y el intervalo nuevo. Se corrigieron esperas de layout sujetas al reloj virtual y el paso final de pausa por foco. Esas correcciones afectan solo al arnés de pruebas; no requirieron cambios en la lógica pública de pausa.

## Publicación y reversión

Preparar una rama de preview y comprobar su despliegue antes de promover a `main`. Producción queda pendiente de confirmación explícita del operador según `.cronos/AGENCY.md` y la skill deploy-checklist.

Si falla tras publicar, usar el rollback de Cloudflare Pages al despliegue base `ab94301e-9078-40ed-9912-574a677d7132`, y revertir el commit funcional de este cambio en `main` mediante un nuevo commit normal. No usar force push ni reset remoto. Confirmar que el mapa vuelve a siete países/4200 ms y el proceso a sus tres ilustraciones anteriores. La regla Bulk Redirect del dominio Pages permanece independiente y no requiere reversión.
