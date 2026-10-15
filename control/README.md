# Control de suscripciones · ALS DevStudio

Panel administrativo independiente del portafolio. Este hito funciona con Firebase Auth, Firestore y Functions **emulados**, bajo `demo-alsdevstudio`. Los cuatro productos siguen desconectados de sus plataformas; registrar un pago crea una orden pendiente y no activa sistemas externos.

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

Detén con Ctrl+C. Los datos emulados son temporales y se pierden al detener los emuladores; persisten entre recargas y nuevas sesiones mientras el proceso sigue activo. Este hito no importa datos históricos ni los escribe en Firebase real. Las pruebas no limpian bases existentes; crean registros sintéticos identificables.

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

## Firebase real pendiente

No se ha conectado, desplegado ni modificado el proyecto real. Para una integración futura autorizada:

1. Registrar o confirmar una aplicación web en el proyecto `alsdevstudio`; copiar su **configuración pública real** a `config/public.json`, usando `config/public.example.json` como estructura y reemplazando todos los marcadores.
2. Activar Google como proveedor Auth y autorizar el dominio real. Establecer el UID definitivo del administrador y el claim `admin:true` mediante un procedimiento administrativo autorizado. El backend comprueba UID, correo verificado, proyecto, proveedor Google, expiración y revocación; nunca concede acceso al primer usuario.
3. Configurar `CONTROL_ADMIN_UID` y `CONTROL_ALLOWED_ORIGINS` en el entorno backend a partir de `functions/.env.example`, con origen HTTPS exacto. No introducir credenciales de servicio en web ni en Git. Sin UID/configuración, la API falla cerrada.
4. Compilar con `CONTROL_PUBLIC_CONFIG=config/public.json` y revisar el build, reglas y cabeceras. Firebase Hosting está preparado para reenviar `/api/**` a `controlApi`, pero aquí no se ejecuta ningún despliegue.
5. Verificar costos, presupuesto/alertas y controles de producción antes de autorizar publicación o datos reales. Conectores de licencia, migración histórica y anulaciones/ajustes siguen fuera de este hito.

Las reglas Firestore deniegan todas las lecturas y escrituras desde clientes; el panel opera únicamente mediante la API y el Admin SDK. Las transacciones difieren todas las escrituras hasta concluir las lecturas, preservan lecturas de datos preparados dentro del callback y descartan cambios cuando una operación falla. Los pagos confirmados son inmutables.

La plataforma muestra errores de red y sesión mediante mensajes seguros, sin respuestas internas ni tokens. Un reintento de una operación conserva su clave idempotente; el servidor rechaza una clave usada con un contenido distinto. No confirma pagos fuera de la vista previa emitida por el backend.

## Dependencias y fuentes

Versiones fijadas y lockfiles reproducibles en ambos paquetes. `npm audit --omit=dev` y la auditoría de Functions resultaron sin vulnerabilidades. La auditoría completa conserva siete nodos afectados exclusivamente por la CLI de desarrollo: `braces`/`chokidar`/`firebase-tools` (tres altos) y `@opentelemetry/core`/`@google-cloud/pubsub`/`uuid`/`gaxios` (cuatro moderados). La CLI más reciente consultada conserva estas transitivas; no se fuerzan cambios de versión mayor incompatibles. `@grpc/grpc-js` y `stream-json` usan overrides fijados a versiones corregidas del mismo major. Este estado debe revisarse antes de una futura publicación.

- [Runtimes Node y ESM de Functions](https://firebase.google.com/docs/functions/manage-functions).
- [Configuración de Emulator Suite](https://firebase.google.com/docs/emulator-suite/install_and_configure).
- [Auth emulator y tokens locales](https://firebase.google.com/docs/emulator-suite/connect_auth).
- [Archivos Adoptium y comprobación SHA-256](https://adoptium.net/installation/archives).
