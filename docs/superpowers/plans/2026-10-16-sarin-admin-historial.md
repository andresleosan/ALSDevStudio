# Plan de implementación: administración e historial de Sarin

> Ejecutar con `superpowers:subagent-driven-development`. El titular aprobó el diseño y exige trabajar únicamente en `main`, sin ramas ni worktrees. Implementación y revisión local completas antes de publicar o cambiar servicios remotos.

**Objetivo:** entregar administración privada, transcripciones fieles de 30 días, autorización previa y purga programada, manteniendo DeepSeek como única IA.

**Arquitectura:** Pages Functions y D1 existentes; sesiones anónimas y contexto recuperado por el servidor. Cloudflare Access protege panel y API con verificación adicional del JWT mediante middleware oficial. Un Worker independiente comparte D1 para purga horaria.

**Stack:** HTML/CSS/ES Modules, Fetch/Crypto, D1 SQL, plugin oficial Access, Node Test y Playwright existentes. Dependencias privadas aisladas en `.github/sarin/`.

**Diseño aprobado:** [especificación](../specs/2026-10-16-sarin-admin-historial-design.md).

## Restricciones y contratos comunes

- Historial: 30 días desde primer mensaje aceptado; sesión operativa/vacía 24 h; cuotas IP y rechazos sin conversación 48 h; auditoría 30 días; cuotas globales 35 días.
- Mantener 10 mensajes/minuto y 50/día por IP pseudonimizada, 15 turnos por conversación también en servidor, 5 sesiones/minuto y 20/día; 2000 conversaciones y 64 MiB de texto agregados como máximos iniciales.
- Máximo 32 eventos por conversación, 10000 agregados de rechazo; al alcanzar el máximo incrementar contadores existentes, sin cuerpos de peticiones inválidas ni IP en transcripciones.
- Flags `SARIN_ENABLED`, `SARIN_HISTORY_ENABLED`, `SARIN_ADMIN_ENABLED` en `false` por defecto. El historial es requisito del nuevo chat; sin configuración válida no hay inferencia.
- Mantener proveedor/modelo/presupuestos anteriores, contexto de cuatro pares, límites de bytes/tokens/timeout y ausencia de reintentos de IA.
- Nuevo módulo público `scripts/modules/sarin-consent.js`: `NOTICE_VERSION`, `PRIVACY_VERSION`, `TERMS_VERSION`, `NOTICE_TEXT`. Solo información pública; versión `sarin-history-2026-10-16-v1`, políticas `2026-10-16-sarin-history-v1`. Hash SHA-256 calculado por servidor del texto canónico.
- `POST /api/sarin/session`: cuerpo cerrado `{consent:{accepted:true,noticeVersion,privacyVersion,termsVersion}}`; respuesta `{conversationId,sessionExpiresAt}` y cookie técnica segura. `POST /api/sarin`: `{message,requestId}`; sin `history` ni roles del cliente.
- Cookie `__Host-sarin-session`, `HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400`, secreto aleatorio de 32 bytes, solo hash en D1. Las pruebas pueden transportar cookies explícitamente; no hay bypass administrativo local en producción.
- Respuesta de chat conserva `reply/service/examples/brief` y añade `conversationId`, `requestId`, `turn`, `expiresAt`; errores públicos conservan `error.code/message`. Cada turno se identifica por UUID del cliente, con idempotencia y una petición activa por sesión.
- Admin: `GET /api/control-sarin/bootstrap` devuelve `{csrfToken,adminEmail,purge}`; `GET /api/control-sarin/conversations` admite `limit` 1–50, `cursor`, `service`, `state`, `from`, `to`; `GET /api/control-sarin/conversations/<uuid>` devuelve detalle; `POST /api/control-sarin/conversations/<uuid>` con `{action:'review'|'block'|'unblock'|'delete'}` y `X-Sarin-CSRF`.
- Admin exige `SARIN_ACCESS_DOMAIN`, `SARIN_ACCESS_AUD`, `SARIN_ADMIN_EMAIL`, `SARIN_ADMIN_CSRF_SECRET` (secreto mínimo 32 caracteres). No confiar en cabeceras de identidad sin validar JWT. Origen exacto y JSON en mutaciones; `no-store`/noindex en todo el panel y API.
- Datos reales, claves, cookies y conversaciones fuera de Git, capturas y logs. Solo fixtures sintéticos en pruebas; ninguna llamada real adicional salvo comprobación local acotada del coordinador.

## Revisión prioritaria

