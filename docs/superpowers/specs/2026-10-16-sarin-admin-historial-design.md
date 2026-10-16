# Sarin: historial administrativo y protección de datos

Fecha: 16 de octubre de 2026. Estado: propuesta concreta para revisión; no implementada ni publicada. Complementa la versión local `8c9d926` y sustituirá su regla de no persistir conversaciones únicamente cuando se active el nuevo flujo con autorización previa.

## Objetivo y decisiones del titular

El titular solicita ver cada conversación y su historial en un panel privado para revisar el uso del chat y detectar abuso. Confirmó conservar el historial completo **30 días**, con borrado automático. No pidió perfiles de visitantes, publicidad, entrenamiento de modelos ni volver al panel anterior de Firebase.

La entrega debe permitir revisar mensajes y respuestas cronológicamente, entender límites y fallos, marcar una conversación como revisada y bloquear temporalmente una sesión. Las señales técnicas indican posibles abusos; no acreditan identidad, intención ilícita ni que una persona sea abusiva.

## Punto de partida comprobado

- La web usa HTML/CSS/JavaScript nativos, Pages Functions y DeepSeek `deepseek-flash`, sin IA local.
- D1 guarda cuotas y reservas, nunca transcripciones. No existe historial anterior recuperable.
- El panel administrativo anterior fue retirado. `/admin`, `/admin/` y `/admin.html` redirigen permanentemente a la portada.
- El aviso del chat y las políticas describen memoria de pestaña y ausencia de mensajes en D1. Los términos todavía no tienen una sección específica del asistente.
- La propiedad `history` enviada por el navegador no es prueba de una conversación auténtica. La ampliación debe registrar intercambios que recibió y emitió el servidor.

## Rutas consideradas y decisión propuesta

| Ruta | Evaluación |
| --- | --- |
| Nuevo panel en el Pages existente, Cloudflare Access y D1 | Recomendada: menor cambio operativo y reutiliza el alojamiento actual. |
| Panel independiente en otro subdominio y Worker | Útil si administración crece a clientes, facturación y proyectos; añade otro despliegue y dominio ahora. |
| Autenticación propia o restaurar Firebase | Añade mantenimiento y recuperación de acceso innecesarios para un único administrador. |

Ruta propuesta: `/control-sarin/` y API `/api/control-sarin/*`. Conservar las redirecciones históricas de `/admin`. El nombre de la ruta no es una medida de autorización. Ningún dato real se incorpora al HTML, JavaScript público, Git o informes de pruebas.

## Acceso administrativo

Cloudflare Access protege interfaz y API con una lista explícita del propietario. Pages Functions valida además el JWT: firma, emisor, audiencia, vigencia y autorización del administrador. Usar el middleware oficial de Access para Pages y comprobar sus garantías en la implementación; no escribir una verificación criptográfica casera.

La configuración debe exigir una identidad de administrador y un acceso fuerte. Preferir un proveedor de identidad con MFA; si se configura acceso por código al correo, documentar su alcance y comprobar la protección del buzón. No afirmar que MFA está activada sin verificarlo. No hay usuarios administrativos públicos, registro abierto ni clave compartida incrustada en el navegador.

Si falta configuración o no se puede verificar la identidad, denegar. Cubrir el dominio propio, `pages.dev` y despliegues inmutables: una ruta alternativa no puede saltarse la validación del servidor. No añadir un interruptor de acceso libre para producción. Las pruebas locales usan identidades y claves sintéticas.

## Lo que verá el titular

1. Lista paginada de conversaciones recientes: referencia, comienzo, última actividad, servicio, turnos, estado y consumo calculado. Filtros por fecha, servicio y estado; sin buscar información personal fuera del chat.
2. Detalle cronológico completo de mensajes aceptados y respuestas emitidas por el servidor, más eventos de límite, consulta fuera de alcance, cancelación o fallo. Una respuesta emitida no prueba que el visitante la haya leído.
3. Señales concretas: frecuencia elevada, límites alcanzados, múltiples consultas fuera de alcance y errores de validación. No clasificar una pregunta aislada fuera de tema como abuso demostrado.
4. Acciones: marcar revisión, bloquear/desbloquear la sesión por un máximo inicial de 24 horas y eliminar una conversación con confirmación. No bloquear permanentemente a una persona por una IP compartida.
5. Vista de consumo que separa uso verificado y reservas retenidas por incertidumbre. No presentar el contador como factura del proveedor.

Renderizar mensajes como texto, incluso si contienen HTML, enlaces o instrucciones para el operador. No ejecutar contenido aportado por visitantes. No incorporar exportaciones masivas ni reenvíos automáticos de transcripciones en esta entrega.

## Autorización antes del primer mensaje

Antes de enviar texto a DeepSeek o guardarlo, mostrar un aviso breve con finalidad, lectura por el titular, plazo de 30 días, proveedores, tratamiento internacional y enlaces a privacidad/términos. Casilla sin marcar y acción explícita de autorizar e iniciar; la analítica conserva su elección independiente. Ni abrir el chat ni empezar a escribir equivale a aceptar.

