# Sarin: revisión de datos y términos

**Borrador interno · 16 de octubre de 2026 · No publicar como política vigente.** Alcance: historial privado solicitado por el titular y textos que deben acompañarlo. No acredita cumplimiento, contratos aceptados, configuración de cuentas ni funciones aún no implementadas.

## Decisión del titular y alcance

- Andrés confirmó conservar conversaciones completas durante **30 días**. Se propone contarlos desde el primer mensaje aceptado de cada conversación, sin renovar el plazo por actividad posterior.
- Guardar mensajes del visitante, respuestas efectivamente emitidas por el servidor y estados de atención/error; no guardar razonamiento interno, respuestas descartadas ni cuerpos de errores del proveedor.
- Finalidades: atender la solicitud comercial y detectar/investigar abuso del chat. Acceso humano exclusivo de Andrés Leonardo Santiago González mediante administración privada; proveedores técnicos intervienen para prestar el servicio.
- No reutilizar el historial para publicidad, crear perfiles comerciales permanentes ni entrenar modelos propios. La aceptación del chat no autoriza analítica ni marketing.
- El plazo de 30 días fue elegido por el titular; los demás criterios concretan la propuesta de operación y están sujetos a su revisión. **No son plazos impuestos universalmente por la ley**. Una conservación excepcional necesita motivo concreto, fundamento aplicable, acceso restringido y vencimiento; no habilita archivar todos los chats indefinidamente.

## Auditoría de la versión local revisada

| Archivo | Hallazgo | Cambio necesario antes de activar el historial |
| --- | --- | --- |
| `terminos.html` | Regula contratación, portafolio, uso, reclamaciones y derechos imperativos; no contiene condiciones específicas de Sarin. | Añadir la sección propuesta abajo y enlaces al aviso y política; mantener contratación y derechos del consumidor existentes. |
| `privacidad.html#sarin` | Afirma memoria exclusiva de la pestaña, ausencia de texto en D1 y borrado local al recargar; esto dejará de describir el servidor. | Distinguir memoria local e historial privado, autorización, finalidad, acceso, conservación, proveedores y borrado. |
| `privacidad.html` | “No mantiene una base de consultas separada” será incorrecto para Sarin. Los seis meses de consultas de WhatsApp/correo son otra categoría. | Reconocer la base de conversaciones; mantener separados los plazos por canal y la atención de derechos. |
| `cookies.html` | “Únicamente en memoria” y “sin el texto de los mensajes” se volverán inexactos. | Describir historial servidor y documentar cualquier cookie de sesión/seguridad que realmente se implemente. |
| `index.html#sarin-notice` | Informa transmisión a DeepSeek y memoria temporal; no ofrece autorización afirmativa previa para historial/revisión humana. | Mostrar aviso y elección explícita antes del primer envío, incluidos botones rápidos; enlazar términos y privacidad. |
| `docs/legal/OPERACION-Y-SOLICITUDES.md` | Dice “No hay formulario, CRM ni registro automático de autorizaciones” y mantiene verificaciones centradas en Vercel. | Actualizar la guía para chat, consentimiento, Cloudflare/D1, retención y restauración; conservar el procedimiento de derechos ya descrito. |

El procedimiento existente contempla consultas, reclamos, subsanación, anotación de reclamo y verificación proporcional de identidad. No requiere sustituirse por un proceso nuevo; debe extenderse a la localización y supresión de conversaciones de Sarin. Los textos públicos y sus fechas deben cambiar juntos cuando la función esté verificada.

## Obligaciones aplicables y verificación pendiente

