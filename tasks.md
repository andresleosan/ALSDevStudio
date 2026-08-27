# Tareas — ALS DevStudio

- [x] Auditoría de landing heredada y definición de alcance.
- [x] Consulta de assets de marca en `F:\Proyectos\ALS DevStudio\Img`.
- [x] Consulta pública de repositorios y demos de `andresleosan`.
- [x] Definir Design DNA en `STACK.md`.
- [x] Implementar rebranding, portafolio curado e interacciones.
- [x] Verificar sintaxis, rutas de assets, responsive y reduced motion.
- [x] Auditoría final de seguridad y QA con evidencia.

## Evidencia de cierre
- `node --check` sobre el JavaScript embebido: PASS.
- Validación de landing y assets: HTML publicado en Vercel `200`; 9 capturas de proyecto y 2 assets de marca presentes.
- Conteo verificado: 6 proyectos con imagen, 4 filtros, 6 slides de proyectos en el hero, marquesina a 14s y 20 enlaces externos seguros.
- Escaneo de seguridad estática: PASS sin secretos, `javascript:` ni `target="_blank"` sin `noopener`.

- [x] Refinar carrusel: logo de navegación, proporción de capturas, contacto por WhatsApp y limpieza del correo temporal.

## QA de esta iteración
- JavaScript embebido: sintaxis PASS.
- 6 tarjetas y 6 capturas verificadas; proporción 16:10 y altura mínima 420px.
- 15 enlaces externos seguros, cero URLs javascript: y correo temporal ausente.