Sin autorización válida no se inicia la conversación ni se llama al modelo. WhatsApp y correo siguen disponibles, bajo el tratamiento propio de esos canales. La autorización no incluye publicidad ni entrenamiento de modelos por ALS. No prometer condiciones de retención o entrenamiento de DeepSeek que no estén verificadas.

El servidor registra versión y hash del texto informado, versiones de privacidad y términos, momento de aceptación y método de manifestación. Una casilla enviada por el cliente es una manifestación registrada, no una identificación civil verificada. Mantener la evidencia asociada durante el tratamiento y atender cualquier deber de conservación concreto que corresponda, sin retener por defecto el texto completo indefinidamente.

## Sesiones e historial fiable

El servidor crea una sesión anónima con secreto aleatorio y guarda únicamente su hash. El navegador lo presenta en cookie técnica `HttpOnly`, `Secure` y `SameSite`, sin acceso desde JavaScript ni valor en la URL. La cookie y sus condiciones deben constar en la política de almacenamiento. La sesión operativa vence a las 24 horas; no se usa como identificador persistente entre visitas. Si nunca se acepta un primer mensaje, eliminar la sesión vacía y su registro de aceptación a las 24 horas mediante la misma purga horaria.

Guardar solo el mensaje nuevo realmente recibido y la respuesta validada o error público que emitió el servidor. Cargar desde D1 los últimos cuatro pares para el contexto de DeepSeek. Retirar `history` del contrato público como fuente del historial. Número de turno, propiedad de la sesión e idempotencia se controlan en servidor; solicitudes simultáneas no pueden duplicar turnos ni modificar registros anteriores.

Mantener quince turnos por conversación también en servidor, una petición activa por sesión y las cuotas existentes de 10/minuto y 50/día por IP pseudonimizada, además de presupuestos diarios/mensuales. Limitar creación de sesiones a cinco/minuto y veinte/día por el mismo pseudónimo técnico. No copiar la IP cruda o su pseudónimo de 48 horas al historial de 30 días.

No registrar cuerpos completos de peticiones malformadas, sin autorización, demasiado grandes o rechazadas antes de admisión. Para ellas, solo eventos técnicos acotados y códigos cerrados. Los rechazos sin conversación se agregan por minuto y motivo, sin IP cruda, con vencimiento a las 48 horas y máximo de 10000 registros activos; al alcanzar ese tope, sumar en contadores globales existentes sin crear filas. Por conversación, máximo 32 eventos técnicos: los posteriores incrementan contadores cerrados y vencen con el chat. Las consultas admitidas que resulten fuera de tema sí forman parte de la transcripción autorizada.

Si no puede persistirse un mensaje admitido, no llamar a DeepSeek: ofrecer contacto humano. Si falla una generación, conservar el mensaje admitido y el estado de fallo, sin guardar una salida inválida del proveedor como respuesta de Sarin. La cancelación no prueba ausencia de procesamiento o facturación del proveedor.

El botón «Nueva conversación» inicia otra sesión y limpia la vista; no borra el historial conservado por ALS. La recarga tampoco equivale a supresión en el servidor. Explicar ambas cosas en la interfaz y permitir localizar el chat para una solicitud de derechos con una referencia y verificación proporcional; un identificador público por sí solo no permite descargar datos.

## Datos, capacidad y seguridad

Usar tablas separadas para conversaciones, mensajes, prueba de autorización, eventos y auditoría administrativa, con índices por fecha de vencimiento y relaciones de borrado. Mantener las tablas de cuotas existentes separadas de las transcripciones. Aplicar migración nueva, sin recrear ni borrar la base previa.

Datos mínimos: referencia aleatoria, secuencia, rol, contenido, fechas, estado, servicio sugerido y metadatos técnicos necesarios. No pedir nombre, correo, teléfono, documento ni fecha de nacimiento para usar el chat; si el visitante los incluye, forman parte del tratamiento y requieren gestión proporcional.

Topes iniciales propuestos: 2000 conversaciones activas y 64 MiB de texto UTF-8 agregado, además del límite por turno. Antes de la inferencia, reservar de forma atómica espacio para la entrada y la respuesta máxima; liquidar o liberar capacidad exactamente una vez. La purga, eliminación y finalización de peticiones pendientes deben coordinarse: una respuesta tardía no recrea una conversación borrada ni vuelve a consumir/liberar capacidad. Al agotarse el tope, ofrecer contacto sin inferencia ni almacenamiento ilimitado. Limitar también eventos de errores y sesiones vacías para impedir abuso de la base. Estos topes son de aplicación, no una garantía sobre cuota o factura de Cloudflare.

D1 ofrece cifrado de infraestructura en reposo y tránsito, sin ser cifrado de extremo a extremo. La primera entrega se apoya en ese cifrado, permisos mínimos y protección del panel; no añade un sistema propio de claves y búsquedas cifradas. No registrar contenido en consola, trazas, analítica, Git, capturas con datos reales ni herramientas de IA adicionales.

