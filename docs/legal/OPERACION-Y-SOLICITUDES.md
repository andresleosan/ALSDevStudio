# Gestión de privacidad y reclamaciones

Vigencia de los textos públicos: 13 de octubre de 2026. Responsable operativo: Andrés Leonardo Santiago González. Esta guía prepara la gestión manual comprometida en las políticas. No acredita que ya se hayan atendido casos ni ejecutado borrados. No crea automatizaciones ni envía mensajes.

## Primer contacto y autorización

La web informa la finalidad junto al enlace de WhatsApp y enlaza la política. Elegir un servicio o abrir un enlace no envía el mensaje ni acredita consentimiento. El correo permanece como enlace nativo. No hay formulario, CRM ni registro automático de autorizaciones.

Antes de pedir información adicional o usarla para una finalidad que requiera autorización, enviar el aviso y obtener una respuesta informada. Aplicar también a contactos directos que no visitaron el sitio. Conservar el mensaje exacto, la respuesta, fecha y versión de la política en el canal privado; no registrar una aceptación inexistente ni deducirla del silencio. Una finalidad publicitaria requeriría evaluación y autorización separadas.

Modelo para adaptar a la finalidad real:

> Soy Andrés Leonardo Santiago González, responsable de ALS DevStudio. Usaré tus datos de contacto y la información que compartas para atender esta consulta y preparar la propuesta que solicitas. Puedes conocer, actualizar, rectificar tus datos y solicitar revocación o eliminación cuando proceda escribiendo a alsdevstudio@alsdevstudio.com. La identificación, proveedores, conservación y procedimiento completo están en https://www.alsdevstudio.com/privacidad.html (versión del 13 de octubre de 2026). ¿Autorizas ese tratamiento para esta consulta y propuesta? No envíes contraseñas ni datos sensibles.

No tratar la consulta como consentimiento para todas las actividades de un proyecto. Antes de recibir datos de usuarios del cliente, acordar roles, instrucciones, seguridad, proveedores y devolución/eliminación; revisión profesional si corresponde. Si se niega autorización, no continuar con tratamientos que dependan de ella; informar los datos imprescindibles para el servicio y las obligaciones legales independientes. Mantener disponible el canal de derechos.

## Recepción y seguimiento manual

Revisar correo y WhatsApp con frecuencia suficiente para cumplir los plazos. Registrar cada solicitud de privacidad o reclamación con una referencia única, fecha/hora de recepción, canal, identidad mínima, tipo, petición, vencimiento, estado, actuaciones y respuesta. Guardar todo fuera del repositorio y del alojamiento público, con acceso restringido al responsable.

Plantilla vacía de referencia: `ALS-AAAA-MM-DD-NNN`. Aumentar el consecutivo para evitar duplicados; no incluir cédula, teléfono ni nombre en el identificador.

> He recibido tu solicitud el [fecha y hora, zona horaria]. Su referencia es [referencia]. Se trata de [consulta/reclamo de datos/reclamación de servicio]. Puedes pedir seguimiento por este mismo canal indicando la referencia. La fecha máxima de respuesta que corresponde es [fecha calculada según el régimen aplicable].

Verificar identidad proporcionalmente antes de entregar datos; pedir poderes o acreditación solo cuando sean necesarios. No exigir sistemáticamente copias completas de identificación. No enviar datos del solicitante a terceros al confirmar recepción. Para reclamos sobre datos, registrar «reclamo en trámite» y su motivo en el conjunto pertinente dentro de dos días hábiles desde el reclamo completo y mantener la anotación hasta resolverlo.

| Tipo | Plazo colombiano que debe calcularse para cada caso |
| --- | --- |
| Consulta de datos | Diez días hábiles desde recepción; extensión justificada de hasta cinco, avisada antes del vencimiento |
| Reclamo de datos | Quince días hábiles desde el día siguiente a recepción; extensión justificada de hasta ocho, avisada antes del vencimiento |
| Reclamo de datos incompleto | El responsable solicita subsanación dentro de los cinco días siguientes a recepción; desistimiento tras dos meses desde el requerimiento sin completar lo solicitado |
| Falta de competencia sobre reclamo de datos | Traslado a quien corresponda dentro de dos días hábiles e información al solicitante |
| Reclamo directo de consumidor, art. 58 | Respuesta dentro de quince días hábiles desde recepción, con las pruebas que la sustenten |
| Retracto procedente en contratación electrónica | Cinco días hábiles para ejercerlo desde contrato de servicios; reembolso máximo quince días calendario cuando se cumplan los presupuestos del art. 47. No confundir con el plazo para contestar un reclamo |

