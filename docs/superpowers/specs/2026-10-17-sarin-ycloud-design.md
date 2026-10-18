# Sarin de ALS: conector YCloud Free

El titular eligió YCloud Free para conectar el bot comercial de ALS al número que ya usa en WhatsApp Business. La web y el celular deben seguir disponibles. Contexto y fuentes: [evaluación](../../SARIN-WHATSAPP-EVALUACION.md).

## Primer entregable

Preparar y probar localmente el transporte autenticado de YCloud. Esta fase no crea rutas públicas ni almacena mensajes, no llama a DeepSeek, no envía a contactos reales y no modifica la cuenta. La conexión real depende del alta del titular y de comprobar la elegibilidad del número en Coexistencia.

Se añaden módulos internos en `server/sarin/whatsapp/` con JavaScript y JSDoc, sin dependencias. El receptor normaliza mensajes y estados; el emisor traduce texto al contrato REST. La lógica comercial y las sesiones web siguen en sus módulos actuales. No se simulan cookies de navegador para WhatsApp.

## Recepción

- Validar el encabezado `YCloud-Signature`, formado por `t` y `s`. Verificar HMAC SHA-256 sobre los bytes UTF-8 de `timestamp + '.'` seguidos por el cuerpo exacto, con el secreto del endpoint. No usar la API key como secreto de firma.
- Sólo POST y JSON; cuerpo máximo de 64 KiB leído con cancelación. Verificar firma antes de parsear JSON. UTF-8 inválido y estructuras inválidas se rechazan con códigos cerrados, sin incluir contenido ni secretos.
- El módulo atiende cancelación del llamador y, en la continuación de recepción durable, incorpora un plazo propio total de lectura de 3 segundos, configurable sólo a la baja. Un cuerpo bloqueado o una cancelación que no resuelva no deben impedir el rechazo.
- Política local de antigüedad: máximo 8 horas y adelanto de 5 minutos. No es un valor prescrito por YCloud. Sus reintentos documentados suman 5 h 35 min 40 s; la tolerancia no sustituye deduplicación persistente por evento y mensaje en la fase siguiente.
- Normalizar sólo `whatsapp.inbound_message.received`, `whatsapp.smb.message.echoes` y `whatsapp.message.updated`. Tipos de evento no usados producen un resultado `ignored`, sin datos personales. Para entrantes no textuales conservar únicamente metadata necesaria para derivación, sin descargar medios.
- IDs acotados, números E.164, fechas válidas y texto máximo de 1.200 caracteres, coherente con Sarin. Los eventos pueden incorporar campos adicionales del proveedor; no trasladarlos al resto del sistema.
- No fusionar identidades web/WhatsApp. La futura admisión comprobará el número empresarial configurado y la lista del piloto antes de persistir contenido.

## Envío

- API fija `https://api.ycloud.com/v2/whatsapp/messages`, `X-API-Key`, JSON y redirecciones manuales rechazadas. No destinos configurables desde HTTP.
- Activación explícita de envío y número empresarial configurado; apagado por defecto. Un cliente sólo podrá enviar desde ese número.
- `externalId` es correlación, no garantía de idempotencia. No se inventa un encabezado `Idempotency-Key`.
- Una llamada por envío, sin reintento automático. Timeout total acotado, incluida lectura; máximo de respuesta 64 KiB.
- Distinguir rechazo previo a envío de resultado incierto después de iniciar la petición. Un timeout, error de red, 5xx, redirección o respuesta exitosa ilegible no autoriza reenviar. Exponer resultado cerrado para reconciliación por ID y eventos.
- Consultar un mensaje por el ID que YCloud haya devuelto con GET; no existe búsqueda documentada por `externalId` que resuelva todos los envíos inciertos.
- No registrar cuerpos, teléfonos, cabeceras ni errores arbitrarios del proveedor.

## Siguientes fases necesarias antes de atención real

1. Persistencia D1 de inbox/outbox con deduplicación, leases y límites; ACK sólo después de persistir. Eventos de estado no necesariamente llegan ordenados.
2. Núcleo comercial compartido con cuotas actuales, sin repetir inferencia tras fallos inciertos. No incorporar al contexto respuestas que no se enviaron.
3. Aviso/aceptación específicos de WhatsApp y datos de contacto; aclarar retención de ALS frente a la del proveedor. El piloto inicial usará datos ficticios y destinatarios expresamente elegidos.
4. Pausa humana y reactivación explícita, comprobación antes de generar y enviar. Ecos del celular como señal adicional; no pueden retirar un envío ya aceptado.
5. Staff con canal/estado, retención y recuperación que no reactiven mensajes pendientes tras restaurar un respaldo.
6. Comprobación de Coexistencia, permisos y eventos en la cuenta Free; prueba con el titular antes de activar atención pública.

## Validación y recuperación

Suites Node en `.github/cloudflare/`, transportes falsos y datos sintéticos. Cubrir firma alterada, timestamp, bytes exactos, JSON inválido, límites, cancelación, tipos ignorados, extracción de campos, desactivación, redirecciones, timeout y envío incierto sin duplicados. Ejecutar regresiones relevantes del bot y build de Pages. No necesitan credenciales ni llamadas de pago.

Recuperación de esta fase: retirar únicamente los nuevos módulos y pruebas; no hay migraciones, rutas, secretos ni configuración remota que revertir. Los cambios se realizan en `main`, siguiendo `AGENTS.md`.
