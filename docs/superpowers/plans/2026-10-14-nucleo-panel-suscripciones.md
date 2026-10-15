# Núcleo del panel de suscripciones Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Estado:** cinco tareas implementadas y verificadas localmente. `npm run qa`: 63/63 pruebas sin omitidas, smoke UI y siete escenarios E2E; cuatro anchos con axe sin hallazgos. [Evidencia y pendientes de producción](../../CONTROL-PRIMER-HITO.md). No se han conectado productos reales ni realizado push/despliegue.

**Goal:** Entregar un panel local funcional para configurar planes, crear personas o negocios, asignar suscripciones y registrar pagos manuales con vigencia e historial.

**Architecture:** Aplicación administrativa vanilla y API central independientes del build público. Dominio transaccional probado con almacenamiento en memoria y adaptador Firestore; Firebase Auth y Functions preparados y verificados mediante emuladores. Los cuatro productos permanecen desconectados de sus plataformas reales.

**Tech Stack:** HTML, CSS, JavaScript ES Modules con JSDoc, Node, Firebase Auth, Firestore, Functions y pruebas Node/Playwright.

**Spec:** [Diseño central](../specs/2026-10-14-panel-central-suscripciones-design.md).

## Global Constraints

- Administrador exclusivo `andres.san1404@gmail.com`, UID fijado y permiso verificado en backend; nunca convertir al primer usuario en administrador.
- La Parada, Sarin Bot y SemanControl por negocio; Dialon individual.
- La Parada y Sarin Bot: prueba de siete días; Dialon y SemanControl sin prueba automática hasta configurar su duración.
- Planes inicialmente borrador, sin inventar precios comerciales; renovación de Sarin por 30 días y opción de mes calendario para otros planes.
- Proyecto local `demo-alsdevstudio`; no escribir en Firebase real, no desplegar ni modificar los productos existentes.
- Ningún framework frontend ni `package.json` en la raíz del portafolio. Todo el producto nuevo vive en `control/`.
- Transacciones e idempotencia para pagos y licencias; suspensión manual independiente de la vigencia; estado de conexión visible.
- Este hito entrega núcleo local y contrato común. Conectores reales, migración histórica, gracias por comprobantes y ajustes/anulaciones de pagos son trabajos posteriores; los pagos confirmados serán inmutables.

## Review Focus

- Fin de mes y año bisiesto: conservar ancla al renovar, sin convertir mes calendario en 30 días.
- Reintento y concurrencia: una confirmación no duplica un pago; dos operaciones diferentes no pierden vigencia.
- Vista previa vencida o modificada: rechazar confirmación y pedir una vista previa nueva.
- Identidad parecida: negar correo correcto con UID, proveedor o permiso incorrectos y tokens de otro proyecto.
- Formulario y móvil: no perder silenciosamente datos, mantener foco accesible y no desbordar el viewport.

## Estructura y contrato entre tareas

`control/CONTRACT.md` fija acciones y datos. El backend produce `createControlService({store, now, newId})`, con `getState(admin)` y `execute({requestId, action, payload}, admin)`. El almacén ofrece `runTransaction(callback)`; el callback recibe `get(collection,id)`, `list(collection,limit)`, `set(collection,id,value)` asíncronos.

El navegador consume `createPlatform()` de `web/scripts/platform.mjs`: `mode`, `onSession(callback)`, `signIn()`, `signOut()`, `getState()` y `command(action,payload,requestId?)`. La integración transporta los mismos contratos por HTTP.

### Task 1: Dominio comercial y transacciones

**Files:** crear `control/functions/src/domain.mjs`, `service.mjs`, `memory-store.mjs` y pruebas `control/functions/test/domain.test.mjs`, `service.test.mjs`.

**Interfaces:** producir el servicio y almacén descritos arriba; registros JSON con fechas ISO e importes enteros en unidades menores. La hora y los identificadores se inyectan para pruebas reproducibles.

- [x] Escribir pruebas que fallen para modalidades, plan borrador, prueba única de 168 horas, renovación anticipada/vencida y ancla de fin de mes.
- [x] Implementar catálogo de cuatro productos, validación de sujetos/planes y creación única de suscripciones.
- [x] Escribir y ejecutar pruebas de pagos repetidos, concurrencia, diferencias de importe y vista previa caducada o invalidada por cambio de versión.
- [x] Implementar vista previa persistida de diez minutos, confirmación atómica, pagos inmutables, auditoría y órdenes de licencia absoluta sin conector.
- [x] Probar suspensión/reactivación: pagar no levanta una suspensión; operaciones inválidas no dejan escrituras parciales.
- [x] Verificar `node --test control/functions/test/domain.test.mjs control/functions/test/service.test.mjs`.

### Task 2: API protegida y Firestore

