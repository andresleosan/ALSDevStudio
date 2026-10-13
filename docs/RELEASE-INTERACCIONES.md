# Interacciones y proceso · 13 de octubre de 2026

Push solicitado por el titular tras aprobar localmente las cuatro mejoras. Base: `e1675dbd9ad1099dbfb361d9414e130798cb83d0`.

## Cambios

- Tarjetas de proyectos: inclinación con el cursor, elevación y brillo; retorno al salir y limpieza al cambiar preferencias. Movimiento limitado a escritorio compatible.
- Mapa: recorrido de siete países cada 4,2 segundos con pausa/reanudación, elección manual estable, suspensión por visibilidad y respeto de movimiento reducido. No anuncia cada avance automático.
- Proceso: tres etapas ilustradas en una superficie continua, adaptación a móvil y lista ordenada visible sin JavaScript. Conserva el texto y los compromisos anteriores.
- Banner: ocho frases distintas, separación amplia y bucle continuo; control de pausa accesible y alternativa estática sin JavaScript o con movimiento reducido. Se expone una sola lista a tecnologías de asistencia.

Sin dependencias, migraciones, cambios en datos de clientes, cookies ni almacenamiento nuevos. Se conservan las políticas publicadas y la configuración de cabeceras. Los SVG del proceso son propios y se incluyen en el HTML.

## Evidencia y límites

Los ensayos específicos se registran en `tasks.md`: `project-hover-qa`, `map-autoplay-qa`, `map-keyboard-qa`, `process-design-qa` y `services-banner-qa`. Las capturas se inspeccionaron en escritorio y móvil. La revisión independiente de integración y seguridad no encontró bloqueantes concretos.

Antes del commit se repiten la regresión general `design-qa.mjs`, las pruebas del banner y las de teclado del mapa; se comprueban sintaxis, contenido preparado e identidad de autor y committer. Las pruebas locales viven en `test-results/`, excluido del repositorio.

La repetición previa al commit terminó correctamente: 19 comprobaciones generales, seis del banner y dos de teclado del mapa; tres auditorías axe sin violaciones automáticas en sus respectivos alcances. Autor y committer verificados con identidad de andresleosan. Sin divergencia respecto de origin/main al preparar la publicación.

Las comprobaciones automáticas no certifican accesibilidad integral. Parte de los ensayos de visibilidad y eventos de preferencias usa simulación; los controles y el avance inicial también se prueban con tiempo real. Se conservan los límites y pendientes de la auditoría legal anterior.

## Publicación y reversión

Publicar mediante push normal a `origin/main`, con autor y committer `Andres Santiago <246775306+andresleosan@users.noreply.github.com>`. Comprobar después el hash remoto y que el sitio público sirva el HTML, CSS y los módulos aprobados; verificar banner, mapa, proceso y hover en navegador.

Si hace falta revertir, desde un árbol limpio ejecutar `git revert <commit-de-esta-release>` y publicar el nuevo commit mediante `git push origin main`. No requiere reescribir historia ni restaurar datos; las políticas publicadas en la base se conservan. No ejecutar la reversión automáticamente por un retraso del despliegue.
