# Piloto de recepción WhatsApp de ALS

Estado: hito de recepción piloto publicado y verificado con entrada, eco y cron reales, con autorización expresa del titular para publicar, aplicar la migración, conectar YCloud y guardar el secreto. La empresa y el remitente de prueba son los elegidos por el titular. YCloud Free muestra la cuenta conectada; la verificación empresarial sigue pendiente. Esta versión sólo recibe: las respuestas del bot pertenecen a una fase futura.

## Alcance publicado

`POST https://www.alsdevstudio.com/api/sarin/whatsapp` verifica la firma YCloud y guarda una captura mínima sólo del participante configurado. Identifica mensajes entrantes y ecos de la app del celular; los ecos conservan metadata, sin texto. Todo queda pausado y con estado `captured`, sin cola de procesamiento. No llama a DeepSeek, no envía respuestas y no consume el cliente REST de YCloud.

YCloud entrega los eventos suscritos de la cuenta al servidor; el filtro de piloto se aplica después de autenticar, antes de persistir. Los demás contactos y eventos se descartan sin guardar su contenido. No se debe presentar este filtro como una restricción de entrega del proveedor. En esta fase se suscriben sólo `whatsapp.inbound_message.received` y `whatsapp.smb.message.echoes`; los estados de salida se añadirán cuando exista outbox verificable.

Contenido: 24 horas. Recibos sin texto/teléfonos: 48 horas. El Worker publicado purga vencidos cada hora en lotes, incluso con la recepción desactivada; su primera ejecución real quedó confirmada a `2026-10-18T05:00:34Z`. Las capturas del piloto aún no habían vencido: el borrado WhatsApp a 24/48 horas está probado localmente, no observado todavía con estos datos remotos. No cambia la conservación de las conversaciones web ni la retención propia de YCloud.

## Configuración de servidor

| Variable | Uso |
| --- | --- |
| `SARIN_WHATSAPP_INGRESS_ENABLED` | Cadena exacta `true` en producción; preview permanece en `false`. |
| `SARIN_WHATSAPP_WEBHOOK_SECRET` | Secreto de firma generado para este endpoint, guardado como secreto en Cloudflare; no es la API key de envío. |
| `SARIN_WHATSAPP_BUSINESS_PHONE` | Teléfono empresarial confirmado, E.164. |
| `SARIN_WHATSAPP_WABA_ID` | WABA de la cuenta conectada. |
| `SARIN_WHATSAPP_PILOT_PHONES` | Array JSON de teléfonos permitidos; piloto inicial de un solo remitente. |
| `SARIN_WHATSAPP_CAPTURE_SINCE` | Inicio efectivo del piloto en UTC ISO, con milisegundos; rechaza historia previa. |
| `SARIN_DB` | Binding D1 existente, con migración aditiva `0004_whatsapp_ingress.sql`. |

Las cinco variables de firma, empresa, WABA, participante e inicio se guardaron como secretos de Cloudflare Production, conservando los secretos anteriores. No se creó ni usó una API key de envío de YCloud. El inicio efectivo de captura es `2026-10-18T04:56:35.522Z`.

No copiar claves ni teléfonos particulares a Git, capturas o reportes. El teléfono público de la web no se modificó por esta configuración. Preview permanece sin D1 y con la flag apagada.

## Publicación autorizada y comprobaciones pendientes

Se integró por fast-forward `ef9f802`, que sólo incorporaba capturas remotas. El código quedó en `bb06b07` y la activación en `88416b8`; ambos se enviaron a `main` con `[CI Skip]`. Pages se publicó por carga directa: primero receptor apagado, despliegue `8cd447f0-f899-4f0e-b7ec-86abe618467c`; después receptor activo, `1c0a7225-b382-4cb5-bdf9-894d2cd707ee`. El push produjo además el registro `aa05ee3c` en estado `Idle` por `[CI Skip]`, sin publicación adicional.

La migración aditiva `0004_whatsapp_ingress.sql` se aplicó en producción: 19 comandos, 5,01 ms y 17 objetos WhatsApp. Conservó las 8 conversaciones y los 32 mensajes web; el canal nuevo quedó con cero capturas tras migrar. El Worker de retención publicado es `64c1c341-285b-438c-9bfc-e1bc51393619`, con cron `0 * * * *` y ejecución real comprobada abajo. La versión anterior era `fc6b4b0f-3aad-4559-a3fc-17a0aae1be9c`.

YCloud creó el endpoint `6ad4515b0af8375d27636917`, comprobado en estado `Active`, con sólo entrada y eco guardados. Su secreto se transfirió de forma privada a Cloudflare. La prueba HTTP de producción de `2026-10-18T04:57:25Z` obtuvo 401 sin firma y 200 para un evento firmado ignorado, sin contenido. Esto comprueba el receptor publicado; no es una entrega real de YCloud.

El build publicado tiene 222 archivos, 5.406.553 bytes y revisión `a6cdc6a268dc5d55`. Se generó con `SARIN_ENABLED=true` y `SARIN_HISTORY_ENABLED=true`; la web respondió 200 con el chat activo. El receptor WhatsApp está activo sólo en producción.

El titular envió después el mensaje ficticio solicitado. Primera entrada real comprobada en D1 a `2026-10-18T04:58:45Z`: una captura `inbound/captured/text`, coincidencia del texto acreditada sólo como resultado booleano y entrega reportada de 2.254 ms. Conserva TTL de contenido de 24 horas y recibo de 48 horas. El contacto quedó pausado (`paused=1`, revisión 0, `last_human_at=0`), sin respuesta automática ni texto del mensaje en los logs de comprobación.

