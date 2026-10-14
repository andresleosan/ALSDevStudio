# Nueva mascota ALS ilustrada

Fecha: 2026-10-13. Estado: candidata verificada; publicación de producción
autorizada explícitamente por el titular.

Solicitud: sustituir la mascota pixel art usando la lámina de tres robots que
proporcionó el titular. Se generaron dos poses del mismo robot blanco/gris, con
visor oscuro y ojos turquesa: bienvenida de pie y sentado con portátil.

## Integración

- `assets/brand/mascot-welcome.png`: 320×480, 50.551 bytes.
- `assets/brand/mascot-laptop.png`: 320×332, 31.939 bytes.
- Herramienta integrada `imagegen`, sin API/CLI adicional. Procedencia y prompts
  completos en `assets/brand/mascot-sources.json`.
- Reducción suave y PNG con paleta de 256 colores mediante Sharp ya instalado;
  se preservó el alfa generado. Sin extracción manual del fondo. Ambos archivos
  contienen píxeles transparentes reales y sus cuatro esquinas tienen alfa cero.
- Dos cambios de proporción en HTML y `image-rendering: auto` para ilustración
  suave. Tamaños CSS existentes: bienvenida 72/56 px y contacto 128/88 px.
  Las imágenes siguen siendo decorativas, sin foco ni animación nueva.
- Nombres conservados, ya incluidos en el build de Pages. Sin cambios de CSP,
  scripts, consentimiento, correo, DNS ni servicios.

## Verificación

`node test-results/mascot-qa.mjs`: PASS en ocho anchos (320, 390, 680, 681, 900,
901, 1024 y 1440 px). Dimensiones de HTML coinciden con las imágenes; proporción
correcta, sin solapamientos/desbordamiento ni errores HTTP/JavaScript. Ambas
imágenes funcionan sin JavaScript a 320 px. El ensayo descarta primero el aviso
opcional de analítica para que las capturas permitan revisar la mascota.

Capturas de portada y contacto a 1440/390 px inspeccionadas: fondo transparente
correcto sobre azul y blanco, silueta legible, contenido y controles visibles.
Build Pages PASS: 182 archivos, aproximadamente 4,7 MB; ambos PNG en `dist`.
`git diff --check` PASS. Revisión de seguridad del cambio sin hallazgos críticos:
solo assets locales, atributos de imagen, CSS y documentación; sin endpoints,
datos sensibles o dependencias nuevas.

Preview Cloudflare construido en `3b3a8aecc5e30aa8e82958e617c8dc0f577a01bd`,
deployment `6a97985c-e460-45b3-94ab-dad8f8983b16`:
https://6a97985c.alsdevstudio.pages.dev/.
`MASCOT_QA_BASE=https://6a97985c.alsdevstudio.pages.dev node test-results/mascot-qa.mjs`:
PASS en los mismos ocho anchos y sin JavaScript. Ambos PNG publicados coinciden
byte a byte con los archivos locales; preview `noindex` comprobado. Revisión
independiente sin bloqueantes, proporciones/metadata/alfa y allowlist correctos.
El titular aprobó expresamente «Sí, publicar la mascota» después de revisar
el candidato y la captura de contacto.

## Reversión

Versión anterior: `a68c7d5d6d1d8f59b7c4594a729357ffe880375f`.
Recuperar ambos PNG y su manifest de esa versión mediante un nuevo
commit. Restaurar solamente las dimensiones anteriores de las dos imágenes y
`image-rendering: pixelated`; conservar cambios posteriores ajenos al alcance.
Ejecutar de nuevo QA/build antes del push autorizado de reversión. No reescribir
historia ni alterar servicios o datos.