- **Obligación:** autorización previa e informada, prueba consultable, finalidades determinadas, seguridad/confidencialidad y ejercicio de derechos; no deducir consentimiento del silencio o de navegar. La política debe identificar al responsable y canales. [F1, arts. 4, 8–9, 12 y 17; F2, arts. 2.2.2.25.2.2–5 y 2.2.2.25.3.1].
- **Obligación:** limitar datos y duración a lo necesario; obtener nueva autorización si cambia la finalidad. Datos sensibles y de menores requieren protección especial. [F2, arts. 2.2.2.25.2.1–3 y 2.2.2.25.2.8–9].
- **Obligación:** evaluar necesidad, proporcionalidad, riesgos y medidas demostrables en IA; documentar un estudio de impacto cuando sea probable alto riesgo. La integración tecnológica exige evaluar y documentar su tratamiento antes de implementarla. [F4, instrucciones I–IV y VII–X; F5, instrucciones 1–3].
- **Pendiente:** clasificar el rol real de DeepSeek y Cloudflare por cada tratamiento. Una transmisión a encargado por cuenta de ALS y una transferencia a otro responsable tienen reglas diferentes; ni la ubicación ni una casilla genérica resuelven por sí solas la operación internacional. [F3, arts. 2.2.2.25.5.1–2; F6].
- **Pendiente:** verificar contratos/DPA aplicables a la cuenta API, finalidades propias, países/subencargados, seguridad, conservación y mecanismo internacional. Cloudflare publica un DPA e incorpora su aplicación en los términos Self-Serve con el alcance allí descrito; falta documentar su aceptación y alcance para esta cuenta y este tratamiento colombiano. No se localizó un DPA público específico de DeepSeek Open Platform en las fuentes oficiales consultadas; esto no demuestra que no exista. [F7, §§3.2–3.4 y 5.5; F9, §§2–4; F14, §6.1].
- **Hecho verificado:** DeepSeek documenta caché de contexto en disco activada por defecto y limpieza habitual tras horas o días de inactividad; esto no acredita un plazo máximo ni todas las copias. No afirmar retención cero, borrado inmediato o ausencia de entrenamiento del proveedor. [F8].
- **Obligación de información comercial:** avisar que es IA no elimina responsabilidad legal; conservar información veraz y no introducir renuncias generales ni cláusulas abusivas. [F11, arts. 23, 29–30 y 42–43].
- **RNBD:** por la forma declarada de persona natural, el registro generalmente no corresponde; si cambia a sociedad/ESAL con activos superiores a 100.000 UVT o entidad pública, revisar inscripción. Esto no elimina las otras obligaciones. [F3, art. 2.2.2.26.1.2].

## Verificación complementaria de proveedores · 16 de octubre de 2026

Esta revisión de fuentes públicas complementa el diagnóstico inicial y los borradores siguientes; no acredita contratos particulares, configuración de cuentas, cumplimiento ni activación del servicio.

- **DeepSeek y reutilización:** los términos de Open Platform incorporan también los términos generales. Estos incluyen en §4.3 un permiso condicionado de uso de inputs y outputs para mantener, desarrollar o mejorar el servicio y su tecnología, tras cifrado y desidentificación. El mecanismo de exclusión descrito es el ajuste «Improve the model for everyone»; no se verificó que ese ajuste controle las peticiones API. No afirmar que DeepSeek no entrena con esos datos, ni deducir que cada mensaje se utiliza efectivamente para entrenar. [F7, introducción; F12, §§1.1 y 4.3].
- **Alcance de la privacidad general de DeepSeek:** la política de febrero de 2026 excluye expresamente los datos de usuarios finales de aplicaciones basadas en Open Platform; los términos API contienen la misma distinción en §5.5. Por ello, sus menciones generales a China, retención y entrenamiento no bastan para certificar las condiciones efectivas de los mensajes de Sarin. Hay que obtener las reglas aplicables a esta cuenta API. La caché de contexto sí está documentada específicamente para la API, sin plazo máximo confirmado para todas las copias. [F7, §5.5; F8; F13, introducción].
- **Cloudflare y alcance contractual:** el DPA v6.4 declara a Cloudflare encargado/subencargado y limita el tratamiento a instrucciones y prestación del servicio. La cláusula Self-Serve que lo incorpora menciona datos sujetos a UE/Reino Unido/CCPA, mientras el DPA define las leyes aplicables de forma más amplia. Debe documentarse el alcance para la cuenta colombiana; la existencia de esta verificación pendiente no implica por sí sola que haya que negociar un contrato nuevo. Las SCC y otros mecanismos citados para jurisdicciones concretas tampoco acreditan automáticamente el mecanismo colombiano. [F9, introducción y §§1–3 y 6; F14, §6.1].
- **Ubicación y subencargados de Cloudflare:** D1 permite fijar una jurisdicción al crear la base; una preferencia de ubicación no la garantiza. La restricción de jurisdicción de la base no limita por sí sola toda ejecución de Workers, conexión o soporte. La lista pública de subencargados identifica servicios y países posibles; no demuestra que todos reciban cada conversación de Sarin. [F16; F17].
- **Logs propios de Access:** distinguirlos de la auditoría de Sarin almacenada en D1 durante 30 días. La documentación Zero Trust consultada indica 24 horas para autenticaciones Access en Free, 30 días en los planes Standard/Access y 180 días en Enterprise; los registros administrativos de Zero Trust tienen 18 meses. No son un historial de mensajes del chat ni quedan borrados por la purga de D1. Verificar el plan y las integraciones efectivas antes de atribuir esos plazos a la cuenta; no activar exportaciones o copias adicionales sin necesidad y conservación definidas. [F15].

