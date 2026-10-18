# Nombre, teléfono y significado de Sarin

Solicitud del titular del 18 de octubre de 2026: pedir nombre y apellido al iniciar la atención, mostrar el número completo en el panel y distinguir un chatbot como el asistente actual del producto Sarin Bot SaaS.

## Comportamiento

Después de aceptar el aviso, la confirmación invita a escribir `NOMBRE: Ana Pérez`. Es opcional: una consulta normal continúa directamente a la IA. Sólo ese prefijo registra el dato; no se adivina una identidad a partir de una consulta ni de una nota de voz. Se conserva el nombre completo con Unicode y nombres compuestos, sin separar apellidos por posición. La respuesta de captura es fija y no consume DeepSeek. Ese intercambio se excluye del contexto comercial posterior.

La ficha y la lista privadas muestran el nombre vigente y el teléfono completo. Pausar o reactivar conserva ese nombre mientras su mensaje fuente siga vigente, sin reproducir mensajes ni ampliar su plazo. Sin nombre muestran el teléfono; al vencer su fuente, vuelven al identificador enmascarado. La caducidad también se aplica en el navegador aunque falle el sondeo. El cierre de sesión borra la información visible y descarta respuestas tardías. Los enlaces usan la huella opaca del contacto; las alertas a Andrés siguen mostrando sólo los últimos dígitos.

«Quiero un chatbot como este / como Sarin» se interpreta como chatbot personalizado, también si atenderá citas. Sarin Bot SaaS se identifica expresamente como el producto de citas y agenda. El prompt conserva esta distinción y un resguardo acotado corrige una derivación evidente al producto. No se promete un clasificador infalible de cualquier frase.

## Datos y migración 0008

`sarin_wa_profiles` añade un perfil opcional por contacto: nombre, contexto, mensaje fuente y vencimiento. No duplica el teléfono. Caduca con el mensaje fuente a las 24 horas, sin ampliarse con consultas posteriores. Cada nombre ocupa como máximo 640 bytes y la tabla admite hasta 1.000 perfiles / 640.000 bytes. El perfil no es una agenda permanente ni un alta de marketing.

El guardado y la confirmación comparten transacción, permisos, aceptación vigente y reserva normal de envío. Una pausa, aceptación vencida o falta de cupo no permite un guardado parcial. Repetir el mismo evento no genera otro envío. Las referencias y triggers eliminan el perfil al borrar su mensaje o contexto, incluso en una restauración con claves foráneas desactivadas. Los datos vencidos no aparecen en la API aunque el cron aún no los haya eliminado físicamente.

La copia privada anterior a 0008 tiene **167.924 bytes**, SHA-256 `d20904c5a3b3b818322f0c2db4c192178330a37d2e5c1b4fa321cfd18c317b69`. Su restauración y promoción local de esquema 7 a 8 conserva conteos y hashes de las **32 tablas existentes**, con integridad correcta y cero fallos de claves foráneas. La tabla nueva queda vacía; no se importan nombres de conversaciones anteriores. Evidencia: `test-results/sarin-whatsapp-profile-20261018/backup-promotion.json`.

## Publicación y reversión

Publicar retención compatible con esquemas 7 y 8 antes de aplicar la migración aditiva; después publicar consumidor y Pages que consultan perfiles. Conservar aceptación v3, cuotas y estados de pausa. No reproducir trabajos anteriores ni reintentar envíos inciertos. La autorización de publicación ya está dada en esta sesión.

Para revertir un problema, cerrar los envíos si hace falta y corregir hacia adelante con detector y retención compatibles con 0008. No borrar la tabla productiva ni restaurar un backup para deshacer esta ampliación; ello perdería eventos posteriores. Un rollback de código sólo es admisible si conserva la compatibilidad del esquema y los controles vigentes de consentimiento, audio y botones.

## Validación previa

- Regresión de WhatsApp, YCloud, intención comercial, retención y backups: **792/792**. Después del último ajuste de lectura al pausar/reactivar: **17/17** pruebas de perfiles y checkJs aprobados.
- Build: **21/21** pruebas. Artefacto estático: 223 archivos, 5.458.001 bytes, revisión `c28478f8b55a6148`.
- Runtime local real workerd + D1 + Queue: captura del nombre, confirmación, deduplicación, historial sin nombre para IA, audio, menú numérico, aviso humano y mantenimiento aprobados. Corridas de retención y recuperación con proveedores completamente simulados; no envían mensajes reales. Manifiesto de fuentes `4b549a4fdbe1cd5cd21c5619f93626c5944a6c477a8e2c6e22eabdf3a0bb3ae0`.
- Navegador CUA: nombre HTML como texto, caducidad sin sondeo, número completo, reflujo a 320 px, teclado y limpieza al cerrar sesión aprobados. Capturas y reporte en `test-results/sarin-whatsapp-profile-20261018`.
- Ejecutor anterior probado sobre esquema 8 aditivo: aviso, aceptación, consulta y listado siguen funcionando. La migración no exige cortar recepción ni girar el estado de activación.

Estado del despliegue: pendiente de registrar los identificadores y la comprobación remota.
