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
- Validación local por HTTP de HTML y assets: `200`, `image/png` para ambos assets.
- Conteo verificado: 9 proyectos, 4 filtros, 2 imágenes locales, 20 enlaces externos seguros.
- Escaneo de seguridad estática: PASS sin secretos, `javascript:` ni `target="_blank"` sin `noopener`.