1. Respuesta tardía tras borrado/purga: no recrea el chat ni duplica capacidad o gasto.
2. Token válido de otra sesión o historia falsificada: nunca accede o modifica el chat ajeno.
3. Repetición concurrente de un requestId: una inferencia como máximo y resultado estable.
4. Rutas alternativas, JWT falso/ajeno y CSRF: denegados incluso fuera de Access perimetral.
5. Vencimiento sin tráfico: purga real, visibilidad inmediata, estado de limpieza y restauración conservadora.

## Tarea 1: almacén, sesiones y retención

**Crear:** `migrations/sarin/0002_history.sql`, `server/sarin/history.js`, `.github/cloudflare/sarin-history.test.mjs`. **Modificar:** README de migraciones y fixture SQLite con opción `sqliteFixture({history:true})`; conservar modo anterior por defecto.

**Produce:** `createHistoryStore({db,now?,limits?})` con métodos asíncronos:

- `createSession({tokenHash,identity,consent})` → `{conversationId,sessionExpiresAt}`; consent incluye versiones/hash y fecha del servidor.
- `beginTurn({tokenHash,requestId,message})` → `{conversationId,turn,expiresAt,history,replay?:{status,body}}`; valida propiedad, vigencia, bloqueo y límite, reserva capacidad de entrada+respuesta máxima y guarda el mensaje admitido. Otro intento activo devuelve 409; mismo requestId/cuerpo completado devuelve replay; texto distinto con el mismo id se rechaza.
- `attachReservation({conversationId,requestId,reservationId})` enlaza una reserva monetaria antes de la llamada sin copiar pseudónimos de IP.
- `finishTurn({tokenHash,requestId,body,status,outcome})` → `{applied:boolean}`; outcome cerrado `completed|out_of_scope|error|timeout`; guarda respuesta pública, finaliza/libera una vez, no recrea registros borrados. El contexto posterior excluye parejas con error.
- `recordRejection({code})` sin contenido/IP; `purge({limit?})` → cantidades y `remaining`; `getPurgeStatus()` → última ejecución/estado sin datos personales.
- `listConversations(filters)` → `{items,nextCursor}`; resumen `{id,createdAt,updatedAt,expiresAt,service,turns,reviewedAt,blockedUntil,status,outOfScopeCount,errorCount,usage:{reservedMicros,verifiedMicros,retainedMicros}}`.
- `getConversation(id)` → resumen más `{messages:[{id,turn,role,content,at,status}],events:[{id,kind,at,count}],consent}`; sin tokens/hash/IP.
- `adminAction({id,action,actor})` → `{ok:true}`; bloqueo 24 h, revisión, desbloqueo o supresión con auditoría mínima.

- [x] Escribir pruebas RED de autorización/sesiones, SQL real, propiedad, idempotencia/concurrencia, límites/capacidad, historial auténtico, respuesta tardía y borrado, caducidad, sesiones vacías, agregados y purga.
- [x] Implementar SQL atómico y errores cerrados con `status/code`, sin registrar errores de DB arbitrarios. Documentar y probar reversión de la migración.
- [x] Ejecutar `node --test .github/cloudflare/sarin-history.test.mjs .github/cloudflare/sarin-quota.test.mjs`; obtener PASS y revisión independiente.

## Tarea 2: protección y API administrativa

**Crear:** `server/sarin/admin.js`, `server/sarin/access.js`, `.github/sarin/package.json` y lockfile, `.github/sarin/access-plugin.js`, Functions bajo `functions/control-sarin/` y `functions/api/control-sarin/`, `.github/cloudflare/sarin-admin.test.mjs`.

**Consume:** consultas/acciones de T1. **Produce:** `handleSarinAdmin(request,env,options?)`, `protectSarinAdmin(context,options?)`; opciones solo internas de pruebas. Middleware oficial importado por wrapper desde sus dependencias aisladas. No modificar build/config/UI de otros responsables.

- [x] RED con JWT inexistente/falso/vencido/audiencia/emisor/usuario ajenos, bypass por pages.dev, falta de configuración, CSRF/origen, filtros inválidos, XSS almacenado y métodos prohibidos.
- [x] Instalar versión explícita del plugin oficial en carpeta aislada; verificar algoritmo, firma y claims con fixtures criptográficos reales, no únicamente un doble que devuelve true.
- [x] Implementar rutas cerradas, paginación, acciones, CSRF firmado de vigencia limitada vinculado al administrador, cabeceras y errores sin datos privados. Proteger también la entrega del HTML.
- [x] Ejecutar `node --test .github/cloudflare/sarin-admin.test.mjs` y auditoría de dependencia; revisión independiente antes de integrar.

## Tarea 3: consentimiento y panel nativos

