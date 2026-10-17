# Operación de Sarin

Fecha: 16 de octubre de 2026. Estado: chat comercial y ampliación administrativa aprobada, implementados y verificados **en local, sin publicar el código web nuevo en producción**. Infraestructura remota preparada: D1 vacía, Access y Worker de retención. `SARIN_ENABLED`, `SARIN_HISTORY_ENABLED` y `SARIN_ADMIN_ENABLED` permanecen en `false`; no se recogen conversaciones públicas. El autenticador del titular está registrado y Access solicita TOTP para Sarin; faltan la sesión funcional del panel nuevo y la primera ejecución remota del cron.

## Preparación remota realizada

- **D1:** base exclusiva `alsdevstudio-sarin`, UUID `ba6d723c-57fb-472d-b9c0-1308c24912e3`, jurisdicción `us` y ubicación ENAM. Migraciones `0001` y `0002` aplicadas; comprobadas cero conversaciones y cero mensajes. Respaldo del esquema vacío restaurado en una prueba. Esto no equivale a probar la recuperación de conversaciones reales. [Decisión de datos y entornos](adr/001-sarin-d1-y-entornos.md).
- **Pages:** producción dispone del binding D1 y de configuración privada de API, secreto de IP, CSRF y Access. Preview permanece sin D1 ni secretos y con los tres flags apagados. El despliegue web continúa siendo `38c298b7`; no se ha hecho push ni publicado el código nuevo. El comando de build de la cuenta sigue en `node .github/cloudflare/build.mjs`; se cambiará al comando con `npm ci` al publicar ese código.
- **Access:** aplicación `385e9dee-d4a3-43d0-bfcc-2719e58a5fc0`, acceso exclusivo de `andres.san1404@gmail.com`, One-time PIN como método de identidad, sesión de 6 horas y TOTP requerido cada 6 horas. Cubre `/control-sarin*` y `/api/control-sarin*` en `www.alsdevstudio.com`, `alsdevstudio.pages.dev` y `*.alsdevstudio.pages.dev`. App Launcher habilitado reutilizando la política exclusiva del titular; no se impuso MFA global a otras aplicaciones. El titular confirmó su registro y se comprobó un dispositivo TOTP en su cuenta. Entrar al destino privado de Sarin solicita el código del autenticador. No se leyó ni guardó ningún código, QR o secreto, y todavía falta comprobar una sesión funcional del panel nuevo.
- **Nombre del acceso:** por instrucción expresa del titular, el rótulo organizacional `fullstack-challenge-e-commerce - Cloudflare Access` se sustituyó por `ALS Dev Studio`. Guardado y comprobado en el login real; afecta el nombre visual de los accesos de esa organización. El dominio `andres-san1404.cloudflareaccess.com` y la configuración de autorización se conservan. Evidencia local ignorada: `test-results/sarin-remote/access-als-dev-studio.jpg`.
- **DNS y acceso anónimo:** el CNAME `www → alsdevstudio.pages.dev` pasó a Proxied para aplicar Access. Los nameservers ya eran Cloudflare; no se modificaron los demás registros. Comprobados portada 200 y rutas privadas de interfaz/API 302 hacia Access, también en preview. Esa redirección verifica el cierre anónimo, no las funciones del panel nuevo todavía sin publicar.
- **Retención:** Worker de producción `als-sarin-retention`, versión `fc6b4b0f-3aad-4559-a3fc-17a0aae1be9c`, desplegado con la misma D1, flag de retención activo y cron `0 * * * *` (cada hora UTC). Sin HTTP público, `workers.dev` ni URLs de preview. **Primera ejecución remota no observada**: falta confirmar su heartbeat en D1. El perfil predeterminado del Worker sigue apagado y con UUID local simulado.
- **DeepSeek:** la revisión del perfil real no mostró un control específico de API para entrenamiento, retención o DPA. No acredita un acuerdo ni una exclusión de entrenamiento. Siguen pendientes las condiciones efectivas y el tratamiento internacional; el chat público continúa apagado. [Revisión de proveedores y consulta preparada, no enviada](legal/SARIN-REVISION-DATOS-Y-TERMINOS.md).

Verificación focal de esta preparación: 27/27 pruebas de build, launcher y retención aprobadas; preparación local repetida sin migraciones pendientes. La API del Worker confirma el cron configurado `0 * * * *`, pero eso no acredita todavía una ejecución. No hubo nuevas inferencias de visitantes ni publicación del código web.

Consulta remota de solo lectura del 16 de octubre a las 21:28 de Bogotá (17 de octubre, 02:28 UTC): estado de purga `never`, sin fechas de ejecución, éxito o error; pendientes cero, conversaciones cero y mensajes cero. Sigue pendiente observar la primera ejecución programada. Esta consulta no ejecuta la purga.

Segunda consulta remota a las 21:32 de Bogotá: mismos resultados, cero escrituras. El registro TOTP no equivale a haber ejecutado la purga.

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
- `SARIN_RETENTION_ENABLED=false` por defecto, con identificador D1 exclusivamente local. El entorno explícito `production` comparte la base de Pages y está desplegado con retención activa; falta observar su primera ejecución remota.
- Límites de servidor: 10 mensajes/minuto, 50/día por IP transformada; 15 turnos/conversación; 5 sesiones/minuto, 20/día; 2000 conversaciones, 64 MiB de texto lógico, 32 clases de evento/conversación y 10000 agregados de rechazo. No equivalen al tamaño físico total de D1.

