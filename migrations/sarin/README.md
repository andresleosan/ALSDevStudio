# Datos de cuotas de Sarin

`0001_usage.sql` crea exclusivamente objetos con prefijo `sarin_`. Aplicar con el comando de migraciones D1 del entorno elegido. No activar el chat hasta confirmar que la migración terminó correctamente.

La vista `sarin_requests` recibe parámetros internos validados por `quota.js`. Su trigger comprueba frecuencia y ambos presupuestos, incrementa contadores e inserta una reserva en la misma sentencia/transacción. No se deben insertar reservas directamente. D1 `batch` agrupa la purga, inserción y lectura confirmatoria; cualquier error revierte el batch. No se mantienen contadores en memoria del proceso.

La frecuencia usa ventanas fijas de minuto/día UTC, solo para clasificación. Los contadores de frecuencia incluyen HMAC diario de IP y caducan lógicamente a las 48 horas. La vista no guarda identidad en reservas. Los contadores de presupuesto y reservas caducan a los 35 días desde su creación. Cada intento de reserva purga hasta 100 filas caducadas por tabla, más la reserva específica si venció; los cálculos ignoran filas caducadas incluso si aún permanecen físicamente. Sin tráfico, la eliminación física espera a posteriores intentos satisfactorios. No hay campos de conversación, resumen ni IP en bruto.

Liquidar solo con uso verificado: el trigger devuelve la diferencia una sola vez a los presupuestos originales aún vigentes. Los errores, cancelaciones y timeouts sin uso confirmado conservan íntegra la reserva. Un exceso deja la reserva conservada y activa el bloqueo global persistente. El estado de bloqueo es un bit operativo sin información personal y no caduca: requiere revisión manual del cálculo/tarifas antes de restablecerlo.

Los identificadores son generados exclusivamente por el servidor para cada llamada. Duplicar un identificador con mismo importe/etapa no incrementa el consumo; cambiar importe/etapa falla cerrado. El servidor no debe aceptar identificadores del navegador ni reintentar llamadas al proveedor.

## Reversión manual

1. Desactivar `SARIN_ENABLED` y detener peticiones en curso. En producción, exportar D1 y verificar respaldo antes de cualquier operación destructiva; requiere autorización explícita del operador. Esta entrega solo usa SQLite/D1 local.
2. Ejecutar las sentencias siguientes en orden; aplicar dentro de un batch transaccional en D1. Conservan intactas otras tablas:

```sql
DROP TRIGGER IF EXISTS sarin_settle;
DROP TRIGGER IF EXISTS sarin_reserve;
DROP VIEW IF EXISTS sarin_requests;
DROP TABLE IF EXISTS sarin_reservations;
DROP TABLE IF EXISTS sarin_counters;
DROP TABLE IF EXISTS sarin_state;
```

3. Si se vuelve a activar, restaurar el respaldo de cuotas o esperar al siguiente mes UTC antes de reiniciar presupuestos; recrear tablas vacías dentro del mismo periodo reiniciaría contadores de gasto. Verificar el registro de migraciones de D1 antes de volver a ejecutar la migración. No borrar su registro automáticamente.

La prueba local ejecuta estas sentencias y verifica que los objetos ajenos se conservan.

## Historial autorizado: `0002_history.sql`

Aplicar después de `0001_usage.sql`. Las tablas de conversaciones, autorización, turnos, mensajes, eventos y enlaces se eliminan en cascada; las reservas monetarias permanecen independientes. Solo el hash del secreto de sesión se conserva, nunca el secreto ni la identidad técnica de IP en las transcripciones. Los pseudónimos de creación de sesiones permanecen únicamente en `sarin_counters` durante 48 horas.

Las vistas de comandos ejecutan admisión y comprobaciones en triggers SQLite dentro de un `batch` transaccional D1. `sarin_history_state.text_bytes` contabiliza texto de entradas y cuerpo JSON público de respuestas, más la reserva máxima de respuesta de cada turno pendiente. Un trigger ajusta capacidad exactamente una vez al finalizar; borrar una conversación devuelve toda su capacidad sin liquidar dinero. Los enlaces monetarios permiten distinguir reservas, uso verificado y reservas retenidas, sin copiar identidad de IP.

