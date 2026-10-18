# Sarin de ALS: respuestas del piloto WhatsApp

Estado: diseño para revisión del titular. Continúa el receptor publicado y comprobado; todavía no implementa ni activa respuestas. Proyecto ALS DevStudio, rama `main`. El SaaS de citas no forma parte del cambio.

## Resultado y alcance

El titular pidió continuar después de comprobar entrada y respuesta humana en Coexistencia. Sarin responderá preguntas comerciales por WhatsApp con el mismo conocimiento y límites del bot web. La app de WhatsApp Business seguirá disponible. El piloto conserva exclusivamente la empresa y el participante ya configurados como secretos, con datos ficticios.

Primera entrega: texto, aviso y aceptación propios del canal, una respuesta por entrada elegible, estado de entrega y controles de pausa/reactivación en Staff. Audios, archivos y petición de humano detienen la automatización. Reactivar requiere acción explícita del administrador y sólo admite mensajes nuevos. No une identidades ni historiales web/WhatsApp; tampoco importa mensajes del celular, cuyo eco se conserva sin texto.

No incluye campañas, plantillas, mensajes fuera de la ventana de servicio, nuevos contactos, pagos, cambios de plan ni atención pública. La publicación de este candidato y la prueba de envío se concretarán después de implementarlo y probarlo. Hasta entonces sigue funcionando la recepción actual.

## Alternativas y decisión

| Ruta | Ventaja | Límite | Decisión |
| --- | --- | --- | --- |
| Inferencia dentro del webhook o únicamente en `waitUntil` | Menos recursos | Retiene el ACK o depende de una vida de ejecución corta para IA y envío | Descartada para este hito |
| Worker con cron como procesador principal | Durable y simple | Añade hasta aproximadamente un minuto de espera normal | Sólo rescate y conciliación |
| Cloudflare Queue + Worker consumidor + estado D1 | Respuesta inmediata cuando hay capacidad, trabajo separado del ACK y deduplicación durable | Requiere una cola y un Worker adicionales | Elegida |