El mecanismo colombiano debe seguir la operación real: transmisión a encargado con contrato conforme al Decreto 1074, o transferencia bajo las condiciones y excepciones del artículo 26 de la Ley 1581, según corresponda. Un DPA no es la única vía jurídica posible para toda operación; una autorización genérica tampoco determina el rol ni acredita por sí sola esa vía. La preparación de infraestructura vacía y con chat apagado no resuelve estas verificaciones para tratar conversaciones de visitantes. [F1, art. 26; F3, arts. 2.2.2.25.5.1–2].

### Consulta preparada para DeepSeek · no enviada

Destinatario público indicado en los términos API: `api-service@deepseek.com`. El siguiente texto puede copiarse para solicitar aclaración. No contiene claves, identificadores de cuenta ni conversaciones. Una respuesta informativa debe contrastarse con los términos que efectivamente integren el acuerdo.

**Asunto:** Open Platform API data-processing terms for a Colombia-based website

> Hello,
>
> We are preparing a commercial website assistant using the direct DeepSeek Open Platform API with the `deepseek-flash` model. The application will serve adult visitors in Colombia. Before enabling it for visitors, please provide the current terms that govern processing of end-user prompts, conversation context and outputs sent through this API, and clarify:
>
> 1. Which legal entity provides this API service, and does it process end-user content solely on the developer's documented instructions, or also for its own purposes? Please identify any distinct purposes and applicable contractual clauses.
> 2. Is an API-specific data processing agreement available? Please provide the agreement, how to enter into it, and its scope for a developer established in Colombia.
> 3. In which countries are API content, logs, caches and backups processed or stored? Which subprocessors may access them, for what activities, and where is the current list available?
> 4. What retention periods or maximum periods apply separately to prompts, outputs, abuse/security logs, disk context caches and backups? What exceptions can extend them? Is context caching optional for this API?
> 5. Are API inputs or outputs used for model training, evaluation, research or service improvement? Do Terms of Use section 4.3 and the "Improve the model for everyone" setting apply to API traffic? If an API opt-out is available, how is it enabled, confirmed and maintained, and what processing remains after opting out?
> 6. How can the developer request access, rectification or deletion on behalf of an end user? Please explain how to locate the relevant API records without submitting unnecessary personal data, completion times, deletion from caches/backups, and any records that cannot be deleted with their reason and retention period.
> 7. Please provide the contractual security, confidentiality, incident-notification and international-processing commitments applicable to this API, together with their version and effective date.
>
> Our application plans to retain its own conversation history for 30 days. This is our application-level period; we are not assuming that it limits your retention. Please distinguish API conditions from those of the DeepSeek consumer chat product. This enquiry includes no API keys, account identifiers or end-user content.
>
> Thank you.

## Texto propuesto: términos específicos de Sarin

Sarin es el asistente automatizado de ALS DevStudio para orientar a personas adultas sobre páginas web, tiendas virtuales, aplicaciones a medida, soluciones web y chatbots, mostrar ejemplos y preparar una consulta para Andrés. Puede cometer errores; solicita revisión humana cuando una respuesta sea dudosa. No realiza compras, cobra pagos ni formaliza por sí mismo una contratación. Andrés define y confirma por escrito el alcance, precio y calendario del proyecto; se respetan los efectos que la ley atribuya a la información y publicidad.

Usa el chat para consultas relacionadas con estos servicios. No envíes spam, solicitudes automatizadas masivas, código destinado a atacar el servicio, contraseñas, datos sensibles, documentos de identidad ni datos de menores. No compartas datos de terceros sin autorización. No intentes eludir límites o acceder a información ajena. ALS puede limitar temporalmente solicitudes para proteger el servicio y revisar indicios de abuso; una señal técnica no demuestra por sí sola una conducta ilícita. Puedes contactar con Andrés para solicitar revisión.

