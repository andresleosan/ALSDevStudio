# Retirada del panel administrativo

Fecha: 2026-10-15, Colombia. Solicitud del titular: volver a la landing, retirar el panel y su publicación en Firebase, limpiar el código y conservar `https://www.alsdevstudio.com/`.

## Alcance

La landing permanece en Cloudflare Pages, con publicación desde `main`. Se retiran el enlace Administración, `admin.html`, los estilos exclusivos, sus cabeceras y la redirección a Firebase. Las rutas antiguas `/admin`, `/admin/` y `/admin.html` llevan a la portada con 301 para reemplazar la respuesta obsoleta observada en Cloudflare y conservar los marcadores existentes. No se modifican DNS, correo, proyectos del portafolio ni las mejoras recientes del mapa.

Se elimina el módulo `control/`, incluidas sus dependencias y configuración local, y la documentación exclusiva que lo proponía como producto activo. El historial Git permanece íntegro. Las menciones en el registro de unificación de ramas se conservan como hechos históricos.

Firebase alojaba únicamente el panel: un sitio Hosting sin dominios personalizados, la función `controlApi`, la app web `ALSDevStudio Control` y Firestore con cuatro documentos de catálogo. El inventario no encontró clientes, pagos ni suscripciones. La retirada se limita al proyecto `alsdevstudio` (`365384555628`); su cuenta de facturación es compartida y no se elimina.

## Verificación

- Build público: `node --test .github/cloudflare/build.test.mjs`, 12/12; `node .github/cloudflare/build.mjs`, 205 archivos y 4.903.687 bytes.
- Pages local inicial: `.github/cloudflare/pages.test.mjs`, 4/4. QA adicional en 320/390/768/1440 px: sin enlace administrativo, desbordamiento, errores JavaScript ni solicitudes a Firebase; footer con axe 0. Teclado, movimiento reducido y no-JS comprobados; el mapa conserva ciclo, selección y pausas.
- La primera comprobación de producción encontró `/admin` sirviendo un HTML anterior desde caché (`HIT`, antigüedad superior a 21 horas), mientras `/admin?retirada=1` y el despliegue inmutable ya devolvían 404. Se añaden redirecciones permanentes de las tres direcciones retiradas a la portada; no restauran la página ni el acceso a Firebase. QA local y pública finales 4/4, comprobando las rutas con y sin query.
- Las redirecciones finales pasan Pages local 4/4, con y sin query; las direcciones retiradas apuntan a la portada, y las rutas desconocidas conservan 404. Revisión independiente sin bloqueantes. Publicación del cambio de código: `4c04f88`; corrección de rutas: `51b67b3`.
- Producción verificada en el despliegue `8782b432-6b3e-409d-b4a1-27005e639938`: `PAGES_QA_BASE=https://www.alsdevstudio.com node --test .github/cloudflare/pages.test.mjs`, 4/4. Portada 200 y artefacto idéntico al build; apex 301 a www; las tres rutas retiradas redirigen a la portada y terminan en 200. Evidencia local: `test-results/panel-removal-live-routing.json`. DNS y correo conservados.

## Firebase retirado

- Hosting live desactivado; `alsdevstudio.firebaseapp.com` y `alsdevstudio.web.app` responden 404, sin panel.
- Función `controlApi` y servicio Cloud Run `controlapi` eliminados. App web retirada mediante borrado recuperable durante 30 días.
- Usuario Firebase exclusivo del panel deshabilitado, sesiones revocadas y claim `admin` retirado. La cuenta Google personal no se elimina.
- Firestore `(default)` eliminado después de respaldar y verificar los cuatro documentos de catálogo; listado vacío y GET con NOT_FOUND.
- Cuenta runtime dedicada y tres bindings exclusivos retirados. Eliminados los dos buckets de compilación con cuatro ZIP/versiones y el repositorio vacío `gcf-artifacts`.
- Presupuesto exclusivo eliminado. Proyecto `alsdevstudio` desvinculado de facturación, con `billingEnabled:false`; la cuenta compartida y los demás proyectos permanecen intactos. No se elimina el contenedor del proyecto Google Cloud ni se deshabilitan APIs generales. Esto no anula consumos que se hayan generado antes de la retirada.
- Informe sanitizado local: `test-results/firebase-panel-retirement.json`. Respaldo de los cuatro documentos y metadatos: `F:/Proyectos/ALS DevStudio/ALSDevStudio-recovery/firebase-panel-2026-10-15/`. No contiene tokens ni claves privadas.
- Verificación final `passed:true`: las URLs de Hosting, su API y las URLs directas de la función y Run responden 404. Listados finales: cero apps web activas, bases Firestore, servicios Run y buckets. Tras desvincular facturación, Google devuelve 403 al listar Functions y Artifact Registry; ambos se eliminaron y verificaron ausentes antes de ese paso, con evidencia temporal en el informe. No se ejecutó una restauración en producción.

## Recuperación

Antes de retirar archivos se creó y verificó íntegramente el ZIP local `F:/Proyectos/ALS DevStudio/ALSDevStudio-recovery/antes-retirar-panel-2026-10-15.zip`, del commit `8b2c431`. El directorio local del panel y el inventario de Firebase se conservan fuera del sitio, dentro de esa carpeta de recuperación; nunca forman parte del build ni de Git.

Para revertir cambios del sitio, restaurar únicamente los archivos necesarios mediante un commit nuevo en `main`. No usar `reset --hard`, force push ni restaurar toda la landing antigua. Reactivar el panel requeriría una nueva decisión del titular, revisar configuración y datos respaldados, habilitar los servicios y publicar expresamente.
