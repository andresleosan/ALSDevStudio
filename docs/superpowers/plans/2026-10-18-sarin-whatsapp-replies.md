# Respuestas controladas de Sarin por WhatsApp — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** preparar, probar y publicar un piloto de respuestas comerciales de Sarin por WhatsApp que respete aceptación, atención humana y resultados de envío inciertos.

**Architecture:** Pages autentica eventos y compromete captura/trabajo en D1; Queue transporta únicamente referencias opacas a un Worker consumidor. D1 gobierna fases, exclusión por contacto, consentimiento, pausas, historial acreditado y cupos. Staff controla el piloto; el Worker de retención conserva el ciclo completo de datos.

**Tech Stack:** JavaScript ESM con JSDoc y `// @ts-check`, SQL/D1, Cloudflare Pages/Workers/Queues, Web Crypto, Node 24, pruebas `node:test` y SQLite real. Sin framework ni dependencia de aplicación nueva.

**Spec:** [diseño aprobado por el titular el 18 de octubre de 2026](../specs/2026-10-18-sarin-whatsapp-replies-design.md). El diseño incluye las aclaraciones de aceptación pendiente si el webhook de entrega llega tarde y recuperación por fase.

## Global Constraints

- Repositorio `F:/Proyectos/ALS DevStudio/Dev`, únicamente `main`; no crear worktrees/ramas ni modificar Sarin Bot SaaS.
- Mantener receptor vigente, chat web e identidades separadas; cero backfill de capturas antiguas.
- Piloto exclusivo con los números ya configurados en secretos; sólo datos ficticios y texto; sin campañas, plantillas, pagos, recargas ni atención pública.
- Respuesta máxima 1.200 caracteres; historial máximo cuatro pares `user/assistant` confirmados, conforme a `validateInput`.
- Cola: sólo `{ jobId, epoch }`; lote 1, espera 1 segundo, concurrencia 1, máximo 3 reintentos previos a efectos externos, retención 24 horas.
- Procesador: deadline total 60 segundos; lease 120 segundos. Una fase externa iniciada no se repite tras fallo o lease vencido.
- Contenido 24 horas, recibos/observaciones mínimos 48 horas; texto saliente vence con su entrada.
- Topes: 10.000 trabajos, 1.000 salidas, 4 MiB de contenido saliente; 20 intentos diarios UTC y 100 mensuales UTC, incluidos avisos.
- IA comparte US$1/día y US$10/mes con web; sin devolver gasto o intento incierto.
- Controles humanos: pausa durable independiente de capacidad de inbox, reactivación explícita con nuevo contexto y nuevo mensaje.
- Pruebas locales sin proveedores reales; secretos fuera de Git/logs. Activación y prueba de envío se presentan al titular cuando exista candidato verificable.

## Review Focus

1. `ACEPTO` llega antes del webhook que acredita entrega: preservar aceptación pendiente sin IA y conciliar una sola vez (tarea 2).
2. Un eco llega con inbox/recibos llenos: comprometer pausa aunque falle captura completa (tarea 2).
3. Caída tras persistir respuesta y antes de POST: recuperar envío sin repetir IA; caída tras POST: nunca reenviar (tareas 1 y 3).
4. Dos pestañas Staff reactivan usando una revisión antigua: rechazar la segunda y mantener controles válidos (tarea 5).
5. Una Queue antigua reaparece después de restaurar/reactivar: época y corte impiden gasto/envío sin reiniciar cupos (tareas 1, 3 y 4).

## Mapa y orden

1. `0005_whatsapp_replies.sql`, `work-store.js` y contratos: autoridad durable del procesamiento.
2. `consent.js`, eventos/ingress y estado de entrega: admisión, aceptación y pausa.
3. `processor.js` y `workers/sarin-whatsapp/`: ejecución, Queue y rescate.
4. Retención, recuperación y respaldo: ciclo completo y reversión compatible.
5. API/UI Staff y aviso de privacidad: supervisión, controles y recorrido del participante.
6. Integración local, auditoría y candidato revisable.
7. Configuración/publicación apagada, activación y prueba privada concretas.