Para usar Sarin debes autorizar previamente el tratamiento descrito en la Política de tratamiento. ALS conservará la conversación para atención y detección de abuso durante el período allí informado; Andrés podrá revisarla desde un panel privado. La autorización del chat es independiente de las preferencias de analítica. Si no deseas utilizarlo, puedes contactar directamente por correo o WhatsApp; esos canales tienen su propio tratamiento de datos.

El resumen es un borrador editable. Abrir WhatsApp transmite al servicio externo la solicitud de conexión y el texto incluido en el enlace; podrás revisarlo y decidir si lo envías. Cerrar el panel permite retomar la vista. Recargar o pulsar «Nueva conversación» limpia la memoria local correspondiente, pero no solicita por sí solo borrar el historial del servidor. Ninguna condición excluye responsabilidades legales ni limita derechos de privacidad o consumo. Consultas: alsdevstudio@alsdevstudio.com y +57 314 643 2135.

## Texto propuesto: privacidad del historial

**Nota editorial interna:** publicar esta sección solo después de verificar autorización, historial, contratos internacionales y mecanismos de caducidad, purga y recuperación descritos; adaptar cualquier afirmación que no corresponda a la implementación final.

Responsable: Andrés Leonardo Santiago González, persona natural que utiliza el nombre ALS DevStudio, Medellín, Colombia. Los datos completos y los canales del responsable constan al inicio de esta política. Sarin está dirigido a adultos; no pide fecha de nacimiento, documentos, datos sensibles ni información de menores.

Con tu autorización, conservaremos los mensajes que envíes, las respuestas emitidas por Sarin, la fecha, el identificador de conversación y estados técnicos necesarios para atender tu solicitud y detectar o investigar abuso. Solo Andrés consultará el historial mediante acceso administrativo privado. No usamos este historial para publicidad ni para entrenar modelos propios. Esto no acredita las prácticas de entrenamiento o conservación de los proveedores.

DeepSeek recibe el mensaje y el contexto reciente necesario para responder mediante su API. Cloudflare presta alojamiento, ejecución y almacenamiento. Su intervención puede implicar tratamiento fuera de Colombia. DeepSeek documenta caché de contexto en disco; no prometemos retención cero ni eliminación inmediata en sus sistemas.

El historial y la evidencia de autorización —fecha y versión aceptada— se conservarán 30 días desde el primer mensaje aceptado de cada conversación. Los mensajes posteriores no amplían el plazo. Al vencer, dejará de estar disponible para consultas. La eliminación de la base activa se programa cada hora, con el objetivo de completarla en la siguiente ejecución; las fallas o retrasos se supervisan y corrigen, y pueden demorar el borrado físico. Estos plazos son criterios operativos de ALS; cualquier excepción legal o contractual concreta se evaluará e informará cuando corresponda.

Si autorizas el chat pero no llegas a enviar un primer mensaje admitido, el registro técnico de esa sesión vacía vence a las 24 horas. Los eventos de rechazo sin conversación se agregan sin guardar el cuerpo de la solicitud y vencen a las 48 horas. La sesión técnica usa una cookie de seguridad de hasta 24 horas; su alcance y finalidad se explicarán en la política de almacenamiento junto con la implementación verificada.

El registro de acceso y acciones del administrador no contendrá el texto del chat y se conservará 30 días desde cada evento. Los contadores contra abuso basados en IP transformada con secreto y fecha caducan lógicamente a las 48 horas; los contadores globales de consumo, a los 35 días. La limpieza física de estas cuotas se ejecuta con peticiones posteriores y puede demorarse si no hay tráfico. Son conjuntos separados del historial y no se presenta su seudonimización como anonimato absoluto.

Borrar datos de la base activa no elimina inmediatamente todas las copias de recuperación. D1 dispone de Time Travel con ventanas documentadas de 7 días en el plan gratuito y 30 días en el plan de pago; falta confirmar el plan y la base de producción. Los respaldos adicionales, si se crean, necesitan plazo, acceso y borrado propios. La restauración de esta primera versión se hace con chat y panel apagados y elimina todo el historial restaurado, sesiones y autorizaciones antes de reabrir, incluido lo que aún no hubiera vencido; no recupera conversaciones antiguas de forma selectiva. La retención de proveedores externos puede diferir. [F10].

