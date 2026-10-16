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
