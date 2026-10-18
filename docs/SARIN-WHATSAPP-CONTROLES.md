# Controles por botones en WhatsApp

Solicitud del titular del 18 de octubre de 2026, después de confirmar el menú real: quitar la numeración 1/2/3 y las instrucciones de escribir comandos para aceptar, solicitar atención humana o salir.

## Comportamiento previsto

El aviso inicial mantiene **Aceptar**, **Hablar con Andrés** y **Salir**. Las confirmaciones y respuestas de Sarin mantienen **Hablar con Andrés** y **Salir**. Los textos indican los botones, sin menús numéricos ni instrucciones de escribir ACEPTO, HUMANO o STOP. El nombre sigue siendo una entrada libre y explícita con el formato `NOMBRE: Ana Pérez`.

Los mensajes ya entregados no se editan en el teléfono. La recepción conserva compatibilidad con las opciones anteriores sin anunciarlas en mensajes nuevos. Aceptar requiere el aviso aprobado correspondiente; un botón de atención humana o salida en una respuesta no puede conceder consentimiento. Los botones se vinculan al contacto, al contexto y al mensaje de origen vigente.

Cada respuesta usa un único envío interactivo, sujeto a los mismos cupos y controles de entrega. El cuerpo guardado debe coincidir con el enviado y respetar el límite de 1.024 unidades de texto admitido por el cliente. No hay segundo envío de texto como respaldo de un intento incierto. Los avisos al WhatsApp de Andrés conservan su mecanismo independiente de texto o plantilla.

Los controles no requieren una migración propia y conservan el alcance y la vigencia de las autorizaciones de IA v3. Esta publicación incorpora por separado el registro de costos del esquema 9, informado en el aviso de 967 caracteres y en la política: datos de precio seudonimizados durante hasta 13 meses, sin contenido ni teléfono del interlocutor. No se atribuye esa retención retroactivamente a una aceptación anterior.

El hallazgo P2 sobre botones de respuestas con envío incierto quedó corregido. Hablar con Andrés y Salir funcionan desde `send_uncertain` con las mismas validaciones de identidad, contexto, época y vencimiento; la aceptación no se habilita desde ese estado. Las pruebas verifican revocación y pausa, una única alerta humana incluso con duplicados y ningún POST adicional.

Publicar todos los lectores compatibles con **esquemas 8 y 9 antes de aplicar la migración 9**, incluidos Pages, consumidor y retención/mantenimiento. Pages se publica antes del consumidor. Comprobar las versiones compatibles y después aplicar la migración. Para revertir el transporte se debe conservar un receptor compatible con el esquema aplicado y todos los botones ya entregados, sin restaurar la base ni reproducir trabajos anteriores.

Validación final: **876/876 regresiones Node y 21/21 pruebas de build correctas**. CUA completada sobre datos sintéticos en navegador: escritorio de 1.761 px, cabecera de 61 px y filtros a 178,4 px; móvil de 320 px sin desbordamiento; multimoneda, gratuidad confirmada, vacío/error, teclado con Enter/Escape y cierre de sesión durante una respuesta lenta sin reaparición de datos. Evidencia: [browser-qa.json](../test-results/sarin-whatsapp-consumption-20261018/browser-qa.json); logs y capturas en la misma carpeta.

Runtime workerd de retención y recuperación correcto, con GET de precios único y persistencia del recibo durante mantenimiento; fuente SHA-256 `6b86e1dfb4127ac45d0e9a61d417cd9dfeb502b53a923706e1acfe024bc9918f`. Evidencias en `test-results/sarin-whatsapp-buttons-only-20261018/runtime-buttons-only-retention.json` y `runtime-buttons-only-recovery.json`. Artefacto de 224 archivos preparado con revisión `df8d32900e429044`.

Estado: botones publicados en producción el 18 de octubre de 2026 a las 09:42 UTC. Tras corregir el rechazo del borrador opcional con la fuente `48aa84c28e48cce5f6e6e5852657c590fb5ad589`, el titular confirmó la respuesta de chatbot a medida y ambos botones desde el teléfono. La respuesta quedó leída, sin conflicto y con el contacto activo. La instrumentación temporal terminó sin nuevos errores. Detalles de publicaciones y compatibilidad del esquema en `SARIN-WHATSAPP-CONSUMO-Y-BOTONES.md`.
