# Operación de Sarin

Fecha: 16 de octubre de 2026. Estado: **panel privado publicado en producción con autorización expresa y sesión del titular comprobada después del TOTP**. `SARIN_ADMIN_ENABLED=true`; `SARIN_ENABLED=false` y `SARIN_HISTORY_ENABLED=false`. Chat público oculto, sin conversaciones recogidas ni llamadas de IA en esta publicación. D1 vacía, Access exclusivo del titular y primera ejecución horaria de retención confirmada. La activación comercial con DeepSeek sigue pendiente de sus condiciones efectivas.

## Preparación remota realizada

- **D1:** base exclusiva `alsdevstudio-sarin`, UUID `ba6d723c-57fb-472d-b9c0-1308c24912e3`, jurisdicción `us` y ubicación ENAM. Migraciones `0001` y `0002` aplicadas; comprobadas cero conversaciones y cero mensajes. Respaldo del esquema vacío restaurado en una prueba. Esto no equivale a probar la recuperación de conversaciones reales. [Decisión de datos y entornos](adr/001-sarin-d1-y-entornos.md).
- **Pages:** despliegue de producción `9ab95b55-6214-4b76-a0b8-126b468cc537`, commit `658f002f4a58a3480f780e3a8ec902a26108833f` publicado en GitHub `main`. Build `npm ci --prefix .github/sarin && node .github/cloudflare/build.mjs`; etapas de Git, instalación, build y despliegue correctas. D1, secretos de API/IP/CSRF y configuración Access preservados privadamente; administración activa con chat/historial apagados. Preview permanece sin D1 ni secretos y con los tres flags apagados.
- **Access:** aplicación `385e9dee-d4a3-43d0-bfcc-2719e58a5fc0`, acceso exclusivo de `andres.san1404@gmail.com`, One-time PIN como método de identidad, sesión de 6 horas y TOTP requerido cada 6 horas. Cubre `/control-sarin*` y `/api/control-sarin*` en `www.alsdevstudio.com`, `alsdevstudio.pages.dev` y `*.alsdevstudio.pages.dev`. App Launcher usa la misma política; no se impuso MFA global a otras aplicaciones. El titular registró el autenticador y escribió su código directamente. Se comprobó la sesión real en `/control-sarin/`: listado actualizado, cero conversaciones y última limpieza visible. No se leyó ni guardó código, QR, cookie de autorización o secreto. El segundo factor protege la administración; no se pide a los visitantes del chat.
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
