# Sarin · notas de voz y aviso a Andrés

**Publicado el 18 de octubre de 2026: aviso HUMANO recibido y recorrido real de audio completado, con respuesta confirmada por el titular. La prueba real de botones sigue pendiente; la plantilla fuera de la ventana de 24 horas figuraba pendiente de Meta en la última consulta, a las 08:31 UTC.** El titular solicitó avisar a su WhatsApp cuando un contacto elija HUMANO y procesar los audios entrantes. Esta ampliación corresponde únicamente a **ALS Dev Studio, +57 305 277 8047**. El destinatario del aviso queda fijado como secreto al número que autorizó Andrés, terminado en **2135**; no se acepta desde mensajes, colas ni solicitudes del navegador.

La recepción real del aviso público anterior v2 fue confirmada por el titular mediante «Recibí el aviso nuevo». Esa confirmación no prueba aceptación de v3, transcripción ni entrega de una alerta. El antecedente y sus despliegues se conservan en [Atención pública](SARIN-WHATSAPP-PUBLICO.md).

## Comportamiento de la ampliación

- **HUMANO:** pausa a Sarin y prepara un aviso operativo para Andrés. Incluye los últimos dígitos del contacto y un enlace al detalle privado; no copia el chat ni genera un resumen con IA. La solicitud funciona sin aceptar la IA. Repetir un evento no crea un segundo envío de la misma solicitud.
- El enlace usa `https://www.alsdevstudio.com/control-sarin/#whatsapp=<huella>` y exige la autenticación administrativa habitual. La huella no es una credencial. El panel solicita directamente ese detalle, aunque el contacto no aparezca entre los primeros cien del listado.
- La ventana para enviar un aviso de texto es la de **Andrés con el número empresarial**, no la del cliente. Fuera de ella se necesita una plantilla aprobada. La ausencia de plantilla deja un estado visible; no se presenta como un aviso enviado. [Reglas de envío de YCloud](https://docs.ycloud.com/en/api-reference/guides/whatsapp-platform/send-whatsapp-message).
- **Audio:** después de recibir el aviso vigente y escribir ACEPTO, se admite una nota de voz OGG/Opus de hasta 120 segundos y 2 MiB. Cloudflare Workers AI ejecuta Whisper y DeepSeek recibe el texto para responder por escrito. No se añade respuesta de voz ni una API directa de OpenAI.
- Un audio anterior a la aceptación sólo puede provocar el aviso. No se descarga ni transcribe retrospectivamente: el contacto debe enviarlo de nuevo después de aceptar. Imágenes y otros archivos mantienen la atención humana.
- Una pausa, revocación, vencimiento o cambio de contexto impide continuar el trabajo. El inicio de una transcripción y de un envío se registra antes de llamar al proveedor; un resultado incierto no autoriza repetir el efecto externo.

## Consentimiento y datos

Aviso `whatsapp-service-2026-10-18-v3`, con **ALS Dev Studio** escrito completo. Añade el tratamiento de audios por Cloudflare, distingue el texto enviado a DeepSeek y exige otra aceptación a quienes sólo aceptaron la versión de texto. La referencia de privacidad WhatsApp pasa a `2026-10-18-whatsapp-public-v2`; el chat web conserva sus versiones.

El archivo se usa temporalmente para transcribirlo y no se almacena como binario en D1. La transcripción conserva el vencimiento del mensaje original, no obtiene otras 24 horas por terminar después. El panel la identifica como **Audio transcrito**, sólo mientras siga vigente. Metadatos del proveedor y URL firmada del archivo no forman parte de la respuesta administrativa. El texto de la transcripción se renderiza mediante `textContent`. La ampliación de [perfiles temporales](SARIN-WHATSAPP-PERFILES.md), solicitada posteriormente por el titular, permite mostrar el número completo y el nombre voluntario sólo en ese panel autenticado y mientras sus fuentes sigan vigentes.

La política describe 24 horas de contenido y hasta 48 horas de recibos/evidencia mínima en Sarin, sin prometer esos mismos plazos para proveedores, aplicaciones, copias o respaldos. La nueva integración no convierte Whisper en una garantía de exactitud; el contacto puede continuar por texto o solicitar HUMANO. [Privacidad del canal](../privacidad.html#whatsapp).

## Límites y costo estimado

| Recurso | Control de esta ampliación |
| --- | --- |
| Archivos de audio | OGG/Opus, máximo 2 MiB y 120 segundos; se valida antes de invocar Whisper. |
| Contenido de audio en D1 | Tabla adicional con un máximo independiente de 1.000 filas; no almacena binarios. Estimación conservadora de contenido: hasta 8.896.000 bytes, más metadatos e índices. |
| Transcripciones | Hasta 20 inicios al día y 100 al mes, períodos UTC. |
| Texto transcrito utilizado | Hasta 1.200 caracteres; una salida no admisible requiere continuar por texto. |
| Intentos de mensaje WhatsApp | Mantienen el máximo compartido de 20 al día y 100 al mes, incluyendo avisos, confirmaciones, respuestas y alertas. |
| DeepSeek | Mantiene los presupuestos existentes de la aplicación; la transcripción no concede presupuesto adicional para respuestas. |

La capacidad adicional de audio no se descuenta del contador de 8 MiB de la bandeja existente. El descriptor normalizado es ASCII y tiene un máximo de 4.096 bytes; una cota conservadora de 1.200 caracteres transcritos a cuatro bytes UTF-8 suma 4.800 bytes. Mil filas representan así hasta unos **8,9 MB de contenido adicional (8,48 MiB)**, sin contar claves, metadatos, páginas e índices de SQLite. Es un límite calculado de la aplicación, no memoria física preasignada ni una medición exacta del tamaño de D1. Los descriptores se retiran tras finalizar el procesamiento y las transcripciones vencen con su entrada.

Cloudflare publica **USD 0,000513 por minuto** para `@cf/openai/whisper-large-v3-turbo`. Con cien notas de dos minutos, el valor teórico mensual de la transcripción es **USD 0,1026** antes de la franquicia, impuestos u otros servicios. Es una proyección calculada, no una factura ni una garantía de tarifa. [Ficha oficial del modelo](https://developers.cloudflare.com/workers-ai/models/whisper-large-v3-turbo/).

La asignación de Workers AI es de **10.000 Neurons al día**, compartida con otros usos de la cuenta. El modelo figura con 46,63 Neurons por minuto; veinte notas de dos minutos representan unos **1.866 Neurons diarios**. Por sí sola, esta carga cabe en la asignación publicada. Superar la asignación en Free produce errores; usar más requiere un plan de pago. No se autoriza ni ejecuta una mejora de plan con esta ampliación. [Precio y asignación de Workers AI](https://developers.cloudflare.com/workers-ai/platform/pricing/), consultado el 18 de octubre de 2026.

Los avisos de WhatsApp pueden tener tarifa por proveedor, categoría y país. Su techo de volumen está incluido en los cien intentos mensuales de toda la aplicación; no se promete costo cero ni una tarifa fija sin comprobar la cuenta y la plantilla concreta. La documentación de YCloud informa cambios de cobro desde el 1 de octubre de 2026. [Facturación de WhatsApp en YCloud](https://docs.ycloud.com/en/documentation/pricing-and-billing/whatsapp-pricing-and-billing).

**Hallazgo de costo, bajo:** no se ha verificado una alerta de facturación específica de Workers AI ni el límite monetario externo de YCloud en esta revisión. Los topes de la aplicación limitan esta función, pero no el gasto de otros servicios o proyectos en las mismas cuentas. Este hallazgo es informativo y no sustituye la comprobación de los límites operativos.

## Presentación administrativa

Se conserva el diseño de bandeja actual, su cabecera fija con **Reactivar Sarin**, las tipografías y tokens de ALS Dev Studio. La ampliación añade información al historial y conserva las acciones en su lugar; no cambia la identidad visual ni crea otro panel.

| Estado API del aviso | Presentación |
| --- | --- |
| `pending` | Aviso pendiente de envío. |
| `waiting_template` | Pendiente de plantilla aprobada para escribir fuera de la conversación reciente. |
| `accepted` | Aceptado por el proveedor; entrega pendiente. |
| `delivered` / `read` | Aviso entregado / leído por Andrés. |
| `failed` | No pudo enviarse; revisar el panel. |
| `send_uncertain` | Puede haberse enviado; revisar WhatsApp. No se ofrece reenviar. |
| `cancelled` / `expired` | Cancelado / vencido; revisar la conversación actual. |

## Evidencia y publicación

Validación local de UI/API: cuatro casos nuevos reproducidos en rojo y después en verde; la corrida junto con las regresiones administrativas terminó en **18/18 pruebas Node** aprobadas. Cubren hash estricto, audio sin metadatos privados, vencimiento del contenido, proyección acotada y diferencia entre aceptación del proveedor y entrega. El tipado focal del módulo WhatsApp del panel pasó.

La última corrida completa registrada de las suites Node, excluyendo las que lanzan Playwright, terminó en **1.002/1.002 aprobadas, cero fallos**. Se sustituyó la expectativa antigua de descartar todo descriptor de audio por casos de descriptor autorizado, URL rechazada, descriptor ausente y eco que nunca prepara otra transcripción. Registro local: `test-results/sarin-whatsapp-audio-handoff-20261018/all-node.log`.

Retención, recuperación y backup: **133/133 pruebas focales** y tipado correspondiente aprobados antes de la corrida completa. La compatibilidad con esquemas 5 y 6 permanece probada. Una prueba exporta y restaura una copia sintética con transcripción iniciada y aviso cuyo envío comenzó: la recuperación elimina audio, entradas y trabajos; deja el aviso incierto, rota la época, deshabilita respuestas y cierra el día y el mes. No devuelve consumos, no libera reservas monetarias ni permite ejecutar de nuevo esas referencias. Otra prueba demuestra la reversión atómica ante un fallo de borrado; la purga de contadores de audio conserva el mes activo y usa lotes acotados.

### Copia previa y promoción aislada

Se verificó la copia privada anterior a 0006/0007 de **132.759 bytes**, SHA-256 `d67952e80df1a434ece672c4c6bec2a97105af12510687b8ce25122201e59f0e`. La restauración en memoria validó el esquema 5; aplicar allí 0006 y 0007 produjo el manifiesto completo de esquema 7, `integrity_check=ok` y cero errores de claves foráneas. Las **29 tablas existentes** conservaron todos sus conteos y hashes de filas, incluidos estados, cuotas, reservas y consentimientos. Las tres tablas nuevas quedaron vacías: no hay importación retroactiva de audios ni avisos.

Evidencia local sin conversaciones ni teléfonos: `test-results/sarin-whatsapp-audio-handoff-20261018/backup-promotion.json`. Contiene además los hashes de las dos migraciones verificadas. El archivo de respaldo original permanece intacto y fuera de Git. Esta comprobación aplicó el SQL sólo en una base de memoria; la aplicación posterior en producción tiene su propia evidencia remota, descrita abajo.

Se añadieron tres escenarios a la suite browser existente: enlace a contacto fuera de primera página, ausencia de acceso por enlace sin autenticación y transcripción segura con entrega pendiente. **No se ejecutó Playwright CLI**. Chrome mediante CUA aprobó escritorio de 1.761 píxeles y ventana móvil 390 × 844, sin desbordamiento ni errores de consola. El enlace carga un contacto fuera de los primeros cien; Reactivar Sarin mediante Enter cambia a Sarin activo/Pausar Sarin y la pausa vuelve a mostrar Reactivar Sarin. Capturas: `panel-desktop.jpg`, `panel-mobile.jpg`, `panel-mobile-actions.jpg` y `panel-mobile-reactivated.jpg` en la carpeta de evidencias.

Runtime local en modos retención y recuperación: ambos PASS, máximo de 23 llamadas al binding D1; manifiesto de fuente `539f2bb079dbcbe335f96fa6b4b93bcd7cff6c7bacdbd70b08e17c43f2c4a690`. Los JSON `runtime-retention.json` y `runtime-recovery.json` guardan la evidencia. Dieciocho pruebas focales de audio aprobadas después de corregir el aborto. Una nota sintética OGG de 10.239 bytes y 3,673 segundos se transcribió mediante el binding real de Workers AI (HTTP 200, 1.575 ms); no fue un audio de WhatsApp. La prueba REST previa no autenticó y no se utiliza como acreditación del proveedor.

Reporte HTML local: `qa/reports/sarin-whatsapp-audio-handoff-20261018.html`, con enlaces al log, backup, escenarios de runtime, capturas y comprobaciones de publicación. La revisión independiente final de seguridad de audio no encontró bloqueos.

### Publicación y comprobación remota

| Componente | Identificador verificado |
| --- | --- |
| Pages de producción | `425fff39-86af-457f-a46d-7e241ce3c08c` |
| Commit de fuente de Pages | `8823c554a7c670a9804ef821a880cc054cca2989` |
| Revisión de recursos | `23c0a7863504d47c` |
| Worker de respuestas, corrección de voz | `aab3db5e-a675-495c-a0d7-9796a2a97c7b` |
| Worker de retención | `e94aee08-e98e-4b39-9194-5961b19ccc04` |

Las migraciones **0006 y 0007 están aplicadas en producción**. La lectura remota confirmó esquema **7**, coincidencia completa con el manifiesto, `quick_check=ok` y cero errores de claves foráneas. Es una comprobación remota `quick_check`, distinta del `integrity_check` completo realizado sobre la copia local. El destinatario está configurado como secreto, el binding AI está presente en el consumidor y `HANDOFF_ENABLED`, `REPLIES_ENABLED` y `SEND_ENABLED` están activos. La retención conserva el cron horario `0 * * * *`; las previews permanecen cerradas y sin credenciales productivas. Evidencia: `test-results/sarin-whatsapp-audio-handoff-20261018/remote-deployed.json`.

La comprobación pública terminó en **PASS**: recursos publicados comparados por hash, marcadores de privacidad y panel verificados, API administrativa sin autenticación rechazada con **403** y webhook sin firma rechazado con **401**. Evidencia: `test-results/sarin-whatsapp-audio-handoff-20261018/public-smoke.json`.

**Plantilla creada:** el titular completó la verificación de YCloud. La creación por API y la lectura posterior confirmaron `als_sarin_solicitud_humana_v1`, idioma `es`, categoría `UTILITY`, TTL de 3.600 segundos y contenido esperado coincidente. La consulta posterior a las 07:59:55 UTC mantiene **`PENDING`: pendiente de aprobación de Meta**, no aprobada todavía; aún no se configuró su variable en el consumidor. Metadatos iniciales sin credenciales ni identificadores de cuenta: `test-results/sarin-whatsapp-audio-handoff-20261018/handoff-template.json`.

**HUMANO real completado:** la consulta productiva confirmó una única alerta en estado `read`, un contexto pausado y un solo intento consumido (contador de 5 a 6). El titular confirmó: «Sí, recibí el aviso con el enlace». Esta evidencia acredita el aviso de texto dentro de la ventana del destinatario; no prueba una plantilla fuera de ella. La credencial temporal utilizada durante la configuración fue eliminada. Evidencia sin contenido del chat: `test-results/sarin-whatsapp-audio-handoff-20261018/handoff-live-check.json`.

**Aviso v3 recibido:** el 18 de octubre de 2026 el titular confirmó haber recibido el aviso que menciona audios después de reactivar Sarin y enviar Hola. La lectura remota de las **07:59:20 UTC (02:59:20 de Colombia)** registró un aviso de la versión vigente, cero marcadores de aceptación v3, cero contextos pausados y siete intentos de envío acumulados en el día y el mes. No había audios iniciados ni consumo de transcripción. Se solicitó ACEPTO voluntario, todavía sin confirmación en ese momento. Esta evidencia acredita la recepción del aviso, **no la aceptación ni una transcripción**. Registro: `test-results/sarin-whatsapp-audio-handoff-20261018/remote-notice-audio-confirmed-1.json`.

**ACEPTO v3 confirmado:** el titular confirmó haber recibido la confirmación después de aceptar el aviso vigente. La lectura remota del 18 de octubre a las **08:00:20 UTC (03:00:20 de Colombia)** registró un marcador de aceptación vigente v3, un aviso v3, cero contextos pausados y ocho intentos de envío acumulados en el día y el mes. Las filas, inicios y consumos de audio seguían en cero. Se solicitó una nota de voz real de 10–20 segundos sobre la tienda ficticia de camisetas; en ese momento todavía no se acreditaba su recepción ni transcripción. Registro: `test-results/sarin-whatsapp-audio-handoff-20261018/remote-consent-audio-confirmed-1.json`.

**Primera nota real fallida:** el titular recibió la respuesta de respaldo «No pude transcribir ese audio». D1 registra audio `failed`, sin inicio de transcripción, sin duración ni texto, descriptor eliminado y trabajo completado; la respuesta de respaldo figura `read`. La lectura de las **08:05:40 UTC** confirma cero intentos de audio, nueve de envío, aceptación v3 vigente, contexto activo y binding AI presente en el consumidor. El fallo precedió a Whisper; la evidencia existente no distingue descarga, validación o permiso de inicio. No se reintenta el trabajo terminado ni se devuelve su cupo. Registro: `test-results/sarin-whatsapp-audio-handoff-20261018/remote-audio-failure-confirmed-1.json`.

### Corrección de compatibilidad y diagnóstico del audio

Se reprodujo una incompatibilidad independiente: el lector rechazaba una página final Ogg vacía con bandera EOS y granule sin definir, variante documentada para notas de WhatsApp en [getID3 #450](https://github.com/JamesHeinrich/getID3/issues/450). [RFC 3533, sección 4](https://www.rfc-editor.org/rfc/rfc3533.html#section-4) permite una página EOS sin contenido. La corrección acepta exclusivamente ese cierre al final exacto del archivo, después de comprobar CRC, pista, secuencia, paquetes completos y muestras anteriores. Conserva SHA-256, 2 MiB y 120 segundos. Esta reproducción **no demuestra que el primer audio real haya fallado por esa causa**.

El consumidor añade un diagnóstico con dos campos: evento fijo `sarin_whatsapp_audio_failed` y motivo de una lista cerrada; cualquier otro valor se convierte en `unknown`. No registra contenido, teléfonos, identificadores, enlaces, hashes, cabeceras ni errores del proveedor. Un error del logger no cambia el envío ni el ACK. No modifica las cuotas ni vuelve a procesar trabajos terminados.

La regresión del diagnóstico pasó **32/32** pruebas. La revisión independiente pasó **38/38** pruebas de cliente, diagnóstico, flujo y consumidor, sin hallazgos bloqueantes. El motor real local workerd pasó **6/6** casos con transporte interceptado y AI falsa: Ogg normal, EOS vacío, borde de 120 segundos, exceso, CRC corrupto y permiso denegado. No hubo llamadas a proveedores. Evidencia: `runtime-empty-eos.json`; hash del cliente comprobado `11f9cb49c3cb6da98e76a95a3c4b4788eacc42b4ce077e43362ef4401993ce36`.

La corrida final seriada pasó **104/104**, cero fallos, en 2.463 ms; registro `audio-fix-regression-final.log`. Incluye audio, diagnóstico, procesador, consumidor, aviso HUMANO y consentimiento público. El checkJs focal de los tres módulos productivos pasó. Una corrida anterior terminó 99/100 y una repetición aislada también falló por temporizadores de prueba de 1.000/10 ms durante una demora del equipo. Se corrigieron únicamente las pruebas: plazo nominal de 30 segundos y reloj simulado que avanza después de entrar en la etapa esperada; se mantiene la comprobación de abortos, vencimientos y resultados tardíos. El plazo productivo no cambió.

Los bundles de Pages antes y después del cambio del lector son idénticos (`82cf8f6febe69a739e15ab398737449367b9c9ed49c86dfa2e2be058fb7dc84b`). La corrección requiere actualizar únicamente el consumidor de WhatsApp; no hay cambios de esquema ni de interfaz. El plan de reversión es volver al consumidor v3 `3fabd841-6b74-4b10-8e80-a2a75c02c315`, que conserva consentimiento v3, tablas y cuotas, aunque vuelve a rechazar esa variante de audio. No se revierte la base de datos.

**Corrección publicada:** fuente `3cd852c`, versión del consumidor `aab3db5e-a675-495c-a0d7-9796a2a97c7b`. La lectura remota de las **08:22:17 UTC (03:22:17 de Colombia)** confirmó esa versión al 100 %, AI presente, envíos y avisos activos, esquema 7 íntegro, aceptación vigente y contexto sin pausa. Los contadores permanecieron en cero transcripciones y nueve envíos, sin trabajos pendientes: el despliegue no volvió a ejecutar el audio fallido. Evidencia: `remote-audio-fix-deployed-1.json`. Se solicitó una nota nueva; su respuesta real aún no estaba confirmada en ese momento.

### Diagnóstico de la segunda nota real

La nota nueva de las **08:25:29 UTC (03:25:29 de Colombia)** volvió a recibir el respaldo. El diagnóstico cerrado del consumidor identificó `invalid_audio`, sin excepciones del Worker. La lectura remota posterior confirmó dos audios registrados, cero transcripciones iniciadas, diez envíos y ningún trabajo pendiente; la aceptación v3 sigue vigente. La corrección anterior de EOS vacío no resolvió esta grabación.

Con la verificación de YCloud completada por el titular, se inspeccionó el archivo únicamente en memoria, sin reproducirlo ni enviarlo a una IA. La descarga autenticada devolvió 200, MIME Ogg/Opus, 23.700 bytes, sin redirección ni compresión y con SHA-256 coincidente. Las ocho páginas tienen CRC, secuencia y pista correctos, sin bytes ni paquetes parciales. El rechazo exacto procede de la comparación de granule con las muestras acumuladas: el grabador usa un desplazamiento constante de 312 muestras, igual a pre-skip, y termina en una página completa sin bandera EOS. Son 504.960 muestras codificadas; al descontar pre-skip, 10,5135 segundos de salida. Evidencia saneada: `real-audio-structure-sanitized.json`. No contiene voz, transcripción, teléfono, enlace ni credencial.

El ajuste se limita a ese patrón: origen cero o igual a pre-skip, constante en todas las páginas; final sin EOS sólo para la variante con desplazamiento positivo igual a pre-skip y última página completa. La duración se calcula en coordenadas normalizadas, conservando SHA-256, CRC, secuencia, una sola pista, 2 MiB y 120 segundos. [RFC 7845, secciones 3 y 4.5](https://www.rfc-editor.org/rfc/rfc7845.html) contempla un origen positivo y la posibilidad de no encontrar EOS. Un corte exactamente entre páginas no se puede distinguir de ese final, pero nunca permite ocultar muestras ni omitir los límites. Un corte parcial sigue rechazado.

La reproducción sintética pasó de dos positivos fallidos a **24/24 pruebas aprobadas**. El mismo archivo real se volvió a validar sólo en memoria: descarga y hash correctos, validación completa y llegada al control previo a inferencia, donde el helper deniega deliberadamente el permiso. **Cero llamadas a IA y cero envíos**; no se reprocesó el trabajo terminado. Evidencia `real-audio-validation-after-fix.json`. La clave temporal y el descriptor privado se eliminaron después. Hash del cliente validado: `bdf94f2c59584ff87ecd44a1e76b4ae3b23e76a77d3a5b3c84f14b00c120e247`.

La regresión conjunta con los [botones de WhatsApp](SARIN-WHATSAPP-BOTONES.md) terminó en **638/638**, checkJs limpio y **11/11** casos del lector en workerd. El recorrido completo local de botones, audio sintético y alerta humana también pasó, con proveedores interceptados. Ninguna de estas comprobaciones sustituye la confirmación de una respuesta a una nota nueva en producción.

**Ajuste publicado:** fuente `307d1dd`, consumidor `f68bad32-682d-403b-a8e7-9ae3699c0eac` y Pages `b34d6669-4a00-4437-b935-b846a4a1c9e6`. La lectura remota de las **08:38:04 UTC** confirmó AI presente, aceptación v3 vigente, contexto activo, sin trabajos pendientes ni transcripciones iniciadas. En ese momento seguían dos audios fallidos y diez envíos; ninguno se volvió a procesar. Se solicitó una nota nueva de 10–20 segundos, sin repetir ACEPTO. Registro `remote-menu-audio-published-1.json`.

**Audio real completado:** el titular confirmó haber recibido la respuesta a la nota nueva. La verificación del **18 de octubre de 2026 a las 08:42:36 UTC (03:42:36 de Colombia)** registró audio `transcribed`, duración de **10,5935 segundos** y transcripción de **163 caracteres / 166 bytes**, sin reproducir su contenido en la evidencia. El descriptor quedó eliminado (`descriptor_purged=1`), el trabajo terminó en `completed` y su salida de tipo `reply` figura `read`, sin conflicto y con entrega observada. Se consumió una transcripción en el día y el mes; los intentos de envío pasaron de diez a once. No quedaron trabajos pendientes ni contextos pausados y la aceptación v3 seguía vigente. Los dos intentos fallidos anteriores conservan su historial y no se reprocesaron. Evidencias: `test-results/sarin-whatsapp-audio-handoff-20261018/audio-live-success.json` y `test-results/sarin-whatsapp-audio-handoff-20261018/remote-audio-live-success-1.json`.

La última consulta de la plantilla, a las **08:31:06 UTC**, mostró `PENDING`, con contenido y categoría coincidentes; no se ha atribuido una consulta posterior ni configurado su variable. El aviso real a Andrés dentro de su ventana ya fue confirmado; falta comprobar la aprobación de Meta para habilitarlo fuera de ella.

**Pendientes funcionales:** verificar los botones en el teléfono, obtener la aprobación de la plantilla y configurarla en el consumidor. El titular confirmó SALIR; una consulta de sólo lectura acredita un contexto pausado, aceptación revocada, un control `stop` reciente y cero trabajos pendientes (`menu-stop-confirmed.json`). La selección de cuenta de Google para volver al panel quedó pendiente de intervención del titular; todavía no se reactivó el contacto ni se acredita recepción de botones. Actualmente el aviso de texto a Andrés sólo puede enviarse dentro de su propia ventana de 24 horas con el número empresarial. Fuera de ella queda `waiting_template`, sin afirmar que se envió. La evidencia real anterior sí acredita el recorrido de la nota nueva; una respuesta 200/202 de YCloud por sí sola no acredita entrega.

## Publicación coordinada y reversión

La publicación autorizada se completó de forma coordinada: retención compatible, aplicación de 0006/0007, consumidor y Pages con aviso v3, privacidad y panel. Durante el cambio se mantuvo temporalmente `SARIN_WHATSAPP_SEND_ENABLED=false` con `REPLIES_ENABLED=true`; los envíos ya están activos con los componentes compatibles y las comprobaciones anteriores aprobadas. `REPLIES_ENABLED=false` altera el interruptor durable y no se utiliza como una simple pausa técnica de despliegue.

Queda comprobar los botones reales y obtener la aprobación de Meta para la plantilla ya creada y configurarla. Las pruebas reales de HUMANO y audio están completadas. Hasta aprobar y configurar la plantilla se mantiene el límite de la ventana de Andrés para las alertas. No se procesa retrospectivamente el audio anterior a ACEPTO.

Si es necesario detener la ampliación, `SARIN_WHATSAPP_HANDOFF_ENABLED=false` cierra nuevos avisos del consumidor y `SARIN_WHATSAPP_SEND_ENABLED=false` cierra los envíos y el procesamiento que prepara las respuestas. Un efecto externo ya iniciado puede completarse. Para un cierre operativo general se usa el interruptor del panel y las flags correspondientes, preservando las pausas individuales.

Conservar el código que exige el aviso v3 y la retención compatible con 0006/0007. **No volver al consumidor o al panel API antiguos como reversión de datos**, no eliminar las tablas nuevas, no copiar aceptaciones v2 a v3, no devolver cupos consumidos y no reintentar envíos o transcripciones inciertos. Corregir mediante un cambio nuevo acotado con las funciones cerradas.

Una recuperación excepcional de base de datos exige mantenimiento y solicitudes drenadas. `clearRestoredHistory` ejecuta el cierre y la limpieza de manera atómica, conserva los consumos y bloquea los períodos vigentes; no se usa para deshacer un despliegue ordinario. Seguir [Restauración de Sarin](SARIN-RESTAURACION.md) y comprobar de nuevo la retención después de recuperar.