Tareas 2 y 4 pueden trabajarse en paralelo después del contrato de 1; coordinar los cambios de `ingress-store.js`. Tarea 3 depende de 1/2. Tarea 5 consume los contratos de 1/2 y no cambia su semántica. Integración y publicación son secuenciales. Cada implementador sólo modifica los archivos asignados y entrega resultados al integrador.

## Tarea 1: estado durable, exclusión y cupos

**Archivos:** crear `migrations/sarin/0005_whatsapp_replies.sql`, `server/sarin/whatsapp/work-store.js`, `server/sarin/whatsapp/work-contracts.js`, `.github/cloudflare/sarin-whatsapp-work-store.test.mjs`; modificar `.github/cloudflare/sarin-sqlite-fixture.mjs` y la integración mínima en `server/sarin/whatsapp/ingress-store.js`.

**Interfaces:** `createWhatsAppWorkStore({db,now,limits})` devuelve los métodos siguientes. `jobId`, `outboxId`, `token`, `epoch` y referencias externas son aleatorios; `peerKey` es la clave interna existente. Fechas enteras UTC en milisegundos. Errores de dominio con `status`/`code` cerrados; no mensajes SQL.

| Método | Resultado y condición principal |
| --- | --- |
| `admitJob({eventId,epoch})` | `{status:'created'|'existing'|'ignored',jobId?}`; mismo batch que captura, sólo mensaje nuevo elegible |
| `claimGeneration({jobId,epoch,token})` | `{status:'claimed',work}` o `{status:'busy'|'terminal'}`; `work` incluye entrada, decisión `notice/accept_pending/confirm/generate/ignore`, máximo cuatro pares entregados, destinatario interno y revisiones. La reclamación sola no autoriza IA |
| `markInferenceStarted({jobId,token})` | Condición de token/lease/época/consentimiento/pausa; reserva cupo y capacidad antes de IA |
| `attachReservation({jobId,token,reservationId})` | Enlace durable y permiso vigente antes de cada fase de IA |
| `completeGeneration({jobId,token,reply,outcome})` | Respuesta persistida y salida `ready` atómicas; devuelve `{outboxId}` |
| `createFixedReply({jobId,token,purpose,text,version,hash})` | Aviso o confirmación persistida y salida `ready`, sin marcar/invocar IA; `purpose` es `notice` o `accepted` y su unicidad impide duplicados |
| `deferWork({jobId,token,reason})`, `finishWithoutReply({jobId,token,reason})` | Liberar sin efecto externo para esperar entrega/consentimiento o cerrar por caducidad/cancelación; razones cerradas. Un trabajo diferido no es despachable mientras persista la condición que lo bloquea |
| `failInference({jobId,token,code,started})` | Terminal conocido o `inference_uncertain`; nunca reprocesar una fase iniciada |
| `claimSend({jobId,epoch,token})` | Salida `ready` exclusiva; no requiere repetir generación |
| `beginSend({outboxId,token})` | Permiso final, cupo consumido y `sending` en un commit; devuelve datos cerrados para un POST |
| `finishSend({outboxId,token,result})` | `accepted`, rechazo o incertidumbre; ID proveedor inmutable; integra observaciones previas |
| `applyStatus(event)` | `{status:'applied'|'duplicate'|'ignored'}`; sólo salida local iniciada, conserva evidencia de entrega |
| `listDispatchable({limit})`, `expireLeases({limit})` | Referencias seguras para Queue y expiración conservadora; jamás reintentar una fase externa iniciada |
| `setPilotMode({enabled,expectedRevision,actor})`, `pausePeer({peerKey,expectedRevision,actor})`, `resumePeer({peerKey,expectedRevision,actor})` | Cambio con revisión, auditoría y nueva época/corte cuando corresponde; sin replay |
| `listPeers({limit,cursor})`, `getPeer({peerKey})` | Resumen/detalle mínimo para administrador, sin datos vencidos |

`work-contracts.js` define typedefs exactos `Work`, `SendPermit`, `DeliveryObservation` y `WorkErrorCode`; tareas posteriores los importan por JSDoc. La admisión no debe quedar como llamada independiente posterior al ACK: factorizar las sentencias necesarias para el batch de captura o usar trigger nuevo con control de activación. No alterar retroactivamente 0004.

