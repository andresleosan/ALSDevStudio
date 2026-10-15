# Conexión real del centro administrativo

Proyecto autorizado: `alsdevstudio`, número `365384555628`. Titular único: `andres.san1404@gmail.com`. La infraestructura real está desplegada; el titular autorizó Blaze y eligió la cuenta «Pago de Firebase», que factura en COP. **La primera entrada Google del titular sigue pendiente de comprobación manual.** No se ha declarado verificada una sesión administrativa real.

## Ruta elegida

El portafolio permanece en Cloudflare Pages. El panel real está en `https://alsdevstudio.firebaseapp.com/`, usando Firebase Hosting y su rewrite `/api/**` hacia `controlApi`, en `us-central1`. `authDomain` coincide con el dominio del panel; frontend y API operan en el mismo origen, sin proxy adicional ni cambios DNS. Está pendiente publicar y comprobar la redirección `302` de `/admin` del portafolio hacia el panel, para que el titular pueda completar su primera entrada Google.

La configuración web real se mantiene en `control/config/public.json`, ignorada por Git; contiene solo `projectId`, `authDomain`, `apiKey` pública y `appId`. El UID definitivo y los orígenes admitidos están en `control/functions/.env.alsdevstudio`, también ignorado. No se crean ni descargan claves privadas de cuentas de servicio.

El intento inicial con ventana emergente dejó el botón esperando y el titular informó que no podía seleccionarlo. Se sustituyó por `signInWithRedirect` en la misma pestaña y se procesa `getRedirectResult` al regresar; solo el observador de Firebase establece la sesión. Se muestran errores seguros y se rehabilita el botón al volver desde el historial. El nuevo artefacto ya está publicado y su igualdad con el build local se comprobó por HTTP. Google abrió el selector de cuentas en la misma pestaña; completar la selección del titular continúa pendiente de intervención manual.

## Inventario y preparación

- [x] Acceso propietario comprobado mediante Firebase CLI y gcloud con sesión existente.
- [x] Inventario previo, al iniciar: cero apps web, bases Firestore, releases de reglas, usuarios del titular y publicaciones Hosting; Google ya habilitado y dominios Firebase autorizados. En ese momento Functions estaba sin habilitar y el proyecto no tenía facturación.
- [x] App web `ALSDevStudio Control` registrada, ID `1:365384555628:web:1ac5f24e16860186640c49`. Configuración pública real preparada y validada para el proyecto exacto.
- [x] Identidad del titular precreada sin contraseña y sin marcar correo como verificado. Claim `admin:true` aplicado a su UID concreto, preservando otros claims. El backend exige además Google y correo verificado; la precreación no concede una sesión.
- [x] Base `(default)` Standard/Native exclusiva, en `us-central1`, inicialmente vacía y con protección de borrado habilitada. Reglas que deniegan todo acceso cliente publicadas; la API usa Admin SDK.
- [x] Cuenta runtime `als-control-api@alsdevstudio.iam.gserviceaccount.com`, sin claves. Permiso `datastore.user` condicionado a la base del panel y `firebaseauth.viewer` para verificar revocación; sin gestión de usuarios ni rol Editor/Owner.
- [x] `controlApi` Gen2 en estado `ACTIVE`, Node 22, cuenta runtime dedicada, proyecto fijado y emuladores prohibidos en real. `minInstances:0`, `maxInstances:1`, concurrencia 20, memoria 256 MiB y timeout 30 s. Invocación HTTP pública con autorización Firebase dentro de la API; no abre acceso a los datos.
- [x] Cuenta «Pago de Firebase» vinculada, Blaze confirmado y presupuesto exclusivo del proyecto creado.
- [x] APIs de Functions/Run/Build/Artifact Registry habilitadas, producción compilada y `controlApi` y Hosting desplegados.
- [x] Comprobaciones HTTP reales: `401` sin sesión, `403` por origen ajeno, `401` con token inválido, `204` en preflight admitido y `403` al acceder directamente a Firestore. Portada `200`, `no-store` y cabecera de no indexación comprobados.
- [x] Hook previo a Hosting ejecutado durante un despliegue real: valida el artefacto productivo de 40 archivos y bloquea demostraciones o recursos internos.
- [ ] Completar manualmente la primera entrada Google del titular y comprobar autorización de API, recarga y cierre de sesión. La identidad precreada aún tiene `emailVerified:false`; no se fuerza su verificación desde el procedimiento administrativo.
- [ ] Publicar la redirección `302` de `/admin` hacia el panel desde `main` y comprobar el destino mediante HTTP.

## Permisos de compilación y runtime

