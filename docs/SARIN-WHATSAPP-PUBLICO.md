# Sarin en WhatsApp · atención pública · 18 de octubre de 2026

**Estado: publicado y verificado el 18 de octubre de 2026, 2:23 a. m. de Colombia.** El titular autorizó admitir nuevos contactos con el flujo «Hola → aviso → ACEPTO → consulta», conservando la pausa cuando conteste desde el celular. Canal exclusivo: **ALS Dev Studio, +57 305 277 8047**. Posteriormente el titular confirmó «Recibí el aviso nuevo» al probar «Hola» desde su contacto de prueba: queda acreditada por su confirmación la recepción del aviso público v2. Esta respuesta no acredita ACEPTO ni una consulta de IA en esta nueva etapa; las pruebas locales no se presentan como mensajes remotos.

Este documento sustituye el alcance limitado a un contacto del [registro del piloto](SARIN-WHATSAPP-RESPUESTAS.md). La prueba real anterior acredita el piloto, no la apertura pública de esta versión.

## Comportamiento publicado

- Un contacto nuevo que escriba un mensaje de texto, incluso «Hola», puede recibir la presentación y el aviso, sujeto a disponibilidad, capacidad y cupos. No necesita agregarse a una lista privada.
- Aviso vigente: `whatsapp-service-2026-10-18-v2`, con la marca completa **ALS Dev Studio**, tratamiento internacional y enlace a `privacidad.html#whatsapp`. El ancla anterior `#whatsapp-piloto` se conserva como alias.
- Se exige entrega acreditada del aviso y **ACEPTO** antes de enviar consultas a DeepSeek. Después de la confirmación, el contacto escribe su consulta. La aceptación operativa vence a las 24 horas y se solicita nuevamente. El aviso no se repite por cada saludo mientras siga vigente el contexto correspondiente.
- La aceptación `whatsapp-pilot-v1` no habilita IA ni el nuevo servicio. Un contacto antiguo recibe el aviso nuevo en el siguiente mensaje admisible, siempre que no esté pausado. Una aceptación del chat web tampoco sirve para WhatsApp.
- **HUMANO**, **STOP**, **PARAR**, **NO ACEPTO** y los mensajes de audio, imagen o archivo detienen la atención automática. Una respuesta desde la app WhatsApp Business la pausa al recibirse su eco. No se envían esos archivos a DeepSeek.
- Las pausas existentes no se levantan al abrir el servicio ni al vencer el contenido. Andrés usa **Reactivar Sarin** en Staff; después hace falta un mensaje nuevo y, si corresponde, otra aceptación. No se contestan retrospectivamente los mensajes anteriores a la reactivación.
- No se habilitan campañas, plantillas, cobros ni mensajes iniciados sin una consulta del contacto. El chat web y su autenticación mantienen su funcionamiento.

## Activación y límites

Pages y el consumidor deben compartir `SARIN_WHATSAPP_ACCESS_MODE=public` y un mismo `SARIN_WHATSAPP_PUBLIC_SINCE`, expresado en UTC con formato ISO completo y milisegundos. La fecha debe ser válida y estar alcanzada; una configuración ausente o inválida no concede acceso público. La apertura también necesita las flags de recepción/respuestas/envío y el interruptor de atención habilitados según su función.

`PUBLIC_SINCE` fija el inicio de la admisión pública. Las entradas y ecos con fecha de envío o creación anterior se ignoran, aunque el proveedor los entregue después. Se mantiene el filtro de cuenta empresarial y número de destino. No se importa el historial anterior ni se retrocede esta fecha para recuperar mensajes. Preview y la configuración base deben permanecer cerrados.

| Control | Límite vigente |
| --- | --- |
| Intentos de envío | 20 al día y 100 al mes; incluyen presentación, confirmación de aceptación y respuestas. Períodos UTC. |
| Presupuesto interno de IA | USD 1 al día y USD 10 al mes, compartido con el chat web. Períodos UTC. |
| Contextos de contacto | Máximo 1.000, incluidos los marcadores persistentes de pausa. |
| Eventos de control | Máximo 20.000; no se retira una pausa para hacer sitio. |
| Contenido en la base de Sarin | 24 horas desde la recepción; la respuesta vence con su entrada. |
| Recibos y evidencia mínima | Hasta 48 horas desde su registro. |

