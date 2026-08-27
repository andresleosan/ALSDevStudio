# Auditoría inicial — Santel → ALS DevStudio

## Hallazgos

### Alta — identidad desactualizada
El documento tenía título, logo, copy, footer y enlaces de contacto de Santel. Esto impedía usarlo como portafolio de ALS DevStudio.

### Media — contenido de portafolio incompleto
Solo mostraba un conjunto corto de proyectos manuales y no incluía los repositorios recientes del perfil público de GitHub.

### Media — assets frágiles
Las miniaturas existentes incluían imágenes base64 muy grandes dentro del HTML. La nueva versión usará assets de marca locales y visuales CSS ligeros para mantener el documento mantenible.

### Baja — interacción insuficiente
Solo había hover básico. No existían filtros, reveal al scroll, cursor visual ni estados de navegación activos.

### Baja — contenido mal codificado
El archivo presentaba mojibake en varios textos acentuados (`diseÃ±ados`, etc.). La renovación lo corrige con UTF-8 real.

## Seguridad final
- No hay endpoints propios, autenticación, almacenamiento de datos ni dependencias de ejecución.
- No se encontraron secretos, `javascript:` URLs ni credenciales embebidas en el HTML.
- Los 20 enlaces con `target="_blank"` incluyen `rel="noopener"`.
- Los recursos de marca se sirven como archivos locales y los enlaces externos usan HTTPS.
- `.gitignore` cubre `.env`, certificados, credenciales, dependencias y artefactos de build.

## Riesgos abiertos
- El alias escrito por el usuario `andresleosanayudame` no existe públicamente; se usa `andresleosan`, que sí coincide con los repositorios y demos existentes.
- Las descripciones de varios repositorios no están publicadas en GitHub; el copy de cada proyecto se mantendrá descriptivo y prudente.