Los mensajes y el resumen también existen temporalmente en la pestaña; no se guardan como contenido en localStorage o sessionStorage. Cerrar el panel permite retomarlos; recargar o iniciar otra conversación elimina esa memoria local sin borrar el servidor. El resumen editado no se transmite automáticamente a WhatsApp; los cambios que hagas solo en el resumen no pasan a formar parte del historial del servidor salvo que los envíes como mensaje.

Puedes conocer, actualizar y rectificar tus datos, solicitar prueba de autorización e información de uso, acceder gratuitamente y solicitar revocación o supresión cuando proceda. Escribe a alsdevstudio@alsdevstudio.com o +57 314 643 2135 e indica la referencia de conversación si dispones de ella; no necesitas enviar una cédula preventivamente. Se aplican el procedimiento y los plazos de la sección «Tus derechos». La solicitud de eliminación debe atenderse también respecto de las copias bajo control de ALS y coordinarse con proveedores cuando sea necesario.

## Aviso y autorización antes del primer envío

> Sarin es un asistente automatizado para adultos. Andrés Leonardo Santiago González, responsable de ALS DevStudio, guardará los mensajes y respuestas durante 30 días desde el primer mensaje para atender tu solicitud y revisar posibles abusos desde un panel privado. DeepSeek procesará el mensaje y contexto para responder, y Cloudflare alojará el servicio; puede existir tratamiento fuera de Colombia. No compartas contraseñas, documentos, datos sensibles ni datos de menores. Puedes ejercer tus derechos en alsdevstudio@alsdevstudio.com o +57 314 643 2135. Consulta la Política de tratamiento y los Términos de Sarin para conocer conservación, proveedores y procedimiento completo.

- Casilla inicialmente desmarcada: **«Autorizo el tratamiento de datos descrito para usar Sarin y conservar esta conversación durante 30 días, y acepto los Términos de Sarin».** Enlazar documentos completos y versión; guardar la manifestación afirmativa, fecha y versión con la conversación.
- Acción: **«Autorizar e iniciar»**. Hasta entonces, ni el formulario ni los botones de servicios deben enviar mensajes o llamar a DeepSeek; validar también en el servidor la autorización vigente.
- Alternativa: **«Prefiero contacto directo»**, con correo y WhatsApp disponibles sin aceptar el chat. Informar el tratamiento propio de esos canales antes de recabar datos que requieran autorización.
- Rechazar no activa publicidad, no impide leer el portafolio y no impide ejercer derechos. Retirar analítica no elimina el historial; borrar la pestaña tampoco equivale a revocar autorización en el servidor.

## Operación que debe acompañar los textos

1. Antes de producción: verificar aviso, contrato internacional y proveedor; acceso administrativo exclusivo con autenticación fuerte, rechazo de accesos ajenos y auditoría sin contenido; no permitir enlaces públicos de conversaciones ni exportaciones automáticas.
2. Probar que el historial reproduce mensajes y respuestas emitidas, no un historial manipulable reenviado por el navegador; errores deben guardar estados acotados, sin claves ni cuerpos internos de proveedores. Mantener conversaciones y datos reales fuera de Git, capturas y logs públicos.
3. Probar caducidad en todas las consultas, purga horaria con supervisión de fallos, borrado a solicitud y restauración con descarte completo del historial restaurado antes de reabrir; no anunciar garantías no verificadas. Conservar evidencia de pruebas usando datos ficticios. Sesiones sin primer mensaje vencen a las 24 horas; eventos de rechazo sin conversación se agregan, no guardan el cuerpo y vencen a las 48 horas.
4. Ante datos sensibles o de menores recibidos incidentalmente: restringir acceso, evitar reenvío o reutilización y tramitar revisión/supresión prioritaria según el caso. No continuar pidiendo detalles; valorar obligaciones concretas. La advertencia inicial no otorga inmunidad.
5. Ampliar `OPERACION-Y-SOLICITUDES.md`: localización por referencia, acreditación proporcional, bloqueo/revisión de abuso, atención de derechos, eliminación y recuperación. Mantener los plazos existentes: consultas 10 + hasta 5 días hábiles; reclamos 15 + hasta 8 con comunicación motivada, y anotación del reclamo completo dentro de 2 días hábiles. [F1, arts. 14–17].

