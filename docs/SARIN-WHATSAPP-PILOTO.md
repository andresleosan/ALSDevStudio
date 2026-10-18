# Piloto de recepción WhatsApp de ALS

Estado: candidato local validado, todavía sin webhook ni publicación. YCloud Free muestra conectado el número empresarial terminado en **8047**. El titular confirmó como remitente de prueba el terminado en **2135**. La verificación empresarial sigue pendiente. No se necesita una clave de envío para este hito.

## Qué hará esta versión

`POST https://www.alsdevstudio.com/api/sarin/whatsapp` verifica la firma YCloud y guarda una captura mínima sólo del participante configurado. Identifica mensajes entrantes y ecos de la app del celular; los ecos conservan metadata, sin texto. Todo queda pausado y con estado `captured`, sin cola de procesamiento. No llama a DeepSeek, no envía respuestas y no consume el cliente REST de YCloud.

YCloud entrega los eventos suscritos de la cuenta al servidor; el filtro de piloto se aplica después de autenticar, antes de persistir. Los demás contactos y eventos se descartan sin guardar su contenido. No se debe presentar este filtro como una restricción de entrega del proveedor. En esta fase se suscriben sólo `whatsapp.inbound_message.received` y `whatsapp.smb.message.echoes`; los estados de salida se añadirán cuando exista outbox verificable.

Contenido: 24 horas. Recibos sin texto/teléfonos: 48 horas. La purga horaria retira vencidos en lotes y sigue funcionando aunque se desactive la recepción. No cambia la conservación de las conversaciones web ni la retención propia de YCloud.

## Configuración de servidor

| Variable | Uso |
| --- | --- |
| `SARIN_WHATSAPP_INGRESS_ENABLED` | Cadena exacta `true`; fuente y preview están en `false`. |
| `SARIN_WHATSAPP_WEBHOOK_SECRET` | Secreto de firma generado para este endpoint, guardado como secreto en Cloudflare; no es la API key de envío. |
| `SARIN_WHATSAPP_BUSINESS_PHONE` | Teléfono empresarial confirmado, E.164. |
| `SARIN_WHATSAPP_WABA_ID` | WABA de la cuenta conectada. |
| `SARIN_WHATSAPP_PILOT_PHONES` | Array JSON de teléfonos permitidos; piloto inicial de un solo remitente. |
| `SARIN_WHATSAPP_CAPTURE_SINCE` | Inicio efectivo del piloto en UTC ISO, con milisegundos; rechaza historia previa. |
| `SARIN_DB` | Binding D1 existente, con migración aditiva `0004_whatsapp_ingress.sql`. |

No copiar claves ni teléfonos particulares a Git, capturas o reportes. No modificar el teléfono público de la web por esta configuración. Preview permanece sin D1 y con la flag apagada.

## Secuencia preparada para la conexión

1. Revisar evidencia local y respaldo reciente verificado de D1. El candidato y el Worker de retención se compilan antes de publicar. La migración se ensaya sobre la copia local; conserva conteos y datos existentes.
2. Con autorización de publicación, aplicar la migración aditiva, publicar la retención compatible y el receptor con la flag apagada. Mantener la configuración pública del chat web y demás recursos.
3. Con autorización concreta de acceso, crear el webhook en YCloud para la URL exacta y los dos eventos anteriores. Transferir su secreto a Cloudflare de forma privada; no solicitarlo por chat. No crear ni revelar la API key de envío en esta etapa.
4. Configurar cuenta y remitente del piloto; fijar su inicio y activar sólo la recepción. Verificar rechazo de una petición sin firma y salud de retención.
5. El titular envía desde el teléfono autorizado un texto ficticio identificable, por ejemplo «Prueba de Sarin: tienda ficticia». Confirmar una captura y cero envíos. Después comprobar un eco escrito por el titular desde la app empresarial. No revisar otros chats ni importar historia.
6. Mantener respuestas apagadas. El siguiente hito implementará aviso/aceptación WhatsApp, outbox y conciliación, procesamiento con cuotas, intervención humana y visibilidad en Staff antes de una prueba de respuesta autorizada.