La cola contiene solamente un ID opaco de trabajo y su época de activación, nunca teléfono, texto ni credenciales. D1 decide elegibilidad y estado; recibir dos veces el aviso de cola no repite IA ni envío. Cloudflare documenta Queues en Free con 10.000 operaciones diarias y consumidores de hasta 15 minutos de tiempo transcurrido. No se requiere contratar un plan para preparar el piloto. [Precio](https://developers.cloudflare.com/queues/platform/pricing/), [límites](https://developers.cloudflare.com/queues/platform/limits/).

## Recorrido del participante

1. El administrador activa el piloto y habilita el contacto existente desde Staff. Se fija un inicio nuevo y se descartan las capturas anteriores para procesamiento. Ni esta acción ni un mensaje `ACEPTO` sustituyen una pausa humana posterior.
2. Ante el primer texto nuevo, Sarin envía un aviso fijo, sin llamar a DeepSeek. Se identifica como asistente de IA de ALS y señala que se trata de un piloto con datos ficticios, los proveedores, la conservación propia de 24 horas y la posibilidad de solicitar atención humana. El aviso enlaza la información específica del canal; no reutiliza el consentimiento web de 30 días.
3. Sólo una respuesta exacta `ACEPTO`, normalizada por espacios y mayúsculas, asociada a un aviso enviado del contexto actual, puede registrar aceptación de esa versión. Si el usuario lo ve antes de llegar la confirmación de entrega, conservar la aceptación como pendiente: no llamar a IA ni enviar confirmación hasta acreditar `delivered`/`read`. Conciliar entonces sin exigir que repita `ACEPTO`; si el aviso falla o vence, la aceptación no se activa. Una aceptación anterior al inicio del envío del aviso no es válida. Se envía una confirmación fija que invita a describir el proyecto; el texto anterior al consentimiento no se envía al motor.
4. Los textos posteriores pasan al núcleo comercial existente. Se envía únicamente `output.reply`, máximo 1.200 caracteres. Catálogo, reglas de negocio y cuotas son los mismos; no se inventan correos ni sesiones web.
5. `HUMANO`, `PARAR`, `STOP` o `NO ACEPTO` revocan el permiso de automatización y pausan. Un audio/archivo también pasa a atención humana sin descargarlo. Cuando el administrador responde desde el celular, el eco pausa la conversación. Estos mensajes de control se interpretan antes de la inferencia.
6. Para continuar, el administrador pulsa «Reactivar Sarin». Esto abre un contexto nuevo y exige un mensaje nuevo; no vuelve a enviar salidas antiguas ni supone que el bot conoce la conversación humana. Si la aceptación ha vencido o fue revocada, se repite el aviso.

Aceptación válida por un máximo de 24 horas, sin prórroga por duplicados. Registrar versión y hash del aviso, ID del aviso entregado, evento de aceptación y fechas. No tomar silencio, una casilla de Staff o la activación global como aceptación del participante. Los textos comerciales del primer piloto son ficticios. La retención propia de YCloud/Meta/DeepSeek se informa por separado: el TTL local no promete borrar datos de terceros.

Texto inicial propuesto: «Soy Sarin, el asistente de IA de ALS DevStudio. Esta es una prueba privada: usa sólo datos ficticios. WhatsApp/Meta y YCloud transportan los mensajes; si aceptas, DeepSeek procesará tus consultas para responder sobre servicios de ALS. ALS conserva el contenido de esta prueba hasta 24 horas; cada proveedor aplica sus propias condiciones. Más información: https://www.alsdevstudio.com/privacidad.html#whatsapp-piloto. Escribe ACEPTO para probar o HUMANO para que te atienda Andrés». Incorporar esa sección informativa, limitada al piloto, antes de enviar el aviso; no afirmar que habilita atención pública ni que resuelve revisiones contractuales pendientes.

## Persistencia y orden

Migración aditiva `0005_whatsapp_replies.sql`. Mantener intacto el significado de `sarin_wa_inbox.state = captured`; no reutilizarlo como cola ni modificar retrospectivamente 0004. Agregar tablas separadas para control del piloto, consentimiento/contexto, trabajos, salidas, observaciones de entrega, auditoría administrativa mínima y cupos de envío.

Guardar trabajo y captura elegible en una transacción D1. No hacer backfill. La publicación a Queue ocurre después del commit, como aviso; un cron recupera avisos perdidos. No existe transacción compartida D1/Queue y no se presume entrega exactamente una vez.

Un solo trabajo activo por contacto, reclamado mediante condición SQL atómica con token aleatorio, caducidad y revisión de pausa. El orden procede de D1, no de Queue. No procesar el siguiente turno mientras una salida previa relevante carezca de resultado de entrega. Un fallo final o una incertidumbre requieren revisión humana y pausan el contacto.

Estados de trabajo: `queued`, `claimed`, `inference_started`, `ready`, `completed`, `cancelled`, `expired`, `failed`, `inference_uncertain`. Estados de salida: `ready`, `sending`, `accepted`, `sent`, `delivered`, `read`, `rejected`, `failed`, `send_uncertain`, `cancelled`, `expired`. La base impide transiciones incompatibles y sólo el titular del token vigente puede finalizar una reclamación.

`claimed` puede recuperarse sólo si nunca se marcó inicio de IA ni envío. Una reclamación vencida tras `inference_started` pasa a incierta y no vuelve a ejecutar el núcleo. Una salida vencida en `sending` pasa a incierta y nunca regresa automáticamente a `ready`. Cada aviso, confirmación o respuesta tiene un identificador de salida único.

El rescate cubre dos fases seguras: generación todavía no iniciada y envío `ready` con respuesta ya persistida pero sin POST iniciado. Recuperar la segunda no vuelve a llamar a IA. El marcador impeditivo es el de la fase que se pretende ejecutar: la generación iniciada no se repite, y el POST iniciado no se repite; una respuesta `ready` con IA terminada sí puede avanzar a su primer POST. El cron y los avisos duplicados de Queue obedecen las mismas condiciones SQL.

Configuración inicial: consumidor de un mensaje por lote, espera máxima de un segundo, concurrencia uno, máximo tres reintentos de fallos previos a efectos externos y retención de cola de 24 horas. Presupuesto total del procesador de 60 segundos y reclamación de 120 segundos; el vencimiento nunca concede permiso para repetir una llamada ya marcada. El cron examina lotes acotados cada minuto. La exclusión SQL sigue siendo obligatoria aunque la concurrencia configurada sea uno.

Contratos internos propuestos: `claimGeneration`, `markInferenceStarted`, `attachReservation`, `completeGeneration`, `failInference`, `beginSend`, `finishSend`, `applyStatus`, `pausePeer`, `resumePeer` y `tick`. Todos reciben reloj/dependencias internas; no aceptan configuración o destino arbitrario de una petición pública.

## IA, entrega y fallos

Reutilizar `runCommercialTurn`. Su `attachReservation` debe volver a comprobar consentimiento, pausa, época y token antes de cada llamada al proveedor. Si la comprobación falla antes de invocar la red, liberar exclusivamente esa reserva conocida como no gastada. Un fallo incierto posterior conserva la reserva con la política conservadora actual. No repetir clasificación ni generación después de una incertidumbre.

Antes de enviar, `beginSend` vuelve a comprobar configuración, destinatario permitido, consentimiento cuando corresponde, ventana de servicio, vigencia del contenido y revisiones. En el mismo commit marca `sending` y consume cupos. Sólo después se ejecuta un POST. Un reintento de Queue no repite ese POST.

Se conserva inicialmente el endpoint ya implementado de YCloud `POST /v2/whatsapp/messages`, con su aceptación asíncrona. No cambiar de modalidad a `sendDirectly` sin incorporar y probar su contrato específico. `externalId` es una referencia aleatoria de correlación, nunca una garantía de idempotencia. La respuesta HTTP aceptada no prueba entrega. [Encolado](https://nndocs.ycloud.com/reference/whatsapp_message-send), [envío directo](https://nndocs.ycloud.com/reference/whatsapp_message-send-directly), [consulta por ID](https://nndocs.ycloud.com/reference/whatsapp_message-retrieve).

Agregar la suscripción `whatsapp.message.updated` al activar este hito. Correlacionar únicamente con una salida local cuyo envío comenzó. Usar el ID del proveedor guardado, o una referencia aleatoria local de al menos 128 bits. Verificar cuenta/emisor/destinatario y `externalId` cuando aparezcan; los ejemplos oficiales no incluyen todos esos campos en cada estado, por lo que su ausencia no invalida un vínculo ya comprobado por ID. Los IDs del proveedor son inmutables una vez vinculados; un conflicto cierra la conciliación. Un evento sin vínculo verificable se descarta; no crea conversaciones. Un estado puede llegar antes de la respuesta POST: guardar la observación vinculada y conciliar atómicamente al finalizar, sin degradar un estado más avanzado. [Ejemplos de estados](https://nndocs.ycloud.com/reference/whatsapp-message-updated-webhook-examples).

Las observaciones de entrega deben tolerar duplicados, desorden y señales contradictorias. Una prueba de `delivered`/`read` no se borra por un `sent` tardío; un conflicto de identidad o resultado se muestra para revisión. No presentar una aceptación como entrega ni reabrir una salida fallida por una señal antigua.

Sólo las respuestas cuya entrega está acreditada entran como `assistant` en el contexto futuro. No incluir respuestas listas, rechazadas o inciertas. Mantener límites de historial del núcleo y separar contextos tras intervención humana. La consulta GET por ID del proveedor sirve para conciliación acotada; si un envío incierto no devolvió ID y ningún evento permite vincularlo, permanece incierto y se atiende manualmente.

## Pausa humana y carreras

Comprobar pausa antes de clasificación, generación y autorización final de envío. Una pausa ya comprometida en D1 impide los pasos posteriores. La revisión/época invalida tareas y salidas anteriores, aunque reaparezcan en Queue.

La señal humana autenticada y admitida en el piloto debe persistir aunque el almacén de contenido esté lleno. La pausa tiene un camino mínimo independiente de la capacidad del inbox; si no se puede guardar el eco completo, cerrar la automatización antes de responder con el error reintentable correspondiente. Lo mismo aplica a comandos de parada. Duplicados y ecos anteriores a una reactivación explícita no deben reabrir ni volver a pausar un contexto nuevo por accidente.

Sólo el evento específico de eco es señal del celular; un estado API con emisor empresarial no es una intervención humana. Conservar `wamid` del envío si el proveedor lo devuelve y excluir ecos inequívocamente correlacionados con salidas propias. Si el eco es ambiguo, la opción conservadora es pausar para revisión, nunca reactivar automáticamente. La prueba real debe comprobar que una salida de la API no se confunda con la respuesta del titular. [Contrato de ecos de la app](https://nndocs.ycloud.com/reference/whatsapp-business-app-sent-message-sync-webhook-examples).

Existe una carrera inevitable con un sistema externo: un eco que llega después de autorizar el POST no puede retirar un mensaje ya aceptado por YCloud, que además puede conservarlo en su cola. Staff debe explicar este límite. No prometer cancelación retroactiva, entrega exactamente una vez ni latencia fija.

## Staff

Añadir una sección «WhatsApp» al área privada existente. Reutilizar autenticación, Origin y CSRF; no exponer endpoints administrativos públicos ni permitir seleccionar otro destinatario. No equiparar bloqueo web con pausa WhatsApp.

Mostrar contacto enmascarado, modo activo/pausado, aceptación, último evento y estado de salida, con detalle de texto sólo para el administrador autorizado y mientras no haya vencido. No mostrar secretos. Mostrar el eco como «Respuesta desde el celular», sin texto. Actualización cada cinco segundos sólo con la sección visible; cancelar al salir u ocultar la pestaña.

Acciones: «Pausar Sarin», «Reactivar Sarin» y «Apagar piloto». Reactivar exige revisión esperada para detectar carreras y usa un contexto/inicio nuevos. Mostrar claramente cuándo debe escribir el participante otra vez. Los estados inciertos ofrecen consulta de estado si hay ID y derivación humana; no incluyen botón de reenvío automático. Registrar actor seudónimo, acción, resultado y hora sin copiar cuerpos.

## Límites, conservación y recuperación

Para el primer piloto: máximo 20 intentos de envío por día UTC y 100 por mes UTC, compartidos por avisos, confirmaciones y respuestas. Son techos de intentos, incluso si el resultado es incierto; no se devuelven cupos automáticamente. Un cupo agotado no dispara otro mensaje de aviso que lo eluda. Aplicar también los límites de frecuencia/capacidad existentes.

Reservar cupo de salida y capacidad antes de gastar en IA; convertir la reserva a intento consumido al marcar `sending`. Sólo liberar una reserva cuyo POST nunca comenzó. Máximo 10.000 trabajos y 1.000 salidas, con 4 MiB adicionales de contenido saliente, contados atómicamente. Un límite agotado cierra admisión/procesamiento; no impide registrar la pausa humana. El texto generado vence junto con la entrada que lo originó, sin iniciar otro plazo de 24 horas.

La ventana de servicio se calcula con el último mensaje recibido del usuario, no con ecos, estados o mensajes del bot. Fuera de las 24 horas no se envía texto libre ni se crea una plantilla como alternativa automática. La automatización conserva una vía clara hacia atención humana y respeta las bajas. [Política oficial de WhatsApp Business](https://whatsappbusiness.com/policy/).

IA mantiene los presupuestos globales actuales compartidos con la web: US$1/día y US$10/mes, mediante reservas conservadoras. No se amplían saldos ni recarga automática. Free de YCloud cubre suscripción, no toda mensajería o IA. Verificar la tarifa vigente y la franquicia consumida de la cuenta al preparar la activación; un piloto de 100 intentos no garantiza por sí solo coste Meta cero. El volumen previsto de Queue está muy por debajo de sus 10.000 operaciones diarias incluidas, pero comparte el límite de la cuenta.

Texto entrante y saliente: máximo 24 horas; recibos/observaciones mínimos: 48 horas. Trabajos y salidas no sobreviven a su contenido ni se envían después de su vencimiento. Conservar contadores de gasto/cupos hasta después del periodo que protegen, sin teléfonos ni cuerpos. La eliminación no reinicia presupuestos ni cupos activos.

Extender purga, respaldo, verificador de esquema y recuperación en el mismo hito. Mantener compatibilidad de lectura con bases 0004 cuando respuestas estén apagadas; una migración parcial se rechaza. Restaurar cierra la automatización, invalida épocas y elimina trabajo pendiente restaurado; una entrega vieja de Queue queda inerte. Preservar presupuestos y cerrar conservadoramente los cupos activos si un respaldo impide acreditar consumo posterior. No tratar restauración como autorización para reenviar.

## Despliegue y prueba concreta

Preparar y revisar todo localmente con datos ficticios. Después: respaldo reciente verificado, migración aditiva, retención compatible, Queue y Worker con envíos apagados, nueva sección Staff y receptor compatible. Los secretos existentes permanecen en su entorno; la clave de envío YCloud se configura privadamente sólo cuando el candidato esté listo. No solicitar contraseñas ni claves por chat.

La activación concreta debe identificar destino piloto, consumo máximo, secreto de envío, nuevo evento de estado y mensaje de prueba. No presupone permiso para atender otros contactos. Publicar primero apagado permite revisar el resultado antes de habilitarlo. La prueba real empieza con un mensaje nuevo del titular, aviso/aceptación, una pregunta comercial ficticia, confirmación de entrega, intervención desde el celular y reactivación manual. No reusar las dos capturas de recepción ya comprobadas.

Reversión: apagar respuesta global, pausar consumidor/endpoint según el incidente y drenar trabajo en curso; conservar receptor y retención compatibles. No borrar tablas como rollback ni restaurar versiones que abandonen datos de las tablas nuevas. Mantener el chat web operativo.

## Verificación exigida

- HMAC real y eventos duplicados/desordenados; ninguna captura anterior a activación se convierte en trabajo.
- SQLite real: dos consumidores reclaman el mismo contacto, tokens vencidos, reinicio antes/después de marcar IA/envío, límite diario/mensual atómico y ausencia de reinicio tras purga/restauración.
- Consentimiento ausente, aviso no entregado, `ACEPTO` anterior al aviso, `ACEPTO` con webhook de entrega retrasado, aceptación vencida/revocada, mensajes anteriores al consentimiento y pausa que no se elimina al aceptar.
- Pausa entre clasificación/generación y entre generación/POST; eco o comando humano con capacidad agotada; reactivación sin reproducción de mensajes previos.
- YCloud acepta sin entregar, rechaza, pierde conexión o devuelve cuerpo ilegible; estado antes del ACK POST; `delivered` antes de `sent`; identidad contradictoria; un POST máximo por salida.
- Ventana de servicio y contenido vencidos; audio/archivo sin descarga; historial sin salidas no entregadas y nuevo contexto tras humano.
- Autenticación, CSRF, Origin y revisión esperada en Staff; texto tratado como datos, filtros, actualización visible y pruebas de móvil/escritorio.
- Regresiones del bot web, cuota, retención, restauración y verificador; smoke workerd/D1/Queue local sin red real; compilación y revisión independiente antes de publicación.

## Referencias de implementación

Núcleo: `server/sarin/run-commercial-turn.js`. Captura/transporte: `server/sarin/whatsapp/` y `functions/api/sarin/whatsapp.js`. Acceso Staff: `server/sarin/admin.js`, `server/sarin/access.js`, `scripts/modules/sarin-admin.js`. Cuotas: `server/sarin/quota.js`. Mantenimiento: `workers/sarin-retention/`, `server/sarin/history-recovery.js`, `.github/cloudflare/check-sarin-backup.mjs`. Evidencia del hito anterior: [piloto de recepción](../../SARIN-WHATSAPP-PILOTO.md).
