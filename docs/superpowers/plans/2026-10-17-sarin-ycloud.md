# Plan de implementación: transporte YCloud de Sarin

**Objetivo:** dejar probado el contrato de recepción y envío mientras el titular completa YCloud Free.

**Arquitectura:** módulos internos independientes para recepción autenticada y transporte REST. Sin ruta pública ni procesamiento de clientes hasta disponer de persistencia, consentimiento y cuenta verificada.

**Stack:** JavaScript ESM, JSDoc, Web Crypto, Fetch, pruebas Node existentes, sin dependencias.

**Diseño:** [especificación](../specs/2026-10-17-sarin-ycloud-design.md).

## Restricciones

- Repositorio ALS DevStudio, rama `main`; no modificar Sarin Bot SaaS.
- No enviar mensajes reales ni emplear credenciales en pruebas.
- No introducir endpoints activos ni scripts que se ejecuten al importar.
- Desactivación predeterminada, secretos sólo recibidos desde servidor, cero logs con datos.

## Revisión prioritaria

Firma sobre bytes exactos; reintentos legítimos y eventos repetidos; respuestas fuera de orden; timeout con petición quizá aceptada; datos extra o excesivos del proveedor.

## Tarea 1: recepción autenticada

Archivos: `server/sarin/whatsapp/ycloud-webhook.js`, `.github/cloudflare/sarin-ycloud-webhook.test.mjs`.

Interfaz: `readYCloudWebhook(request, {secret, now?})` devuelve un evento normalizado o `ignored`; lanza un error con `code` y `status` cerrados. Sin persistencia ni ACK HTTP de éxito en esta fase.

- [x] Escribir y ejecutar pruebas fallidas de firma/cuerpo, antigüedad, entrada y normalización.
- [x] Implementar verificación y normalización mínima.
- [x] Ejecutar la suite y revisar la autenticación independientemente: 80 pruebas; corregida correlación Unicode/espacios internos de `externalId` con prueba de ida y vuelta.

## Tarea 2: envío REST

Archivos: `server/sarin/whatsapp/ycloud-client.js`, `.github/cloudflare/sarin-ycloud-client.test.mjs`.

Interfaz: `createYCloudClient({apiKey,businessPhone,sendEnabled,fetcher?,timeoutMs?})` expone `sendText({to,text,externalId,signal?})` y `getMessage({id,signal?})`. Envío devuelve identificador del proveedor; errores distinguen `not_sent`, `rejected` y `uncertain`.

- [x] Escribir y ejecutar pruebas fallidas de configuración, petición, respuesta, timeout y fallo incierto.
- [x] Implementar cliente con URL fija, límites y sin reintentos automáticos.
- [x] Ejecutar suite y revisar ausencia de duplicados, fugas y destinos arbitrarios: 67 pruebas.

## Tarea 3: verificación y estado

- [x] Ejecutar suites nuevas, regresiones de Sarin y build existentes con datos ficticios: 147 nuevas + 206 regresiones; TSC estricto y build correctos.
- [x] Revisión independiente y corrección de hallazgos: sin P1/P2 abiertos en el transporte interno; plazo de lectura pendiente antes de ruta pública.
- [x] Documentar comandos/resultados y pendientes de alta, persistencia y activación en `docs/SARIN-WHATSAPP-EVALUACION.md` y `tasks.md`.
- [x] Alta terminada con intervención del titular para contraseña y verificación; plan Free confirmado en el panel de ALS DevStudio, sin datos de pago.
- [x] El titular completó la vinculación. YCloud muestra `Connected` para el número terminado en 8047 y el titular confirmó usarlo. Free continúa activo; verificación empresarial pendiente. Los eventos de entrada, estado y eco están disponibles en el formulario; aún no se creó webhook ni se comprobó entrega real.

Continuación: [recepción durable del piloto](2026-10-17-sarin-whatsapp-ingress.md). El historial de pruebas anterior corresponde al primer tramo; el deadline propio se incorpora en esta continuación.

Las tareas 1 y 2 se pueden preparar en paralelo; la revisión e integración final son secuenciales. El acceso a la cuenta es independiente y no habilita automáticamente envíos públicos.