La recuperación de un trabajo diferido sólo vuelve a ser elegible al cambiar su condición durable: aviso/aceptación conciliados o entrega precedente resuelta. No publicar un aviso de Queue por minuto para cada trabajo bloqueado. La fase de respuesta fija reserva capacidad/cupo al crear su salida; generación los reserva antes de IA.

- [ ] Escribir pruebas de SQLite: `capture_and_job_are_atomic`, `concurrent_claim_has_one_owner`, `old_activation_never_claims`, `ready_send_recovers_without_generation`, `started_inference_never_reclaims`, `sending_never_returns_ready`, `quota_twentieth_and_hundredth_are_atomic`, `outbox_capacity_is_reserved_before_ai`. Afirmaciones clave: un trabajo por evento canónico, un dueño por contacto, intentos ≤20/día y ≤100/mes, texto saliente ≤1.200 y bytes ≤4 MiB.
- [ ] Ejecutar `node --test .github/cloudflare/sarin-whatsapp-work-store.test.mjs`; observar fallos por contrato ausente.
- [ ] Implementar migración y métodos con CAS/batches, índice de exclusión por contacto y comprobación de token/lease en toda transición. Mantener gasto separado de la caducidad de contenido; contadores activos no se purgan.
- [ ] Ejecutar suite nueva y `sarin-whatsapp-ingress-store.test.mjs`; exigir cero fallos y pruebas de rollback reales.
- [ ] Revisar y hacer commit enfocado con `[CI Skip]`; registrar esquema y contratos definitivos en este plan antes de delegar consumidores.

## Tarea 2: aceptación, pausas y eventos de entrega

**Archivos:** crear `server/sarin/whatsapp/consent.js`, `.github/cloudflare/sarin-whatsapp-consent.test.mjs`, `.github/cloudflare/sarin-whatsapp-delivery.test.mjs`; modificar `work-store.js`, `ingress.js`, `ingress-store.js`, `ycloud-webhook.js`, `ycloud-client.js` y sus pruebas.

**Interfaces:** `classifyWhatsAppInput({mediaType,text}) -> 'accept'|'stop'|'human'|'text'|'media'`; constantes `WHATSAPP_NOTICE_VERSION`, `WHATSAPP_NOTICE`, `WHATSAPP_ACCEPTED`. Store añade `observeControl({event})`, `recordNotice({peerKey,outboxId,version,hash})` y `reconcileConsent({peerKey})`. `observeControl` es durable, idempotente por evento/contexto y se ejecuta tras firma/filtro temporal/piloto, antes de capacidad de contenido. La decisión de inferir siempre procede de la aceptación persistida, nunca de texto libre de un trabajo.

Conservar `handleWhatsAppIngress(request,env,options)` y `{ok:true}`; agregar `options.notifyWork` para publicación posterior al commit mediante contexto de Pages. Cuando respuestas estén apagadas o no exista 0005, mantener comportamiento de captura actual sin exigir Queue.

Eventos de estado normalizados incorporan campos opcionales `from`, `to`, `wabaId`, `externalId`, `wamid`; validarlos si aparecen. El cliente puede devolver `wamid` además de `{providerId,status}`. No cambiar la URL de envío ni convertir `accepted` en `delivered`. Estado API nunca es señal humana. Eco con correlación inequívoca a una salida propia no pausa; eco ambiguo sí pausa conservadoramente.

- [ ] Escribir pruebas: `notice_never_calls_ai`, `accept_before_notice_rejected`, `accept_waits_for_delayed_delivery`, `late_delivery_reconciles_once`, `failed_notice_never_grants_consent`, `stop_works_while_paused`, `accept_does_not_resume_human_pause`, `echo_full_capacity_still_pauses`, `own_api_status_does_not_pause`, `provider_identity_conflict_is_rejected`. Afirmar vigencia máxima 86.400.000 ms y ausencia de texto previo al consentimiento en trabajo IA.
- [ ] Ejecutar las suites nuevas y comprobar RED antes de implementación.
- [ ] Implementar clasificación exacta y aviso fijado por el diseño, conciliación pendiente, pausa independiente de capacidad, semántica de ecos y estados duplicados/desordenados. Probar `read` sin `delivered`, `failed` posterior a entrega y estado anterior al resultado POST.
- [ ] Ejecutar `node --test .github/cloudflare/sarin-whatsapp-consent.test.mjs .github/cloudflare/sarin-whatsapp-delivery.test.mjs .github/cloudflare/sarin-whatsapp-ingress.test.mjs .github/cloudflare/sarin-ycloud-webhook.test.mjs .github/cloudflare/sarin-ycloud-client.test.mjs`; cero fallos.
- [ ] Revisión independiente del límite de cuenta, secretos, consentimiento y carrera humana; commit enfocado.