La sesión operativa y su autorización vacía vencen a las 24 horas. El primer mensaje admitido fija los 30 días de conservación, sin ampliarlos por actividad posterior. Consultas administrativas excluyen lo vencido aunque espere purga física. La purga acotada elimina además cuotas técnicas vencidas, reservas de 35 días, rechazos de 48 horas y auditoría de 30 días; una limpieza fallida guarda solo fecha y estado si D1 sigue disponible.

Un turno tiene una concesión de 45 segundos. Al vencer, una admisión posterior o la purga marca `timeout`, conserva la entrada y libera la reserva de respuesta sin inventar un mensaje emitido. La respuesta tardía se descarta y no reabre ni recrea el turno. No se libera ninguna reserva monetaria incierta.

Los eventos se agregan por código cerrado, con máximo de 32 clases por conversación. Si un límite de pruebas inferior impide una clase nueva, su ocurrencia incrementa un agregado existente. Los rechazos sin conversación se agregan por minuto/código: máximo 10000 filas y un contador global de desborde sin contenido.

### Reversión exclusiva del historial

Desactivar chat, historial y panel; detener y drenar peticiones y purga. En producción verificar antes un respaldo y la autorización explícita para borrar. Este procedimiento elimina todas las transcripciones, contactos y autorizaciones; conserva íntegra la cuota monetaria para no reiniciar gasto del período. No es la reversión operativa de `0003`: para volver sólo al código anterior, mantener las tablas y datos. Ejecutar en un batch transaccional; revisar por separado el registro de migraciones de D1 antes de reaplicar.

<!-- history-rollback -->
```sql
DROP TRIGGER IF EXISTS sarin_history_lead;
DROP VIEW IF EXISTS sarin_lead_commands;
DROP TABLE IF EXISTS sarin_leads;
DROP TRIGGER IF EXISTS sarin_history_finish;
DROP TRIGGER IF EXISTS sarin_history_begin;
DROP TRIGGER IF EXISTS sarin_history_event;
DROP TRIGGER IF EXISTS sarin_history_session;
DROP TRIGGER IF EXISTS sarin_history_capacity_delete;
DROP TRIGGER IF EXISTS sarin_history_capacity_update;
DROP VIEW IF EXISTS sarin_turn_commands;
DROP VIEW IF EXISTS sarin_event_commands;
DROP VIEW IF EXISTS sarin_session_commands;
DROP TABLE IF EXISTS sarin_turn_reservations;
DROP TABLE IF EXISTS sarin_messages;
DROP TABLE IF EXISTS sarin_events;
DROP TABLE IF EXISTS sarin_consents;
DROP TABLE IF EXISTS sarin_turns;
DROP TABLE IF EXISTS sarin_conversations;
DROP TABLE IF EXISTS sarin_rejections;
DROP TABLE IF EXISTS sarin_admin_audit;
DROP TABLE IF EXISTS sarin_history_state;
```

La suite SQLite real ejecuta esta reversión, comprueba que conserva las cuotas y una tabla ajena y vuelve a aplicar la migración. No ejecutar la reversión de cuotas anterior mientras el historial siga activo.

## Contacto declarado: `0003_leads.sql`

Aplicar después de `0002`, con respaldo privado verificado antes de producción. Sólo añade `sarin_leads` 1:1 y un comando con trigger para admisión atómica; no modifica filas antiguas ni cuadros monetarios. Los nombres/correo suman sus bytes UTF-8 a `capacity_bytes` y al límite lógico global, incluso antes del primer mensaje. El contacto hereda vencimiento y eliminación en cascada de la conversación. Consultas administrativas usan `LEFT JOIN` y devuelven `lead:null` para históricos, sin backfill. Nunca se agrega el contacto al contexto de IA ni a la respuesta pública.

Reversión segura de aplicación: publicar código anterior conservando esta migración, contactos y contabilidad hasta su purga. La eliminación total anterior requiere otra autorización explícita y no se ejecuta como parte de publicar esta ampliación. Para restaurar una copia anterior a `0003`, aplicar migraciones en la copia aislada antes del helper de limpieza, según [SARIN-RESTAURACION](../../docs/SARIN-RESTAURACION.md).
