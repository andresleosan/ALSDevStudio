# Sarin de ALS DevStudio: evaluación de WhatsApp

Fecha: 17 de octubre de 2026, America/Bogota.
Estado: el titular seleccionó YCloud Free el 17 de octubre de 2026. Cuenta ALS DevStudio registrada, plan Free y número terminado en 8047 con estado `Connected` confirmados en el panel. El titular confirmó usar ese número. Verificación empresarial pendiente. Sin pagos, mensajes reales ni despliegue WhatsApp realizados.

## Objetivo confirmado

Conectar el asistente comercial de la web de ALS DevStudio al número existente de WhatsApp Business, que el titular atiende desde el celular. Mantener ambos canales y la atención humana. El producto de citas Sarin Bot SaaS queda fuera de este trabajo. El titular eligió comparar proveedores para agilizar la conexión.

## Evidencia del proyecto

Revisión sobre `main`, HEAD `c16b8b7`, inicialmente sin cambios.

- `functions/api/sarin.js` delega en `server/sarin/handler.js`: DeepSeek, conocimiento comercial, cuotas e historial D1. El contrato web exige Origin y cookie; el adaptador WhatsApp necesita una entrada independiente.
- `scripts/modules/sarin-summary.js` sólo prepara un enlace `wa.me` con resumen editable; hoy no recibe mensajes ni responde por API.
- Staff permite revisar y bloquear conversaciones, pero aún no tiene transferencia a humano ni recepción en vivo de eventos WhatsApp.
- `server/sarin/history.js` y la migración de historial fijan el consentimiento a `checkbox_and_start`. WhatsApp necesita un método propio. Nombre, apellido y correo son obligatorios en el recorrido web actual.

## Conexión del número existente

Meta documenta **Coexistencia** para usar la app móvil y Cloud API con el mismo número. El flujo documentado se ofrece mediante un socio de soluciones o proveedor tecnológico. La elegibilidad del número de ALS todavía no está comprobada. La documentación advierte cambios en funciones de la app y revinculación de dispositivos; hay que revisar ese resumen antes de conectar. [Meta: coexistencia](https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/onboarding-business-app-users).

## Comparación

Precios base publicados en USD; mensajería, consumo de nuestra IA e impuestos aplicables se calculan aparte. Comparación documental, sin prueba con cuenta real.

| Proveedor | Plan pertinente y precio base | Encaje para ALS |
| --- | --- | --- |
| YCloud | Free, US$0 de suscripción, 1 usuario y 2 canales | Primera opción para un piloto. API y webhooks publicados en todos los planes. |
| 360dialog | API Regular, US$59 por número/mes | Alternativa centrada en API propia, coexistencia y soporte. |
| Respond.io | Advanced, US$349/mes; US$279/mes equivalente con pago anual de US$3.348 | Incluye una plataforma de atención más amplia. Su integración mediante webhooks requiere Advanced. |