## Tarea 3: procesador y Worker de Queue

**Archivos:** crear `server/sarin/whatsapp/processor.js`, `server/sarin/whatsapp/processing-config.js`, `workers/sarin-whatsapp/index.js`, `workers/sarin-whatsapp/wrangler.jsonc`, `.github/cloudflare/sarin-whatsapp-processor.test.mjs`, `.github/cloudflare/sarin-whatsapp-worker.test.mjs`; modificar `functions/api/sarin/whatsapp.js` para avisar a Queue después del commit.

**Interfaces:** `processWhatsAppWork({jobId,epoch},env,{store,fetch,now}?) -> {status}`; `dispatchWhatsAppWork(env,{store,now}?) -> {published,expired}`. Worker implementa `queue(batch,env)` y `scheduled(controller,env)`; sin `fetch` público. Store y transportes de tareas 1/2; `runCommercialTurn` sigue siendo el motor único.

Config cerrada: `SARIN_WHATSAPP_REPLIES_ENABLED`, `SARIN_WHATSAPP_SEND_ENABLED`, `SARIN_WHATSAPP_API_KEY`, empresa/WABA/piloto ya confirmados, secreto de identidad/cuota existente, precios y límites actuales, D1/Queue. Flags nuevas falsas por defecto y en preview. La época de activación y revisión se leen desde D1. Config incompleta no inicia IA ni envío.

- [ ] Escribir pruebas `duplicate_queue_one_inference_one_post`, `pause_during_classification_prevents_generation`, `pause_after_generation_prevents_post`, `crash_after_saved_reply_only_sends`, `post_timeout_is_terminal_uncertain`, `queue_old_epoch_is_inert`, `expired_window_no_post`, `no_delivered_reply_in_history`, `dead_consumer_does_not_restart_ai`, `queue_publish_failure_is_recovered`. Espías de red distinguen DeepSeek/YCloud; afirmar un POST máximo por salida.
- [ ] Ejecutar `node --test .github/cloudflare/sarin-whatsapp-processor.test.mjs .github/cloudflare/sarin-whatsapp-worker.test.mjs`; observar RED.
- [ ] Implementar fases con deadline global, abortos y configuración fija. Usar `attachReservation` como control antes de cada llamada; no extender `runCommercialTurn` para reintentar clasificación. Un fallo tras inicio externo conserva presupuesto y deja revisión humana.
- [ ] Implementar Queue ack de duplicados/terminales y rescate acotado de fases seguras. Programar cron por minuto; GET de conciliación por ID con tope de tres intentos separados, nunca búsqueda inventada por `externalId` ni repetición de POST.
- [ ] Ejecutar las suites nuevas más `sarin-commercial-turn.test.mjs` y `sarin-quota.test.mjs`; compilar Worker con `deploy --dry-run`. Ningún recurso remoto se crea en este paso.
- [ ] Revisión de efectos externos, serialización por contacto y cupos; commit enfocado.

## Tarea 4: retención, respaldo y restauración

**Archivos:** crear `server/sarin/whatsapp/work-maintenance.js`; modificar `workers/sarin-retention/index.js`, `server/sarin/history-recovery.js`, `.github/cloudflare/check-sarin-backup.mjs`, `.github/cloudflare/check-sarin-backup.test.mjs`, `.github/cloudflare/sarin-whatsapp-maintenance.test.mjs`, `.github/cloudflare/sarin-retention.test.mjs`, `docs/SARIN-RESTAURACION.md`.

**Interfaces:** `purgeWhatsAppWork({db,now,limit}) -> {jobs,outbox,consents,audits,observations,remaining}`; `getWhatsAppWorkRecoveryStatements({db,at}) -> statements[]` para un único batch junto con web/recepción. Detectar versión completa 0004/0005 sin asumir que una sola tabla prueba migración correcta.

