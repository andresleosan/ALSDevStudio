# Diseño de Sarin como asistente comercial de la web

Fecha: 16 de octubre de 2026. Diseño detallado para revisión; no describe una integración ya implementada.

Base comercial acordada: [Sarin como asistente comercial](../../SARIN-ASISTENTE-COMERCIAL.md).

## Resultado esperado

Un visitante de ALS DevStudio puede hablar con Sarin sobre su negocio, entender qué solución le conviene, explorar ejemplos reales y continuar con Andrés por WhatsApp con un resumen revisable. La cotización final corresponde a Andrés. El visitante puede pedir contacto en cualquier momento.

Restricciones confirmadas: DeepSeek como único proveedor de IA; sin IA local, registro obligatorio ni frameworks de frontend. Mantener identidad, rendimiento, accesibilidad y funcionamiento básico sin JavaScript de la web. Trabajar exclusivamente en `main`.

Esta primera entrega se prepara y verifica en local. La activación en producción se realiza después de revisar el resultado y configurar los secretos y controles de consumo. Las pruebas automáticas emplean dobles del proveedor y no consumen la API real.

## Ruta elegida

| Ruta | Evaluación |
| --- | --- |
| Pages Function en `/api/sarin` | Elegida: conserva el mismo origen y el despliegue actual de Pages, con una función pequeña para el chat. |
| Worker independiente | Viable si otros sitios necesitan el mismo servicio; para esta versión añade una unidad de despliegue y configuración. |
| Incrustar la aplicación de Sarin Bot | Su flujo actual exige autenticación y está orientado a citas; reutilizar sus patrones de DeepSeek, validación y contacto es más adecuado que trasladar la aplicación. |

