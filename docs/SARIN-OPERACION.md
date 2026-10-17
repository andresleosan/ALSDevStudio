# Operación de Sarin

**Actualización posterior de la misma fecha:** revisión de políticas v2 y accesibilidad publicada en `81784d3`, Pages `7f36ae7e-7543-49cb-ae17-3ec5bbc2515c`. Build con revisión común de módulos y estilos; HSTS, exclusión de analítica privada, correo sin JavaScript y controles accesibles verificados. Chrome normal inicia con v2; prueba ficticia café/Mundial/retorno conserva tres turnos y seis mensajes en el panel. Se mantienen el cierre público, Access, D1 y cuotas. [Auditoría final y fuentes](PRIVACIDAD-Y-CUMPLIMIENTO.md). Los despliegues descritos en la preparación inferior son el registro previo de la primera prueba.

Fecha: 16 de octubre de 2026. Estado: **panel y prueba privada publicados con autorización expresa; sesión del titular, DeepSeek real e historial comprobados en el dominio**. `SARIN_ADMIN_ENABLED=true` y `SARIN_PRIVATE_TEST_ENABLED=true`; `SARIN_ENABLED=false` y `SARIN_HISTORY_ENABLED=false` públicos. La portada normal mantiene el chat oculto para visitantes. El titular puede probar con datos ficticios en `https://www.alsdevstudio.com/?sarin=prueba`; el historial aparece en el panel protegido. La activación comercial con datos de visitantes sigue pendiente de sus condiciones efectivas.

## Preparación remota realizada

- **D1:** base exclusiva `alsdevstudio-sarin`, UUID `ba6d723c-57fb-472d-b9c0-1308c24912e3`, jurisdicción `us` y ubicación ENAM. Migraciones `0001` y `0002` aplicadas; base vacía antes de la prueba privada, que añade únicamente conversaciones ficticias. Respaldo del esquema vacío restaurado en una prueba. Esto no equivale a probar la recuperación de conversaciones de visitantes. [Decisión de datos y entornos](adr/001-sarin-d1-y-entornos.md).
- **Pages:** despliegue de producción `03625efb-fe06-4678-b847-b7cbfac6ebe1`, commit `828bdd570936420dc025d8b6261ad42326a36dbc` publicado en GitHub `main`. Build `npm ci --prefix .github/sarin && node .github/cloudflare/build.mjs`; despliegue correcto. D1 y seis secretos de API/IP/CSRF/Access preservados; administración y prueba privada activas, chat/historial públicos apagados. Preview permanece sin D1 ni secretos y con los cuatro flags apagados.
- **Access:** aplicación `385e9dee-d4a3-43d0-bfcc-2719e58a5fc0`, acceso exclusivo de `andres.san1404@gmail.com`, One-time PIN como método de identidad, sesión de 6 horas y TOTP requerido cada 6 horas. Cubre `/control-sarin*` y `/api/control-sarin*` en `www.alsdevstudio.com`, `alsdevstudio.pages.dev` y `*.alsdevstudio.pages.dev`. App Launcher usa la misma política; no se impuso MFA global a otras aplicaciones. El titular registró el autenticador y escribió su código directamente. Sesión real, listado e historial ficticio comprobados; no se leyó ni guardó código, QR, cookie de autorización o secreto. La prueba privada reutiliza esta identidad; el futuro chat para visitantes no exige MFA administrativo.
- **Nombre del acceso:** por instrucción expresa del titular, el rótulo organizacional `fullstack-challenge-e-commerce - Cloudflare Access` se sustituyó por `ALS Dev Studio`. Guardado y comprobado en el login real; afecta el nombre visual de los accesos de esa organización. El dominio `andres-san1404.cloudflareaccess.com` y la configuración de autorización se conservan. Evidencia local ignorada: `test-results/sarin-remote/access-als-dev-studio.jpg`.
- **DNS y acceso anónimo:** el CNAME `www → alsdevstudio.pages.dev` pasó a Proxied para aplicar Access. Los nameservers ya eran Cloudflare; no se modificaron los demás registros. Portada y políticas 200; variantes privadas de interfaz/API 302 hacia Access con `no-store`, también en preview. El acceso del titular y el listado vacío se comprobaron aparte en el navegador autenticado.
- **Retención:** Worker `als-sarin-retention`, versión `fc6b4b0f-3aad-4559-a3fc-17a0aae1be9c`, comparte D1 y ejecuta cron `0 * * * *`, sin HTTP público, `workers.dev` ni previews. Primera ejecución correcta: **16 de octubre, 22:00:34.515 de Bogotá** (17 de octubre, 03:00:34.515 UTC), `purge_status=ok`, `last_error_at=null`, pendientes cero. Lectura de las 22:21:35 de Bogotá: cero conversaciones y mensajes. El perfil predeterminado sigue apagado con UUID local. Para comandos remotos, seleccionar explícitamente la cuenta `05fb22c155667de064b55c4e287b21d8`; la selección implícita del CLI devolvió 7403 y no se usó para mutar datos.
- **DeepSeek:** la revisión del perfil real no mostró un control específico de API para entrenamiento, retención o DPA. No acredita un acuerdo ni una exclusión de entrenamiento. Siguen pendientes las condiciones efectivas y el tratamiento internacional; el chat público continúa apagado. [Revisión de proveedores y consulta preparada, no enviada](legal/SARIN-REVISION-DATOS-Y-TERMINOS.md).