## Fuentes primarias revisadas

- **F1.** [Ley 1581 de 2012, arts. 4, 6–9, 12, 14–17 y 26](https://cancilleria.gov.co/sites/default/files/Normograma/docs/ley_1581_2012.htm).
- **F2.** [Decreto 1074 de 2015, capítulo 25: autorización, retención y políticas](https://cancilleria.gov.co/sites/default/files/Normograma/docs/decreto_1074_2015_pr025.htm).
- **F3.** [Decreto 1074: arts. 2.2.2.25.5.1–2, responsabilidad demostrada y RNBD](https://cancilleria.gov.co/sites/default/files/Normograma/docs/decreto_1074_2015_pr026.htm).
- **F4.** [SIC, Circular Externa 002 de 2024: datos personales en IA](https://www.cancilleria.gov.co/normograma/compilacion/docs/circular_superindustria_0002_2024.htm).
- **F5.** [SIC, Circular Externa 002 del 7 de octubre de 2025: transferencia de tecnología](https://www.cancilleria.gov.co/normograma/compilacion/docs/circular_superindustria_0002_2025.htm).
- **F6.** [SIC, resumen oficial del concepto 25-632634, publicado el 25 de febrero de 2026](https://sedeelectronica.sic.gov.co/publicaciones/boletin-juridico/concepto/alcance-de-la-circular-002-de-2025-sobre-transferencias-internacionales-de-datos); el resumen no reemplaza la revisión del contrato concreto.
- **F7.** [DeepSeek Open Platform Terms of Service, vigentes desde el 29 de abril de 2026](https://cdn.deepseek.com/policies/en-US/deepseek-open-platform-terms-of-service.html).
- **F8.** [DeepSeek API: Context Caching](https://api-docs.deepseek.com/guides/kv_cache/).
- **F9.** [Cloudflare Data Processing Addendum, v6.4, vigente desde el 3 de abril de 2026](https://www.cloudflare.com/cloudflare-customer-dpa/).
- **F10.** [Cloudflare D1: Time Travel and backups](https://developers.cloudflare.com/d1/reference/time-travel/), especialmente notas de plan gratuito/pago; no confirma la configuración de esta cuenta.
- **F11.** [Ley 1480 de 2011, arts. 23, 29–30 y 42–43](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=44306).
- **F12.** [DeepSeek Terms of Use, actualizados el 27 de marzo de 2026](https://cdn.deepseek.com/policies/en-US/deepseek-terms-of-use.html), especialmente §§1.1 y 4.3; consultados el 16 de octubre de 2026.
- **F13.** [DeepSeek Privacy Policy, actualizada el 10 de febrero de 2026](https://cdn.deepseek.com/policies/en-US/deepseek-privacy-policy.html), introducción y exclusión de usuarios finales de aplicaciones Open Platform; consultada el 16 de octubre de 2026.
- **F14.** [Cloudflare Self-Serve Subscription Agreement, actualizado el 12 de septiembre de 2025](https://www.cloudflare.com/terms/), §6.1; consultado el 16 de octubre de 2026.
- **F15.** [Cloudflare One: Zero Trust logs, actualizado el 15 de octubre de 2026](https://developers.cloudflare.com/cloudflare-one/insights/logs/), tabla de conservación por servicio y plan; consultado el 16 de octubre de 2026.
- **F16.** [Cloudflare Sub-Processors for Cloudflare services, lista fechada el 1 de octubre de 2025](https://www.cloudflare.com/gdpr/subprocessors/cloudflare-services/); consultada el 16 de octubre de 2026.
- **F17.** [Cloudflare D1: Data location](https://developers.cloudflare.com/d1/configuration/data-location/), jurisdicción, preferencias y sus límites; consultado el 16 de octubre de 2026.

Las fuentes F7–F10 se volvieron a consultar el 16 de octubre de 2026. Sus publicaciones no acreditan las condiciones particulares ni el plan de una cuenta.

Revisión profesional pendiente para cerrar contratos internacionales, excepciones de conservación y obligaciones concretas del responsable. Este archivo propone cambios y verificaciones; no modifica los HTML ni demuestra que el historial esté habilitado.
