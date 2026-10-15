# Favicons de los productos en el panel

14 de octubre de 2026. Las tarjetas de Productos muestran el favicon oficial de cada plataforma dentro del recuadro existente de 43 px, con la imagen a 32 px y su proporción conservada. El nombre contiguo identifica el producto; la imagen es decorativa. Si una imagen falla, se recuperan las iniciales.

Los archivos se guardan en `control/web/assets/products/`. Se comprobaron los enlaces de icono del HTML oficial, los formatos y su apariencia antes de copiarlos:

| Producto | Origen | Copia local |
| --- | --- | --- |
| Dialon | [favicon.ico](https://dialon.pages.dev/favicon.ico) | `dialon.ico`, 14.510 bytes |
| La Parada | [favicon-32.png](https://laparada.pages.dev/favicon-32.png) | `laparada.png`, 2.453 bytes |
| Sarin Bot | [sarin-face-48.png](https://sarinbotsaas.pages.dev/sarin-face-48.png) | `sarinbotsaas.png`, 4.514 bytes |
| SemanControl | [icon.svg](https://semancontrol.pages.dev/icon.svg) | `semancontrol.svg`, 471 bytes |

La UI usa rutas locales de un mapa fijo y el guard de publicación exige exactamente esos cuatro recursos adicionales. ICO y PNG tienen firmas válidas; el SVG contiene únicamente formas y título, sin código ni referencias externas. El build de Hosting contiene 44 archivos públicos.

Verificación: 37/37 pruebas existentes de build/guard; recorrido UI completo aprobado. Inspección de Productos en 320/390/768/1440 px: cuatro imágenes cargadas, axe 0 y sin desbordamiento. Se corrigió una espera del harness para observar las tarjetas después del evento de navegación. Capturas locales en `test-results/control-favicons-*.png`.

Hosting publicado y comprobado: los cuatro iconos, `app.mjs` y `control.css` responden 200 y coinciden byte a byte con el artefacto revisado. Evidencia en `test-results/control-favicons-live.json`. Para revertir, restaurar el commit anterior, reconstruir producción y publicar únicamente Hosting.