- [ ] Escribir RED: `purge_never_resets_active_send_caps`, `response_expires_with_inbound`, `partial_0005_fails_closed`, `restore_rotates_epoch_and_closes_send`, `restored_queue_reference_never_runs`, `missing_0005_trigger_rejects_backup`. Contadores monetarios no se eliminan por cascada; cupos del periodo restaurado se cierran conservadoramente hasta conciliación.
- [ ] Ejecutar pruebas de mantenimiento/respaldo y observar fallos específicos nuevos.
- [ ] Implementar borrados por lotes, liberación exacta de capacidad, conciliación conservadora y validación de definiciones SQL acumuladas. Mantener soporte a base anterior cuando envío está apagado.
- [ ] Ejecutar `node --test .github/cloudflare/sarin-whatsapp-maintenance.test.mjs .github/cloudflare/sarin-retention.test.mjs .github/cloudflare/check-sarin-backup.test.mjs`; cero fallos. Restaurar solamente copias sintéticas/locales en estas pruebas.
- [ ] Revisión independiente de conservación/cupos y actualización del procedimiento de rollback; commit.

## Tarea 5: Staff y aviso del piloto

**Archivos:** crear `server/sarin/whatsapp/admin.js`, `scripts/modules/sarin-whatsapp-admin.js`, `.github/cloudflare/sarin-whatsapp-admin.test.mjs`, `.github/cloudflare/sarin-whatsapp-admin-ui.test.mjs`; modificar `server/sarin/admin.js`, `control-sarin/index.html`, `scripts/modules/sarin-admin.js`, `styles/sarin-admin.css` y `privacidad.html`.

**Interfaces HTTP:** rutas bajo `/api/control-sarin/whatsapp`: GET `/peers`, GET `/peers/:peerKey`, POST `/peers/:peerKey/action` con `{action:'pause'|'resume',revision}`, POST `/pilot` con `{enabled,revision}`, POST `/outbox/:id/reconcile` sólo consulta por ID existente. No aceptar teléfono destino ni texto de envío desde estos endpoints. Respuestas incluyen revisiones, estado y fechas, no secretos.

`handleSarinAdmin` conserva autenticación/Origin/CSRF; despacha a `handleWhatsAppAdmin(request,env,{admin,actor,now,store})` sólo después de esos controles. El módulo UI consume el token de bootstrap existente. Usar listas/detalle separados para WhatsApp, sin alterar filtros y contratos web.

- [ ] Escribir RED: `anonymous_cannot_read_whatsapp`, `wrong_origin_or_csrf_cannot_resume`, `stale_revision_returns_409`, `resume_requires_fresh_message`, `api_cannot_choose_recipient`, `html_in_message_is_text`, `hidden_tab_stops_polling`, `uncertain_has_no_resend_action`. Afirmar lista con teléfono enmascarado y actualización de 5.000 ms sólo visible.
- [ ] Ejecutar suites nuevas; observar fallos por rutas/UI ausentes.
- [ ] Implementar sección WhatsApp con «Pausar Sarin», «Reactivar Sarin», «Apagar piloto», aceptación y estado de entrega. Eco visible como «Respuesta desde el celular» sin cuerpo. Resolver conflictos de revisión mostrando estado actual, sin repetir acción silenciosamente.
- [ ] Agregar `#whatsapp-piloto` a privacidad con alcance de datos ficticios, proveedores y retención diferenciada del aviso aprobado. Mantener pendientes contractuales y excluir atención pública; no reescribir las condiciones web restantes.
- [ ] Ejecutar nuevas suites y `sarin-admin.test.mjs`, `sarin-admin-ui.test.mjs`, `sarin-ui.test.mjs`, `build.test.mjs`. Validar visualmente escritorio/móvil con datos sintéticos y teclado; guardar capturas ignoradas.
- [ ] Revisión de acceso, copia visible y recorrido completo; commit.

## Tarea 6: candidato integrado y auditoría

**Archivos:** `wrangler.jsonc`, `_routes.json` sólo si hacen falta rutas exactas nuevas, `.github/cloudflare/build.mjs`/pruebas, documentación de operación `docs/SARIN-WHATSAPP-PILOTO.md`, `STACK.md`, `tasks.md`. Harnesses locales/evidencias en `.wrangler/` y `test-results/`, ignorados.