**Files:** crear `control/functions/src/auth.mjs`, `api.mjs`, `firestore-store.mjs`, `index.mjs`, configuración Firebase, reglas y pruebas `auth.test.mjs`, `api.test.mjs`, `firestore.integration.test.mjs`.

**Interfaces:** consumir Task 1. Exportar `createApi({service, verifyToken, config})`, que acepta `Request` y devuelve `Response`; `createFirestoreStore(db)` implementa el mismo almacén. Functions exporta `controlApi`.

- [x] Escribir pruebas que nieguen token ausente, UID incorrecto, otro proyecto, correo no verificado, proveedor incorrecto o claim ausente.
- [x] Implementar autorización con revocación y configuración que falla cerrada al faltar UID; permitir identidad sintética únicamente con proyecto demo y emuladores loopback.
- [x] Implementar `GET /api/state` y `POST /api/commands` con tipos, límite de cuerpo, CORS de orígenes explícitos y errores seguros.
- [x] Implementar Firestore con transacciones y escrituras diferidas hasta terminar lecturas; reglas deniegan escrituras del navegador.
- [x] Probar contra emulador persistencia y dos confirmaciones concurrentes, y denegar acceso directo no autorizado a Firestore.
- [x] Verificar Node tests y prueba integrada con emuladores.

### Task 3: Interfaz administrativa

**Files:** crear `control/web/index.html`, `styles/control.css`, `scripts/app.mjs`, `scripts/render.mjs` y módulos de presentación necesarios, sin editar `platform.mjs`.

**Interfaces:** consumir `createPlatform()` y las acciones de `CONTRACT.md`. La UI no calcula ni concede vigencias por su cuenta; muestra la vista previa emitida por servidor.

- [x] Construir navegación Resumen, Productos, Suscripciones, Pagos y Actividad con identidad ALS y formularios etiquetados.
- [x] Mostrar catálogo sin precios inventados, configuración de plan, alta de persona/negocio y asignación de producto compatible.
- [x] Permitir prueba elegible, pago con vista previa y confirmación, suspensión/reactivación motivadas e historial.
- [x] Separar vigencia deseada de conexión pendiente; resumen distingue pagos recibidos y valor periódico previsto por moneda.
- [x] Implementar búsqueda, filtros y páginas de diez elementos; errores y carga accesibles, foco visible, diálogos y advertencia de cambios sin guardar.
- [x] Comprobar con navegador en 320, 390, 768 y 1440 px, teclado, movimiento reducido y `noscript`.

### Task 4: Entorno local y acceso Firebase

**Files:** crear `control/package.json`, lockfiles, `scripts/build.mjs`, `dev.mjs`, `local-server.mjs`, utilidades de emulador y `web/scripts/platform.mjs`; documentación `control/README.md` y ejemplos de configuración pública.

**Interfaces:** producir la plataforma consumida por Task 3 y lanzar Task 2 sobre `demo-alsdevstudio`. El servidor de desarrollo escuchará solo loopback y no viajará al build de producción.

- [x] Instalar dependencias fijadas en `control/`; compilar SDK Firebase modular localmente, sin CDN ni secretos en web.
- [x] Preparar emuladores y Java compatible en carpeta local ignorada si el sistema no lo tiene; no modificar Java global.
- [x] Crear identidad sintética del administrador exclusivamente en Auth emulator y sesión de prueba local; producción usa Google real y falla cerrada sin configuración.
- [x] Implementar build explícito del panel, fuentes locales y cabeceras de seguridad; distinguir claramente entorno local y modo no configurado.
- [x] Probar inicio/cierre de sesión, recarga, error de red y expiración; verificar que ningún endpoint de desarrollo exista en Functions ni en el build web.
- [x] Documentar comandos de arranque, pruebas y configuración pendiente para conectar Firebase real.

### Task 5: Verificación integrada y cierre

**Files:** crear `control/test/e2e.mjs`, actualizar `STACK.md`, `tasks.md` y el registro de verificación del hito.

- [x] Probar el recorrido completo: configurar plan, crear sujeto, crear suscripción, iniciar prueba, previsualizar/confirmar pago y comprobar historial tras recarga.
- [x] Comprobar acceso directo sin token y usuario no administrador, texto malicioso como dato y límite de cuerpo de API.
- [x] Ejecutar pruebas de dominio/API/Firestore, QA responsive y accesibilidad; revisar dependencias con `npm audit`.
- [x] Ejecutar la regresión del build público y confirmar que no publica código, configuración ni archivos del panel.
- [x] Revisar seguridad de la rama completa, corregir hallazgos y registrar evidencia fresca; conservar revisión local sin push ni despliegue.

## Verificación y ejecución

La autorización del usuario «procedamos» corresponde al hito local descrito en la conversación. Se ejecutará por módulos con agentes en archivos separados, con coordinación y revisión del agente principal. Los cambios de backend real, DNS y publicación quedan fuera de este hito.