Verificación inicial antes de publicar: 27/27 pruebas de build, launcher y retención aprobadas; preparación local repetida sin migraciones pendientes. En esa fase la API solo confirmaba el cron instalado, todavía sin ejecución observada. No hubo inferencias de visitantes. La publicación y verificación posteriores se registran al final.

Registro histórico: consulta remota de solo lectura del 16 de octubre a las 21:28 de Bogotá (17 de octubre, 02:28 UTC): estado de purga `never`, sin fechas de ejecución, éxito o error; pendientes cero, conversaciones cero y mensajes cero. En ese momento faltaba observar la primera ejecución programada. Esta consulta no ejecutó la purga.

Segunda consulta remota a las 21:32 de Bogotá: mismos resultados, cero escrituras. El registro TOTP no equivale a haber ejecutado la purga.

La lectura posterior de las 22:21 confirmó la primera ejecución correcta a las 22:00:34.515. Fue una consulta de solo lectura; no se simuló ni lanzó manualmente el cron de producción.

## Preparar y abrir

Desde la raíz, con Node y Wrangler 4.150 o posterior:

```powershell
npm ci --prefix .github/sarin
node .github/sarin/dev.mjs --prepare
node .github/sarin/dev.mjs
```

`--prepare` construye `dist` y aplica migraciones pendientes únicamente en D1 local. Es repetible; no ejecuta de nuevo las aplicadas. El servidor abre `http://127.0.0.1:8791` con chat e historial apagados. Admite `--port 8792`; detener con Ctrl+C. No crea recursos ni despliega.

En desarrollo, secretos exclusivamente en `.dev.vars`, ignorado y excluido del artefacto: `DEEPSEEK_API_KEY`, `SARIN_IP_SECRET`, `SARIN_ADMIN_CSRF_SECRET`. El launcher conserva valores y genera los dos secretos técnicos si faltan, sin imprimirlos. Persistencia en `.wrangler/sarin-local`; configuración separada solo para migrar D1 local y binding simulado explícito al arrancar. Pages utiliza `wrangler.jsonc` estándar; su binding de producción no habilita acceso remoto desde el launcher.

`node .github/sarin/dev.mjs --live` habilita chat e historial locales. **Enviar** mensajes llama a DeepSeek y puede consumir saldo; abrir o autorizar una sesión no llama a IA. Administración permanece apagada y exige Access real. `--live --prepare` prepara sin iniciar servidor. No hay bypass de autenticación para ver transcripciones.

