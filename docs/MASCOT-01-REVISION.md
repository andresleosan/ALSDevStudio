# Mascota ALS en portada y contacto

13 de octubre de 2026. Integración local; sin commit, push ni publicación.

La pose de pie acompaña la firma de Andrés en portada. La pose con laptop aparece debajo del correo en contacto. Ambas permanecen en el flujo de la página y disminuyen de tamaño en móvil; no cubren capturas, textos ni controles. Se mantienen el logo de navegación, los 18 proyectos y los avisos existentes.

## Recursos y procedencia

- `assets/brand/mascot-welcome.png`: 224 × 295 px, 29.654 bytes; visible a 72 px de ancho en escritorio y 56 px en móvil.
- `assets/brand/mascot-laptop.png`: 320 × 322 px, 36.816 bytes; visible a 128 px de ancho en escritorio y 88 px en móvil.
- Total: 66.470 bytes, aproximadamente 65 KiB. Ambos archivos tienen transparencia real, comprobada en sus canales y visualmente sobre los fondos oscuro y claro del sitio.
- Son versiones adaptadas por imagegen desde las capturas del titular, no recortes exactos de los originales. Con su confirmación expresa se retiró localmente la cuadrícula opaca, se recortaron márgenes y se optimizaron los PNG. Procedencia y prompts en `assets/brand/mascot-sources.json`.

## Implementación y revisión

HTML y CSS únicamente. Dimensiones intrínsecas declaradas para reservar la proporción antes de cargar; prioridad baja para ambas imágenes y carga diferida en contacto. Se usa `image-rendering:pixelated`. Son decorativas junto al contenido de marca: `alt=""`, sin foco, enlaces implícitos ni animaciones nuevas.

Revisión de seguridad del cambio: recursos locales y estáticos, sin entradas del visitante, scripts, dependencias de navegador, almacenamiento o conexiones externas añadidos. Sin hallazgos críticos en este alcance.

Antislop durante la implementación: se conservan ENERGY 2 / RHYTHM 2 / MOTION 3. La mascota es un recurso específico solicitado por el titular; su uso no introduce nuevos bloques genéricos, frases comerciales, estadísticas ni testimonios. El foco sigue en proyectos y contacto. Las imágenes no se presentan como controles. Se revisaron identidad, jerarquía, adaptación y funcionamiento mediante las capturas y pruebas indicadas a continuación.

## Evidencia

- `node test-results/mascot-qa.mjs`: PASS en 320, 390, 680, 681, 900, 901, 1024 y 1440 px. Ambas imágenes se decodifican y conservan su proporción; sin solapamiento con firma, correo o controles del contacto y sin desbordamiento horizontal. Carga sin JavaScript a 320 px y cero errores de página/HTTP.
- `node test-results/design-qa.mjs`: PASS en las 19 comprobaciones existentes, incluidos los 18 proyectos, carrusel, filtros, teclado, correo, WhatsApp, menú, movimiento reducido y ampliación CSS al 200 %. Sin errores de consola/HTTP ni terceros automáticos en la visita local.
- Axe: cero violaciones automáticas en 320 y 1440 px. Persiste la revisión manual de contraste en superficies complejas del diseño existente; no equivale a certificación de accesibilidad ni a una prueba de lector de pantalla.
- Inspección visual de portada y contacto en 1440 y 390 px: PNG sin cuadrícula, contornos legibles y controles libres.
- Revisión independiente del HTML/CSS, selectores de módulos y prueba de mascota: sin conflictos ni hallazgos bloqueantes. El barrido de ocho anchos usa movimiento reducido y contexto de escritorio; verifica adaptación de ancho, no dispositivos físicos ni gestos táctiles. La inspección visual complementa la cobertura de solapamiento en portada.
- `git diff --check`: PASS. No se ejecutó publicación.

Resultados y capturas locales: `test-results/mascot-qa.json`, `test-results/mascot-assets.json`, `test-results/design-qa.json` y `test-results/mascot-*.png`. La carpeta de evidencias está excluida de Git. Los pendientes legales anteriores siguen documentados por separado.
