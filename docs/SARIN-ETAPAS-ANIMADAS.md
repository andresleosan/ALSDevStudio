# Animaciones de las tres etapas de Sarin

Solicitud del titular, 2026-10-13: animar también las tarjetas Definir, Construir y Entregar, con su texto apareciendo junto a la animación. Es una extensión concreta del componente Sarin y de las animaciones autorizadas en la sesión.

## Diseño

- Definir: pose de bienvenida con un saludo suave. Construir: dos poses de tecleo, con cuerpo fijo. Entregar: inclinación leve del personaje de revisión y aparición de una señal de aprobación.
- Se reutilizan los PNG locales y un SVG decorativo; no se genera arte ni se añaden dependencias, conexiones o proveedores.
- Cada tarjeta se reproduce una vez cuando alcanza 60% de visibilidad. Un reloj de 3,6 segundos sincroniza el personaje y la escritura: primero el título, después la explicación.
- El texto original completo permanece en HTML y en el árbol accesible. La copia progresiva es decorativa, sin anuncios por letra. Espacio reservado para conservar alturas y evitar saltos. Todos los textos originales y las tres tarjetas iguales se mantienen.
- Movimiento reducido, falta de APIs o JavaScript: poses y texto completo visibles. Al terminar, salir, ocultar la pestaña, cambiar tamaño o fallar, se limpian los efectos y todas las copias.

## Validación local

RED de dos casos nuevos observado antes de implementar. Cronos revisó los archivos y repitió:

- `node --test .github/cloudflare/mascot-scenes.test.mjs`: 42/42 PASS, incluidas las 36 regresiones previas. Verifica título→párrafo, threshold real, gesto/tecleo/aprobación, una vez, fallback, error en segundo overlay y limpieza de ambos pares.
- `node --test .github/cloudflare/build.test.mjs`: 12/12 PASS. Build de187archivos públicos/4.898.563bytes.
- `node test-results/sarin-scenes-qa.mjs`: 10 casos PASS; siete escenas, 320/390/680/681/900/901/1440 px, sin JS, reducido y axe main320/1440 sin violaciones. Sin errores ni conexiones externas.
- `node test-results/sarin-motion-frames.mjs`: 14 registros PASS. Incluye saludo/encabezados/anclas previos y tres tarjetas, con títulos y párrafos parciales/finales capturados mediante scroll real en390/1440. Todos los rectángulos original/clone difieren0px, alturas estables/iguales y señal de aprobación sin recorte ni solape. Capturas inspeccionadas por Cronos.
- Sintaxis, TSC aislado estricto del módulo y `git diff --check`: PASS. TSC global conserva la limitación anterior de11errores en analytics.js, archivo intacto.

Informes locales: `test-results/sarin-steps-local-scenes.json` y `sarin-steps-local-frames.json`. El ensayo conservaba un prefijo anterior de Entregar; se actualizó a la base pública aprobada «Comprobamos…», sin cambios de redacción del producto.

Seguridad y revisión independiente: guardas de todos los pares antes de ocultar originales, clones decorativos, encabezados/lista conservados y cleanup central. Texto fijo mediante textContent; sin datos, secretos, dependencias, red, permisos, CSP o integraciones nuevas. Sin bloqueantes. QA Chromium no sustituye una evaluación con lector de pantalla.

Pendiente candidato Pages y promoción dentro de la revisión de las animaciones autorizadas en esta sesión.

## Reversión

Base pública conocida `f007f93a9905ebe3411e4546f6c1e582812a5191`. Revertir el commit funcional mediante un nuevo commit normal, resolver documentos conservando la evidencia y hacer push a main; esperar Pages y verificar la recuperación de las tres tarjetas estáticas. No cambia DNS, correo, analítica, almacenamiento ni plan. El saludo en vuelo y el tecleo de los encabezados permanecen en la base.