El HTML fuente mantiene `data-sarin-enabled="false"` en el botón del chat. El módulo no revela ni inicializa el diálogo sin el valor exacto `true`. El build local con `--live` lo habilita únicamente en `dist`, conservando la fuente apagada. Esto evita mostrar un formulario que terminaría en 503 durante una publicación solo administrativa. Para activar el chat público posteriormente deben revisarse tanto ese control de presentación como los flags y condiciones del servidor; cambiar el atributo no autoriza peticiones ni habilita IA por sí solo.

## Conversaciones y consentimiento

Frontend nativo, Pages Functions y D1; única IA DeepSeek `deepseek-flash`, pensamiento desactivado, sin streaming ni reintentos. Catálogo y alcance comercial controlados por el servidor.

Aviso visible, casilla sin marcar y acción expresa antes de iniciar. `POST /api/sarin/session` acepta solo `{consent:{accepted:true,noticeVersion,privacyVersion,termsVersion}}`. Registra fecha, método, versiones y hash del aviso; devuelve referencia y cookie `__Host-sarin-session`, secreto aleatorio `HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400`. D1 conserva únicamente su hash. Esta evidencia no identifica civilmente al visitante.

`POST /api/sarin` recibe solo `{message,requestId}`. El servidor recupera hasta cuatro pares anteriores; no admite historial ni roles del navegador. Un turno pendiente por sesión. Repetir mensaje/UUID completado reproduce respuesta sin otra inferencia; cambiar el mensaje con el mismo UUID se rechaza. Borrar o vencer el historial impide que una respuesta tardía lo recree.

Se guardan mensajes admitidos, respuestas públicas validadas y errores públicos. Un mensaje admitido puede conservarse con error de cuota sin llamar a IA. Las peticiones inválidas o sin sesión no guardan contenido. No almacenar razonamiento, salidas descartadas, cuerpos de error del proveedor ni IP en las transcripciones. No hay contenido en analítica, consola ni almacenamiento persistente del navegador.

Referencia en chat y resumen editable de hasta 1800 caracteres. WhatsApp `573146432135` se abre por acción de la persona y conserva su revisión; la persona decide enviarlo. Recargar o iniciar otra conversación limpia la vista, **no elimina el historial del servidor**.

## Administración

Interfaz `/control-sarin/` y API `/api/control-sarin/*`: plugin oficial Access con firma, claims obligatorios y correo exclusivo del titular. API autentica también por separado. Mutaciones con origen exacto, JSON y CSRF de 15 minutos; respuestas `no-store` y sin indexación.

Filtros de fecha colombiana, servicio y estado; paginación; transcripción y eventos; prueba de autorización; uso verificado y reservas retenidas. Acciones: revisar, bloquear sesión por 24 horas, desbloquear y eliminar. Borrar no reinicia dinero. Las señales requieren revisión contextual y no prueban abuso. El panel muestra estado y última limpieza.

Configuración privada de producción provisionada: `SARIN_ACCESS_DOMAIN` (HTTPS del equipo `*.cloudflareaccess.com`), `SARIN_ACCESS_AUD`, `SARIN_ADMIN_EMAIL` y secreto `SARIN_ADMIN_CSRF_SECRET` de al menos 32 caracteres. `SARIN_ADMIN_ENABLED` sigue apagado. No hay credenciales incorporadas al cliente. Dependencia oficial aislada en `.github/sarin/`; falta publicar el código web y validar el login real del titular antes de habilitar la administración.

