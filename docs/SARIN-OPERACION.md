# Operación local de Sarin

Fecha: 16 de octubre de 2026. Estado: chat comercial y ampliación administrativa aprobada, implementados y verificados **en local, sin publicar**. No se ha configurado Access, D1 ni cron remotos. El panel deniega acceso mientras falte su configuración; no incorpora contraseña o autenticación de demostración.

## Preparar y abrir

Desde la raíz, con Node y Wrangler 4.150 o posterior:

```powershell
npm ci --prefix .github/sarin
node .github/sarin/dev.mjs --prepare
node .github/sarin/dev.mjs
```

`--prepare` construye `dist` y aplica migraciones pendientes únicamente en D1 local. Es repetible; no ejecuta de nuevo las aplicadas. El servidor abre `http://127.0.0.1:8791` con chat e historial apagados. Admite `--port 8792`; detener con Ctrl+C. No crea recursos ni despliega.

Secretos exclusivamente en `.dev.vars`, ignorado y excluido del artefacto: `DEEPSEEK_API_KEY`, `SARIN_IP_SECRET`, `SARIN_ADMIN_CSRF_SECRET`. El launcher conserva valores y genera los dos secretos técnicos si faltan, sin imprimirlos. Persistencia en `.wrangler/sarin-local`; configuración separada solo para migrar D1 local. Pages utiliza `wrangler.jsonc` estándar.

`node .github/sarin/dev.mjs --live` habilita chat e historial locales. **Enviar** mensajes llama a DeepSeek y puede consumir saldo; abrir o autorizar una sesión no llama a IA. Administración permanece apagada y exige Access real. `--live --prepare` prepara sin iniciar servidor. No hay bypass de autenticación para ver transcripciones.

## Conversaciones y consentimiento

Frontend nativo, Pages Functions y D1; única IA DeepSeek `deepseek-flash`, pensamiento desactivado, sin streaming ni reintentos. Catálogo y alcance comercial controlados por el servidor.

Aviso visible, casilla sin marcar y acción expresa antes de iniciar. `POST /api/sarin/session` acepta solo `{consent:{accepted:true,noticeVersion,privacyVersion,termsVersion}}`. Registra fecha, método, versiones y hash del aviso; devuelve referencia y cookie `__Host-sarin-session`, secreto aleatorio `HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400`. D1 conserva únicamente su hash. Esta evidencia no identifica civilmente al visitante.

`POST /api/sarin` recibe solo `{message,requestId}`. El servidor recupera hasta cuatro pares anteriores; no admite historial ni roles del navegador. Un turno pendiente por sesión. Repetir mensaje/UUID completado reproduce respuesta sin otra inferencia; cambiar el mensaje con el mismo UUID se rechaza. Borrar o vencer el historial impide que una respuesta tardía lo recree.

Se guardan mensajes admitidos, respuestas públicas validadas y errores públicos. Un mensaje admitido puede conservarse con error de cuota sin llamar a IA. Las peticiones inválidas o sin sesión no guardan contenido. No almacenar razonamiento, salidas descartadas, cuerpos de error del proveedor ni IP en las transcripciones. No hay contenido en analítica, consola ni almacenamiento persistente del navegador.

Referencia en chat y resumen editable de hasta 1800 caracteres. WhatsApp `573146432135` se abre por acción de la persona y conserva su revisión; la persona decide enviarlo. Recargar o iniciar otra conversación limpia la vista, **no elimina el historial del servidor**.

## Administración

Interfaz `/control-sarin/` y API `/api/control-sarin/*`: plugin oficial Access con firma, claims obligatorios y correo exclusivo del titular. API autentica también por separado. Mutaciones con origen exacto, JSON y CSRF de 15 minutos; respuestas `no-store` y sin indexación.

Filtros de fecha colombiana, servicio y estado; paginación; transcripción y eventos; prueba de autorización; uso verificado y reservas retenidas. Acciones: revisar, bloquear sesión por 24 horas, desbloquear y eliminar. Borrar no reinicia dinero. Las señales requieren revisión contextual y no prueban abuso. El panel muestra estado y última limpieza.

Configurar `SARIN_ADMIN_ENABLED`, `SARIN_ACCESS_DOMAIN` (HTTPS del equipo `*.cloudflareaccess.com`), `SARIN_ACCESS_AUD`, `SARIN_ADMIN_EMAIL` y secreto `SARIN_ADMIN_CSRF_SECRET` de al menos 32 caracteres. No hay valores de cuenta incorporados. Dependencia oficial aislada en `.github/sarin/`, nunca en el cliente.

## Retención, límites y costo

