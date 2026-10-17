# ADR-002: Firebase Authentication para Staff

Fecha: 17 de octubre de 2026. Estado: publicada por autorización del titular; verificación final de su inicio de sesión pendiente.

## Contexto y decisión

El titular solicita volver a Firebase para autenticarse con Google y limpiar la alternativa de Cloudflare Access. Se utiliza exclusivamente Firebase Authentication del proyecto `alsdevstudio`. La interfaz y API continúan en Cloudflare Pages y el historial permanece en D1; no se recuperan el antiguo panel, Hosting publicado, Firestore, Functions, facturación ni suscripciones.

La pantalla `/control-sarin/` es una estructura pública sin datos. La API comprueba en cada petición la firma RS256 del token con las claves públicas de Google, proyecto, emisor, vencimiento, momento de autenticación, proveedor Google, UID fijo y correo verificado del titular. Consulta además `accounts:lookup` para comprobar el usuario actual y rechazar cuentas deshabilitadas o sesiones revocadas. `validSince` se compara con `auth_time`, no con la fecha de renovación del token. Fallos de red o configuración cierran el acceso.

El SDK web modular de Firebase 12.19.0 sólo se carga en Staff. Usa persistencia de sesión de pestaña, con memoria como alternativa, nunca persistencia local indefinida. El ID token se intercambia por la cookie `__Host-sarin_admin`, `HttpOnly; Secure; SameSite=Strict; Path=/`, sin `Domain`. El servidor no recibe ni guarda el refresh token. La cookie vence al vencer el token o al cumplirse seis horas desde `auth_time`, lo que ocurra antes. La API conserva origen exacto, JSON acotado, CSRF ligado al titular, respuestas sin caché y errores genéricos.

## Alternativas y consecuencias

- Google dentro de Access: descartado por nueva elección expresa del titular; requería gestionar un secreto OAuth adicional.
- Restaurar el sistema Firebase completo: descartado; añade infraestructura ajena a la autenticación solicitada.
- Confiar sólo en el navegador o en el correo: descartado; no autoriza el acceso a D1.
- Service account privada: no necesaria; la verificación usa claves públicas y consulta de usuario con ID token y API key pública del proyecto.

La verificación TOTP independiente de Access no se conserva al sustituir ese servicio. Los desafíos adicionales del inicio de sesión dependen de la seguridad de la cuenta de Google. La duración máxima de seis horas no implica un nuevo desafío MFA cada seis horas. La sesión de pestaña de Firebase y su renovación automática no pueden prolongar ese límite del servidor.

La API key web identifica el proyecto y no concede permisos administrativos. No se incorpora ningún secreto OAuth ni clave de cuenta de servicio al sitio. La autorización sigue exigiendo UID y correo verificado en el servidor.

## Transición y recuperación

Secuencia aplicada: pruebas y compilación de Pages, recuperación de la app web existente, rehabilitación sólo del usuario esperado, autorización del dominio exacto y despliegue del backend cerrado antes de retirar Access. No se habilitaron previews, nuevas cuentas administrativas o una base distinta. La verificación con el motor Workerd detectó después una incompatibilidad de transporte y se publicó su corrección; ver registro de operación.

Si falla la activación antes de retirar Access, conservarlo como barrera y cerrar `SARIN_ADMIN_ENABLED`/`SARIN_PRIVATE_TEST_ENABLED`. El titular autorizó después eliminar únicamente la aplicación Access anterior; la política reutilizable se conserva. Para volver, recrear primero esa aplicación y sus seis destinos con la política exclusiva y TOTP, obtener su nuevo AUD y actualizar la configuración privada correspondiente, y después publicar mediante un commit nuevo la autenticación anterior y sus dependencias. El AUD de una aplicación eliminada no sirve para su reemplazo. No borrar ni restaurar D1 para revertir autenticación. Conservar los registros históricos de la transición.

## Fuentes verificadas

[Verificar ID tokens](https://firebase.google.com/docs/auth/admin/verify-id-tokens), [consultar usuario](https://firebase.google.com/docs/reference/rest/auth#section-get-account-info), [gestionar sesiones](https://firebase.google.com/docs/auth/admin/manage-sessions), [persistencia web](https://firebase.google.com/docs/auth/web/auth-state-persistence), [API keys de Firebase](https://firebase.google.com/docs/projects/api-keys). La consulta REST complementa la verificación de firma; no la sustituye.