Estos son topes de la aplicación, no garantías sobre factura, tarifa o almacenamiento de proveedores. No se contratan planes ni recargas. Un aviso y su confirmación consumen dos intentos antes de la primera respuesta de IA; la apertura no aumenta los cupos del piloto. Al llegar a los límites puede no haber respuesta automática: corresponde atención humana y revisión del consumo, no un reinicio de cuotas.

El contenido vencido queda fuera de lectura y de contexto de IA; la purga física es horaria y puede retrasarse ante fallos. El marcador de control de cada contacto persiste para respetar pausas y preferencias: contiene una huella, estado, referencias de versión y fechas, sin texto ni teléfono en claro. No mantiene vigente una aceptación vencida. Su revisión o supresión requiere atención de la solicitud y no se confunde con la purga de 24/48 horas.

El historial de la app WhatsApp Business, el seguimiento humano, los respaldos y los proveedores tienen criterios distintos, descritos en [Privacidad](../privacidad.html#whatsapp). No se promete retención cero en YCloud, Meta, DeepSeek o Cloudflare.

## Verificación y registro de publicación

Antes de marcar esta etapa publicada, registrar resultados de pruebas de admisión pública, aviso vigente, rechazo del consentimiento antiguo, pausa/STOP durables, eventos anteriores al inicio, duplicados, capacidad y cuotas. Comprobar además el panel, los avisos legales, la configuración de ambos componentes y el aislamiento de preview. Las pruebas con proveedores sustitutos no acreditan una entrega remota.

| Evidencia de esta versión | Estado |
| --- | --- |
| Regresiones, revisión y QA del candidato | 858/858 pruebas Node, harness workerd/D1/Queue y QA CUA aprobados; detalles debajo. |
| Commit fuente y revisión del artefacto | `67e7619`, enviado a `main`; revisión `706ac4a106e73ae4`. |
| Pages y versión del consumidor | Pages `92275127-3c90-44fe-8976-c73d9299deed`; consumidor `0142e118-a07e-4580-8085-454fe086d504` al 100 %. |
| `PUBLIC_SINCE` remoto, UTC y equivalente Colombia | Piso de admisión `2026-10-18T07:19:24.000Z` = 2:19:24 a. m.; apertura publicada y confirmada a las 2:23 a. m. |
| Verificación remota de configuración y recursos | Pages y consumidor en `public`, respuestas/envío habilitados, misma fecha; once secretos Pages y seis del consumidor conservados. Preview sin secretos, D1 ni Queue. Recursos públicos coinciden con el artefacto; API administrativa anónima 403 y webhook sin firma 401. |
| Recepción real del aviso público v2 | Confirmada por el titular: «Recibí el aviso nuevo», desde el contacto de prueba existente. No se ha confirmado aún ACEPTO v2 ni una prueba real desde otro contacto nuevo. |

No registrar claves, teléfonos de clientes, cuerpos de conversaciones ni códigos de acceso en evidencias o Git. La prueba del piloto y el [arreglo previo del panel](SARIN-WHATSAPP-PANEL-UX.md) se conservan como antecedentes, sin presentarlos como validación de esta apertura.

### Evidencia local del candidato

- `node --test` sobre las suites Node de `.github/cloudflare`, excluyendo las que lanzan Playwright: **858 aprobadas, cero fallos**. Incluye 41 casos públicos nuevos y paginación API con 205 contactos. Se actualizó el fixture de mantenimiento que todavía creaba avisos v1.
- Harness multitrabajador con workerd, D1 y Queue: dos contactos nuevos sin lista privada, seis envíos y cuatro llamadas IA ficticias, destinatarios/contextos aislados, duplicados sin gasto, pausa humana persistente y retención sin reiniciar dinero. Cero tráfico externo inesperado. Máximo del consumidor: 20 llamadas al binding D1 y 69 sentencias SQL; no se equipara esta medición local a CPU facturada.
- Revisión independiente: sin P1/P2 abiertos. Una prueba reprodujo una carrera al llenarse el cupo de eventos; se corrigió para que STOP y la pausa humana se apliquen también tras ese rechazo concurrente.
- Tipado focal de ingreso, procesamiento, conciliación, store y UI: correcto. Al incluir el módulo administrativo aparecen dos errores previos de `unknown` en `server/sarin/access.js:154-155`, archivo sin cambios; no se certifica el tipado global.
- Chrome mediante CUA, 1450 × 765 y 320 × 780: 106 contactos, segunda página sin perder selección tras sondeo, reactivar/pausar sólo un contacto ficticio, marca y aviso públicos, controles accesibles y sin desbordamiento horizontal. Se corrigió el alto de las filas y se fijó «Cargar más contactos» fuera del desplazamiento. Sin errores de consola, HTML inyectado ni texto de eco expuesto. No se ejecutó Playwright externo.
- Build: 223 recursos públicos, 5.450.701 bytes, revisión `706ac4a106e73ae4`. Consumidor compilado con Wrangler 4.151.1 en `--dry-run`, 113,28 KiB (26,87 KiB gzip). Sin migraciones, dependencias ni cambios de credenciales.

Artefactos locales ignorados por Git: `test-results/sarin-whatsapp-public-20261018/` (pruebas, evidencia de runtime y capturas). Para el despliegue, publicar primero el consumidor nuevo con sólo `SEND_ENABLED=false`, después Pages y finalmente el consumidor con envío habilitado. Mantener `REPLIES_ENABLED=true` durante esa transición evita cambiar el interruptor durable o las pausas existentes.

Publicación coordinada completada en ese orden: versión temporal sin envío `fd7b9058-4210-4c63-949b-9c981ad1e15f`, Pages público y consumidor activo. Se verificaron los valores remotos en cada transición. El interruptor durable continuó habilitado; al cierre había un contexto activo, cero trabajos pendientes, cuatro intentos previos consumidos y ninguna aceptación v2 todavía. No se alteraron controles del contacto real ni se enviaron mensajes manuales desde esta revisión. La sesión del panel se restauró y mostró «Respuestas automáticas activas», marca completa y aceptación pendiente para el participante anterior. El historial conserva sus mensajes originales; el texto nuevo se utiliza en el siguiente aviso.

Evidencias remotas: `remote-before.json`, `remote-hold.json`, `remote-pages.json`, `remote-active.json`, `public-smoke.json` y `panel-publicado.jpg` en la carpeta local anterior. Reporte visual: `qa/reports/sarin-whatsapp-public-20261018.html`. Pages anterior: `75347c75-b112-4956-ad7b-7ca91de9cfd9`; no restaurar su lógica antigua de consentimiento como procedimiento de reversión.

## Cierre y reversión

1. Apagar la atención en Staff y deshabilitar `SARIN_WHATSAPP_REPLIES_ENABLED` y `SARIN_WHATSAPP_SEND_ENABLED` en Pages y consumidor. Un envío ya iniciado puede llegar; esperar y revisar el trabajo pendiente sin repetir envíos inciertos.
2. Cerrar la admisión pública cambiando `SARIN_WHATSAPP_ACCESS_MODE` a `pilot` con su lista privada válida, o manteniendo la recepción deshabilitada. Verificar el cierre en ambos componentes; conservar pausas, deduplicación, cuotas y registros de entrega.
3. Mantener el código que exige el aviso vigente. **No restaurar una versión que vuelva a aceptar `whatsapp-pilot-v1`, ni copiar aceptaciones antiguas al nuevo aviso.** Revertir presentación o configuración mediante un cambio acotado, sin rebajar el consentimiento.
4. Conservar las tablas y la retención compatible. No restaurar datos ni reiniciar presupuesto como procedimiento de cierre; una recuperación excepcional sigue [el procedimiento de restauración](SARIN-RESTAURACION.md).
5. Para reabrir después de un cierre, fijar una nueva fecha de admisión coordinada en ambos componentes, sin retrocederla para procesar mensajes de la interrupción. Preservar pausas individuales y exigir autorización vigente; una modificación material del aviso requiere su nueva versión.