El primer despliegue falló por permisos insuficientes de la cuenta de compilación de Compute. Se corrigieron bindings concretos: `storage.objectViewer` en el bucket de fuentes `gcf-v2-sources` de `us-central1`, `artifactregistry.writer` en el repositorio `gcf-artifacts` y `logging.logWriter` para los registros de compilación. No se concedió Editor. Estos permisos pertenecen al proceso de compilación; la función sigue ejecutándose con `als-control-api` y los permisos de datos y Auth descritos arriba.

El despliegue posterior terminó correctamente. La política de limpieza de imágenes de Functions en Artifact Registry está configurada a un día, para limitar la retención de imágenes de despliegue.

## Facturación

Estimación de orden de magnitud: US$0–5 mensuales con un solo administrador, 50–100 sujetos y poco tráfico; no garantiza costo cero ni incluye los productos conectados. Blaze es pago por consumo, con cuotas sin costo según servicio. El despliegue también utiliza Cloud Build y Artifact Registry. La instancia no queda reservada y el escalado está limitado a una; esto no establece un tope monetario.

La cuenta elegida factura en COP. Está creado un presupuesto mensual de COP 25.000 filtrado exclusivamente a `projects/365384555628`, con umbrales de gasto real al 50 %, 90 % y 100 %. Mantiene las notificaciones predeterminadas de facturación. El presupuesto avisa y no detiene automáticamente el servicio ni impide cargos por encima del importe. No se agregaron ni cambiaron métodos de pago de la cuenta existente.

## Verificación y datos

La suite de emuladores utiliza exclusivamente `demo-alsdevstudio`; los clientes, pagos y pruebas sintéticas nunca se importan a producción. No hay contratantes, pagos o suscripciones reales cargados. El catálogo previsto conserva los cuatro productos con planes por definir y conexión pendiente.

La QA completa final, después de cambiar el ingreso a la misma pestaña, pasó 111/111 pruebas sin omisiones, smoke de recuperación de pagos/foco, siete escenarios E2E con Firebase emulado y axe sin hallazgos en 320, 390, 768 y 1440 px. Incluye runtime, build, guard y autenticación con retorno/error de Google; no incluye una sesión Google real ni pagos reales. Las auditorías de dependencias de producción de ambos paquetes dieron cero vulnerabilidades. El build público pasó 12/12 y produjo 206 archivos / 4.911.029 bytes; footer y respaldo HTML pasaron cuatro anchos, teclado, axe 0 y no-JS en 390/1440. Se corrigió el contraste del enlace de respaldo, comprobado en 9,57:1.

Los helpers reales `/__/auth/iframe` y `/__/auth/handler` respondieron `200` sin CSP ni X-Frame-Options, aun con las cabeceras globales de Hosting activas. Se mantuvieron las políticas de protección del panel. La pantalla de entrada está disponible para continuar con Google, pero el inicio requiere interacción manual del titular y aún falta verificar la sesión resultante.

El build de producción rechaza proyectos ajenos, configuración demo, credenciales de ejemplo y campos privados. El guard lee el JSON de `public-config.mjs` sin ejecutar ese módulo, valida los campos de producción y revisa rutas demo, conexiones locales y recursos internos. `hosting.predeploy` lo ejecuta antes de publicar. Hosting añade `X-Robots-Tag: noindex, nofollow, noarchive`; las reglas de autorización siguen siendo obligatorias aunque el panel no se indexe.

Nunca se publica un `control/dist` producido por `npm run qa` o `npm run dev`: primero se reconstruye explícitamente con `CONTROL_PUBLIC_CONFIG=config/public.json` y se verifica. `.firebaserc` conserva el proyecto demo como predeterminado; todo despliegue real usa `--project alsdevstudio` explícito. Los comandos están en [control/README.md](../control/README.md#firebase-real-y-publicación).

SaaS posteriores: La Parada, Sarin Bot y SemanControl por negocio; Dialon individual. Esta conexión habilita el centro, sin modificar sus accesos ni copiar sus datos operativos.

## Reversión

El cambio de la entrada pública es reversible restaurando `admin.html` y sus reglas anteriores mediante commit nuevo. Para retirar temporalmente la API se revoca su invocación o se despliega una versión que falla cerrada; no se borran pagos, cuentas ni bases. La base tiene protección de borrado y el UID permanece fijo. Los cambios IAM se retiran por el binding específico, preservando los permisos ajenos.

Fuentes oficiales: [Functions y Blaze](https://firebase.google.com/docs/functions/get-started), [precios](https://firebase.google.com/pricing), [rewrites Hosting](https://firebase.google.com/docs/hosting/full-config), [dominio de Auth](https://firebase.google.com/docs/auth/web/redirect-best-practices), [claims](https://firebase.google.com/docs/auth/admin/custom-claims), [IAM por base](https://firebase.google.com/docs/firestore/manage-databases#configure_per-database_access_permissions).