- Historial/autorización: 30 días desde primer mensaje admitido, sin renovación. Sesión operativa y sesión vacía: 24 horas.
- Cuotas por IP transformada/rechazos agregados: 48 horas. Auditoría de acciones: 30 días. Contadores globales y reservas: 35 días.
- Vencidos excluidos inmediatamente. Worker horario: máximo 20 lotes de 100, sin HTTP público. Fallas/retrasos pueden demorar eliminación física; supervisar. Las cuotas se limpian también durante peticiones.
- `SARIN_RETENTION_ENABLED=false` por defecto, identificador D1 exclusivamente local. Debe compartir la base exacta de Pages. Cron remoto todavía no desplegado.
- Límites de servidor: 10 mensajes/minuto, 50/día por IP transformada; 15 turnos/conversación; 5 sesiones/minuto, 20/día; 2000 conversaciones, 64 MiB de texto lógico, 32 clases de evento/conversación y 10000 agregados de rechazo. No equivalen al tamaño físico total de D1.

Precios de cálculo: 300000/1200000 microUSD por millón de tokens de entrada/salida. Presupuesto global: 1000000/10000000 microUSD por día/mes UTC (1/10 USD). Reserva atómica antes de cada llamada; liquidación solo de uso comprobado. Incertidumbre conserva reserva; cero se liquida únicamente al comprobar ausencia de red. Historial y revisión de abuso no añaden llamadas de IA. Estimación en [STACK](../STACK.md). Contadores no son factura ni garantizan tarifas futuras. Alertas/límites de la cuenta no comprobados; ningún plan contratado.

Borrar D1 activo no promete eliminación inmediata de backups del proveedor. Plan/ventana Time Travel reales pendientes. [Restauración conservadora](SARIN-RESTAURACION.md): cerrar y drenar, borrar **todo** historial restaurado, conciliar capacidad, conservar dinero y mantener IA apagada hasta conciliar consumo o agotar períodos afectados. Una copia antigua no acredita saldo disponible.

## Verificación local

259/259 pruebas de build, launcher, cuotas, backend, sesiones, historial, Access/admin, integración SQLite, retención/recuperación y UI. Regresión analítica/escenas 80/80; Pages local real 6/6, incluidas rutas alternativas privadas y cookie HttpOnly/Secure en navegador. Cinco anchos 320–1440, teclado, no-JS y axe sin incidencias automáticas en superficies evaluadas. TypeScript mantiene doce errores previos en analítica/proyectos; ninguno nuevo de Sarin.

Migración aplicada localmente y preparación repetida sin pendientes. Worker empaquetado con `deploy --dry-run`, sin publicar; evento scheduled en workerd local devuelve 200 y estado D1 `ok`. Compatibilidad `2026-10-13` igual que Pages, admitida por runtime local. El endpoint temporal de simulación de Wrangler solo se usó en loopback durante QA; producto no implementa `fetch`.

Revisiones independientes de integración, UI/textos y purga/restauración sin hallazgos medios/altos pendientes. Corregidos lease con más de 100 pendientes, validación SQL de metadatos, filtro inválido durante carga y dos descripciones de retención. La muestra anterior de DeepSeek real valida transporte/modelo de forma acotada; esta ampliación usó datos/proveedores sintéticos, sin nuevas inferencias pagadas ni prueba de contención D1 remoto.

Evidencia ignorada: `test-results/sarin-admin-tests-final.txt`, `sarin-admin-regression-final.txt`, `sarin-admin-types-final.txt`, capturas `test-results/sarin/` y `test-results/sarin-admin/`.

## Activación posterior

1. Verificar condiciones API, roles, tratamiento internacional y retención efectiva de DeepSeek/Cloudflare; completar [guía de datos](legal/OPERACION-Y-SOLICITUDES.md). No afirmar cero retención o exclusión de entrenamiento sin prueba contractual.
2. Configurar Access del titular para interfaz y API en dominio propio, `pages.dev` y alternativas. Verificar acceso fuerte real y denegación de identidad ausente/ajena/vencida, sin guardar tokens.
3. Preparar D1 remoto, respaldo y migraciones con base identificada; vincular Pages y Worker a esa misma base y configurar secretos privadamente. Comando Git de Pages necesario: `npm ci --prefix .github/sarin && node .github/cloudflare/build.mjs`, salida `dist`; no se cambió la cuenta.
4. Desplegar/verificar cron, heartbeat, recuperación y controles de cuenta. Revisar candidato antes de activar chat/historial. Mantener `SARIN_ENABLED`, `SARIN_HISTORY_ENABLED`, `SARIN_ADMIN_ENABLED` apagados mientras falten los pasos. No activar previews contra datos operativos; cambiar flags no cancela inferencias en curso.

Sin push, despliegue o configuración remota en esta entrega. [Diseño aprobado](superpowers/specs/2026-10-16-sarin-admin-historial-design.md), [plan](superpowers/plans/2026-10-16-sarin-admin-historial.md) y [revisión jurídica](legal/SARIN-REVISION-DATOS-Y-TERMINOS.md).