Precios de cálculo: 300000/1200000 microUSD por millón de tokens de entrada/salida. Presupuesto global: 1000000/10000000 microUSD por día/mes UTC (1/10 USD). Reserva atómica antes de cada llamada; liquidación solo de uso comprobado. Incertidumbre conserva reserva; cero se liquida únicamente al comprobar ausencia de red. Historial y revisión de abuso no añaden llamadas de IA. Estimación en [STACK](../STACK.md). Contadores no son factura ni garantizan tarifas futuras. Alertas/límites de la cuenta no comprobados; ningún plan contratado.

Borrar D1 activo no promete eliminación inmediata de backups del proveedor. Plan/ventana Time Travel reales pendientes. [Restauración conservadora](SARIN-RESTAURACION.md): cerrar y drenar, borrar **todo** historial restaurado, conciliar capacidad, conservar dinero y mantener IA apagada hasta conciliar consumo o agotar períodos afectados. Una copia antigua no acredita saldo disponible.

## Verificación local

259/259 pruebas de build, launcher, cuotas, backend, sesiones, historial, Access/admin, integración SQLite, retención/recuperación y UI. Regresión analítica/escenas 80/80; Pages local real 6/6, incluidas rutas alternativas privadas y cookie HttpOnly/Secure en navegador. Cinco anchos 320–1440, teclado, no-JS y axe sin incidencias automáticas en superficies evaluadas. TypeScript mantiene doce errores previos en analítica/proyectos; ninguno nuevo de Sarin.

En la entrega local anterior: migración aplicada y preparación repetida sin pendientes; Worker empaquetado con `deploy --dry-run`; evento scheduled en workerd local con 200 y estado D1 `ok`. El Worker remoto se desplegó después, según el registro de preparación remota, sin haber observado aún una ejecución. Compatibilidad `2026-10-13` igual que Pages, admitida por runtime local. El endpoint temporal de simulación de Wrangler solo se usó en loopback durante QA; producto no implementa `fetch`.

Revisiones independientes de integración, UI/textos y purga/restauración sin hallazgos medios/altos pendientes. Corregidos lease con más de 100 pendientes, validación SQL de metadatos, filtro inválido durante carga y dos descripciones de retención. La muestra anterior de DeepSeek real valida transporte/modelo de forma acotada; esta ampliación usó datos/proveedores sintéticos, sin nuevas inferencias pagadas ni prueba de contención D1 remoto.

Evidencia ignorada: `test-results/sarin-admin-tests-final.txt`, `sarin-admin-regression-final.txt`, `sarin-admin-types-final.txt`, capturas `test-results/sarin/` y `test-results/sarin-admin/`.

## Activación posterior

1. Verificar condiciones API, roles, tratamiento internacional y retención efectiva de DeepSeek/Cloudflare; completar [guía de datos](legal/OPERACION-Y-SOLICITUDES.md). No afirmar cero retención o exclusión de entrenamiento sin prueba contractual.
2. Completar la sesión funcional del panel nuevo con el TOTP ya registrado. Verificar acceso fuerte real y denegación de identidad ajena/vencida, sin guardar tokens. La denegación anónima y la solicitud del segundo factor ya se comprobaron.
3. Publicar el código web revisado cuando corresponda y cambiar entonces el comando Git de Pages a `npm ci --prefix .github/sarin && node .github/cloudflare/build.mjs`, salida `dist`. Conservar D1 y secretos solo en producción, comprobar las Functions y el panel nuevo detrás de Access y revisar el candidato antes de activar chat/historial.
4. Observar primera ejecución remota del cron y heartbeat, verificar controles de cuenta y mantener el procedimiento de recuperación conservadora. D1, migraciones, respaldo vacío y Worker ya están preparados; no sustituir estas comprobaciones por la prueba local. Mantener `SARIN_ENABLED`, `SARIN_HISTORY_ENABLED`, `SARIN_ADMIN_ENABLED` apagados mientras falten los pasos. No activar previews contra datos operativos; cambiar flags no cancela inferencias en curso.

Preparación remota realizada sin push ni publicación del código web nuevo; únicamente el Worker de retención fue desplegado. [Diseño aprobado](superpowers/specs/2026-10-16-sarin-admin-historial-design.md), [plan](superpowers/plans/2026-10-16-sarin-admin-historial.md), [ADR-001](adr/001-sarin-d1-y-entornos.md) y [revisión jurídica](legal/SARIN-REVISION-DATOS-Y-TERMINOS.md).

## Candidato de publicación del panel privado

La administración se puede publicar con `SARIN_ADMIN_ENABLED=true`, conservando `SARIN_ENABLED=false`, `SARIN_HISTORY_ENABLED=false` y el botón público deshabilitado. Usa Access, el secreto CSRF y D1 vacía; no requiere DeepSeek ni recoge chats. La matriz está probada con identidad sintética y SQLite: bootstrap/listado 200 y sesión pública 503 sin cookie, registros o llamadas al proveedor. Esto permite separar la verificación del panel de la activación comercial pendiente.

La publicación en producción requiere la autorización de esa etapa. El candidato conserva previews sin D1 ni secretos, con administración apagada. Verificación focal: 29 pruebas de build/lanzador/UI, 59 administrativas y 6 de Pages local aprobadas; compilación de Functions correcta y revisión independiente sin hallazgos P1/P2. La autorización de crear el autenticador no se presenta como aprobación de publicar producción.
