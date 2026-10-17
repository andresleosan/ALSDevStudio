# Contacto al iniciar Sarin · 17 de octubre de 2026

Estado: candidato verificado; publicación expresamente aprobada por el titular después de pruebas y respaldo.

## Alcance aprobado

Nombre, apellido y correo son obligatorios antes de «Autorizar e iniciar». Son datos declarados, no una autenticación ni un correo verificado. Sólo Staff los muestra; no se añaden automáticamente a mensajes/contexto de DeepSeek, resumen de WhatsApp, analítica, URLs, logs o almacenamiento persistente propio del navegador. No autorizan publicidad. Si el visitante incluye datos en un mensaje, ese texto sigue el flujo de IA informado.

No cambia Firebase/Google del titular ni se crean cuentas para visitantes. Los chats anteriores permanecen con `lead: null` / «Sin datos de contacto»; sesiones antiguas válidas pueden continuar hasta su vencimiento. No hay backfill ni atribución inferida.

Formulario y autorización se limpian al iniciar correctamente, recargar o solicitar nueva conversación. Cerrar/reabrir sin recargar conserva el borrador en memoria. Nueva conversación no hace un POST automático; si falla la siguiente creación se conserva la conversación anterior en la vista, sin habilitar mensajes hasta completar el nuevo inicio. El navegador controla su propio autocompletado/restauración.

## Contrato y almacenamiento

`POST /api/sarin/session` y la variante privada reciben exactamente `{consent,lead:{firstName,lastName,email}}`. Validador puro compartido cliente/servidor: nombres Unicode normalizados NFC y espacios, máximo 80 caracteres por campo; correo ASCII/punycode con máximo 254, local 64, etiquetas de dominio 63. Se rechazan controles, marcado, campos ausentes/extra y valores no textuales. Comprobar formato no acredita existencia ni titularidad.

Migración aditiva `0003_leads.sql`: tabla `sarin_leads` 1:1 con FK `ON DELETE CASCADE`, sin agenda ni índice de correo. Sesión, consentimiento y contacto se insertan en un único batch. El trigger comprueba el límite vigente y suma bytes UTF-8 a la capacidad lógica global de 64 MiB, incluidos los contactos sin mensajes. Fallar o no tener la migración revierte todo el batch; no se entrega cookie.

La conversación controla la retención de contacto: 24 horas sin primer mensaje o 30 días desde el primero, sin extensión por actividad. Expirados no se muestran; la purga horaria vigente y el borrado administrativo los eliminan en cascada. El Worker de retención anterior sigue siendo compatible con el esquema nuevo, sin necesitar cambiar el cron. Recuperación conservadora actualizada para migrar copias antiguas e incluir contactos; no restablece dinero.

Aviso `sarin-history-2026-10-17-v6`, privacidad `2026-10-17-sarin-history-v5`, términos `2026-10-17-sarin-history-v4`; el hash contiene sólo texto estático, nunca los valores personales. Finalidad y autorización previa se revisaron contra [Ley 1581, arts. 4, 9 y 12](https://www.cancilleria.gov.co/normograma/compilacion/docs/ley_1581_2012.htm). No constituye certificación jurídica.

## Publicación y recuperación

1. Pruebas sintéticas locales, incluyendo D1/Workerd real local y verificación visual/accesible. Ninguna inferencia ni creación sintética de contacto en producción.
2. Respaldo D1 completo reciente fuera del repositorio, con ACL privada. Verificar restauración local en memoria, integridad y claves foráneas; registrar sólo hash, fecha y cantidades. No publicar SQL ni datos. Respaldo de intervención: retirar manualmente antes del 24/10/2026, bajo responsabilidad del titular; no se ha creado una tarea automática.
3. Aplicar únicamente la migración pendiente `0003` a la base exacta. No borrar tablas, conversaciones, migraciones previas ni contadores. El código anterior sigue funcionando mientras se publica el nuevo.
4. Publicar commit normal sobre `main` mediante Pages; confirmar artefacto, versiones, formulario y rechazo anónimo de historial, sin leer conversaciones reales.
5. Reversión preferida: restaurar el código/despliegue anterior mediante commit nuevo, manteniendo `0003`, sus filas y contabilidad hasta su purga. No ejecutar un down destructivo ni restaurar una copia para revertir sólo código; una recuperación de datos es otra intervención y sigue [SARIN-RESTAURACION](SARIN-RESTAURACION.md).

## Evidencia previa al despliegue

- 429/429 regresiones sin UI (motor, cuotas, historial, sesiones, administración, retención, integración, build, analítica y módulos visuales); 40/40 UI chat/Staff, repetidas por auditor independiente, sin P1/P2. Validador compartido y canarios en ambas llamadas IA/JSON público/logs, y analítica aceptada/resumen/WhatsApp/almacenamiento del navegador.
- 6/6 Pages con D1 y Workerd locales reales: cookie HttpOnly/Strict, rechazo sin contacto, artefacto/cabeceras, internos 404, datos administrativos anónimos cerrados y lectura sin JS. Cinco anchos de chat/Staff (320–1440), axe, teclado y 320×568; capturas inspeccionadas. Nombres de 80 y correo 254 sin desbordar.
- Build 222 archivos públicos / 5.399.551 bytes, revisión `d435c4a715b192c2`; compilación de Functions y tipos estrictos de los cuatro módulos modificados aprobados; `git diff --check` limpio. Sin dependencias nuevas ni cambios de autenticación.
- Respaldo D1 privado fuera de Git: `ALSDevStudio-recovery/sarin-contactos-2026-10-17/antes-0003.sql`, 78.064 bytes, SHA-256 `7d2ddf3f2461707a0a8b0f2029151b97b4347aa6dfed61e52781a4f6c7be176c`. ACL protegida (usuario actual/SYSTEM/Administradores), sin acceso general. Exportado a las 13:50:33 UTC; verificado antes de migrar con `integrity_check=ok` y cero errores FK. 8 conversaciones, 32 mensajes, 8 consentimientos, 30 reservas y 23 contadores coinciden con el origen.
- El export D1 antepone triggers a vistas: el ensayo inicial falló antes de modificar producción. Checker corregido con TDD, 6/6, separa sentencias respetando literales/comentarios y difiere triggers sólo en memoria; no modifica el archivo original ni muestra filas. La restauración y el ensayo de `0003` conservaron todos los conteos. Usar ese orden en una recuperación aislada; no ejecutar ingenuamente el dump con `db.exec` completo.

Migración remota `0003_leads.sql` aplicada correctamente el 17/10/2026 antes de publicar: cuatro sentencias DDL, sin cambiar filas anteriores. Recuento posterior: 8 conversaciones, 32 mensajes, 8 consentimientos, 30 reservas, 23 contadores y 0 contactos, iguales a la copia. No se crean contactos sintéticos en producción. Total de comprobaciones distintas previas: 481 (429 + 40 UI + 6 Pages local + 6 respaldo), sin sumar repeticiones.

Base funcional anterior: `de87219` / Pages `b0414971`, cierre documental `6fcdebd`. Publicación de aplicación y comprobación final pendientes.
