# Entrada administrativa en el pie de página

Actualización de conexión real: Firebase Hosting y la API ya están publicados. `/admin` y `/admin/` redirigen con 302 a `https://alsdevstudio.firebaseapp.com/`, comprobado por HTTP y desde el footer en móvil/escritorio tras `a21b3de`; el HTML de respaldo tiene un enlace activo al centro. Google usa la misma pestaña y el titular confirmó que entró; Auth y respuestas `200` de la API corroboran el acceso, registrado en [Conexión Firebase](CONEXION-FIREBASE.md). Los resultados siguientes corresponden al shell inicial antes de conectar Firebase.

14 de octubre de 2026. Solicitud: un acceso discreto en la parte inferior del sitio. Se agrega «Administración» al final del footer, con la misma tipografía, color y subrayado de los enlaces existentes. Tiene un área de 44 px y foco visible; en móvil pasa abajo a la derecha.

## Destino y alcance

El enlace fuente `admin.html` se normaliza a `/admin` en el build. La ruta abre una pantalla estática que explica que el ingreso Google está pendiente de configuración. El botón permanece inhabilitado: no simula sesión ni abre datos de prueba en el dominio público. El enlace de regreso funciona sin JavaScript.

El panel completo continúa en `control/`, fuera del build del portafolio. No se agregan dependencias, APIs, credenciales, correo personal ni llamadas externas. La nueva pantalla no contiene JavaScript ni SDK Firebase. El siguiente hito deberá sustituirla por el acceso real una vez configurados Google, UID, claim administrativo y API; también deberá revisar CSP y la separación del build.

La página declara `noindex, nofollow, noarchive`; `_headers` agrega la misma política y `Cache-Control: no-store` a `/admin` y `/admin.html`. No se añade al sitemap. Son medidas de indexación/caché; la autorización del panel real sigue correspondiendo al backend.

## Verificación

- Regresión del build: 12/12, después de observar el fallo inicial de las pruebas de allowlist/ruta y aplicar el cambio. Los fixtures incluyen configuración, Functions y build demo falsos bajo `control/` y comprueban que no se publican.
- Build: 206 archivos, 4.910.917 bytes; se añade únicamente la pantalla estática al conjunto de archivos públicos.
- Navegador: 320, 390, 768 y 1440 px; enlace, regreso, orden de teclado/foco y objetivo mínimo verificados. Axe sin hallazgos en footer y acceso; sin overflow, errores JavaScript ni solicitudes externas durante el recorrido.
- Sin JavaScript: navegación de ida y vuelta disponible en 390/1440 px. Redirección `/admin.html?qa=public` a `/admin?qa=public` comprobada por el servidor de QA.
- Capturas locales inspeccionadas y resultados regenerables en `test-results/admin-footer-*` y `test-results/admin-entry-*`, ignorados por Git.

Las reglas de URL y cabeceras se contrastaron con la documentación oficial de [rutas de Pages](https://developers.cloudflare.com/pages/configuration/serving-pages/) y [cabeceras](https://developers.cloudflare.com/pages/configuration/headers/). La comprobación local utiliza un servidor estático que aplica las reglas del artefacto; la publicación debe comprobarse también en el dominio real.

## Reversión

Revertir el commit de esta entrega mediante un commit nuevo y push normal a `main`. Se retiran el enlace, la pantalla y sus reglas/allowlist; `control/` y las plataformas no requieren cambios. No hay migraciones ni datos que restaurar. Base anterior: `a49203d`.