- [ ] Leer el diff completo y el diseño, comprobar que no se ampliaron destinatarios ni plan de proveedor. Añadir binding Queue de producción al candidato; preview permanece apagado/sin D1. Mantener flags del chat web.
- [ ] Ejecutar todas las suites Sarin, WhatsApp, respaldo y build relevantes con salida guardada; registrar conteo real y fallos/omisiones. Ejecutar TSC estricto en módulos nuevos y comparar deuda previa del backend antes de atribuir regresiones.
- [ ] Compilar Functions, consumidor y retención. Smoke con workerd/D1 y Queue simulada: aviso, aceptación, IA falsa, salida falsa, estado, pausa, reactivación, expiración y restauración. Cero llamadas de red reales. Pages es productor y un Worker separado consume; Wrangler Pages dev no acredita por sí solo ese recorrido, usar un harness multitrabajador o contratos separados explícitos. [Limitación oficial](https://developers.cloudflare.com/pages/functions/bindings/#queue-producers).
- [ ] Rebuild público con `SARIN_ENABLED=true` y `SARIN_HISTORY_ENABLED=true`; comprobar `data-sarin-enabled="true"`. Verificar que servidor, SQL, backups y secretos no entren en `dist`.
- [ ] Revisión independiente final del conjunto: carreras, pausa con capacidad llena, incertidumbres, mezcla de cuentas, consentimiento, coste y restauración. Corregir P1/P2 y repetir sólo pruebas afectadas y la integración final.
- [ ] Presentar candidato concreto: comportamiento, evidencia, límites, recursos/secreto necesarios y reversión. Solicitar al titular la publicación/configuración y una prueba de envío al participante autorizado; no abrir destinatarios públicos ni usar claves antes de ese paso.

## Tarea 7: publicación y piloto autorizado

Depende de candidato probado y confirmación concreta, porque introduce envíos y uso de proveedores además de la recepción ya autorizada.

- [ ] Confirmar versión remota vigente, guardar IDs de reversión y obtener respaldo reciente privado; verificar esquema/datos restaurando sólo en memoria antes de migrar.
- [ ] Aplicar únicamente migración pendiente, publicar retención compatible, crear Queue y Worker con envíos apagados y publicar Staff/receptor. Preservar chat web y secretos existentes.
- [ ] Configurar privadamente clave de envío YCloud en el Worker y credenciales mínimas de IA/cuota; no leer/revelar clave por defecto innecesariamente ni pedirla por chat. Confirmar capacidades reales de Free sin añadir pago ni ampliar permisos fuera del hito autorizado.
- [ ] Añadir evento de estado al webhook y verificar URL/cuenta/eventos exactos. Guardar evidencia sin secretos.
- [ ] Con el titular en Staff, habilitar piloto y contacto con un inicio nuevo. Solicitar mensaje ficticio nuevo, aviso/ACEPTO, consulta comercial, entrega confirmada, respuesta humana desde celular y reactivación. Comprobar que un envío propio no se clasifique como humano.
- [ ] Verificar estado/TTL/cupos por metadatos, cron real y web intacta. Si hay incertidumbre, pausar y diagnosticar sin reenviar. No declarar entrega sólo por HTTP 200.
- [ ] Registrar commit/despliegues/resultados y limitaciones en los documentos operativos. Retirar archivos temporales de secretos y detener observadores de pruebas. Reportar qué fase está funcionando y qué permanece fuera del piloto.

## Autorrevisión del plan

Cobertura: tareas 1–3 cubren procesamiento/consentimiento/entrega; 4 conservación/restauración; 5 operador/aviso; 6 pruebas y candidato; 7 activación. Los cinco riesgos de Review Focus tienen pruebas asignadas. Interfaces y nombres se comparten por `work-contracts.js`; las tareas posteriores no inventan métodos de store. No se estimula ningún envío remoto durante desarrollo.

Estado de revisión: diseño aprobado; plan preparado para lectura del titular y elección del método de ejecución. Recomendación: implementación por tareas con agentes y revisión independiente, por las carreras y efectos externos de esta integración.
