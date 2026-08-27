# Release — ALS DevStudio

## 2026-08-27 · Carrusel directo

- Carrusel enderezado y controles manuales anterior/siguiente con puntos seleccionables.
- Se conserva el avance automático cada 2.6 segundos y se pausa al interactuar.
- Retirados Jobsite Jedi, SurtiFácil, Donaciones Venezuela y la portada ALS del carrusel/proyectos destacados.


## 2026-08-27 · 24fbf07

- Añadidas capturas de las 9 demos/proyectos públicos en assets/projects/.
- El hero rota la portada de marca y las capturas de proyectos cada 2.6 segundos.
- Las tarjetas muestran capturas reales con zoom suave al pasar el cursor.
- Eliminado el chip construir mejor.
- La marquesina pasó de 28s a 14s.
- Favicon SVG y entrypoint index.html se mantienen activos.

## Rollback

Si una publicación falla, revertir al commit anterior estable y volver a hacer push:

git revert 24fbf07

Después, verificar https://alsdevstudio.vercel.app/ y el estado del despliegue en Vercel.
