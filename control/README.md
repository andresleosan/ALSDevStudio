# Control de suscripciones · ALS DevStudio

Panel administrativo independiente del portafolio. La infraestructura real de `alsdevstudio` está publicada en **https://alsdevstudio.firebaseapp.com/**, con Firebase Auth, Firestore y Functions. La primera entrada Google del titular aún requiere comprobación manual; no se ha verificado una sesión administrativa real. Está pendiente publicar la redirección de `/admin` del portafolio hacia el panel para que el titular pueda completar ese ingreso.

También existe una demostración local bajo `demo-alsdevstudio`, completamente separada. Los cuatro productos siguen desconectados de sus plataformas; registrar un pago crea una orden pendiente y no activa sistemas externos. No hay clientes, suscripciones ni pagos reales cargados. Estado de la conexión y comprobaciones: [CONEXION-FIREBASE.md](../docs/CONEXION-FIREBASE.md).

## Inicio local

Desde `control/`, con Node 22 o superior y npm:

```powershell
npm ci --ignore-scripts
npm --prefix functions ci --ignore-scripts
npm run dev
```

Abre **http://127.0.0.1:8788** y pulsa **Entrar a la demostración**. No requiere Firebase login, una cuenta Google, un proyecto facturable ni credenciales reales. La sesión sintética tiene UID `andres-demo-admin`, correo administrativo y claim `admin:true`, solo en Auth emulator. La interfaz identifica el modo demostración. La sesión del navegador persiste tras recargar; **Cerrar sesión** elimina el acceso del navegador.

El comando compila el panel, inicia los tres emuladores y sirve únicamente el build por loopback. El primer inicio puede descargar los emuladores; en Windows x64 con Java antiguo descarga Eclipse Temurin JRE 21 portable en `.tools/`, comprueba SHA-256 y modifica solo el entorno del proceso hijo. No cambia Java, PATH ni JAVA_HOME del sistema. En otras plataformas prepara Java 21 o superior previamente.

| Servicio | Dirección |
| --- | --- |
| Panel | `127.0.0.1:8788` |
| Auth emulator | `127.0.0.1:9099` |
| Firestore emulator | `127.0.0.1:8085` |
| Functions emulator | `127.0.0.1:5001` |
| Emulator UI | `127.0.0.1:4001` |
| Hub / logging / websocket Firestore | `4401` / `4501` / `9150` |

Detén con Ctrl+C. Los datos emulados son temporales y se pierden al detener los emuladores; persisten entre recargas y nuevas sesiones mientras el proceso sigue activo. El modo local no importa datos históricos ni los escribe en Firebase real. Las pruebas no limpian bases existentes; crean registros sintéticos identificables.

La función declara Node 22, versión soportada en la documentación oficial de Firebase consultada. En una máquina con Node 24 la CLI puede avisar que ejecutará el emulador con el Node anfitrión; el runtime declarado para Functions permanece en 22. La validación local de este hito se realizó con Node 24.18.0, CLI 15.34.0 y JRE 21.0.12.1.

## Pruebas y build

```powershell
npm test
npm run emulators:e2e
npm run qa
npm run build
npm audit --omit=dev
npm --prefix functions audit --omit=dev
```

`npm test` ejecuta dominio, servicio, API, autenticación, plataforma y servidor; la integración Firestore se omite sin el proyecto demo y host exacto del emulador. `emulators:e2e` inicia y detiene emuladores para ejecutar también la integración real del adaptador: persistencia, confirmación simultánea idempotente, cotizaciones concurrentes, rollback y reglas de acceso directo.

`npm run qa` automatiza el recorrido completo: verifica puertos libres, compila e inicia el entorno de desarrollo, ejecuta las pruebas unitarias e integración con las variables demo explícitas, comprueba recuperación de pagos y foco con `test/ui.smoke.mjs`, corre `test/e2e.mjs` con Playwright y axe-core y detiene el entorno en `finally`, tanto si pasa como si falla. Devuelve un código distinto de cero si falla una etapa. Detén primero cualquier `npm run dev` o suite de emuladores activa; el runner rechaza puertos ocupados antes de modificar el build. Esta ejecución utiliza datos temporales nuevos.

No ejecutes dos suites de emuladores a la vez ni durante una sesión de QA que deba conservar datos. También puedes ejecutar solo el recorrido de navegador con `node test/e2e.mjs` después de iniciar `npm run dev`. Playwright y axe-core están fijados localmente. Usa los navegadores ya instalados en la máquina; si no hay ninguno, prepara Chromium de Playwright antes de ese recorrido.

`npm run build` produce `dist/` sin acceso de demostración y con modo **sin configurar** si no se proporciona configuración pública. No compiles sobre `dist/` mientras otra persona usa la demostración: el servidor sirve esa carpeta. El build copia únicamente `web/`, compila el SDK modular Firebase Auth localmente y agrega las fuentes y la marca locales del portafolio. No usa CDN, incluye un módulo público explícito de configuración y excluye scripts del servidor, Functions, reglas, pruebas y archivos `.env`. La ruta `/__dev/session` se elimina del módulo de plataforma de producción durante la compilación.

El servidor local entrega CSP, cabeceras privadas y rechaza Host/Origin externos. `/__dev/session` acepta exclusivamente POST del mismo origen y existe solo en el servidor de desarrollo; no existe en Functions ni en Hosting de producción. `/api/*` se reenvía a la función emulada. El proceso de emuladores recibe una lista limitada de variables del sistema para evitar heredar credenciales de otras herramientas.

## Firebase real y publicación