Fuentes de precios: [YCloud](https://www.ycloud.com/pricing), [360dialog](https://360dialog.com/whatsapp-api), [Respond.io](https://respond.io/pricing). Respond.io se comprobó también con el selector Monthly y 1.000 contactos; [webhooks disponibles desde Advanced](https://respond.io/help/integrations/webhooks).

YCloud publica coexistencia junto con Free y acceso para bots externos. Su contrato de eventos incluye `whatsapp.inbound_message.received`, `whatsapp.message.updated` y `whatsapp.smb.message.echoes`, este último para mensajes enviados desde la app móvil. Falta validar esos eventos en la cuenta Free concreta y el alta del número. No se necesita añadir n8n al proyecto para aprovechar las APIs. [Guía del proveedor](https://www.ycloud.com/blog/integrate-ycloud-with-n8n), [eventos](https://nndocs.ycloud.com/reference/webhook-events-payloads#whatsappsmbmessageechoes).

YCloud publica seis meses de almacenamiento de chats para Free, distintos de los 30 días de ALS. Su FAQ señala posibles cargos de asistencia adicional después de 30 días y excluye impuestos. Verificar estos términos y las opciones de conservación antes de activar tráfico real. [Condiciones del plan](https://www.ycloud.com/pricing).

360dialog permite el alta de coexistencia a clientes directos y documenta ecos de mensajes de la app. Hay una discrepancia sobre un recargo del 4%: una página lo limita a recargas y otra lo aplica a licencias. US$59 es el precio base, no una cotización final. [Alta](https://docs.360dialog.com/docs/hub/embedded-signup/coexistence-onboarding), [ecos](https://docs.360dialog.com/partner/onboarding/whatsapp-coexistence/coexistence-webhooks), [facturas](https://docs.360dialog.com/docs/hub/invoices), [pagos](https://docs.360dialog.com/docs/get-started/payments).

Respond.io documenta coexistencia y muestra los mensajes del celular como ecos, pero indica que éstos no disparan automatizaciones. No se confirmó su entrega a un webhook externo para pausar Sarin. [Coexistencia](https://respond.io/help/whatsapp/whatsapp-coexistence).

## Costo vigente de WhatsApp

La documentación técnica de Meta, actualizada el 30 de septiembre, confirma reglas vigentes desde el **1 de octubre de 2026**: 1.000 mensajes de servicio entregados gratuitos por número cada mes; después se cobra según el mercado del destinatario. Las respuestas libres de una IA externa como Sarin dentro de la ventana de 24 horas pertenecen a servicio. Los mensajes entrantes del cliente no se cobran. Fuera de esa ventana se necesitan plantillas autorizadas; las de utilidad también se cobran dentro de la ventana. La franquicia cuenta mensajes entregados, incluidos avisos de inicio y otras respuestas de servicio por API; no cuenta chats ni sólo respuestas de DeepSeek. Algunas páginas comerciales conservan textos anteriores sobre gratuidad ilimitada y no deben usarse para presupuestar. [Meta: precios vigentes](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing).

Para un piloto de hasta 1.000 respuestas de servicio al mes, sin plantillas cobradas, YCloud publica US$0 de suscripción y la tarifa Meta de servicio puede quedar dentro de la franquicia. Esto no elimina el consumo de DeepSeek/Cloudflare ni posibles cargos de asistencia. No se ha configurado ninguna alerta, saldo o recarga automática del proveedor. No se confirmó en la tabla oficial una tarifa concreta para Colombia; no se convierte a COP ni se presupone el país de todos los destinatarios.

## Primer alcance propuesto

1. Compartir conocimiento, reglas y ejecución comercial de Sarin entre web y WhatsApp; sesiones e identidades separadas por canal.
2. Empezar con texto. Audios, archivos y solicitudes de atención personal pasan a humano.
3. Incorporar aviso y aceptación propios antes de enviar texto a DeepSeek. Resolver los datos de contacto del canal sin inventar un correo ni fingir una casilla web.
4. Recibir eventos autenticados, deduplicar y procesar en segundo plano. Registrar estado de envío y errores; limitar reintentos de entrega sin repetir inferencia ni reenviar ciegamente una salida cuyo envío sea incierto.
5. Añadir pausa por conversación y reactivación explícita. Comprobarla antes de generar y antes de enviar; usar los ecos del celular como señal adicional. Un evento tardío no permite retirar una respuesta ya aceptada por la API.
6. Mostrar canal y estado en Staff. Compartir contexto completo web/WhatsApp exigiría vincular identidades de forma verificable; una referencia pegada no basta.
7. Probar con datos sintéticos: recepción repetida, firma inválida, mezcla de contactos, intervención humana, caída de proveedor, envío incierto y vencimiento de ventana. Luego piloto autorizado con el titular y verificación móvil/web antes de publicar.

La vinculación posterior fue completada por el titular. El siguiente paso técnico es la recepción durable de un piloto limitado antes de conectar inferencia o envíos. No se requiere contratar un plan pagado ni importar historial previo para este hito.

## Primer tramo técnico verificado

Se añadieron `server/sarin/whatsapp/ycloud-webhook.js` y `ycloud-client.js`, sin dependencias. El receptor valida firma HMAC sobre bytes originales y normaliza entrada, eco humano y estado; el cliente envía texto o consulta un ID por API fija, con envío desactivado por defecto. No hay ruta pública, persistencia, inferencia ni configuración de producción nueva.

- Pruebas nuevas: `node --test .github/cloudflare/sarin-ycloud-client.test.mjs .github/cloudflare/sarin-ycloud-webhook.test.mjs`, **147/147** aprobadas (67 cliente y 80 receptor). RED observado antes de implementación; todos los transportes de prueba son sintéticos.
- Regresión: `node --test .github/cloudflare/sarin.test.mjs .github/cloudflare/sarin-integration.test.mjs .github/cloudflare/sarin-sessions.test.mjs .github/cloudflare/sarin-quota.test.mjs .github/cloudflare/sarin-history.test.mjs .github/cloudflare/sarin-retention.test.mjs .github/cloudflare/build.test.mjs`, **206/206** aprobadas.
- TSC `--allowJs --checkJs --noEmit --strict --target es2022 --module esnext --moduleResolution bundler --lib es2022,dom` sobre ambos módulos: sin errores. Se usó el compilador ya instalado; no se modificó el repositorio del SaaS.
- `node .github/cloudflare/build.mjs`: **222 recursos públicos**, 5.404.825 bytes, revisión local `9a64e9085d02a8d3`. Los módulos del servidor no se copian al artefacto público; este build no se publicó.
- Revisión independiente cerró un P2: el receptor rechazaba una correlación con Unicode/espacios internos que el emisor admitía. La regresión envía una referencia sintética y la recupera de un webhook firmado. Sin P1/P2 abiertos en el alcance interno.

Antes de exponer una ruta falta un plazo propio para la lectura del cuerpo: hoy el receptor sólo termina por fin del stream, exceso de 64 KiB o cancelación del llamador. También faltan inbox/outbox persistentes, deduplicación, ACK, procesamiento comercial, consentimiento, pausa humana, Staff y prueba del número real. [Diseño](superpowers/specs/2026-10-17-sarin-ycloud-design.md), [plan y estado](superpowers/plans/2026-10-17-sarin-ycloud.md).

## Estado del alta

Se abrió el registro oficial y se dejó al titular crear la contraseña, revisar términos y verificar correo. Informó que otro correo tampoco permitía continuar. La inspección mostró el campo hCaptcha vacío con «Required», sin un error visible en el correo; una recarga no recuperó el CAPTCHA. No se pudo determinar la causa de la carga fallida. Se propuso completar el registro en otro navegador o en el celular y avisar al llegar al panel. No hay cuenta, plan, elegibilidad ni claves comprobados. La captura parcial local `test-results/ycloud-captcha-pendiente.png` está excluida de Git.

Actualización posterior: hCaptcha cargó y el titular avanzó al paso 2/5, «Verifica tu dirección de correo electrónico». La página solicita un código de seis dígitos; verificación y acceso al panel pendientes. El agente no resolvió el desafío ni envió el formulario. Captura local excluida de Git: `test-results/ycloud-verificacion-correo.png`.

El titular completó la verificación y pidió continuar con los datos. Se guardaron ALS DevStudio, `https://www.alsdevstudio.com`, Colombia, actividad Software, cargo Fundador/Director Ejecutivo y rango 1–10. Casos de uso: integración API, captación de clientes y atención al cliente. Al terminar, el panel confirmó empresa ALS DevStudio y **Free Plan**; no se introdujeron datos de pago ni se seleccionó un plan de pago. Evidencia local excluida de Git: `test-results/ycloud-als-free-confirmado.png`.

El titular autorizó expresamente aceptar el aviso de Coexistencia que advierte restricciones/desconexiones de Meta e impacto posible en la app móvil. Aviso aceptado; conexión aún no autorizada en Meta ni número vinculado. La pantalla «Connect WhatsApp Business App» mantiene «I'm ready to start» desactivado con Loading incluso tras recargar y abrir una pestaña nueva. Los recursos del SDK de Meta aparecen en el árbol del navegador, pero no se confirmó la causa del bloqueo. Se cerró la pestaña duplicada y se conserva la original para retomar. No se solicitaron claves ni se importó historial. Evidencia local: `test-results/ycloud-coexistencia-cargando.png`.

Actualización de conexión: el titular resolvió el alta de Meta y el panel muestra `Connected`, Free, calidad `Unknown`, límite visible de 250 clientes y verificación empresarial requerida. Confirmó usar el número terminado en 8047, distinto del número anteriormente encontrado en la web. No se cambia el contacto público por esta confirmación. Captura local: `test-results/ycloud-numero-conectado.png`.

Se inspeccionó Developers sin revelar claves. Hay una clave por defecto y cero endpoints. El formulario permite `whatsapp.inbound_message.received`, `whatsapp.message.updated` y `whatsapp.smb.message.echoes`; se cerró sin guardar. Esto acredita disponibilidad del selector, no recepción efectiva. Se desconoce si el titular compartió historial al completar Meta; el receptor propuesto excluye historia anterior al piloto.

Continuación local: [diseño de recepción durable](superpowers/specs/2026-10-17-sarin-whatsapp-ingress-design.md) y [plan](superpowers/plans/2026-10-17-sarin-whatsapp-ingress.md). Ruta apagada por defecto, migración sólo local y sin credenciales remotas. Las pruebas anteriores son la evidencia histórica del transporte, no del hito nuevo.