Cloudflare admite funciones con rutas por archivos y permite restringir sus invocaciones con `_routes.json`. El build actual necesita permitir explícitamente este archivo y los nuevos módulos públicos, preservando la exclusión del servidor. [Functions](https://developers.cloudflare.com/pages/functions/), [rutas](https://developers.cloudflare.com/pages/functions/routing/).

## Experiencia del visitante

1. Lanzador discreto con la ilustración existente de Sarin y texto «Hablar con Sarin». No abre el chat automáticamente ni hace llamadas a DeepSeek al cargar la página.
2. Panel mediante `<dialog>` con título «Sarin · Asistente de ALS DevStudio», botón de cerrar y acceso visible a contacto humano. En móvil ocupa el espacio disponible y respeta las áreas seguras y el teclado virtual.
3. Presentación breve de su función y cuatro accesos de conversación: «Página web», «Tienda virtual», «Aplicación a medida» y «Chatbot». El visitante también puede escribir libremente sobre su necesidad.
4. Sarin pregunta un dato por turno, recomienda una solución proporcional y puede mostrar hasta dos ejemplos relevantes del portafolio.
5. Botón «Preparar resumen» abre un borrador editable con lo compartido: negocio, necesidad, funciones prioritarias, plazo y presupuesto opcional. La solución sugerida queda identificada como recomendación, no como requisito ya confirmado.
6. «Continuar por WhatsApp» prepara un enlace al número público existente `573146432135`. El visitante decide enviar el mensaje desde WhatsApp. No se envían mensajes ni notificaciones automáticamente.

El acceso humano funciona aunque el visitante escriba poco, DeepSeek falle o se agote la cuota. Un resumen breve o vacío puede completarse manualmente sin pasar por la IA. Máximo del resumen: 1800 caracteres, con contador y posibilidad de corregirlo; no se trunca silenciosamente.

El cierre conserva la conversación únicamente en memoria de la pestaña; «Nueva conversación» y la recarga la borran del navegador. No se escriben mensajes en `localStorage`, `sessionStorage`, cookies, D1 ni eventos de analítica.

## Accesibilidad y rendimiento

- Etiquetas visibles para mensaje y resumen; controles de al menos 44 × 44 px.
- Foco inicial en el panel, navegación contenida por el diálogo, cierre con Escape y devolución al lanzador. El aviso de analítica tiene prioridad para evitar dos diálogos abiertos simultáneamente.
- Historial con `role="log"` y anuncios de respuestas completas. Estado de espera y errores comprensibles, sin anunciar carácter por carácter.
- Enter envía; Shift+Enter crea una línea. Ignorar Enter durante composición de texto (`isComposing`). Evitar envíos dobles mientras hay una petición pendiente.
- Una petición por vez, cancelación al reiniciar la conversación y descarte de respuestas antiguas. Cerrar el panel no borra el trabajo del visitante.
- Respetar `prefers-reduced-motion`; no añadir animación continua. Inicializar el módulo de forma aislada y cargar los recursos de conversación al abrirlo.
- Sin JavaScript se conserva el contacto existente y se ofrece un enlace de respaldo en `<noscript>`.

## Componentes y límites

| Responsabilidad | Archivos previstos |
| --- | --- |
| Marcado, estilos e inicialización | `index.html`, `styles/main.css`, `scripts/main.js`, `scripts/modules/sarin-chat.js` |
| Validación del resumen y enlace de contacto | `scripts/modules/sarin-summary.js` |
| Transporte y validación de respuestas para la interfaz | `scripts/modules/sarin-api.js` |
| Ruta HTTP y cabeceras propias | `functions/api/sarin.js` |
| Catálogo aprobado y ejemplos | `server/sarin/knowledge.js` |
| Contratos, alcance y validación de salidas | `server/sarin/policy.js` |
| Cliente HTTP exclusivo de DeepSeek | `server/sarin/deepseek.js` |
| Reservas de consumo y límites concurrentes | `server/sarin/quota.js`, `migrations/sarin/0001_usage.sql` |
| Configuración y empaquetado | `wrangler.jsonc`, `_routes.json`, `.github/cloudflare/build.mjs` y sus pruebas |
| Pruebas del chat | `.github/cloudflare/sarin.test.mjs`, `.github/cloudflare/sarin-ui.test.mjs` |

Los módulos del servidor y las migraciones no entran en `dist` ni son rutas públicas. La función importa esos módulos desde fuera de `functions`, evitando que los auxiliares generen endpoints accidentales. No se añaden SDK de IA ni dependencias a la página; usar `fetch` del runtime.

El archivo `_routes.json` incluye únicamente `/api/sarin` y `/api/sarin/`. Los recursos estáticos conservan su entrega habitual. Las respuestas de la función deben incluir sus propias cabeceras de seguridad y `Cache-Control: no-store`; no dependen de `_headers`. [Cabeceras de Pages](https://developers.cloudflare.com/pages/configuration/headers/).

## Contrato del endpoint

`POST /api/sarin`, cuerpo JSON de hasta 16 KiB. Campos cerrados: `message` (1–1200 caracteres) e `history` (hasta ocho mensajes anteriores, con roles `user` o `assistant`, máximo 1200 caracteres por entrada). Rechazar campos adicionales, roles `system`/`tool`, mensajes vacíos y tipos incorrectos antes de llamar al proveedor.

El historial aportado por el navegador es contexto no confiable. Nunca concede permisos ni prueba que una acción o precio se haya confirmado. La función compone sus instrucciones y el catálogo desde el servidor.

Respuesta JSON validada con `reply` (texto plano de 1–1200 caracteres), `service` (identificador conocido u omitido), `examples` (hasta dos identificadores del catálogo) y `brief` (campos opcionales extraídos del mensaje del visitante). El servidor resuelve títulos y URLs desde su catálogo. La interfaz nunca interpreta HTML, Markdown arbitrario, enlaces ni instrucciones devueltos por el modelo.

Los campos de `brief` son un borrador; se muestran para corregirlos antes de pasarlos a WhatsApp. No se rellenan con datos de ejemplo, fechas supuestas, precios estimados ni información de otros visitantes.

Errores públicos: `400` petición inválida, `403` origen rechazado, `405` método no permitido, `413` cuerpo excesivo, `429` límite alcanzado, `503` chat desactivado o configuración incompleta, `502` proveedor/salida inválida y `504` espera agotada. Mensajes de error breves, con contacto disponible y sin detalles internos.

## DeepSeek y alcance comercial

Destino fijo `https://api.deepseek.com/chat/completions`, modelo `deepseek-flash`, modo de razonamiento desactivado y salida JSON. Sin herramientas, navegación web, ejecución de código ni otros proveedores. El cliente no puede elegir modelo, destino o instrucciones del sistema.

La primera versión recibe respuestas completas, sin streaming. Timeout de diez segundos para clasificación, veinte para generación y treinta y cinco para la petición de la interfaz. Si el visitante cancela, se intenta abortar el transporte; eso no acredita que el proveedor haya detenido la facturación.

Dos llamadas como máximo por turno: clasificación temática y, solo si corresponde, respuesta comercial. Cada llamada se reserva antes de salir a DeepSeek. La clasificación admite necesidades del negocio, preguntas sobre los servicios, seguimiento contextual y datos aportados para el resumen; no exige que el visitante use vocabulario técnico.

Contrato cerrado del clasificador: `{ "inScope": boolean }`, sin otros campos. Salida inválida, error o timeout impiden la segunda llamada y ofrecen contacto. Para conservar seguimientos como «sí» o un presupuesto aislado, incluir el mensaje actual y los pares más recientes completos del historial. Al superar 8 KiB, retirar pares antiguos hasta cumplir el límite; conservar siempre el mensaje actual y al menos el último par. Si el mínimo no cabe, devolver `400` con una indicación de acortar la consulta, sin llamadas de pago. Aplicar la misma selección por pares a la generación con su límite de 32 KiB. Esta ventana de contexto se documenta en el aviso del chat; no se recortan mensajes individuales silenciosamente.

Fuera de alcance: respuesta breve que reconduce a los servicios de ALS DevStudio. Dentro de alcance: usar únicamente los hechos y ejemplos aprobados. El modelo no publica precios ni plazos de ejecución, ni promete resultados medidos. Las características que falten se llevan como preguntas para Andrés.

Validar todas las salidas y descartar identificadores ajenos al catálogo. Renderizar con `textContent`; crear los enlaces permitidos mediante el DOM. El objetivo es contener la conversación al negocio y comprobarlo con casos adversariales; no presentar el prompt como una garantía infalible.

Ejemplos obligatorios: landing pages de Sarin/SemanControl y webs de servicios como BPT-Jersey; tiendas Mundo Celular/Coctels OPS; aplicaciones La Parada/SemanControl; asistente de citas Sarin Bot. Dialon y Vigia conservan sus límites de prototipo/demo. Las capturas automáticas no modifican estos hechos ni las instrucciones del bot.

## Control de consumo

IA desactivada por defecto mediante `SARIN_ENABLED`. Requiere clave privada, secreto de pseudonimización, D1 y precios/límites configurados. Si falta algo o no se puede verificar una cuota, no realizar una llamada de pago.

Valores iniciales propuestos y configurables: diez turnos HTTP por minuto y cincuenta por día por IP pseudonimizada, máximo quince turnos por conversación en la interfaz, tope de USD 1 diario y USD 10 mensual en el contador global del servidor. Las dos llamadas de un turno consumen un único turno de frecuencia, pero cada una reserva su propio costo. La cuota cuenta peticiones válidas que llegan al clasificador, incluidas consultas fuera de alcance. El límite de la interfaz es de experiencia, no una protección frente a solicitudes externas. Las ventanas del servidor usan UTC.

D1 realiza reservas atómicas que cubren todas las cuotas aplicables antes de cada llamada. No usar memoria del isolate ni almacenamiento del navegador como límite global. Las pruebas concurrentes deben demostrar que dos peticiones no pueden gastar la misma cuota disponible.

Limitar el payload serializado de clasificación a 8 KiB y 128 tokens de salida, y el de respuesta a 32 KiB y 512 tokens de salida. Reservar de forma conservadora con los precios de entrada/salida configurados; liquidar con el uso real verificado en respuestas válidas. Un timeout o respuesta incierta conserva la reserva. No hay reintentos automáticos ni cambio de proveedor.

Contabilidad en enteros de microdólares (1 USD = 1.000.000 unidades). Con `B` bytes UTF-8 del cuerpo JSON completo que se enviará, reservar `Tentrada = 2 × B + 1024` tokens y el máximo de salida de esa llamada. Precios iniciales por millón de tokens: `Pentrada = 300000` y `Psalida = 1200000` microdólares. Reserva: `ceil((Tentrada × Pentrada + Tsalida × Psalida) / 1000000)`. Presupuesto diario: `1000000`; mensual: `10000000` unidades. Es una cota operacional conservadora que debe contrastarse con el uso reportado en la prueba acotada de activación, no una garantía sobre cambios de facturación del proveedor.

La liquidación de una respuesta válida solo devuelve la diferencia entre la reserva y el uso real verificado, una vez y de forma atómica. Rechazar uso ausente, negativo, no entero o incoherente, manteniendo la reserva. Si excede los límites reservados, bloquear llamadas posteriores hasta revisar tarifas/cálculo. Una petición cancelada o de resultado incierto nunca libera la reserva por su cuenta. Los registros de reserva tienen un identificador único para impedir liquidaciones duplicadas.

Los topes son controles de la aplicación, no una afirmación sobre límites configurados en la cuenta de DeepSeek. Verificar la tarifa antes de activar y volver a verificarla si cambia el modelo. [Precios del proveedor](https://api-docs.deepseek.com/quick_start/pricing/).

Referencia consultada para presupuestar: tarifa punta sin caché de `deepseek-flash`, USD 0,30 por millón de tokens de entrada y USD 1,20 por millón de salida. El alcance inicial usa los niveles gratuitos existentes de Pages y una D1 pequeña; no se contrata un plan de pago para esta preparación local.

## Datos y avisos

Antes del primer envío, explicar en el panel que Sarin usa DeepSeek, que el texto se transmite para responder y que no se deben compartir contraseñas ni datos sensibles; enlace a privacidad y opción de contacto directo. Abrir el panel no envía conversaciones al proveedor.

Los mensajes se conservan solo en memoria del navegador y durante la petición del servidor. D1 guarda contadores, importes reservados e identificadores técnicos; no guarda conversaciones ni resúmenes. Pseudonimizar la IP mediante HMAC con secreto y fecha, sin guardar la IP en bruto. Los registros por IP caducan lógicamente a las 48 horas y los contadores globales a los 35 días. La purga se realiza de forma acotada durante peticiones posteriores; si cesa el tráfico pueden permanecer almacenados hasta la próxima purga. El aviso explica esta diferencia y no promete eliminación física en el instante del vencimiento.

No registrar cuerpos ni contenido de los mensajes en consola o analítica. No prometer eliminación en DeepSeek ni ausencia de registros de los proveedores sin verificar sus condiciones. Actualizar privacidad y cookies para reflejar los campos, el tratamiento y los proveedores reales; revisar términos si contienen afirmaciones incompatibles.

## Desarrollo sin clave y operación

La interfaz local permite abrir/cerrar, navegar servicios, escribir y corregir el resumen y preparar WhatsApp. Al intentar una conversación sin conexión configurada, informa que el asistente todavía no está conectado y ofrece contacto. No simula una respuesta de IA al visitante; los dobles del proveedor se usan solo en pruebas.

La configuración local usa un archivo de secretos ignorado por Git. No pedir claves por el chat ni incluirlas en HTML, JS público, logs o commits. Previews desactivadas salvo habilitación expresa y separadas de producción. El empaquetado de Functions utiliza una salida separada de `dist` para no dejar artefactos que el build seguro rechace después.

## Criterios de aceptación

- Interfaz usable con teclado y lector de pantalla; Escape, foco, anuncios, cinco anchos de 320 a 1440 px, movimiento reducido y contacto sin JS.
- Conversaciones sobre páginas web, tiendas, aplicaciones y chatbots recomiendan ejemplos correctos sin inventar funciones o precios. Fuera de alcance e intentos de cambiar instrucciones se reconducen.
- API rechaza cuerpos/roles/orígenes inválidos antes de cualquier llamada de pago; no interpreta enlaces ni HTML del modelo.
- Límites persistentes bajo concurrencia, errores de D1, cancelación, timeout, saldo insuficiente y respuesta mal formada conservan un comportamiento seguro y contacto disponible.
- Resumen editable formado solo con lo compartido, presupuesto opcional y envío manual mediante WhatsApp.
- Pruebas del build, galería, mapa, analítica y cabeceras conservadas. No incluir servidor, migraciones o secretos entre los archivos públicos.
- Primera entrega revisable localmente sin API real. La comprobación de respuestas reales se realiza cuando se configure DeepSeek, con una muestra acotada y el contador de consumo activo.

## Próxima fase

Convertir este diseño en un plan de implementación con tareas, interfaces y pruebas concretas. Con el diseño y el plan revisados, construir la versión local y presentar evidencia antes de activar el servicio público.