El proyecto `alsdevstudio` tiene la app web `ALSDevStudio Control`, Firestore exclusivo y `controlApi` Gen2 activo en `us-central1`, con Node 22. Hosting sirve el panel y reenvía `/api/**` a esa función en el mismo origen. La cuenta runtime dedicada `als-control-api` no tiene claves privadas, rol Editor ni administración de usuarios. Tiene los permisos necesarios sobre la base del panel y lectura Auth para comprobar revocación. El servicio escala de cero a una instancia, con concurrencia 20, memoria 256 MiB y timeout 30 s.

Google está habilitado. La identidad del titular se precreó sin contraseña, con correo sin verificar y `admin:true` ligado a su UID concreto. El backend sigue exigiendo correo verificado, proveedor Google, UID, proyecto, expiración y revocación: el claim por sí solo no permite entrar. El ingreso usa la misma pestaña mediante `signInWithRedirect`, procesa el regreso y recupera la identidad del observador de Firebase. Sustituye la ventana emergente que dejó el intento inicial esperando. **Falta que el titular complete Google y compruebe entrada, recarga y cierre de sesión.** La redirección desde `/admin` ya está publicada y verificada para continuar ese paso.

La configuración pública real está en `config/public.json`, ignorada por Git. Solo admite `mode`, `apiBase` y los cuatro campos Firebase `projectId`, `authDomain`, `apiKey` pública y `appId`; el proyecto y dominio están fijados a `alsdevstudio` y `alsdevstudio.firebaseapp.com`, con `apiBase:/api`. El UID y origen exacto se configuran en `functions/.env.alsdevstudio`, también ignorado. No se publican credenciales de servicio.

`.firebaserc` conserva `demo-alsdevstudio` como proyecto predeterminado por seguridad. **Usa siempre `--project alsdevstudio` explícito al publicar.** Desde `control/`, después de revisar y probar los cambios autorizados:

```powershell
$env:CONTROL_PUBLIC_CONFIG = 'config/public.json'
npm run build
node scripts/assert-production.mjs
npx firebase deploy --project alsdevstudio --only "functions:controlApi,hosting"
```

Para una publicación exclusivamente visual se puede limitar `--only hosting`. Las reglas e índices se publican por separado solo cuando corresponda: `npx firebase deploy --project alsdevstudio --only "firestore:rules,firestore:indexes"`.

**Recompila producción después de `npm run qa` o `npm run dev`**: ambos preparan un `dist/` de demostración. El hook `hosting.predeploy` ejecuta `scripts/assert-production.mjs` y bloquea artefactos demo, sin configurar, de otro proyecto o con recursos internos. Lee el JSON de `public-config.mjs` sin ejecutarlo y revisa que la plataforma no contenga conexiones locales. También valida una lista explícita de archivos públicos; se debe revisar si se agregan nuevos recursos. El hook se comprobó durante una publicación real de Hosting con 40 archivos. El panel entrega `no-store` y `X-Robots-Tag: noindex, nofollow, noarchive`; estas cabeceras no sustituyen la autorización del backend.

Blaze se vinculó con autorización del titular a la cuenta «Pago de Firebase», en COP. Existe un presupuesto mensual de COP 25.000, exclusivo del proyecto, con alertas al 50 %, 90 % y 100 %. Es una alerta, no un tope de gasto ni un corte automático. Artifact Registry tiene una política de limpieza de imágenes de despliegue de un día. Conectores de licencia, migración histórica y anulaciones/ajustes siguen pendientes.

Las reglas Firestore deniegan todas las lecturas y escrituras desde clientes; el panel opera únicamente mediante la API y el Admin SDK. Las transacciones difieren todas las escrituras hasta concluir las lecturas, preservan lecturas de datos preparados dentro del callback y descartan cambios cuando una operación falla. Los pagos confirmados son inmutables.

La plataforma muestra errores de red y sesión mediante mensajes seguros, sin respuestas internas ni tokens. Un reintento de una operación conserva su clave idempotente; el servidor rechaza una clave usada con un contenido distinto. No confirma pagos fuera de la vista previa emitida por el backend.

La verificación final completó `npm run qa` con 111/111 pruebas sin omitidas después de cambiar el ingreso de Google, smoke de recuperación/foco, siete escenarios E2E y axe en 320, 390, 768 y 1440 px sin hallazgos. En producción se comprobaron portada `200`, API sin sesión `401`, origen ajeno `403`, token inválido `401`, preflight admitido `204` y acceso directo a Firestore denegado con `403`. Los helpers `/__/auth/iframe` y `/__/auth/handler` responden `200` sin heredar CSP ni X-Frame-Options del panel. Estas comprobaciones no incluyen todavía una sesión Google válida del titular.

## Dependencias y fuentes

Versiones fijadas y lockfiles reproducibles en ambos paquetes. `npm audit --omit=dev` y la auditoría de Functions resultaron sin vulnerabilidades. La auditoría completa conserva siete nodos afectados exclusivamente por la CLI de desarrollo: `braces`/`chokidar`/`firebase-tools` (tres altos) y `@opentelemetry/core`/`@google-cloud/pubsub`/`uuid`/`gaxios` (cuatro moderados). La CLI más reciente consultada conserva estas transitivas; no se fuerzan cambios de versión mayor incompatibles. `@grpc/grpc-js` y `stream-json` usan overrides fijados a versiones corregidas del mismo major. Las transitivas de la CLI no se incluyen en el artefacto del panel ni en las dependencias runtime de Functions; deben revisarse al actualizar las herramientas.

- [Runtimes Node y ESM de Functions](https://firebase.google.com/docs/functions/manage-functions).
- [Configuración de Emulator Suite](https://firebase.google.com/docs/emulator-suite/install_and_configure).
- [Auth emulator y tokens locales](https://firebase.google.com/docs/emulator-suite/connect_auth).
- [Archivos Adoptium y comprobación SHA-256](https://adoptium.net/installation/archives).