## Reversión y recuperación

Apagar `SARIN_WHATSAPP_INGRESS_ENABLED` cierra entradas nuevas; no cancela una escritura iniciada. Pausar el endpoint de YCloud y esperar el drenaje. Volver al despliegue anterior de Pages es compatible con las tablas aditivas. Conservar el Worker nuevo de retención mientras existan datos WhatsApp: volver prematuramente al anterior dejaría esas tablas fuera de limpieza. No borrar tablas ni reiniciar cuotas como reversión rutinaria.

Tras restaurar una copia, mantener los canales cerrados, limpiar todo el historial restaurado y conciliar presupuestos según [restauración](SARIN-RESTAURACION.md). El helper elimina web y WhatsApp en un batch, conserva dinero, reconcilia capacidad, deja pausa global y fija un piso de recuperación **cinco minutos después** del reloj de la operación. Ese margen cubre fechas futuras toleradas antes de restaurar. Esperar hasta superar el piso, fijar un nuevo inicio de captura y sólo entonces considerar reabrir. Ninguna captura restaurada se convierte en un envío pendiente.

El rollback estructural está anotado en la migración para mantenimiento controlado; no es el procedimiento operativo normal ni se ejecutó remotamente.

## Evidencia

Pruebas Node con HMAC real, SQLite en memoria, relojes y proveedores sintéticos. Cubren firma/cuenta/piloto, ACK durable, duplicados/alias, límites, fallos, pausas, expiración, recuperación y regresiones web. Registro local ignorado: `test-results/ycloud-reception-tests.txt`. Respaldo privado y artefactos de validación: `.wrangler/ycloud-candidate/`; no se publican en `dist`.

Validación final de raíz: **616/616** en 16 suites de archivos; cero omitidas o fallidas. TypeScript estricto pasa en cliente, receptor, almacén, handler y ruta WhatsApp. El backend general conserva diagnósticos anteriores; la comparación con HEAD no añadió errores al extraer el núcleo. Revisión independiente sin P1/P2 pendientes. Se corrigió un P2 del verificador: además de filas/bytes, ahora exige las definiciones de los 17 objetos SQL de 0004, evitando aceptar respaldos sin controles de admisión/capacidad.

Wrangler 4.151.1 compila Functions y retención (`deploy --dry-run`, 45,11 KiB sin comprimir). Smoke de handler y bundle completo de Pages en workerd/Miniflare con D1 local: firma, duplicado, rechazo, eco sin texto/pausa y fallback de assets correctos; cero llamadas salientes y sin flags de compatibilidad adicionales. El harness aislado también verificó purga y contadores. Registro `test-results/ycloud-runtime-full.txt`. Build estático: 222 recursos, 5.404.872 bytes, revisión local `fe69d3eb372604e6`.

Respaldo remoto obtenido privadamente y restaurado exclusivamente en memoria con el verificador final: integridad correcta, cero errores FK, objetos críticos correctos y migración aditiva sin cambios en conteos previos. Evidencia privada `.wrangler/ycloud-candidate/backup-verification.json`. No se aplicó ninguna migración a la base remota. Refrescar el respaldo antes de publicar si esta preparación deja de ser reciente.

YCloud quedó con borrador sin guardar: URL exacta y dos eventos seleccionados, sin clave revelada ni acceso nuevo creado. Captura local `test-results/ycloud-webhook-piloto-preparado.png`. La conexión y la publicación quedan pendientes de autorización concreta del titular.

El comando de [exportación D1](https://developers.cloudflare.com/d1/best-practices/import-export-data/) conserva una copia local privada; el verificador la restaura exclusivamente en memoria. La compilación de [Wrangler](https://developers.cloudflare.com/workers/wrangler/commands/) y `deploy --dry-run` no publican el candidato.
