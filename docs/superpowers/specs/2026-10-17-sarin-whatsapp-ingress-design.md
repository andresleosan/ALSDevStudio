# Sarin de ALS: recepción durable del piloto WhatsApp

## Alcance confirmado

El titular vinculó YCloud Free por Coexistencia y confirmó el número empresarial terminado en 8047. El panel muestra `Connected`; la verificación empresarial sigue pendiente. Se observaron disponibles los tres eventos del transporte. No se han creado webhooks ni leído claves API, y no se han enviado mensajes.

Este hito prepara recepción local verificable y el núcleo comercial compartido. No activa respuestas ni convierte mensajes capturados en una cola de inferencia. Los números públicos actuales de la web no se modifican como consecuencia de confirmar el canal.

## Recepción

Ruta exacta propuesta: `POST /api/sarin/whatsapp`, en `www.alsdevstudio.com`. Flag estricta independiente apagada por defecto. Configuración de servidor: secreto de firma del endpoint, teléfono empresarial E.164, WABA esperado, lista JSON de 1–10 teléfonos de prueba y fecha inicial de captura. Sin configuración completa, responder 503 antes de leer datos o acceder a D1.

Usar el transporte autenticado existente: firma sobre bytes exactos, máximo 64 KiB y deadline propio de lectura de 3 segundos. El commit D1 tiene un presupuesto adicional de 2 segundos; un timeout devuelve error reintentable, aunque D1 pudiera terminar después. Una repetición posterior se deduplica. No usar `waitUntil` para confirmar persistencia pendiente.

Comprobar número, WABA y participante antes de persistir. Descartar explícitamente eventos anteriores al inicio del piloto, de más de 8 horas o con fecha futura superior a 5 minutos. Desconocidos, fuera de piloto y estados sin correlación local reciben respuesta cerrada de descarte, sin almacenar contenido. Esta fase no tiene outbox: no atribuir estados por `externalId` ni crear conversaciones a partir de ellos.

## Persistencia aditiva

Migración `0004_whatsapp_ingress.sql`, tablas propias sin alterar sesiones ni consentimiento web. Captura atómica mediante transacción D1 y trigger: recibo por evento, deduplicación adicional por tipo/WABA/empresa/wamid, contenido mínimo y señal de pausa humana. Los IDs repetidos con contenido distinto son conflicto. Un duplicado exacto no consume frecuencia ni capacidad adicional; un ID nuevo del mismo mensaje ocupa un recibo alias, sin repetir contenido, cuota o pausa y sin extender el vencimiento. Los hashes sólo correlacionan datos internos, no autorizan acceso ni anonimizan teléfonos.

Estado de contenido fijo `captured`, pausa global predeterminada y sin procesador. Un eco conserva metadata sin texto, aplica pausa una vez y nunca reactiva. Los mensajes multimedia no descargan archivos ni conservan URLs/captions.

Límites iniciales: 10.000 capturas, 20.000 recibos, 8 MiB lógicos, 10 entrantes/minuto y 50/día por participante, y techo global. Los ecos no usan la cuota de entrantes. Contenido y contactos del piloto sintético caducan a las 24 horas; recibos mínimos, a las 48 horas. Repetir un evento no extiende vencimientos. Purga acotada integrada al cron existente antes de cualquier activación.

Restaurar elimina capturas/contactos restaurados, mantiene la pausa y fija un piso temporal al menos cinco minutos posterior a la operación, cubriendo las fechas futuras admitidas previamente, sin reiniciar presupuestos. Ambas fechas del evento deben superar el piso. Reversión operativa: apagar la flag y volver al código Pages anterior conservando tablas y el Worker nuevo de retención mientras existan datos WhatsApp; no borrar datos automáticamente. Probar respaldo, recuperación y contabilidad localmente; migración remota exige respaldo reciente verificado.

## Motor comercial

Extraer clasificación/generación y liquidación de reservas a `run-commercial-turn.js`. El adaptador web conserva Origin, cookies, consentimiento, admisión, replay e historial. El núcleo recibe historial ya autorizado y dependencias internas; no recibe Request ni teléfonos. Este hito no conecta la captura WhatsApp a dicho núcleo.

## Validación y activación posterior

Pruebas con HMAC real, SQLite en memoria, datos ficticios y red sustituida. Cubrir timeout de lectura, ACK posterior al commit, rollback, deduplicación y conflictos, filtros de cuenta/piloto, límites, pausa, expiración y recuperación sin gasto ni envíos. Ejecutar regresiones web, retención, respaldo, build y revisión independiente.

La configuración remota del webhook sólo se hará con endpoint preparado y autorización concreta para transmitir los eventos de YCloud a ALS. Se necesita un número de prueba elegido por el titular. La clave de envío no es necesaria para recepción. Consentimiento WhatsApp, outbox, reconciliación, Staff y prueba de respuesta siguen pendientes antes de atención real.
