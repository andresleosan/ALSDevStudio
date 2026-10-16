# Plan de implementación de Sarin en la web

> Para agentes: ejecutar por tareas con `superpowers:subagent-driven-development`; pruebas antes del código y revisión independiente al integrar. Las instrucciones del titular prevalecen: trabajar únicamente en `main`, sin ramas ni worktrees.

**Objetivo:** entregar un chat local revisable que orienta sobre ALS DevStudio con DeepSeek y prepara contacto manual por WhatsApp.

**Arquitectura:** frontend Vanilla JS aislado, Pages Function `/api/sarin`, catálogo cerrado en servidor y D1 para cuotas atómicas. Las pruebas de proveedor usan dobles; la prueba real se realiza al final con la clave local, cuotas activas y un consumo acotado. No se publica durante esta entrega.

**Stack:** HTML, CSS, ES Modules, Web Fetch/Crypto, Cloudflare Pages/D1, Node Test y Playwright ya instalado.

**Diseño:** [especificación](../specs/2026-10-16-sarin-chat-web-design.md).

## Restricciones globales

- Solo `deepseek-flash`, `https://api.deepseek.com/chat/completions`, sin razonamiento ni streaming.
- Una pregunta por turno; ejemplos reales del catálogo; cotización final de Andrés.
- Solo memoria de pestaña para conversaciones. No persistir texto en D1, cookies, storage o logs.
- Request JSON hasta 16 KiB; mensaje de 1–1200 caracteres; historial hasta ocho mensajes `user`/`assistant`, máximo 1200 caracteres cada uno.
- Clasificación hasta 8 KiB/128 tokens/10 s; generación hasta 32 KiB/512 tokens/20 s; timeout de interfaz 35 s.
- Frecuencia por IP pseudonimizada: 10 turnos/minuto, 50/día; 15 turnos por conversación en la interfaz.
- Presupuesto inicial diario 1000000 y mensual 10000000 microUSD; precios por millón: entrada 300000, salida 1200000 microUSD.
- Reserva `ceil(((2 * bytesUTF8 + 1024) * precioEntrada + tokensSalida * precioSalida) / 1000000)` antes de cada llamada, sin reintentos.
- `_routes.json` limita invocaciones a `/api/sarin` y `/api/sarin/`; servidor/migraciones/secretos nunca en `dist`.
- Primera entrega local; `SARIN_ENABLED=false` por defecto y previews sin activación automática.

## Foco de revisión

- Dos peticiones concurrentes no pueden reservar el mismo saldo: probar con SQLite real y límites simultáneos.
- Reinicio/cancelación/timeout no mezclan respuestas ni liberan reservas inciertas: pruebas de backend y navegador.
- Seguimientos breves y caracteres multibyte conservan contexto o fallan antes de facturar: pruebas de selección de pares y tamaño en bytes.
- Salidas del modelo, historial y URLs son no confiables: probar roles prohibidos, HTML, enlaces externos, precios y campos desconocidos.
- Diálogos simultáneos, teclado móvil e IME: probar foco/Escape, Enter en composición y prioridad del aviso de analítica.

## Interfaces compartidas

### API HTTP

POST `{ message, history: [{role,content}] }`. Respuesta satisfactoria:

`{ reply, service?: 'website'|'store'|'application'|'chatbot', examples: [{id,title,url,description}], brief: {business?,need?,features?,timeline?,budget?} }`.

Campos de brief son cadenas opcionales de hasta 240 caracteres; se validan como borrador, nunca datos confirmados. `reply`: 1–1200 caracteres. Máximo dos ejemplos; el servidor resuelve sus URLs desde el catálogo. El cliente renderiza texto plano y comprueba URLs HTTPS del catálogo público conocido. Error `{error:{code,message}}` con HTTP del diseño.

### Cuotas

`server/sarin/quota.js` exporta:

- `QuotaError`: `status` 429 o 503, `code` seguro.
- `pseudonymizeIp(ip, secret, nowMs): Promise<string>` mediante Web Crypto HMAC con día UTC; secreto mínimo 32 caracteres.
- `createQuota({db, identity, now = () => Date.now(), limits}): { reserve, settle, block }`.
- `limits = { perMinute:10, perDay:50, dailyMicros:1000000, monthlyMicros:10000000 }`.
- `reserve({id, stage:'classification'|'generation', amountMicros}): Promise<{id,reservedMicros}>`; clasificación incrementa frecuencia una vez, generación solo reserva costo. `id` único generado en servidor por llamada.
- `settle(id, actualMicros): Promise<void>`; liquidación atómica, única y solo ≤ reserva. Incertidumbre conserva reserva. Exceso bloquea futuras reservas; `block()` registra el bloqueo global.

SQL: tabla de contadores, reservas y estado global, sin mensajes ni IP cruda. Caducidad lógica IP 48 h y global/reservas 35 días con purga oportunista acotada. Probar D1 con un adaptador de `node:sqlite` que ejecute el SQL real, incluidas transacciones/triggers.

### Entorno

`DEEPSEEK_API_KEY`, `SARIN_IP_SECRET` (secretos), `SARIN_DB` (D1), `SARIN_ENABLED`, `SARIN_INPUT_PRICE_MICROS`, `SARIN_OUTPUT_PRICE_MICROS`, `SARIN_DAILY_BUDGET_MICROS`, `SARIN_MONTHLY_BUDGET_MICROS`.

Valores numéricos se configuran explícitamente en Wrangler/local; si faltan o son inválidos y se intenta activar, responder 503 sin proveedor. Backend recibe Fetch/Crypto de plataforma; las dependencias de pruebas se inyectan explícitamente, sin seleccionar proveedores alternos desde HTTP/env.

## Tarea 1: cuotas persistentes y liquidación concurrente

**Archivos:** crear `server/sarin/quota.js`, `migrations/sarin/0001_usage.sql`, `.github/cloudflare/sarin-quota.test.mjs`.

- [x] Escribir pruebas de límites de frecuencia, presupuesto diario/mensual, concurrencia, liquidación doble, error/timeout incierto, bloqueo por exceso, vencimiento y ausencia de texto/IP cruda.
- [x] Ejecutar `node --test .github/cloudflare/sarin-quota.test.mjs`; confirmar fallo por funcionalidad ausente.
- [x] Implementar las interfaces compartidas; reservas y liquidaciones atómicas usando SQL real. Las cuotas rechazan configuración inválida y fallos de base de datos.
- [x] Ejecutar las mismas pruebas hasta PASS; inspeccionar secretos/logs y emitir evidencia al coordinador.

## Tarea 2: conocimiento, política, DeepSeek y endpoint

**Archivos:** crear `server/sarin/knowledge.js`, `server/sarin/policy.js`, `server/sarin/deepseek.js`, `server/sarin/handler.js`, `functions/api/sarin.js`, `.github/cloudflare/sarin.test.mjs`.

**Consume:** API de cuotas anterior y contratos HTTP compartidos. `handler.js` exporta `handleSarin(request, env, options?)`; `options` solo permite dobles de fetch/reloj/cuotas para pruebas de unidad, no desde solicitudes públicas.

- [x] Escribir pruebas para cuerpos/roles/orígenes prohibidos, tamaño por bytes, campos cerrados, configuración ausente, catálogo/ejemplos, clasificador `{inScope:boolean}`, seguimiento contextual, salida inválida/HTML/URLs y errores del proveedor.
- [x] Ejecutar `node --test .github/cloudflare/sarin.test.mjs`; confirmar RED.
- [x] Implementar clasificación y generación JSON con contexto por pares, presupuestar cada llamada antes de ejecutarla y liquidar solo uso verificado. Sin reintentos, herramientas o proveedores alternos.
- [x] Fuera de alcance: respuesta fija comercial sin segunda llamada. Rechazar contenidos de salida que contradigan los contratos; no aceptar URLs arbitrarias ni precios en la respuesta comercial.
- [x] Añadir cabeceras propias, `no-store`, métodos/orígenes válidos y aborto/timeout. No registrar cuerpos, claves ni respuestas del proveedor.
- [x] Ejecutar pruebas hasta PASS y comprobar que todos los rechazos previos al proveedor consumen cero inferencias.

