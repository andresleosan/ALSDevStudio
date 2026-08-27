# Release — ALS DevStudio

## 2026-08-27 · Portfolio completo

- El carrusel del inicio y la grilla ahora muestran 19 proyectos públicos.
- Se excluyeron exactamente los 7 repositorios solicitados.
- Se tomaron capturas con Chromium: demos públicas cuando estuvieron disponibles y páginas de GitHub como respaldo verificable.
- Los puntos del carrusel se pueden desplazar horizontalmente para elegir entre todos los proyectos.


## 2026-08-27 · Tarjetas de proyectos directas

- La grilla usa dos columnas equilibradas y visuales 16:10 de mayor tamaño.
- Cada tarjeta completa abre directamente el proyecto correspondiente.
- Retirados los textos internos Demo y Código para reducir ruido visual.


## 2026-08-27 · Mini brief de contacto

- El bloque final ahora incluye una selección interactiva de tipo de proyecto.
- El resultado y el mensaje de WhatsApp se actualizan según la opción elegida.
- El layout aprovecha el espacio disponible con un panel oscuro de acción.


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