Todas las respuestas privadas usan `Cache-Control: no-store`, cabeceras restrictivas y ausencia de indexación. Las operaciones de modificación exigen autorización, origen exacto, formato no simple, protección CSRF y confirmación cuando corresponda; nunca se borra mediante GET. La auditoría guarda actor, acción, referencia, resultado y fecha, sin duplicar mensajes o secretos.

## Retención y borrado

La conversación completa vence a los **30 días desde el primer mensaje aceptado**. Las consultas del panel excluyen inmediatamente lo vencido. Un Worker programado cada hora elimina transcripciones y registros asociados en lotes acotados e indexados; objetivo operativo: eliminación de la base activa en la siguiente limpieza, hasta una hora después del vencimiento si el servicio funciona. Registrar solo resultado, cantidad y fecha de la limpieza, y detectar ejecuciones fallidas.

Conservar auditoría administrativa sin contenido durante 30 días. Mantener cuotas por IP durante 48 horas y registros globales de consumo durante 35 días según el contrato existente. Una reclamación u obligación concreta puede justificar conservar evidencia estrictamente necesaria; debe documentarse caso, fundamento y revisión, sin una excepción general indefinida.

El plazo del historial activo no promete borrado inmediato de copias de recuperación. D1 Time Travel tiene ventanas distintas según plan. Antes de publicar, verificar el plan y describir el efecto real de sus copias. El procedimiento de restauración de esta primera versión exige apagar chat y panel, restaurar y eliminar todas las transcripciones, sesiones y pruebas de autorización restauradas antes de reabrir; las cuotas técnicas se revisan por separado. Se pierde también el historial restaurado que aún no hubiera vencido. Este criterio evita recuperar conversaciones previamente suprimidas sin añadir un registro externo de borrados. No se admite restaurar una copia con el servicio abierto ni recuperar su historial de forma selectiva en esta entrega. No se atribuye a ALS el control de los registros internos de DeepSeek o Cloudflare.

El procedimiento debe esperar a que terminen o se cancelen las peticiones activas, eliminar también los eventos vinculados y reconciliar contadores/reservas de capacidad. Restaurar una cuota monetaria antigua no acredita saldo disponible: mantener la IA desactivada hasta conciliar el período con evidencia o hasta vencer los períodos presupuestarios afectados; no reiniciar un presupuesto vigente por recuperar la base.

## Cambios de textos y activación

Aplicar de forma conjunta el nuevo flujo y las modificaciones de `index.html`, `privacidad.html`, `cookies.html`, `terminos.html` y la guía de atención. Retirar las afirmaciones de memoria exclusiva, ausencia de base de consultas y recarga como equivalente a eliminación. No cambiar todavía esos HTML para describir una función que aún no existe.

Mantener historial y administración desactivados por defecto hasta configurar autenticación, base, purga y avisos. Los borradores de cláusulas y la revisión de fuentes se encuentran en [revisión de datos y términos](../../legal/SARIN-REVISION-DATOS-Y-TERMINOS.md).

Antes de utilizarlo con visitantes: verificar contratos y roles de los proveedores, tratamiento internacional, retención/uso de datos de la API DeepSeek y mecanismos de atención de derechos. La publicación de una política o una casilla no sustituye esas comprobaciones. No se crea ni contrata un servicio remoto durante la fase de diseño.

## Verificación exigida para la implementación

- Denegar acceso administrativo ausente, inválido, vencido o de otro usuario; cubrir rutas alternativas y pruebas de CSRF.
- No guardar mensajes ni llamar al modelo sin autorización/versiones válidas. Probar rechazos de analítica independientes del chat.
- Historial fiel: cliente no puede introducir mensajes previos falsos, cambiar secuencias o acceder a otra sesión; duplicados y concurrencia no repiten turnos ni pagos.
- Límites de uso/capacidad atómicos; salidas inválidas y cancelaciones con estados honestos; ningún contenido en logs.
- Probar vencimiento a los 30 días, sesiones vacías a las 24 horas, eventos sin conversación a las 48 horas, purga real, fallo de purga, eliminación individual y restauración con eliminación completa del historial antes de reabrir.
- Panel y chat accesibles en móvil/escritorio, teclado, foco, estados de error, movimiento reducido y ausencia de HTML ejecutable.
- Revisar coherencia entre términos, privacidad, cookies y comportamiento real; revisión independiente antes de activación.

## Fuentes técnicas contrastadas

- [Plugin oficial de Access para Pages](https://developers.cloudflare.com/pages/functions/plugins/cloudflare-access/).
- [Validación del JWT de Access](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/).
- [Cron de Workers](https://developers.cloudflare.com/workers/configuration/cron-triggers/).
- [Seguridad de D1](https://developers.cloudflare.com/d1/reference/data-security/) y [copias Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/).
- [Términos API de DeepSeek](https://cdn.deepseek.com/policies/en-US/deepseek-open-platform-terms-of-service.html) y [caché de contexto](https://api-docs.deepseek.com/guides/kv_cache/).