El eco real de la respuesta escrita por el titular desde la app empresarial quedó confirmado a `2026-10-18T04:59:44Z`: una captura `echo/captured/text`, entrega reportada de 2.478 ms, texto almacenado nulo y TTL de 24 horas. La señal humana elevó `pause_revision` a 1 y mantuvo `paused=1`; estado final de la comprobación: 2 capturas, 2 recibos y pausa global activa. La evidencia sólo de metadatos está en `test-results/ycloud-live-reception-metadata.json`, sin identificadores, teléfonos ni cuerpos.

El cron real de `2026-10-18T05:00:34Z` ejecutó la versión nueva con `outcome=ok`, sin excepciones, `sarin_retention.status=ok`, un lote y cero pendientes. Purgó dos sesiones web vencidas y cero filas WhatsApp, porque aún no había vencidos del piloto. D1 confirmó `last_purge_at` a esa hora y `purge_remaining=0`, conservando las 2 capturas y los 2 recibos vigentes. Evidencia: `test-results/ycloud-retention-live.jsonl`. Queda cerrado el hito de publicación y recepción piloto real; esta ejecución no acredita todavía un borrado remoto WhatsApp por vencimiento.

Las respuestas siguen apagadas. El siguiente hito requiere aviso/aceptación WhatsApp, outbox y conciliación, procesamiento con cuotas, intervención humana y visibilidad en Staff antes de una prueba de respuesta autorizada.

## Reversión y recuperación

Apagar `SARIN_WHATSAPP_INGRESS_ENABLED` cierra entradas nuevas; no cancela una escritura iniciada. Pausar el endpoint de YCloud y esperar el drenaje. El despliegue real de Pages anterior al piloto es `48e38fe8-836a-4f6a-9f67-b8e4e0f7d297`, fuente `ef9f802`; volver a él es compatible con las tablas aditivas. Conservar el chat web activo y el Worker nuevo de retención mientras existan datos WhatsApp: volver prematuramente al Worker anterior dejaría esas tablas fuera de limpieza. No borrar tablas ni reiniciar cuotas como reversión rutinaria.

Tras restaurar una copia, mantener los canales cerrados, limpiar todo el historial restaurado y conciliar presupuestos según [restauración](SARIN-RESTAURACION.md). El helper elimina web y WhatsApp en un batch, conserva dinero, reconcilia capacidad, deja pausa global y fija un piso de recuperación **cinco minutos después** del reloj de la operación. Ese margen cubre fechas futuras toleradas antes de restaurar. Esperar hasta superar el piso, fijar un nuevo inicio de captura y sólo entonces considerar reabrir. Ninguna captura restaurada se convierte en un envío pendiente.

El rollback estructural está anotado en la migración para mantenimiento controlado; no es el procedimiento operativo normal ni se ejecutó remotamente.

## Evidencia

Pruebas Node con HMAC real, SQLite en memoria, relojes y proveedores sintéticos. Cubren firma/cuenta/piloto, ACK durable, duplicados/alias, límites, fallos, pausas, expiración, recuperación y regresiones web. Registro local ignorado: `test-results/ycloud-reception-tests.txt`. Respaldo privado y artefactos de validación: `.wrangler/ycloud-candidate/`; no se publican en `dist`.

Validación final de raíz: **616/616** en 16 suites de archivos; cero omitidas o fallidas. TypeScript estricto pasa en cliente, receptor, almacén, handler y ruta WhatsApp. El backend general conserva diagnósticos anteriores; la comparación con HEAD no añadió errores al extraer el núcleo. Revisión independiente sin P1/P2 pendientes. Se corrigió un P2 del verificador: además de filas/bytes, ahora exige las definiciones de los 17 objetos SQL de 0004, evitando aceptar respaldos sin controles de admisión/capacidad.

Wrangler 4.151.1 compila Functions y retención (`deploy --dry-run`, 45,11 KiB sin comprimir). Smoke de handler y bundle completo de Pages en workerd/Miniflare con D1 local: firma, duplicado, rechazo, eco sin texto/pausa y fallback de assets correctos; cero llamadas salientes y sin flags de compatibilidad adicionales. El harness aislado también verificó purga y contadores. Registro `test-results/ycloud-runtime-full.txt`. Después de las 616 pruebas previas, la verificación de activación pasó **35/35**.

Antes de migrar se obtuvo un respaldo remoto privado y se restauró exclusivamente en memoria con el verificador final: integridad correcta, cero errores FK, objetos críticos correctos y ensayo de migración aditiva sin cambios en conteos previos. Evidencia privada `.wrangler/ycloud-candidate/backup-verification.json`. La aplicación remota posterior conservó los conteos web indicados arriba.

La evidencia de publicación y activación está en `test-results/ycloud-production-check.json` y `test-results/ycloud-webhook-activo.png`, fuera del artefacto público. Publicación, migración, webhook y secreto fueron autorizados expresamente y ejecutados. Entrada y eco reales quedaron confirmados con `test-results/ycloud-live-reception-metadata.json`, y el cron nuevo con `test-results/ycloud-retention-live.jsonl`. El hito de recepción está verificado; las respuestas automáticas siguen pendientes de su fase específica.

El comando de [exportación D1](https://developers.cloudflare.com/d1/best-practices/import-export-data/) conserva una copia local privada; el verificador la restaura exclusivamente en memoria. La compilación de [Wrangler](https://developers.cloudflare.com/workers/wrangler/commands/) y `deploy --dry-run` no publican el candidato.
