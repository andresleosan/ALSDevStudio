# Sarin · notas de voz y aviso a Andrés

18 de octubre de 2026. **Estado: implementación y validación local; publicación y pruebas reales de esta ampliación todavía por registrar.** El titular solicitó avisar a su WhatsApp cuando un contacto elija HUMANO y procesar los audios entrantes. Esta ampliación corresponde únicamente a **ALS Dev Studio, +57 305 277 8047**. El destinatario del aviso queda fijado en configuración privada al número que autorizó Andrés, terminado en **2135**; no se acepta desde mensajes, colas ni solicitudes del navegador.

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

El archivo se usa temporalmente para transcribirlo y no se almacena como binario en D1. La transcripción conserva el vencimiento del mensaje original, no obtiene otras 24 horas por terminar después. El panel la identifica como **Audio transcrito**, sólo mientras siga vigente. Metadatos del proveedor, URL firmada del archivo y teléfonos completos no forman parte de la respuesta administrativa. El texto de la transcripción se renderiza mediante `textContent`.

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

Evidencia local sin conversaciones ni teléfonos: `test-results/sarin-whatsapp-audio-handoff-20261018/backup-promotion.json`. Contiene además los hashes de las dos migraciones verificadas. El archivo de respaldo original permanece intacto y fuera de Git. Esta comprobación aplicó el SQL sólo en una base de memoria; **no acredita que la migración esté aplicada en producción**.

Se añadieron tres escenarios a la suite browser existente: enlace a contacto fuera de primera página, ausencia de acceso por enlace sin autenticación y transcripción segura con entrega pendiente. **No se ejecutó Playwright CLI**. Chrome mediante CUA aprobó escritorio de 1.761 píxeles y ventana móvil 390 × 844, sin desbordamiento ni errores de consola. El enlace carga un contacto fuera de los primeros cien; Reactivar Sarin mediante Enter cambia a Sarin activo/Pausar Sarin y la pausa vuelve a mostrar Reactivar Sarin. Capturas: `panel-desktop.jpg`, `panel-mobile.jpg`, `panel-mobile-actions.jpg` y `panel-mobile-reactivated.jpg` en la carpeta de evidencias.

Runtime local en modos retención y recuperación: ambos PASS, máximo de 23 llamadas al binding D1; manifiesto de fuente `539f2bb079dbcbe335f96fa6b4b93bcd7cff6c7bacdbd70b08e17c43f2c4a690`. Los JSON `runtime-retention.json` y `runtime-recovery.json` guardan la evidencia. Dieciocho pruebas focales de audio aprobadas después de corregir el aborto. Una nota sintética OGG de 10.239 bytes y 3,673 segundos se transcribió mediante el binding real de Workers AI (HTTP 200, 1.575 ms); no fue un audio de WhatsApp. La prueba REST previa no autenticó y no se utiliza como acreditación del proveedor.

Reporte HTML local: `qa/reports/sarin-whatsapp-audio-handoff-20261018.html`, con enlaces al log, backup, escenarios de runtime y capturas. El envío productivo anterior quedó temporalmente cerrado con `SEND_ENABLED=false`, `REPLIES_ENABLED=true`, versión `d38f0ffb-9d65-4c8c-9cd0-09550b996130`. La nueva publicación sigue pendiente de registrar.

Antes de marcar publicado, completar en este documento la aplicación remota de las migraciones, pruebas del motor, revisión independiente, configuración de la plantilla, despliegues y comprobaciones remotas. No equiparar una respuesta 200/202 de YCloud con entrega ni una prueba sintética de Whisper con una transcripción real.

## Publicación coordinada y reversión

La autorización del titular para publicar continúa vigente; esta sección describe operaciones todavía pendientes de registrar, no una publicación completada.

1. Publicar la retención compatible con los esquemas 5, 6 y 7 antes de introducir las tablas nuevas. Conservar el cron horario y verificar su configuración.
2. Mantener temporalmente `SARIN_WHATSAPP_SEND_ENABLED=false` en el consumidor durante el cambio coordinado. `REPLIES_ENABLED=false` altera el interruptor durable; no utilizarlo como una simple pausa técnica de despliegue.
3. Aplicar 0006 y 0007 sin borrar tablas ni reiniciar cuotas; comprobar esquema, integridad y valores de control. Publicar el consumidor compatible y Pages con aviso v3, privacidad y panel correspondientes. Las previews continúan cerradas y sin credenciales productivas.
4. Configurar el destinatario fijo y comprobar la plantilla, el binding AI y los permisos necesarios. Habilitar el envío tras verificar los componentes compatibles. Registrar identificadores de despliegue y evidencia de una prueba real por cada flujo; no enviar retrospectivamente el audio anterior a ACEPTO.

Si es necesario detener la ampliación, `SARIN_WHATSAPP_HANDOFF_ENABLED=false` cierra nuevos avisos del consumidor y `SARIN_WHATSAPP_SEND_ENABLED=false` cierra los envíos y el procesamiento que prepara las respuestas. Un efecto externo ya iniciado puede completarse. Para un cierre operativo general se usa el interruptor del panel y las flags correspondientes, preservando las pausas individuales.

Conservar el código que exige el aviso v3 y la retención compatible con 0006/0007. **No volver al consumidor o al panel API antiguos como reversión de datos**, no eliminar las tablas nuevas, no copiar aceptaciones v2 a v3, no devolver cupos consumidos y no reintentar envíos o transcripciones inciertos. Corregir mediante un cambio nuevo acotado con las funciones cerradas.

Una recuperación excepcional de base de datos exige mantenimiento y solicitudes drenadas. `clearRestoredHistory` ejecuta el cierre y la limpieza de manera atómica, conserva los consumos y bloquea los períodos vigentes; no se usa para deshacer un despliegue ordinario. Seguir [Restauración de Sarin](SARIN-RESTAURACION.md) y comprobar de nuevo la retención después de recuperar.