## Tarea 3: interfaz, memoria y resumen revisable

**Archivos:** modificar `index.html`, `styles/main.css`, `scripts/main.js`; crear `scripts/modules/sarin-chat.js`, `scripts/modules/sarin-api.js`, `scripts/modules/sarin-summary.js`, `.github/cloudflare/sarin-ui.test.mjs`.

**Consume:** contrato HTTP anterior. Los ejemplos permiten exclusivamente los orígenes/URLs públicos de BPT-Jersey, Sarin, SemanControl, Mundo Celular, Coctels OPS, La Parada, Field Hours, Dialon y Vigia.

- [x] Escribir pruebas de navegador para apertura, foco/Escape, prioridad del aviso, cuatro accesos, envío único, IME, validación del transporte, error/contacto, cancelación/nueva conversación, resumen vacío/editable/1800 caracteres y WhatsApp solo tras gesto.
- [x] Ejecutar `node --test .github/cloudflare/sarin-ui.test.mjs`; confirmar RED.
- [x] Implementar diálogo accesible y lanzador con identidad actual; estado vacío explícito, una pregunta por turno y sin abrir automáticamente.
- [x] Mantener mensajes en memoria; al enviar historial usar pares recientes y hasta ocho mensajes. Descartar respuestas antiguas y mantener máximo quince turnos de UI.
- [x] Construir el resumen con lo compartido y campos de borrador revisables; validación clara en vez de truncado silencioso. Crear enlace al número fijo existente, sin enviar mensajes.
- [x] Verificar cinco anchos 320/390/680/900/1440, teclado, reduced motion, sin JS y axe; sin HTML del modelo, almacenamiento o conexiones al abrir.

## Tarea 4: empaquetado, desarrollo local e integración

**Archivos:** modificar `.github/cloudflare/build.mjs` y `build.test.mjs`, `_headers`, `wrangler.jsonc`; crear `_routes.json`, `.github/sarin/dev.mjs` y configuración exclusivamente local. Actualizar políticas/documentación/estado de tareas.

- [x] Probar que el build permite solo nuevos módulos públicos y `_routes.json` exacto; sigue rechazando servidor, SQL, secretos y artefactos ajenos.
- [x] Añadir configuración no sensible y desactivada por defecto. Preparar D1 local con migración real y un comando de inicio repetible; no crear recursos remotos ni publicar.
- [x] Añadir `SARIN_IP_SECRET` local aleatorio si falta, sin leer valores en herramientas ni sobrescribir la clave; el launcher carga secretos sin mostrarlos.
- [x] Ajustar avisos a mensajes enviados a DeepSeek, memoria temporal y cuotas pseudonimizadas, sin inventar plazos del proveedor. Preservar consentimiento independiente de analítica.
- [x] Ejecutar `node --test .github/cloudflare/build.test.mjs .github/cloudflare/sarin-quota.test.mjs .github/cloudflare/sarin.test.mjs .github/cloudflare/sarin-ui.test.mjs` y build.
- [x] Ejecutar QA de Pages y regresión pertinente. Inspeccionar capturas, `git diff --check` y revisión independiente; corregir bloqueantes.
- [x] Con la clave del usuario, hacer una prueba local pequeña con cuotas activas: una consulta sobre solución y ejemplos, una fuera de alcance y el resumen/contacto; no imprimir conversación ni clave en logs. Registrar solo resultados, cantidad de inferencias y consumo técnico.
- [x] Presentar versión local y evidencia. Mantener producción sin cambios; preparar instrucciones de activación/rollback para el paso posterior autorizado.

## Autorrevisión

Cada criterio del diseño está cubierto por una tarea. Cuotas, endpoint e interfaz pueden implementarse en paralelo porque comparten contratos definidos; integración y prueba real quedan a cargo del coordinador. Cualquier cambio de interfaz se comunica a los otros responsables antes de aplicarlo. La revisión final verifica conjuntamente datos, costo, seguridad, accesibilidad y regresiones.
