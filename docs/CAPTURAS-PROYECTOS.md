# Vistas de proyectos y actualización automática

Fecha: 16 de octubre de 2026. Base de recuperación: `9f3d263`.

## Cambio

Capturas reales de Dialon, Vigia, Sarin Bot y SemanControl a 1440 × 900, con variantes AVIF y WebP de 480, 768 y 1200 px. Galería y carrusel conservan el mismo orden, con 20 proyectos enlazados. Vigia apunta a `/demo/`; SemanControl sustituye su tarjeta provisional por una captura y enlace, y se incorpora al carrusel. Dialon queda identificado como prototipo y Vigia como demo técnica. Las descripciones de Sarin y SemanControl reflejan sus páginas públicas actuales.

## Programación

`.github/workflows/capturas.yml` ejecuta el script existente dos veces al día con `0 5,17 * * *`: 05:00 y 17:00 UTC, equivalentes a 00:00 y 12:00 en Colombia (`America/Bogota`). Trabaja sobre `main` y regenera todos los proyectos enlazados en `index.html`.

GitHub puede retrasar o descartar ejecuciones en períodos de alta carga. La programación indica la hora de solicitud, no garantiza el minuto de finalización. En repositorios públicos GitHub puede desactivar el cron tras 60 días sin actividad. [Documentación oficial](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

Se conserva la ejecución manual mediante **Actions → Capturas de proyectos → Run workflow**, con `solo` opcional. Ejemplo: `dialon,vigia,sarinbotsaas,semancontrol`. El input se pasa como argumento entre comillas mediante una variable de entorno. El workflow valida el build antes de guardar las imágenes y solo hace commit/push si hay cambios; no fuerza sobrescrituras de `main`.

En local: `node .github/capturas/capturar.mjs --solo dialon,vigia,sarinbotsaas,semancontrol`. Las dependencias siguen dentro de `.github/capturas`, sin añadir dependencias al sitio.

La automatización refresca imágenes, no cambia los proyectos de origen, sus enlaces, sus descripciones ni el conocimiento de Sarin. El despliegue del sitio continúa mediante la integración existente de Cloudflare Pages con GitHub.

## Verificación y reversión

Las cuatro capturas se generaron y revisaron visualmente. Build estático: 12/12 pruebas aprobadas. QA de Pages en Chromium con Wrangler 4.150.0: 4/4 pruebas aprobadas, incluyendo referencias, cabeceras, destinos actualizados, 20 tarjetas/diapositivas, accesibilidad del aviso y lectura móvil/sin JavaScript.

QA adicional en 320, 390, 680, 900 y 1440 px: cuatro tarjetas nuevas visibles, imágenes decodificadas, sin desbordamiento y axe sin violaciones automáticas. Recorrido completo de las 20 diapositivas con destino e imagen correctos y retorno al inicio; SemanControl accesible sin JavaScript. Evidencia local en `test-results/proyectos-actualizados-qa.json` y capturas de 390/1440 px. Revisión independiente sin bloqueantes.

Para revertir, crear un commit inverso del commit de esta actualización sobre `main` y dejar que Cloudflare reconstruya. No usar reset ni force push. La programación anterior era semanal, lunes a las 07:00 UTC.
