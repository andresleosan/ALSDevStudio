# Retirada del panel administrativo

Fecha: 2026-10-15, Colombia. Solicitud del titular: volver a la landing, retirar el panel y su publicación en Firebase, limpiar el código y conservar `https://www.alsdevstudio.com/`.

## Alcance

La landing permanece en Cloudflare Pages, con publicación desde `main`. Se retiran el enlace Administración, `admin.html`, los estilos exclusivos y las reglas de cabeceras y redirección administrativas. Las rutas `/admin`, `/admin/` y `/admin.html` deben devolver 404. No se modifican DNS, correo, proyectos del portafolio ni las mejoras recientes del mapa.

Se elimina el módulo `control/`, incluidas sus dependencias y configuración local, y la documentación exclusiva que lo proponía como producto activo. El historial Git permanece íntegro. Las menciones en el registro de unificación de ramas se conservan como hechos históricos.

Firebase alojaba únicamente el panel: un sitio Hosting sin dominios personalizados, la función `controlApi`, la app web `ALSDevStudio Control` y Firestore con cuatro documentos de catálogo. El inventario no encontró clientes, pagos ni suscripciones. La retirada se limita al proyecto `alsdevstudio` (`365384555628`); su cuenta de facturación es compartida y no se elimina.

## Verificación

- Build público: `node --test .github/cloudflare/build.test.mjs`, 12/12; `node .github/cloudflare/build.mjs`, 205 archivos y 4.903.567 bytes.
- Pages local: `.github/cloudflare/pages.test.mjs`, 4/4. Las tres rutas administrativas devuelven 404 sin cabecera Location. QA adicional en 320/390/768/1440 px: sin enlace administrativo, desbordamiento, errores JavaScript ni solicitudes a Firebase; footer con axe 0. Teclado, movimiento reducido y no-JS comprobados; el mapa conserva ciclo, selección y pausas.
- Estado final de Firebase y publicación: pendientes al iniciar este registro; completar con evidencia real.

## Recuperación

Antes de retirar archivos se creó y verificó íntegramente el ZIP local `F:/Proyectos/ALS DevStudio/ALSDevStudio-recovery/antes-retirar-panel-2026-10-15.zip`, del commit `8b2c431`. El directorio local del panel y el inventario de Firebase se conservan fuera del sitio, dentro de esa carpeta de recuperación; nunca forman parte del build ni de Git.

Para revertir cambios del sitio, restaurar únicamente los archivos necesarios mediante un commit nuevo en `main`. No usar `reset --hard`, force push ni restaurar toda la landing antigua. Reactivar el panel requeriría una nueva decisión del titular, revisar configuración y datos respaldados, habilitar los servicios y publicar expresamente.
