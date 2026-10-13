# Revisión de diseño y código de ALS DevStudio

13 de octubre de 2026. Cambios locales, pendientes de revisión visual del titular; sin publicación.

Se aplicó Antislop en modo `during`, elegido por el titular. Fuente: [miqdadbadjuber/anti-slop](https://github.com/miqdadbadjuber/anti-slop/tree/9685ca7eac70283d083fc23baa9a88e7d3cd93c4). Se leyeron las instrucciones y los módulos de UI, texto y comentarios. No se ejecutaron instaladores ni se modificaron instrucciones globales.

La dirección conserva la identidad documentada en STACK.md: tinta, blanco, verde, tipografía geométrica y órbita de ALS. ENERGY 2 / RHYTHM 2 / MOTION 3; el movimiento de profundidad queda en la escena de marca y el mapa. Galería, proceso y contacto permanecen estables.

## Cambios

- Portada: texto específico sobre los servicios y el desarrollador; énfasis verde sólido, captura sin etiquetas superpuestas ni tarjetas fantasma. Se conserva la órbita.
- Galería: 18 capturas con título y descripción fuera del marco; filtros subrayados con objetivos de 44 px. BPT y Hampton Estates conservan su posición conjunta; Dialon y Vigia conservan el estado en construcción.
- Proceso: filas que separan fase, objetivo y explicación. Se retiraron números gigantes, efectos al pasar el puntero y afirmaciones genéricas sobre crecimiento.
- Contacto: correo destacado y opciones de servicio en filas, con estado visual y `aria-pressed`. La flecha se reserva para enlaces; seleccionar un servicio no simula navegar. Aviso de privacidad conservado.
- Código: retirados estilos de componentes eliminados, duplicaciones responsive, cálculos de parallax sin consumidor y listeners de brillo en las tarjetas. Comentarios breves que conservan tipos, limitaciones y razones de accesibilidad/rendimiento.
- Sin JavaScript se ocultan filtros, opciones de servicio y controles del carrusel; permanecen los enlaces de proyectos, correo y WhatsApp inicial. La etiqueta inicial del carrusel coincide ahora con La Parada incluso sin JavaScript.

Referencias consultadas con el MCP de Mobbin: [Büro](https://mobbin.com/sites/sections/2c741505-173b-4cfa-a885-ca4429184887) para priorizar imágenes y metadata; [Cloudstudio](https://mobbin.com/sites/sections/48890788-7d16-4887-baaa-5b22583ef055) para jerarquía de proyectos; [basement.studio](https://mobbin.com/sites/sections/a2f3898a-cd70-4d7d-b549-5f5dbb5a9fa6) para contacto directo. Se usaron como referencias de composición; sus imágenes no se incorporaron al sitio.

## Corrección del carrusel

Las capturas anteriores y posteriores mostraron un recorte del footer en Chromium. La geometría y el hit testing de los botones eran correctos, pero su pintura se cortaba entre planos 3D. Experimentos separados descartaron tamaño, `overflow`, el plano del carrusel y la perspectiva por sí sola. `transform-style:flat` en `.hero-visual` corrigió el recorte manteniendo inclinación y perspectiva. Se inspeccionó el resultado con movimiento normal y reducido.

## Pruebas ejecutadas

- `node test-results/design-qa.mjs`: PASS. Filtros Todos/Producto/Web/Sistemas; 18 capturas decodificadas y enlaces sincronizados del carrusel; selección de servicios con Espacio; correo con Tab/Shift+Tab; menú con Enter/Escape y navegación de sus enlaces.
- Anchos 320, 390, 768, 1024 y 1440 px: sin desbordamiento horizontal; filtros, opciones y correo de al menos 44 px. Ampliación CSS al 200 % sin desbordamiento, sin equipararla a zoom nativo del navegador.
- axe 4.14.0, reglas WCAG 2 A/AA, 2.1 AA y 2.2 AA: cero violaciones automáticas en las dos dimensiones revisadas. Las superficies complejas conservan comprobaciones de contraste que axe no resuelve automáticamente.
- `node test-results/privacy-final.mjs`: PASS durante la iteración, con ocho auditorías automáticas de portada y documentos legales, restablecimiento de preferencias y comprobación de recursos locales. La prueba final de diseño vuelve a verificar cero cookies, terceros automáticos o errores de consola/HTTP.
- `node --check` del punto de entrada y módulos: PASS. `git diff --check`: PASS; advertencias de normalización LF/CRLF no son errores.
- Capturas de portada, galería, proceso y contacto a 1440 y 390 px inspeccionadas, con movimiento normal y reducido. Evidencia en `test-results/design-final-*.png` y `test-results/design-final-normal-*.png`.
- Revisión independiente del DOM: 18 tarjetas y 18 diapositivas conservadas, sin IDs duplicados ni referencias internas/ARIA rotas. Sus dos hallazgos menores (cálculos sin consumidor y comentario de profundidad desactualizado) se corrigieron.

## Delivery Gate de Antislop

El estado siguiente cubre las modificaciones de DESIGN-01. No sustituye una auditoría exhaustiva del sitio, de los proyectos enlazados o de los documentos legales pendientes.

### 1. Hard Gate

| Regla | Estado y evidencia |
| --- | --- |
| R-02 | PASS: textos nuevos y metadata sin raya larga; nombres y datos existentes conservados. |
| R-03 | PASS: cinco anchos y controles de 44 px verificados en Chromium. |
| R-17, R-18, R-36, R-38 | PASS: no se añadieron cifras de resultados, testimonios, credenciales o clientes. Identidad, ciudad, servicios y correo proceden del contexto confirmado. |
| R-23 | PASS: sin nuevos logos, retratos ni imágenes; capturas y navegación existentes. |
| R-24, R-26 | PASS: anclas válidas, filtros y selección probados; correo y WhatsApp mantienen sus contratos de enlace. No se enviaron mensajes. |
| R-25 | PASS en componentes modificados: contraste calculado y revisión visual. Texto de contacto 16,45:1; secundario 5,70:1, seleccionado 5,19:1 y hover 5,09:1; CTA hover 5,02:1. Evidencia `design-contrast.json`. |
| R-27 | PASS para el alcance estático: capturas y enlaces disponibles sin datos remotos; se conserva la degradación de formatos de imagen. No se añadió formulario, API ni estado de carga remoto. |
| R-28 | No aplica: no se añadió FAQ. |
| R-32 | PASS: teclado, selección, foco y menú verificados. |
| R-33 | PASS: edición directa de HTML/CSS/JS; scripts solo para pruebas, capturas y lectura de evidencias. |
| R-34 | No aplica: no se introdujo selector de tema. |
| R-35 | PASS: sitio ejecutado; recorrido detallado y resultados en `test-results/design-qa.json`. |
| R-37 | PASS: dirección previa de ALS conservada y decisiones escritas en STACK.md antes de implementar. |

### 2. Purpose-Gate

| Regla | Estado y evidencia |
| --- | --- |
| R-01, R-06, R-07 | PASS: paleta, familias y órbita responden a la identidad previa; se retiró el degradado animado del titular y los chips. |
| R-04, R-08 | PASS: sin iconos decorativos nuevos; las flechas acompañan enlaces, los círculos indican selección. |
| R-09 | PASS: se eliminaron las cápsulas flotantes sobre la captura; estados de construcción reales conservados. |
| R-10, R-12, R-13 | PASS en componentes modificados: se retiraron desenfoques y brillos de tarjetas/etiquetas; contacto sin sombra ni superficies transparentes superpuestas. |
| R-14 | PASS: galería de proyectos comparable, proceso en filas y contacto dividido por canal, cada composición con propósito documentado. |
| R-19, R-22 | PASS: profundidad reservada a la escena original y mapa; controles estables, movimiento reducido verificado, imágenes reales existentes. |

### 3. Liveliness

| Criterio | Estado y evidencia |
| --- | --- |
| Lectura y diales | PASS: ENERGY 2 / RHYTHM 2 / MOTION 3 documentados antes de implementar. |
| Foco y jerarquía | PASS: titular y captura en portada; evidencia visual en galería; correo y servicio elegido en contacto. |
| Espacio y ritmo | PASS: títulos fuera de las capturas; fases separadas por reglas; división de canales en contacto, apilados en móvil. |
| Acento e identidad | PASS: verde en titular, selección y acciones; órbita, tipografía y proyectos propios de ALS conservados. |

### 4. Craftsmanship y Quality Locks

| Criterio | Estado y evidencia |
| --- | --- |
| C-1, R-20, R-31 | PASS: motivo escrito para paleta, tipografía, composición, espacio, capturas e indicadores. |
| C-2, C-4 | PASS en recorridos probados: controles, teclado, responsive, imágenes y degradación sin JavaScript. |
| C-3, R-05, R-11 | PASS: secuencia de trabajo con contenido concreto, composición distinta de la galería y radios según función. |
| C-5, R-15, R-16 | PASS: acciones «Ver proyectos» y «Conversar por WhatsApp», servicios descritos sin promesas de resultados. |
| R-21, R-29 | PASS: tema existente de la marca, superficie clara en contacto; no se añadió un sistema de temas innecesario. |
| R-30 | PASS: referencias de Mobbin interpretadas, sin trasladar sus assets o clonar sus páginas. |
| Código | PASS: comentarios sin narración redundante; tipos y contratos preservados. Limpieza de comportamiento revisada aparte de la limpieza de comentarios. |

## Límites y pendientes

La prueba automatizada no certifica accesibilidad completa. No se probó lector de pantalla, Safari, Firefox ni sensores de un dispositivo físico. El contraste sobre el mapa y algunas superficies originales requiere evaluación manual adicional; no se declara resuelto por un resultado de axe.

Los enlaces de proyectos se compararon con los destinos existentes y las capturas se decodificaron localmente; esta revisión no afirma que los 18 sitios externos estén siempre disponibles. No se verificó entrega de correo ni se enviaron mensajes por WhatsApp.

Los borradores y asuntos pendientes de privacidad continúan en `docs/PRIVACIDAD-Y-CUMPLIMIENTO.md`. No se publicaron políticas incompletas ni se efectuó push. No se instalaron dependencias de producto, no se crearon endpoints y no se añadieron conexiones automáticas a terceros. No se identificaron hallazgos críticos de seguridad en los cambios revisados.
