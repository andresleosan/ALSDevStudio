# Respuestas de Sarin para WhatsApp de ALS

Fecha: 18 de octubre de 2026. Alcance autorizado: ALS DevStudio, **+573052778047**, un único participante piloto ya configurado. No corresponde al SaaS de citas ni amplía el canal al público.

## Preparación y publicación

- Panel corregido y trabajo previo conservado: [auditoría y reparación](SARIN-WHATSAPP-AUDITORIA-2026-10-18.md). 825 pruebas Node, 11 de integración nuevas, QA real de escritorio/móvil/teclado y revisión independiente sin P1/P2. El tipado completo mantiene deuda previa, sin diagnósticos nuevos.
- Fuentes actuales compiladas y verificadas en workerd con D1 y proveedores ficticios: aviso, aceptación, generación, entrega, duplicados, pausa humana, retención y recuperación. No se atribuye a estas pruebas una entrega remota ni CPU facturable.
- Respaldo privado `pre-0005.sql`, SHA256 `62b68bb0bc62936c2eb72ebd7880667c23dbd601d881a64208326170b1f75e07`. Restaurado en memoria, integridad correcta, cero errores FK; ensayo 0005 conserva todas las filas y comienza apagado, sin backfill. Evidencias ignoradas en `.wrangler/wa-replies-release-20261018/`.
- Retención compatible publicada: `527ed214-1cf0-45aa-b94f-77aaa80e2c5f`, cron cada hora. Migración 0005 aplicada: 34 comandos correctos.
- Queue `als-sarin-whatsapp`, ID `cbbc168e2232454db3f4ac606213b269`, retención 86400 segundos. Un consumidor, concurrencia y lote máximos de uno.
- Primera publicación apagada: consumidor `a709e557-089e-40d5-a3c1-45fffae995d1`; Pages `0d254a01-cc41-4129-91bb-c740d1783dd2`, fuente `96ed743`. Git main integra también las imágenes remotas, sin descartar cambios ni force push.
- Seis secretos del consumidor cargados privadamente. Credenciales de DeepSeek y cuota tomadas de `.dev.vars`; identidad del único participante reconstruida de registros vigentes y validada por hash y cuenta. No se modificaron los secretos web: sus once nombres/tipos siguen presentes; preview no tiene secretos ni bindings de datos.
- YCloud conserva el endpoint de ALS, entrada y eco; ahora suscribe también `whatsapp.message.updated`. Se comprobó por GET oficial el número/WABA conectado y la autenticación YCloud. DeepSeek devuelve autenticación válida y disponibilidad de saldo; estas comprobaciones no enviaron mensajes ni generaron IA.
- Smoke publicado 10/10: web/chat activos, Staff y aviso, cuatro assets idénticos, API privada anónima 403 y webhook GET 405. Evidencia `test-results/whatsapp-audit-20261018/release-http.json`.

## Activación y prueba

Las flags de servicio se habilitan sólo en producción. El piloto permanece apagado hasta activarlo en Staff; el contacto debe reactivarse y escribir un mensaje nuevo. Preview y configuración base del consumidor siguen apagados. Las capturas antiguas no se convierten en trabajo.

Recorrido pendiente de acreditar remotamente: mensaje ficticio nuevo, aviso **entregado**, `ACEPTO`, consulta ficticia, respuesta de Sarin **entregada**, contestación desde el teléfono empresarial y pausa automática. No considerar un HTTP 200 del proveedor como prueba de entrega. Registrar resultado y versiones de activación tras completar el recorrido.

Topes actuales: 20 intentos de envío/día y 100/mes, incluidos avisos; presupuesto IA compartido 1 USD/día y 10 USD/mes. No se contrataron planes, recargas ni ampliaron destinatarios. Estos controles de aplicación no sustituyen la facturación del proveedor.

## Reversión

Apagar piloto en Staff y deshabilitar las flags de respuestas/envío en Pages y consumidor; esperar el trabajo ya iniciado. Un envío que ya empezó puede llegar. No repetir POST inciertos ni reiniciar cuotas. Conservar las tablas 0005, el registro de envíos y el Worker nuevo de retención.

La publicación Pages previa era `68a0f9d6-73a0-42bc-94b5-3e6ae74e63fa` (recepción solamente). Antes de volver a ella, cerrar el piloto y el consumidor. No restaurar una retención anterior que desconozca las tablas de respuestas. Para recuperación de datos seguir [el procedimiento de restauración](SARIN-RESTAURACION.md), con drenaje, época nueva y cierre conservador de cupos.