Registrar festivos y el punto inicial aplicable; no usar un único contador de quince días para todos los casos. Al cerrar, conservar solo la prueba necesaria de recepción, atención y obligaciones. La publicación del texto no implementa por sí sola esta gestión.

## Conservación adoptada por el titular

- Una vez al mes, revisar consultas de WhatsApp y Gmail que no se convirtieron en contrato. Eliminar en esa revisión las que lleven seis meses sin actividad, incluidos adjuntos y copias bajo control del responsable que ya no sean necesarios. El plazo de seis meses fue elegido por el titular; no se presenta como una obligación legal universal.
- En proyectos, pagos, autorizaciones y reclamaciones, revisar al cerrar el asunto qué documentos deben conservarse y por qué. Registrar el fundamento, período aplicable y próxima revisión, con apoyo contable/jurídico para las obligaciones fiscales y contractuales. No borrar soportes necesarios aplicando el plazo de consultas.
- Registrar fecha de revisión, categorías revisadas, número de eliminaciones y excepciones justificadas, sin duplicar innecesariamente el contenido eliminado. No archivar un chat como sustituto del borrado.
- Revisar papelera, adjuntos descargados, dispositivos vinculados y copias. Confirmar los ciclos de Gmail y WhatsApp antes de afirmar eliminación definitiva; no se promete borrar las copias del interlocutor o registros propios del proveedor. Si una copia se restaura, reaplicar las decisiones de eliminación que correspondan.

El registro mensual y los casos reales deben permanecer **fuera del proyecto, Git y Vercel**. Esta guía no solicita exportar conversaciones al repositorio.

## Configuración que falta verificar

Porkbun reenvía el correo a Gmail; el titular confirmó acceso exclusivo. Esto no demuestra MFA, ausencia de sesiones ajenas, ajustes de respaldo ni acuerdos de tratamiento.

Revisar Vercel (miembros, Analytics, Speed Insights, integraciones, log drains, registros y retención); Porkbun (destino y acceso al reenvío); Gmail (sesiones, delegaciones, reglas, copias y seguridad); WhatsApp (dispositivos vinculados, copias y acceso). Registrar solo conclusiones y fechas, nunca claves, tokens, conversaciones o capturas con datos de clientes en el repositorio. Evaluar contratos/DPA, subencargados, países y mecanismos de transmisión/transferencia con asesoría según cada caso.

## Antes de contratar un servicio

Dejar alcance, precio/cargos, hitos, plazo, pago, revisiones, aceptación, soporte, propiedad intelectual y terminación por escrito. Si se empieza dentro del período de retracto aplicable, documentar el acuerdo de inicio; no insertar renuncias generales ni asumir que el software a medida está automáticamente exceptuado. Una cancelación no justifica retener todo el dinero por defecto. No usar el antiguo deseo de «sin reembolsos» como prohibición absoluta.

Mantener evidencia de licencias y permiso de portafolio según el inventario. Revisar consumo y privacidad internacional cuando la actividad se dirija a un mercado concreto.

Fuentes oficiales: [Ley 1581, arts. 8 y 12–17](https://www.cancilleria.gov.co/normograma/compilacion/docs/ley_1581_2012.htm), [Decreto 1074, capítulo 25](https://cancilleria.gov.co/sites/default/files/Normograma/docs/decreto_1074_2015_pr025.htm), [Ley 1480 consolidada, arts. 47, 50 y 58](https://normograma.dian.gov.co/dian/compilacion/docs/ley_1480_2011.htm). Revisión profesional pendiente de contratos, conservación por categoría y operaciones internacionales; esta guía no certifica cumplimiento.