**Modificar:** `index.html`, `styles/main.css`, `scripts/modules/sarin-chat.js`, `sarin-api.js`, pruebas UI existentes. **Crear:** `control-sarin/index.html`, `scripts/modules/sarin-admin.js`, `styles/sarin-admin.css`, `.github/cloudflare/sarin-admin-ui.test.mjs`.

**Consume:** módulo público de consentimiento y contratos HTTP anteriores. No escribir backend, build, dependencias, políticas HTML ni módulo de consentimiento del coordinador.

- [x] RED de casilla sin marcar, accesos rápidos bloqueados hasta autorizar, rechazo/contacto, analítica independiente, sesión/cookie, envío sin historial y UUID, nueva conversación y resumen/referencia.
- [x] Implementar aviso explícito, creación de sesión al autorizar, solo contexto del servidor y mensajes honestos sobre recarga/nueva conversación; mantener resumen y WhatsApp manual.
- [x] Implementar panel accesible con filtros, listado/detalle cronológico, uso verificado vs retenido, señales y acciones con confirmación de borrado, vencimientos, expiración de acceso y estado de purga. Todo texto mediante DOM seguro.
- [x] Probar cinco anchos, teclado/foco, axe, error/espera/vacío, datos falsos XSS y ausencia de persistencia de mensajes en storage; guardar solo capturas sintéticas.

## Tarea 4: contrato público y proveedor (coordinador)

**Crear:** `scripts/modules/sarin-consent.js`, `server/sarin/sessions.js`, `functions/api/sarin/session.js`, pruebas de sesiones. **Modificar:** `handler.js`, `policy.js`, pruebas backend; conservar cliente DeepSeek y cuotas salvo ajustes mínimos justificados.

- [x] RED de autorización/versiones, cookie/tamaño/origen, eliminación de `history`, turno/replay, error/pago/aborto y sesión ajena; mantener regresiones anteriores.
- [x] Crear sesiones sin llamadas de IA; exigir flags y cookie para chat. Derivar historial de T1, construir payloads existentes, asociar cada reserva antes de red y persistir solo respuesta pública validada.
- [x] Guardar estado de error/cancelación, reservas inciertas conservadas y ausencia de reintentos; si falta persistencia no inferir. Probar integración real SQLite y cuota.

## Tarea 5: empaquetado, purga y textos (coordinador)

**Modificar:** build y pruebas, `_routes.json`, `_headers`, Wrangler y launcher local, políticas y guía operativa. **Crear:** `workers/sarin-retention/` con `scheduled()` cada hora y pruebas; runbook de restauración cerrado.

- [x] RED del allowlist público nuevo y rutas limitadas; servidor, SQL, Worker, dependencias y secretos siguen fuera de `dist`.
- [x] Empaquetar panel y módulos; ampliar solo rutas del chat/sesión y administración. Añadir flags apagados y Worker sin recursos remotos creados.
- [x] Habilitar migración local incremental e importación del plugin instalado; generar secreto CSRF local si falta sin imprimirlo.
- [x] Worker de purga acotada con estado/resultado, captura de fallos sin contenido y detección de retraso en panel. Prueba de restauración: apagar, drenar, borrar tablas restauradas y conciliar capacidad/cuotas antes de reabrir.
- [x] Sustituir afirmaciones obsoletas y publicar localmente cláusulas aprobadas, cookie de sesión, datos/proveedores, derechos, 30 días activos y límites de backups; no afirmar contratos o ajustes de cuenta no comprobados.

## Tarea 6: integración y cierre local

- [x] Ejecutar suites de historial/admin/sesiones/chat/UI/build/purga y regresión de Pages/analítica/escenas pertinente; clasificar errores TypeScript previos sin modificarlos por comodidad.
- [x] Probar en workerd migración repetible, autorización sin IA, rechazo de accesos y datos privados no públicos; prueba pequeña con DeepSeek solo si necesaria para resolver integración.
- [x] Validar panel con autenticación criptográfica sintética y datos ficticios; no crear acceso administrativo libre a transcripciones reales para facilitar QA.
- [x] Revisión independiente de código completo y textos, corregir bloqueantes, actualizar documentos/estado y commit local en main sin claves.
- [x] Entregar resultado revisable y pasos concretos de configuración remota pendientes; no publicar ni alterar cuentas/proveedores sin autorización de esa fase.

## Cierre local

Implementación aprobada y validada: 259 pruebas principales, 80 de regresión y 6 de Pages local. Revisiones independientes y correcciones integradas; ningún hallazgo medio/alto pendiente. Worker scheduled local y migración incremental verificados. Activación remota/configuración de Access/contratos sigue fuera de esta fase. Evidencia, costos y dependencias en [operación](../../SARIN-OPERACION.md). No hubo nueva inferencia pagada, push ni despliegue.
