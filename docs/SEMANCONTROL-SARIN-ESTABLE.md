# SemanControl y tecleo estable de Sarin

Solicitud del titular, 2026-10-14: reservar un espacio para SemanControl todavía sin push/publicación y corregir el movimiento extraño del personaje con escritorio en la cabecera de Proceso. Continuación independiente de Sarin Bot y vuelo de cinco mensajes, ya publicados con autorización en main `a19c91e`, despliegue `aeb5c225`, cierre documental `76d5a98`.

## Espacio del proyecto

SemanControl se añade después de Sarin Bot como tarjeta20, categoría Producto, con estado «En construcción» y descripción provisional «Proyecto en construcción. Próximamente compartiré más detalles». Article no interactivo, sin href/tabindex/role de control, flecha, subrayado ni inclinación al pasar el puntero. Panel16:10 con reloj de arena decorativo y «Vista previa próximamente»; sin capturas ficticias ni prestaciones inventadas.

Se conserva el carrusel con19 sitios que tienen vista previa real, el orden de los19 enlaces anteriores y los filtros (nueve Productos incluyendo SemanControl). La etiqueta del enlace enviado indica semancontrol.pages.dev pero el destino Markdown apunta a Sarin Bot: no se reutiliza ese destino equivocado ni se abre/publica una aplicación todavía no disponible. El parser de capturas sigue procesando solo anchors HTTPS.

## Causa y corrección de la animación

Los dos PNG de Proceso miden320×384; cabeza, cuerpo, escritorio y patas del fotogramaB están40px a la izquierda de A. Al alternar las opacidades, el personaje salta11px en móvil y13.96px en escritorio. El actor y su rotación no son la causa.

Se registra únicamente el fotograma alternativo de Proceso mediante `translateX(12.5%)` (40/320). Mantiene el contenido opaco dentro del espacio reservado, la pose, alternancia de manos, duración y texto. No se modifican imágenes ni controlador, ni otras poses/escenas. Sin nuevas dependencias, servicios, gasto, permisos, conexiones o cambios a Analytics/CSP.

## Verificación y límites

Cronos repitió RED antes de la regla: nueve casos con fallos de registro esperados, sin errores de ejecución. GREEN nueve casos320/390/1440 × animado/reducido/noJS: desviación máxima0.042px en cabeza y patas, contenido dentro del actor, sin solapamiento con el globo ni overflow y texto/fallback final conservados. Capturas A/B desktop y móvil inspeccionadas.

Placeholder6/6 en320/1440 normal/reducido/noJS: semántica/control-free, aspecto y geometría, filtros/teclado, orden y carrusel19→1. Se corrigió solo el harness nuevo para reconocer `aria-hidden` heredado del padre del SVG. Integración existente10/10 en320/390/680/681/900/901/1440, noJS/reducido/axe PASS; TSC aislado de depth/sintaxis/diff-check PASS. Build198archivos/5.198.797bytes. Revisión focal del cambio sin hallazgos críticos. No se afirma auditoría completa WCAG ni se modifica la decisión previa de vuelo sin pausa manual.

Evidencia local ignorada por Git: `test-results/sarin-process-registration-red-root.json`, `sarin-process-registration-green-root.json`, `seman-qa-local.json`, `seman-local-scenes.json`, `seman-last-row-normal-1440-local.png` y capturas A/B de registro. Los tests Pages incorporan conteo20/19 y placeholder no interactivo.

## Reversión

Base `76d5a98`. Revertir el commit funcional de esta continuación mediante commit nuevo y push normal a main; esperar Pages y verificar retorno de19 tarjetas/carrusel y CSS anterior. No force push, migraciones, DNS, datos, servicios ni assets nuevos. Sarin Bot y vuelo de cinco mensajes permanecen en la base. Publicación de esta continuación pendiente de candidato revisado y confirmación explícita del titular.
