# Plan: recepción durable WhatsApp de ALS

Diseño: [contrato del piloto](../specs/2026-10-17-sarin-whatsapp-ingress-design.md). Trabajo local autorizado por la integración solicitada; rama main, sin modificar Sarin SaaS.

1. Añadir deadline total al lector firmado con prueba RED de stream bloqueado y cancelación no resuelta.
2. Extraer núcleo comercial con pruebas de cuotas y regresiones web, conservando adaptador y errores existentes.
3. Implementar migración/almacén atómico, fixture SQLite y pruebas de deduplicación, límites, pausa, purga y recuperación.
4. Implementar handler cerrado por defecto, filtros de cuenta/piloto/fechas, deadline de commit y ACK durable. Añadir ruta exacta al build.
5. Integrar purga y recuperación compatibles con instalaciones sin migración; actualizar verificador de respaldos y documentación operativa.
6. Ejecutar pruebas relevantes, typecheck, build y revisión independiente; corregir hallazgos y registrar evidencia.
7. Preparar configuración remota concreta y pedir sólo los datos/permisos pendientes para el piloto. No crear claves, webhooks ni enviar mensajes durante las pruebas locales.

No se declara completada la integración por aprobar este hito. El siguiente tramo debe resolver consentimiento, outbox/envíos inciertos, intervención humana y visibilidad de Staff antes de activar respuestas.

## Resultado local

Pasos 1–6 completados: 616/616 pruebas finales, TSC del canal, build Functions y Worker, smoke de workerd/D1 y revisión independiente sin P1/P2. Respaldo verificado y reversión documentados en [operación](../../SARIN-WHATSAPP-PILOTO.md). El titular eligió el remitente terminado en 2135 para el empresarial 8047. Paso 7 preparado: formulario YCloud sin guardar; pendiente autorización de publicación y conexión. Sin credenciales nuevas, mensajes ni mutaciones de producción WhatsApp.
