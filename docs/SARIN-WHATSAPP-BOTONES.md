# Menú de WhatsApp de Sarin

El aviso inicial de ALS Dev Studio ofrece **Aceptar**, **Hablar con Andrés** y **Salir**. El receptor conserva las palabras ACEPTO, HUMANO y STOP; SALIR también detiene al asistente. Mientras el aviso de este menú está pendiente, admite 1, 2 y 3 como alternativas. Después de aceptar, los números vuelven a ser parte de la conversación: no se confunde una cantidad o una respuesta comercial con una orden.

Cada botón contiene la referencia del aviso que lo originó. El receptor comprueba en la misma transacción el contacto, contexto, versión, hash, inicio del envío y vencimiento del aviso. Un botón de otro contacto, de una etapa anterior o desconocido no concede aceptación ni entra a la IA. El título mostrado por WhatsApp no determina la acción. Los duplicados conservan la misma identidad y no producen otro envío.

El botón para Andrés conserva la pausa y la alerta al propietario. Salir revoca la aceptación y mantiene la pausa, incluso si Andrés ya había intervenido desde el celular. Aceptar no reactiva un chat pausado. La reactivación continúa en el panel administrativo.

El cambio es de presentación: la información sobre proveedores, tratamiento y retención sigue siendo la del aviso v3. Las aceptaciones v3 anteriores permanecen válidas. El hash exacto del aviso nuevo impide interpretar números como opciones de un aviso anterior que no las ofrecía. No hay migración ni modificación de cuotas.

## Contrato y verificación

Se utiliza `interactive/button` en el aviso inicial, con tres respuestas. El cuerpo cumple el límite de 1.024 caracteres, los títulos el de 20 y los identificadores el de 256. Las confirmaciones, respuestas comerciales y alertas siguen siendo texto. Una solicitud fallida o incierta no genera un segundo POST de respaldo. Véanse los [ejemplos oficiales de YCloud](https://nndocs.ycloud.com/reference/whatsapp-messaging-examples) y los [eventos entrantes](https://nndocs.ycloud.com/reference/whatsapp-inbound-message-webhook-examples.md).

Las pruebas nuevas cubren el contrato del proveedor, firma del webhook, referencia exacta del aviso, consentimiento pendiente de entrega, aislamiento entre contactos, selección numérica contextual, carreras al confirmar, intervención humana y ausencia de envíos duplicados. La revisión independiente detectó un caso de saturación: la opción 2 pausaba el chat, pero su reintento podía perder la alerta. Se corrigió conservando 2/3 en un menú nunca aceptado incluso durante la pausa; la ausencia de una prueba de aceptación del mismo aviso se verifica en la transacción. El tope de recibos y la deduplicación permanecen intactos. Tras una aceptación previa, los números siguen siendo texto, incluso después de revocarla.

La corrida final seriada de WhatsApp y YCloud terminó en **638/638 pruebas aprobadas**, cero fallos; registro `test-results/sarin-whatsapp-audio-handoff-20261018/menu-audio-final-regression.log`. CheckJs de los diez módulos modificados pasó sin diagnósticos. Las revisiones independientes del transporte, ingreso y audio cerraron sin bloqueos.

El recorrido local con workerd, D1 y Queue pasó: aviso interactivo, aceptación por botón, aceptación numérica de otro contacto, audio sintético, respuesta textual, solicitud humana por botón, una alerta al propietario, deduplicación y retención. Máximo de 23 llamadas al binding D1 por ejecución. Todas las llamadas a proveedores e IA fueron interceptadas; no hubo llamadas reales. Evidencia `runtime-menu-retention.json`. El lector de audio pasó además **11/11 escenarios en workerd**, incluidos el desplazamiento de pre-skip y final sin EOS, 120 segundos, exceso, CRC corrupto y permiso denegado; evidencia `runtime-recorded-opus.json`.

El artefacto estático permanece idéntico: 223 archivos, 5.454.014 bytes, revisión `23c0a7863504d47c`. Este cambio modifica el servidor y el menú nativo de WhatsApp; no modifica la interfaz web cuya verificación visual consta en [Audio y atención humana](SARIN-WHATSAPP-AUDIO-ATENCION.md).

## Publicación y reversión

Publicar primero Pages, que reconoce los botones nuevos y los mensajes anteriores; después el consumidor que los envía. Se mantienen el esquema 7, la retención y la versión de consentimiento v3. No se reproducen trabajos terminados ni se reinician consumos.

Para revertir el transporte, volver al consumidor `aab3db5e-a675-495c-a0d7-9796a2a97c7b`, conservando el nuevo receptor de Pages para los botones ya entregados. Ese consumidor vuelve al aviso textual y al validador de audio anterior. Si además se necesitara revertir Pages, cerrar primero los envíos y revisar los menús ya entregados; no restaurar la base de datos para deshacer este cambio.
