# Saludo de Sarin y tecleo del proceso

Solicitud del titular, 2026-10-13, sobre las animaciones publicadas y autorizadas en esta sesión: añadir tecleo y texto progresivo a «Cómo trabajaremos»; retirar «Pausar vuelo», detener a Sarin a mitad, saludar con un mensaje y continuar. Se conserva la repetición mientras la zona está visible, elegida previamente por el titular.

## Diseño acotado

- Reutilizar las ilustraciones actuales: vuelo, bienvenida con mano levantada y dos poses de tecleo. El saludo usa cambio de pose y una pequeña inclinación; no se generan assets ni se incorporan librerías.
- Mensaje: «¡Hola! Una buena idea puede llegar lejos. ¿Le damos vuelo a la tuya?». El robot mantiene la posición central durante unos cuatro segundos y después sigue su recorrido. Globo a la derecha en escritorio y debajo en móvil, con espacio reservado.
- Retirar el rótulo y el botón rectangular anterior; pequeño icono de pausa/reanudación, botón nativo de 44 px con nombre accesible y foco. Sin JS o con movimiento reducido se muestra la composición estática y se oculta el control.
- Cuarta escena `process` reutiliza el tecleo finito de Proyectos. El texto completo permanece en HTML y en el árbol accesible; la copia progresiva es decorativa. Las tres tarjetas del proceso permanecen iguales.

## Validación local

RED de tres casos nuevos observado antes de implementación. Cronos inspeccionó los archivos y repitió:

- `node --test .github/cloudflare/mascot-scenes.test.mjs`: 36/36 PASS. Parada exacta, saludo/poses/mensaje durante su fase, continuación visible, control SVG intacto y fallbacks del tecleo de Proceso.
- `node --test .github/cloudflare/build.test.mjs`: 12/12 PASS. Build: 187 archivos públicos, 4.893.101 bytes.
- `node test-results/sarin-scenes-qa.mjs`: 10 casos PASS; 320/390/680/681/900/901/1440 px, sin JS, movimiento reducido y cuatro escenas. Axe en main320/1440 sin violaciones; sin errores ni conexiones nuevas.
- `node test-results/sarin-motion-frames.mjs`: 8 registros PASS. Retención y continuación medidas con tiempo real; globo del saludo legible sin recortes/solapes, tecleo parcial de Proyectos y Proceso con rectángulo/altura estables, anclas despejadas en390/1440. Capturas inspeccionadas por Cronos.
- Sintaxis, TSC aislado estricto del módulo y `git diff --check`: PASS. El chequeo global de JavaScript conserva el límite documentado de 11 errores anteriores en `analytics.js`; ese archivo no se modifica.

Revisión de seguridad: texto fijo escrito con `textContent`, sin datos/secretos, integraciones, endpoints, dependencias ni permisos nuevos; CSP y Analytics intactos. Revisión independiente sin bloqueantes. Ajustes de QA: tolerancia numérica 1e-12 para interpolación WAAPI en límites binarios y fallback del fixture alineado con el saludo estático real.

Pendiente preparar y comprobar candidato Pages antes de promover a producción, dentro de la corrección autorizada de las animaciones.

## Reversión

Base pública conocida: `69d4b7a9155da18c0609dae1dfe258368a6af602`. Revertir el commit funcional de esta revisión mediante un nuevo commit y push normal a `main`, esperar la construcción de Pages y verificar HTML/CSS/módulo, portátil de Proyectos y vuelo anterior en www. No hay cambios de DNS, correo, analítica, datos ni plan de alojamiento. El archivo de referencia de la entrega anterior es `docs/SARIN-VUELO-TECLEO.md`.