El titular registra su propio TOTP en App Launcher: **Account → MFA devices → Add an MFA device**, o mediante [registro de dispositivo MFA del equipo](https://andres-san1404.cloudflareaccess.com/AddMfaDevice). El PIN enviado al correo autentica su identidad; el TOTP es el factor adicional exigido para Sarin. No compartir códigos, semilla ni QR en capturas o documentación. [Instrucciones oficiales de MFA independiente](https://developers.cloudflare.com/cloudflare-one/access-controls/access-settings/independent-mfa/).

## Retención, límites y costo

- Historial/autorización: 30 días desde primer mensaje admitido, sin renovación. Sesión operativa y sesión vacía: 24 horas.
- Cuotas por IP transformada/rechazos agregados: 48 horas. Auditoría de acciones: 30 días. Contadores globales y reservas: 35 días.
- Vencidos excluidos inmediatamente. Worker horario: máximo 20 lotes de 100, sin HTTP público. Fallas/retrasos pueden demorar eliminación física; supervisar. Las cuotas se limpian también durante peticiones.
- `SARIN_RETENTION_ENABLED=false` por defecto, con identificador D1 exclusivamente local. El entorno explícito `production` comparte la base de Pages y tiene retención activa, con primera ejecución remota correcta comprobada.
- Límites de servidor: 10 mensajes/minuto, 50/día por IP transformada; 15 turnos/conversación; 5 sesiones/minuto, 20/día; 2000 conversaciones, 64 MiB de texto lógico, 32 clases de evento/conversación y 10000 agregados de rechazo. No equivalen al tamaño físico total de D1.

Precios de cálculo: 300000/1200000 microUSD por millón de tokens de entrada/salida. Presupuesto global: 1000000/10000000 microUSD por día/mes UTC (1/10 USD). Reserva atómica antes de cada llamada; liquidación solo de uso comprobado. Incertidumbre conserva reserva; cero se liquida únicamente al comprobar ausencia de red. Historial y revisión de abuso no añaden llamadas de IA. Estimación en [STACK](../STACK.md). Contadores no son factura ni garantizan tarifas futuras. Alertas/límites de la cuenta no comprobados; ningún plan contratado.

Borrar D1 activo no promete eliminación inmediata de backups del proveedor. Plan/ventana Time Travel reales pendientes. [Restauración conservadora](SARIN-RESTAURACION.md): cerrar y drenar, borrar **todo** historial restaurado, conciliar capacidad, conservar dinero y mantener IA apagada hasta conciliar consumo o agotar períodos afectados. Una copia antigua no acredita saldo disponible.

## Verificación local

259/259 pruebas de build, launcher, cuotas, backend, sesiones, historial, Access/admin, integración SQLite, retención/recuperación y UI. Regresión analítica/escenas 80/80; Pages local real 6/6, incluidas rutas alternativas privadas y cookie HttpOnly/Secure en navegador. Cinco anchos 320–1440, teclado, no-JS y axe sin incidencias automáticas en superficies evaluadas. TypeScript mantiene doce errores previos en analítica/proyectos; ninguno nuevo de Sarin.

En la entrega local anterior: migración aplicada y preparación repetida sin pendientes; Worker empaquetado con `deploy --dry-run`; evento scheduled en workerd local con 200 y estado D1 `ok`. El Worker remoto se desplegó después, según el registro de preparación remota, sin haber observado aún una ejecución. Compatibilidad `2026-10-13` igual que Pages, admitida por runtime local. El endpoint temporal de simulación de Wrangler solo se usó en loopback durante QA; producto no implementa `fetch`.

Revisiones independientes de integración, UI/textos y purga/restauración sin hallazgos medios/altos pendientes. Corregidos lease con más de 100 pendientes, validación SQL de metadatos, filtro inválido durante carga y dos descripciones de retención. La muestra anterior de DeepSeek real valida transporte/modelo de forma acotada; esta ampliación usó datos/proveedores sintéticos, sin nuevas inferencias pagadas ni prueba de contención D1 remoto.

Evidencia ignorada: `test-results/sarin-admin-tests-final.txt`, `sarin-admin-regression-final.txt`, `sarin-admin-types-final.txt`, capturas `test-results/sarin/` y `test-results/sarin-admin/`.

## Activación posterior del chat público

1. Verificar condiciones API, roles, tratamiento internacional y retención efectiva de DeepSeek/Cloudflare; completar [guía de datos](legal/OPERACION-Y-SOLICITUDES.md). No afirmar cero retención o exclusión de entrenamiento sin prueba contractual.
2. Mantener el control de acceso ya comprobado y sus sesiones. Identidad válida verificada en producción, acceso anónimo cerrado; identidades ajenas, tokens vencidos y claims inválidos probados con material criptográfico sintético. No se crearon cuentas de terceros para probar producción.
3. El código y el build Git ya están publicados. Antes de activar chat/historial, revisar el control visual del botón, flags del servidor, avisos y condiciones efectivas. Mantener D1 y secretos solo en producción y preparar un candidato con las verificaciones que correspondan al cambio.
4. Supervisar próximas ejecuciones y heartbeat, conservar controles de cuenta y procedimiento de recuperación. La primera ejecución remota ya pasó. Mantener `SARIN_ENABLED` y `SARIN_HISTORY_ENABLED` apagados mientras falten las condiciones del chat; la administración privada puede continuar activa. No habilitar previews contra datos operativos; cambiar flags no cancela inferencias en curso.

La preparación inicial y la preview se completaron antes de pedir autorización de producción. La publicación administrativa aprobada se registra abajo. [Diseño](superpowers/specs/2026-10-16-sarin-admin-historial-design.md), [plan](superpowers/plans/2026-10-16-sarin-admin-historial.md), [ADR-001](adr/001-sarin-d1-y-entornos.md) y [revisión jurídica](legal/SARIN-REVISION-DATOS-Y-TERMINOS.md).

## Candidato y publicación del panel privado

La administración se puede publicar con `SARIN_ADMIN_ENABLED=true`, conservando `SARIN_ENABLED=false`, `SARIN_HISTORY_ENABLED=false` y el botón público deshabilitado. Usa Access, el secreto CSRF y D1 vacía; no requiere DeepSeek ni recoge chats. La matriz está probada con identidad sintética y SQLite: bootstrap/listado 200 y sesión pública 503 sin cookie, registros o llamadas al proveedor. Esto permite separar la verificación del panel de la activación comercial pendiente.

El candidato se preparó antes de la aprobación expresa de producción. Conserva previews sin D1 ni secretos, con administración apagada. Verificación focal: 29 pruebas de build/lanzador/UI, 59 administrativas, 10 de retención/configuración y 6 de Pages local aprobadas (104 en total); compilación de Functions y revisión independiente aprobadas. La autorización de crear el autenticador no se utilizó como aprobación de producción; el titular dio después esa aprobación por separado.

### Preview publicada para revisión

Despliegue `f2dd9eee-8f22-407b-8375-6718f4b81bfb`, commit local `e677449`: [vista exacta](https://f2dd9eee.alsdevstudio.pages.dev/) y [alias de revisión](https://revision-sarin.alsdevstudio.pages.dev/). `revision-sarin` es una etiqueta de despliegue Pages; Git local y GitHub conservan únicamente `main`, sin crear ni publicar ramas.

En la revisión previa, API de Pages confirmó entorno `preview`, estado `success`, tres flags apagados, ninguna D1 y ningún secreto. Producción conservaba entonces `38c298b7-df63-4a0a-92c5-8398ee6b9ced`, flags apagados y su build anterior. Verificación HTTP de preview con agente de navegador: portada y tres políticas 200 con `noindex`; interfaz y API privadas 302 hacia Access. El agente Python predeterminado recibió el código Cloudflare 1010; no se modificó esa protección. Chrome mostró 20 proyectos, lanzador de chat oculto y ningún script de analítica después de rechazar. Captura ignorada: `test-results/sarin-remote/candidato-panel-web.jpg`.

La preview permite revisar el sitio y el cierre de las rutas privadas; no ofrece un panel operativo ni crea conversaciones. La propuesta de esa fase fue publicar únicamente la administración protegida sobre D1 vacía, mantener chat/historial apagados y actualizar el build Git. Se ejecutó después de la autorización, según el registro siguiente.

### Producción aprobada y comprobada

El titular autorizó expresamente publicar el panel privado manteniendo el chat apagado. Se revisaron los 66 archivos pendientes de publicación sin encontrar rutas privadas ni patrones de claves; se sincronizaron los ocho commits de `main` y se actualizó el build Git. Producción `9ab95b55-6214-4b76-a0b8-126b468cc537`, commit `658f002`: todas las etapas correctas. API de Pages confirma administración activa, chat/historial apagados, D1 exclusiva y seis secretos conservados. Preview continúa aislada. No hubo inferencias ni mensajes reales de visitantes.

El titular completó TOTP directamente en su navegador. El panel real muestra su identidad autorizada, «Listado actualizado», cero conversaciones y última limpieza del 16 de octubre a las 22:00 de Colombia. Se guardó únicamente la captura del panel vacío en `test-results/sarin-remote/panel-produccion.jpg`, fuera de Git. No se copió su sesión ni ningún código.

La revisión de producción detectó un beacon automático en el HTML de `www`, ausente en fuente, `dist` y el mismo despliegue Pages. El sitio manual de Web Analytics seguía en «JS Snippet installation» y los campos de Analytics del build de Pages estaban vacíos. Se aplicó la Configuration Rule `8c5eb63c31fc477c8cff625f25835e81`, «ALS - Analítica solo con consentimiento»: expresión `(http.host eq "www.alsdevstudio.com")`, únicamente `disable_rum=true`. Evita la inyección automática del dominio proxied; conserva el cargador manual, el sitio de Web Analytics y las demás opciones del dominio. [Control documentado](https://developers.cloudflare.com/rules/configuration-rules/settings/).

P2 cerrado: revisión independiente de 14 comprobaciones HTTP aprobada, incluyendo portada y políticas 200 sin beacons automáticos, privadas 302 a Access, rutas internas 404 y sesión pública 503 sin cookie. En Chrome se comprobó carga manual: elección aceptada inicial con un script; rechazar deja cero; aceptar vuelve a uno y restaura la elección inicial. No se exportaron configuraciones de seguimiento ni tokens. La captura de la regla activa se conserva localmente con el resto de evidencia.

Reversión de emergencia: restaurar el despliegue canónico anterior `38c298b7-df63-4a0a-92c5-8398ee6b9ced` desde Cloudflare y cerrar administración en la configuración de despliegue; conservar D1. Si se revierte también Git a código anterior a `.github/sarin`, restaurar su comando de build compatible. No borrar historiales ni reponer presupuestos desde copias. La regla que evita RUM automático debe conservarse para respetar el consentimiento; cualquier reversión de esa regla requiere volver a comprobar la ausencia de medición previa.

## Prueba local con DeepSeek real · 16 de octubre de 2026

Por solicitud del titular se abrió `http://127.0.0.1:8792/` mediante `node .github/sarin/dev.mjs --live --port 8792`. El servidor escucha solo en loopback y usa D1 simulada `00000000-0000-0000-0000-000000000002`, persistencia `.wrangler/sarin-local`, historial local activo y administración local apagada. La clave existente se utiliza en el servidor; no se copia a la interfaz ni a los informes. Estas conversaciones son ficticias y no aparecen en el panel administrativo de producción. La tarea horaria remota no limpia esta base local.

La prueba encontró errores 502 en seguimientos. Se distinguió el contenido vacío del proveedor mediante el diagnóstico cerrado `provider_empty_content`, sin guardar la salida inválida. Una comparación de seis llamadas de clasificación, con tres contextos ficticios idénticos, obtuvo dos vacíos y una clasificación incorrecta al reenviar roles independientes; enviar el contexto como datos JSON dio tres respuestas válidas dentro del alcance. Se corrigió `buildPayload` para enviar solo `system` y `user` con `{message,history}` serializado. El contexto sigue procediendo del servidor; conserva límites, poda de pares completos, último par y cálculo monetario sobre los bytes finales. No se añadió ningún reintento ni se relajó el contrato de salida. DeepSeek documenta que JSON mode puede devolver contenido vacío; la muestra aprobada no garantiza ausencia de fallos futuros. [Guía del proveedor](https://api-docs.deepseek.com/guides/json_mode/).

También se ajustó el cierre comercial: preparar y revisar el resumen y abrir WhatsApp es una acción del visitante; Sarin no promete devolución de llamada ni avisos automáticos a Andrés.

Verificación de la corrección:

- Regresiones RED/GREEN de contexto JSON, poda e integración SQL; revisión independiente sin hallazgos P1/P2. Backend e integración focales: 98/98 aprobadas; suites ampliadas de backend, SQL, sesiones, historial y cuotas también aprobadas.
- DeepSeek real posterior al cambio: tienda y pregunta sobre tarjeta 2/2 con 200; aplicación y límites de Dialon/Vigia 2/2 con 200. No inventó pasarela de pago, traducción operativa ni protección personal.
- Chrome: petición de revelar instrucciones/claves y prometer precio/entrega rechazada con respuesta comercial válida; pregunta de fútbol redirigida sin contestarla; recuperación hacia chatbot de citas con ejemplo de Sarin Bot y continuación manual por WhatsApp.
- Resumen en Chrome: referencia incluida; editar actualiza exactamente el texto del enlace y su destinatario; 1801 caracteres deshabilitan WhatsApp sin truncar. No se abrió ni envió un mensaje.
- Lectura local de metadatos: 11 conversaciones iniciadas, todas con vencimiento exactamente 30 días después del primer mensaje. Las 19 sesiones acumuladas incluyen preparación y reintentos del cliente de pruebas; las cuotas se conservan. Se dejó una conversación nueva sin mensajes para el titular.

Evidencia ficticia y herramientas puntuales en `test-results/sarin-remote/`, excluidas de Git: `prueba-local-deepseek-inicial.json`, `prueba-local-deepseek.json`, `sarin-prueba-deepseek.jpg`. Los contadores locales no representan la factura: hubo además ocho llamadas diagnósticas directas con contexto ficticio, sin registrar credenciales ni cuerpos del proveedor.

La corrección se validó primero en local y se publicó después junto con la prueba privada descrita abajo. Producción conserva el chat público oculto; las condiciones de activación pública descritas arriba siguen pendientes. Para repetir manualmente, escribir una necesidad ficticia o usar los botones de servicio, revisar los ejemplos y pulsar «Preparar resumen». La API real puede consumir saldo al enviar mensajes; abrir el chat o una sesión no llama a IA.

## Prueba privada publicada en el dominio · 16 de octubre de 2026

El titular solicitó push para probar en `https://www.alsdevstudio.com/` si las comprobaciones eran correctas. Se publicó una prueba del propietario con datos ficticios, sin activar conversaciones de visitantes. Acceso desde el panel mediante «Probar Sarin en la web» hacia `/?sarin=prueba`; la query selecciona la vista y no concede autorización. Antes de mostrar el chat, el cliente exige un bootstrap privado válido con `privateTestEnabled=true`. Si no puede comprobarlo, ofrece el acceso administrativo y no crea sesión ni llama a IA.

Contrato y controles del candidato:

- `SARIN_PRIVATE_TEST_ENABLED=true` solo en producción; `SARIN_ENABLED=false` y `SARIN_HISTORY_ENABLED=false` públicos se conservan. Preview y desarrollo mantienen el flag privado apagado. El artefacto HTML sigue con `data-sarin-enabled="false"`.
- Dos POST bajo el prefijo Access existente: `/api/control-sarin/test/session` y `/api/control-sarin/test/message`. Cada petición exige firma/claims y correo del titular, flag exacto, origen, JSON y CSRF antes de delegar en los handlers existentes mediante una copia interna del entorno. No hay nuevas reglas Access, cuentas o secretos. El CSRF se renueva en memoria por petición; bootstrap y POST comparten timeout y abort.
- Cookie privada `__Host-sarin-test-session`, HttpOnly/Secure/Strict, con hash separado del público; rechaza cruces incluso renombrando el token. Se mantienen esquemas cerrados, límite de 16 KiB, cuotas, presupuesto y cero reintentos. No cambia el esquema D1 ni requiere migraciones.
- Las conversaciones ficticias se guardan en la D1 operativa y aparecen en el panel. Conservación de 30 días y purga existentes; no se reinician cuotas ni se crean copias adicionales. El modo muestra un aviso para usar datos ficticios y no abre WhatsApp ni envía mensajes automáticamente.

Verificación previa: 282/282 pruebas de Sarin/build y 6/6 de Pages local aprobadas; 29 de UI, con ocho regresiones nuevas. Revisión independiente sin P1/P2, comprobaciones JWT/CSRF/SQL/cookies y límites; `npm audit` privado sin vulnerabilidades. TSC conserva 13 errores previos, cero nuevos y cero de Sarin. Build de 220 archivos públicos y Functions compiladas; ausencia de SQL, backend, dependencias y secretos en `dist`. Evidencias locales ignoradas: `private-release-tests.txt`, `private-types-final.txt` y `private-release-pages-local.txt`.

La revisión remota previa confirmó producción `9ab95b55`, D1 vacía, seis secretos y heartbeat correcto. Preview `cd64f7c1`, commit `828bdd5`, pasó 14/14 comprobaciones HTTP con los cuatro flags apagados, sin D1 ni secretos; se envió entonces `main` a GitHub. Producción `03625efb-fe06-4678-b847-b7cbfac6ebe1`, mismo commit, completó el despliegue y conservó las flags/bindings previstos. Otras 14/14 comprobaciones anónimas en `www` aprobaron portada/políticas, ausencia de beacons automáticos, cierre Access de los POST privados, internos 404 y sesión pública 503 sin cookie.

Chrome comprobó el flujo completo con la sesión real del titular: consentimiento, referencia `9985d258-96a3-4aa4-ac61-3b4379befcda`, dos turnos de DeepSeek válidos y cuatro mensajes en el panel. Caso identificado como «PRUEBA FICTICIA DE PUBLICACIÓN»: tienda de accesorios, ejemplos Mundo Celular/Coctels OPS y seguimiento sobre pagos sin inventar pasarela. Panel: vencimiento 15 de noviembre a las 23:03 Colombia, uso verificado USD 0.001232, reservas retenidas cero y limpieza del 16 de octubre a las 23:00. Resumen editable de 836 caracteres con referencia y destinatario WhatsApp correctos; no se abrió ni envió un mensaje por WhatsApp. Se dejó una conversación nueva para el titular. Evidencias locales, fuera de Git: `sarin-www-prueba.jpg` y `sarin-www-historial.jpg` en `test-results/sarin-remote/`.

El navegador conservaba scripts anteriores por el `max-age=14400` de assets sin huella; recargar sin caché mostró los controles actuales. No se alteraron preferencias, autenticación ni reglas de caché persistentes. La sesión de prueba creó únicamente su cookie técnica prevista. Si una pestaña antigua no muestra el enlace, recargar sin caché antes de repetir. Las opciones de analítica se conservaron.

Respaldo de metadatos de publicación en `.wrangler/sarin-preparation/private-test-release-before.json`, fuera de Git; no contiene valores secretos. Reversión: apagar `SARIN_PRIVATE_TEST_ENABLED` y volver al despliegue canónico `9ab95b55-6214-4b76-a0b8-126b468cc537`; mantener D1, registros monetarios y la regla de consentimiento de analítica. No se eliminan las conversaciones ficticias antes de que el titular pueda revisarlas; conservan su plazo de retención.
