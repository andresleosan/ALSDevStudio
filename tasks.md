# Tareas — ALS DevStudio

## ORDEN-PORTAFOLIO · Sarin cuarto y Dialon en lugar de Coco · 2026-10-17

- [x] Intercambiar Sarin Bot/Hampton Estates (puestos 4/19) y Dialon/The Coco Club (7/17), tanto en galería como en carrusel. Conservar los otros 16 puestos, enlaces, imágenes, textos y los 20 proyectos; ajustar IDs y etiquetas de las cuatro diapositivas.
- [x] TDD: dos fallos por posiciones anteriores y dos pruebas nuevas aprobadas. Regresión build/accesibilidad/normalización 32/32; primera y segunda página a 320/1440 px, avance del carrusel, enlaces y numeración correctos; build 222 recursos y diff limpio. Capturas diarias usan claves y no reescriben el HTML.
- [x] Autorización expresa recibida: «Sí, publicar sólo este cambio de orden». El rediseño administrativo y los ajustes de landing propuestos con Mobbin siguen pendientes de aprobación; no están implementados.
- [ ] Publicar y comprobar el orden en producción. Reversión: volver sólo al orden anterior de `index.html` mediante un commit nuevo tomando `6f97eb0` como base; conservar autenticación, contactos, datos y todos los demás cambios.

## SARIN-CONTACTO · Identificar nuevas conversaciones · 2026-10-17

- [x] Aprobación expresa «Sí, aplicar y publicar»: nombre, apellido y correo obligatorios; datos declarados, correo sin verificar, visibles en Staff, no añadidos automáticamente a IA ni publicidad. Históricos sin contacto; 30 días desde primer mensaje o 24 horas sin mensajes.
- [x] Implementar validación compartida, formulario accesible, DTO administrativo y migración aditiva atómica con contabilidad y borrado en cascada. Actualizar aviso v6, privacidad v5, términos v4 y recuperación.
- [x] Terminar pruebas: 481 distintas (429 regresiones, 40 UI, 6 Pages locales y 6 respaldo), sin P1/P2; cinco anchos/axe/tipos/Functions/build correctos. Respaldo privado restaurado en memoria y verificado antes de migrar D1.
- [x] Aplicar únicamente `0003_leads.sql` a producción; conteos originales 8 conversaciones/32 mensajes/8 consentimientos/30 reservas/23 contadores conservados, 0 contactos.
- [x] Publicar `9011bd8` / Pages `ea44f40a` desde `main`; producción Pages 5 PASS/1 omitida para evitar sesiones sintéticas, revisión HTTP 23/23 y UI 5/5. Artefacto LF `4206991de17e8ec8`, tres pruebas del normalizador edge y reversión documentada en `docs/SARIN-CONTACTO.md`; historial y presupuesto conservados.

## SARIN-FIREBASE-AUTH · Regreso a Google con Firebase · 2026-10-17

- [x] Confirmar alcance: sólo autenticación de Staff; conservar D1 e historial, sin restaurar el panel Firebase retirado.
- [x] Sustituir Access en código y retirar plugin obsoleto. Verificación final: 117 pruebas administrativas, incluida rotación de claves y compatibilidad Workerd, 15 UI (login/salida/renovación/carreras, cinco anchos y axe), 6 Pages locales y regresiones aprobadas; Functions y tipos estrictos del panel compilan. Auditoría npm sin vulnerabilidades. Backend completo en Workerd con identidad sintética válido 200 / firma ajena 403, sin D1 ni IA.
- [x] Configurar app/usuario/dominio existentes y publicar Firebase; retirar sólo la aplicación Access autorizada. Revisión remota 30/30 y probe final de firma ajena/consentimiento anterior 403 sin cookie; datos administrativos anónimos 403.
- [x] Confirmar inicio de sesión real del titular tras corregir el error de transporte reportado. El 17/10/2026 respondió «si me deja entrar» después de la publicación corregida `de87219` / Pages `b0414971`.
- [x] Autorización expresa de producción recibida: rehabilitar el único usuario, autorizar el dominio y sustituir Access, informando que no se conserva su TOTP. App web existente restaurada, usuario habilitado y `www.alsdevstudio.com` autorizado; Hosting antiguo sigue retirado, sin cambios de D1 ni facturación.
- [x] Registrar despliegues, limpieza de dependencia, reversión y confirmación final del titular. El TOTP de Access no se traslada a Firebase.

## SARIN-AVISO-ACCESO · Aviso breve y entrada con Google · 2026-10-17

- [x] Retirar el enlace administrativo del chat y renombrar únicamente el enlace del pie como «Staff», por solicitud posterior. Publicado `866c330` / Pages `c27ab819`; UI 18/18, build correcto, revisión sin hallazgos, cinco comprobaciones HTTP y Chrome. Ruta protegida y consentimiento v5 conservados.
- [x] Sustituir «para adultos» en la presentación por «para ayudarte a impulsar tu negocio con soluciones digitales». Aviso v5 publicado en `337948f` / Pages `c750942e`; UI/sesiones 39/39, build correcto, revisión sin hallazgos, seis comprobaciones HTTP y Chrome con recarga normal. Resto del aviso y autenticación conservados.
- [x] Aplicar aviso breve con ALS DevStudio como marca principal, identificación legal secundaria visible, proveedor enlazado y autorización internacional expresa. Conservar privacidad y términos v3; versionar el aviso completo como v4.
- [x] Añadir «Panel administrativo» al chat y al pie; retirar la sobrescritura JavaScript del aviso para conservar su marcado semántico.
- [x] Verificar UI/sesiones 39/39 y build/sesiones/administración 107/107. Cinco anchos 320–1440 px, teclado, objetivos de 44 px, axe sin hallazgos y contacto sin JavaScript. Revisión independiente sin P1/P2; capturas locales en `test-results/sarin/empty-390.png` y `empty-1440.png`.
- [x] Identificar causa de Firebase inhabilitado: retirada expresa del panel anterior el 15/10; usuario deshabilitado, sesiones revocadas y claim retirado. Consola actual confirma Google habilitado, usuario inhabilitado y plan Spark. Sarin usa un panel distinto con Access.
- Sustituido por SARIN-FIREBASE-AUTH: el titular cambió la elección y solicitó Firebase. No completar la integración Google/Access ni generar el secreto que quedó pendiente.
- [x] Publicar el cambio revisado en `f76d3db` / Pages `5560c540` y comprobar aviso v4, acceso visible y cierre privado: 12/12 comprobaciones HTTP, build remoto correcto y Chrome con recarga normal. Google conserva el paso de secreto pendiente del titular.

## SARIN-PUBLICO · Acceso visible y apertura solicitada · 2026-10-16

- [x] Reproducir ausencia del widget: despliegue correcto con flags públicos apagados; prueba privada y panel sí accesibles.
- [x] Añadir Administración al pie y consentimiento v3 explícito para envío internacional, sin promesas sobre retención o entrenamiento del proveedor.
- [x] Preparar ambos flags de producción activos, build coherente y previews/local cerrados; conservar Access, cuotas y retención.
- [x] Publicar `952d2cb` / Pages `53e29312`: 299 pruebas seleccionadas, 10 comprobaciones HTTP y Chrome en portada sin query con chat visible/aviso v3. Administración autenticada y Access anónimo comprobados; ninguna autorización pública real v3 se simuló en producción.
- [x] Registrar la declaración del titular del 16/10/2026: autorización de los veinte proyectos con marcas e imágenes, y logo/referencias de Sarin propios o con permiso comercial. No se inspeccionaron justificantes; mapa y voz del video tienen pendientes separados.

## PRIVACIDAD-SARIN · Revisión y demostración solicitadas · 2026-10-16

- [x] Identificar antes de editar actividad, ubicación, público, canales y datos a partir de la web y confirmaciones previas; no repetir preguntas respondidas ni autenticar documentos no inspeccionados.
- [x] Actualizar políticas reales y versiones v2, inventario de recursos y fuentes oficiales; delimitar condiciones de apertura pública y revisión profesional. Chakra OFL oficial restaurada y siete hashes comprobados.
- [x] Corregir analítica privada, cabecera HSTS, pausa del carrusel y nombres/foco accesibles. 370/370 pruebas, 6/6 Pages con D1 local nueva, 12/12 escaneos axe y teclado/reflujo. Sin nuevos errores TSC; revisión independiente sin P1/P2. No se probó NVDA ni zoom nativo.
- [x] Publicar cambios revisados en `main` (`bb9a88a`, `a13ae30`, `81784d3`), Pages final `7f36ae7e` y 14/14 HTTP. Chrome verifica versiones v2 con caché normal, inicio de sesión, cero analítica privada y prueba comercial/Mundial/recuperación (3 turnos, 6 mensajes, 1 fuera de alcance, 0 errores). Público apagado.
- [x] Probar cliente ficticio y desvío sobre el Mundial; video de 73,5 s, vertical 1080×1920/30 fps, voz colombiana y 25 subtítulos, seis capturas reales y cero provisionales. MP4 y copia sin voz comprobados; textos WhatsApp/Facebook entregados sin publicar. Voz para revisión: licencia comercial pendiente de acreditar o sustituir, según la relación de permisos del entregable. Carpeta externa `../Entregables/Sarin-Promo/entrega/`.

## SARIN-WWW-PRIVADO · Pruebas del titular en el dominio · 2026-10-16

- [x] Preparar prueba privada solicitada para `www`: enlace desde panel, query de presentación, bootstrap del titular y POST Access/CSRF, sin habilitar chat público.
- [x] Aislar cookie y hash privados, conservar cuotas/presupuesto, contrato y D1 con 30 días; preview/local apagados, sin migraciones ni secretos nuevos.
- [x] Regresiones RED/GREEN y 282/282 pruebas de Sarin/build; UI 29/29, revisión independiente sin P1/P2, audit sin vulnerabilidades, TSC sin errores nuevos de Sarin y build/Functions correctos.
- [x] Preview `cd64f7c1` 14/14; push autorizado a `main` en `828bdd5`, producción `03625efb` correcta y 14/14 HTTP anónimas. Chrome comprueba dos turnos reales, cuatro mensajes en el panel, retención, resumen de 836 caracteres y enlace WhatsApp sin enviar; prueba nueva abierta para el titular. Público apagado. [Operación y reversión](docs/SARIN-OPERACION.md#prueba-privada-publicada-en-el-dominio--16-de-octubre-de-2026).

## SARIN-QA · Prueba local real y corrección de seguimientos · 2026-10-16

- [x] Preparar vista local `http://127.0.0.1:8792/` con DeepSeek real, historial D1 local y datos ficticios; conservar producción con chat apagado.
- [x] Reproducir fallos de seguimiento, distinguir contenido vacío sin exponer cuerpos y comparar tres contextos: roles independientes fallan; datos JSON dan tres clasificaciones correctas. Corregir representación del contexto con regresiones RED/GREEN, sin reintentos ni relajación de controles.
- [x] Corregir cierre comercial: resumen revisado y WhatsApp manual, sin prometer que Andrés contactará al visitante.
- [x] Verificar 98/98 focales de backend/integración y suites ampliadas; revisión independiente sin P1/P2. Pruebas reales finales de tienda/pagos y aplicación/demos 4/4 con 200; Chrome verifica rechazo de inyección, salida de tema, recuperación a chatbot y edición/límite de resumen. Historial local vence a 30 días. [Evidencia y operación](docs/SARIN-OPERACION.md#prueba-local-con-deepseek-real--16-de-octubre-de-2026).
- [x] Dejar inicialmente conversación y servidor locales para probar; la corrección se publicó después con SARIN-WWW-PRIVADO. El historial local permanece separado del panel de producción.

## SARIN-INFRA · Preparación remota con funciones públicas apagadas · 2026-10-16

- Estado: **panel privado publicado con autorización expresa**, GitHub `main` sincronizado y despliegue Pages `9ab95b55` correcto. Build con `npm ci --prefix .github/sarin`; administración activa, chat e historial públicos apagados. Sesión del titular y primera purga remota comprobadas.
- [x] Crear D1 exclusiva `alsdevstudio-sarin`, UUID `ba6d723c-57fb-472d-b9c0-1308c24912e3`, jurisdicción `us`/ubicación ENAM; aplicar 0001/0002, verificar cero conversaciones/mensajes y restaurar un respaldo vacío en prueba. [ADR-001](docs/adr/001-sarin-d1-y-entornos.md).
- [x] Provisionar privadamente secretos API/IP/CSRF y configuración Access de Pages en producción; preview sin D1 ni secretos, con los tres flags apagados.
- [x] Configurar Access exclusivo del titular en los seis destinos de interfaz/API (`www`, `pages.dev` y previews), sesión de 6 h y TOTP requerido cada 6 h. Activar Proxied solo en CNAME `www`, conservando destino y demás DNS. Verificar portada 200 e interfaz/API privadas 302 hacia Access, también en preview.
- [x] Cambiar por instrucción del titular el nombre visual de la organización Access a **ALS Dev Studio** y comprobarlo en el login real, conservando dominio de autenticación y autorizaciones. El registro TOTP y la sesión posterior se completaron después.
- [x] Desplegar Worker `als-sarin-retention`, versión `fc6b4b0f-3aad-4559-a3fc-17a0aae1be9c`, misma D1 y cron `0 * * * *`, sin HTTP público, `workers.dev` ni URLs de preview. Perfil predeterminado local apagado con UUID simulado.
- [x] Repetir pruebas focales build/launcher/retención 27/27 y preparación local sin migraciones pendientes; confirmar cron configurado mediante API, sin acreditar todavía una ejecución. Revisar el perfil real de DeepSeek sin encontrar controles específicos API de entrenamiento, retención o DPA; mantener chat apagado y documentar condiciones pendientes.
- [x] Registrar credencial TOTP por el titular, comprobar dispositivo en su cuenta y solicitud real de segundo factor al entrar a Sarin, sin leer códigos ni QR.
- [x] Corregir disponibilidad pública: chat oculto y sin eventos por defecto, activación explícita solo para la vista local `--live`; 29 pruebas build/lanzador/UI y 6 de Pages local aprobadas. Probar publicación independiente de admin con chat/historial apagados: 59 pruebas administrativas aprobadas.
- [x] Publicar solo preview `f2dd9eee` desde commit `e677449`, sin D1, secretos ni flags activos. Verificar web/políticas 200 con noindex, rutas privadas 302 a Access, chat oculto y producción conservada en `38c298b7`. [Candidato y reversión](docs/SARIN-OPERACION.md#preview-publicada-para-revisión).
- [x] Publicar el panel privado tras autorización explícita de producción; verificar sesión real del titular tras TOTP, listado vacío y cierre anónimo. Identidades ajenas/vencidas probadas con material criptográfico sintético. Mantener chat/historial públicos apagados.
- [x] Observar primera purga remota correcta: 16 de octubre 22:00:34.515 Bogotá, estado `ok`, sin error ni pendientes; D1 con cero conversaciones y mensajes. El panel muestra la última ejecución.
- [x] Corregir P2 de RUM automático en el dominio proxied mediante regla exclusiva de `www`, sin cambiar la instalación manual. Catorce comprobaciones HTTP posteriores aprobadas; navegador confirma cero scripts al rechazar y uno al aceptar, restaurando la elección inicial.
- [ ] Completar condiciones efectivas de DeepSeek y tratamiento internacional antes de habilitar chat e historial públicos. La administración ya está publicada; no depende de activar IA. [Operación actual](docs/SARIN-OPERACION.md).

## SARIN-ADMIN · Historial y revisión de datos · 2026-10-16

- [x] Confirmar intención y retención: cada conversación para revisar uso/abuso; el titular elige 30 días para historial completo y borrado automático.
- [x] Auditar administración retirada, contrato actual, cuotas, datos y afirmaciones públicas. Investigar fuentes oficiales de Colombia, DeepSeek y Cloudflare; preparar cláusulas y diseño concretos, sin cambiar el funcionamiento ni recoger conversaciones reales.
- [x] Aprobación expresa del titular («aprobado») del [diseño propuesto](docs/superpowers/specs/2026-10-16-sarin-admin-historial-design.md) y los [textos de datos y términos](docs/legal/SARIN-REVISION-DATOS-Y-TERMINOS.md) para implementar la ampliación local.
- [x] Implementar panel privado, sesiones e historial del servidor, autorización previa y purga programada; actualizar avisos y guía. Pruebas con datos ficticios, sin publicar.
- [x] Verificar: 259/259 principales, analítica/escenas 80/80, Pages local 6/6. Migración incremental repetible; cookie real segura; todas las rutas/alias privados cerrados. Worker scheduled local 200 y heartbeat D1 ok; dry-run sin despliegue.
- [x] Revisiones independientes de integración, UI/legal y retención/recuperación. Corregidos lease con más de 100 pendientes, metadatos SQL, filtro inválido durante carga y descripciones de auditoría/purga. Sin hallazgos medios/altos pendientes. TSC mantiene 12 errores previos de analítica/proyectos; ninguno nuevo de Sarin.
- [x] Preparar activación, costos y restauración en [operación](docs/SARIN-OPERACION.md) y [runbook](docs/SARIN-RESTAURACION.md). Entrega inicial solo main/commit local, sin push ni recursos remotos entonces; la preparación posterior se registra en SARIN-INFRA.
- [ ] Verificar configuración y contratos de los proveedores y tratamiento internacional, antes de una activación pública autorizada.

## SARIN-WEB · Entrega inicial anterior a SARIN-ADMIN · 2026-10-16

- Estado histórico de la entrega inicial: implementación local validada, todavía sin publicar entonces. La administración se publicó posteriormente, según SARIN-INFRA; el chat sigue apagado.
- [x] Implementar Pages Function `/api/sarin`, catálogo cerrado y DeepSeek `deepseek-flash` con pensamiento desactivado; D1 para cuotas/reservas sin conversaciones. Límites de aplicación: 10/min y 50/día por IP pseudonimizada, 1 USD/día y 10 USD/mes globales.
- [x] Implementar interfaz Vanilla JS, memoria de pestaña, contexto de cuatro pares y quince turnos; resumen editable de hasta 1800 caracteres, WhatsApp manual y contacto disponible ante fallo.
- [x] Preparar build y desarrollo exclusivamente local, secretos ignorados y modo apagado por defecto; sin recursos remotos ni despliegue.
- [x] Verificar interfaz con dobles: `node --test .github/cloudflare/sarin-ui.test.mjs`, 7/7 PASS; cinco anchos 320/390/680/900/1440, axe sin violaciones en el diálogo, teclado/IME/foco/analítica prioritaria, cancelación, resumen y no-JS. Botón cerrar mínimo 44 × 44 px, con regresión RED/GREEN; capturas en `test-results/sarin/`.
- [x] Completar prueba integrada local con DeepSeek real y cuotas activas: landing, tienda, chatbot y pregunta ajena con 200; navegador móvil con dos ejemplos, resumen editable exacto para WhatsApp y cero errores. Corregidos redirect incompatible de `workerd` y reformulación del borrador; solo metadatos técnicos en logs.
- [x] Cerrar QA local: suite conjunta 120/120, Pages/escenas 64/64, capturas revisadas y revisión independiente sin bloqueantes. TypeScript conserva doce errores previos fuera de Sarin. Muestra D1 local: 2110 microUSD verificados + 12196 retenidos, sin bloqueo global; no representa la factura de la cuenta.
- [ ] Activación pública del chat: código y administración publicados posteriormente según SARIN-INFRA; siguen pendientes condiciones del proveedor y límites/alertas de cuenta. No se afirma un límite de facturación verificado.
- [Diseño](docs/superpowers/specs/2026-10-16-sarin-chat-web-design.md), [plan](docs/superpowers/plans/2026-10-16-sarin-chat-web.md) y [operación](docs/SARIN-OPERACION.md).

## ADMIN-RETIRADA · Volver a la landing sin panel · 2026-10-15
- Solicitud del titular: retirar el panel administrativo y su publicación Firebase, limpiar el código y conservar `https://www.alsdevstudio.com/`.
- [x] Copia de recuperación local verificada antes de retirar archivos. Eliminar enlace, página, estilos, rutas y soporte del build; conservar cambios recientes del mapa.
- [x] Retirar módulo y documentación administrativa. Build 12/12 y 205 archivos; Pages local final 4/4, móvil 320–1440 px, teclado, axe 0 y no-JS. Mapa conserva ciclo, pausas y selección. Direcciones antiguas con retorno 301 a la portada, comprobadas con y sin query tras corregir la copia obsoleta de `/admin` en la caché pública.
- [x] Retirar servicios Firebase del panel: Hosting 404, API/Run, Firestore y recursos exclusivos eliminados; acceso administrativo revocado y facturación desvinculada únicamente de este proyecto. Informe final aprobado y respaldo externo verificado.
- [x] Publicado por `main` en `4c04f88` y `51b67b3`. Pages público final 4/4; www 200 con artefacto idéntico, apex 301 a www, antiguas rutas 301 a portada y Firebase 404. Revisión independiente sin bloqueantes.
- [Registro y recuperación](docs/RETIRADA-PANEL.md).

## GLOBAL-METRICS · Retirar la franja de contadores · 2026-10-15
- [x] Quitar los dos contadores, el botón «Pausar recorrido» y sus estilos/listeners exclusivos. Mantener el recorrido sin depender del botón y la pausa por interacción.
- [x] QA en navegador: ciclo completo, hover, visibilidad, teclado y selección manual; cinco anchos 320–1440 px sin overflow ni hallazgos axe, movimiento reducido y no-JS. Build 12/12, 206 archivos / 4.905.637 bytes; capturas revisadas y revisión independiente sin bloqueos.
- Publicación por `main`; reversión mediante commit nuevo restaurando los tres archivos públicos de `59a8692`.

## GLOBAL-CONSOLE · Mejorar la ficha de ubicación · 2026-10-15
- [x] Unificar los dos recuadros inferiores en una tarjeta: país destacado, mensaje propio de la ubicación y coordenadas con etiquetas Latitud/Longitud. Retirar antetítulos y barra decorativa.
- [x] Sincronizar el mensaje mediante `textContent`, conservando IDs, selección, pausa y anuncios exclusivamente manuales. QA RED/GREEN del detalle automático/manual; recorrido existente 10 comprobaciones, axe 0 y sin errores.
- [x] Nueve anchos entre 320 y 1440 px, incluyendo ambos lados de los breakpoints: altura estable al recorrer los ocho países y sin overflow. Capturas revisadas; build 12/12, 206 archivos / 4.908.382 bytes.
- Publicación por `main`; reversión de los tres archivos públicos mediante commit nuevo hacia `e7eaee3`.

## GLOBAL-LABELS · Retirar rótulos del mapa · 2026-10-15
- [x] Quitar los tres grupos señalados: trabajo remoto/colaboración a distancia, mapa ilustrativo/ALS 2026 y pie del mapa. Retirar su CSS y recomponer márgenes; conservar países, métricas y controles.
- [x] Build 12/12, 206 archivos / 4.909.393 bytes; QA del mapa 10 comprobaciones, axe 0, sin errores ni red externa, móvil/reducido/no-JS y capturas revisadas. El harness local se actualizó para no buscar el control del hero retirado anteriormente.
- Publicación mediante push normal a `main`; reversión con commit nuevo restaurando `index.html` y `styles/main.css` de `ef214fb`.

## GIT-MAIN · Consolidación en una única rama · 2026-10-14
- Solicitud del titular: «unifica todas las ramas, quiero tener una unica rama main». Integrar el panel, conservar toda la historia y retirar las ramas auxiliares locales/remotas.
- Integración: panel `1708cfe` por fast-forward; las demás ramas ya eran ancestros de `main`, excepto 39 commits de `feat/depth-3d-live-previews` con parches equivalentes ya integrados. Se incorporan como historia con estrategia `ours`, conservando las decisiones posteriores de privacidad y diseño.
- Verificación: build público 12/12 y 205 archivos / 4.908.959 bytes; sin cambios de archivos públicos respecto de `origin/main`, sin `dist/control` y sin cambios en `control/` respecto del panel probado. Copia completa del historial verificada con `git bundle verify` antes de la limpieza.
- [Registro y recuperación](docs/GIT-MAIN.md). Política de rama única incorporada a `AGENTS.md`. El panel integrado entonces se retira el 15 de octubre; ver ADMIN-RETIRADA.

## SEMAN-PROCESS · Espacio en construcción y corregir salto de Sarin · 2026-10-14
- Estado: desplegada y verificada en producción. Placeholder SemanControl no clicable en galería20; conservar19 capturas/carrusel, enlaces/orden/filtros. Marca En construcción, sin capturas ficticias, URL errónea o funcionalidades no verificadas.
- Alinear frameB Proceso+12.5% tras diagnosticar desalineación40px; mantener pose/tecleo/texto y otros assets/animaciones. Regression de registro de cabeza/patas, imágenes reales, noJS/reducido y finales estables.
- Repetir QA focal de placeholder/filtros/carrusel y geometría320/390/1440; build/revisión de seguridad y candidato. Reversión normal a la base anterior a esta tarea, sin migraciones, publicación de SemanControl ni servicios/dependencias nuevos.
- Cronos repitió registro RED (salto11–13.96px) y GREEN9/9 (máximo0.042px), placeholder6/6 e integración10/10/sieteanchos/noJS/reducido/axe PASS. TSC aislado de depth, sintaxis y diff-check PASS; build198archivos/5.198.797bytes. Inspección visual desktop/móvil y A/B estable, sin nuevos hallazgos críticos. Evidencia y reversión en `docs/SEMANCONTROL-SARIN-ESTABLE.md`.
- Candidato `https://027c6235.alsdevstudio.pages.dev/` de `08cfe52`: Cronos repitió Pages4/4, placeholder6/6 y registro9/9 PASS. Chrome confirma article/transform aplicado/sin overflow y conserva capturas del catálogo y Proceso. Revisión independiente final sin bloqueantes; main conserva la entrega anterior hasta confirmar esta continuación.
- El titular autoriza explícitamente: «Sí, publicar SemanControl y la corrección». Promover el artefacto público del candidato revisado mediante push normal a main y comprobar www antes del cierre.
- Publicada en main `1c4240a`, despliegue `02feeaf8`. Cronos repitió www Pages4/4, placeholder6/6 y registro9/9 PASS: catálogo20/19, filtros/carrusel, pose estable320/390/1440, noJS/reducido y artefacto/cabeceras/consentimiento conservados. Chrome y capturas de producción confirman ambas entregas. Cierre documental sin cambios públicos.

## SARIN-CATALOG-FLIGHT · Proyecto nuevo y vuelo con cinco mensajes · 2026-10-14
- Estado: desplegada y verificada en producción. Sarin Bot como proyecto19/Producto/Próximamente en galería y carrusel con captura real y siete formatos locales; orden y navegación de los18 anteriores conservados.
- Vuelo sin «Hola»: alternar ida/vuelta y cinco textos de servicios ALSDevStudio, confirmados por el titular, con paradas centrales y giro en extremos. Conservar suspensión viewport/hidden, noJS/reducido y ausencia de botones manuales.
- Verificar módulo, build, carrusel19→1, filtros, captura/imagen, cinco textos/direcciones/giro/pausas y estabilidad320–1440. Reversión por commit normal, base `6ef732f`. Preparar candidato revisable antes de producción; sin migraciones, servicios o gasto nuevo.
- Cronos repitió módulo60/60, build tests12/12, TSC aislado/sintaxis/diff-checkPASS; build198archivos/5.197.345bytes. Integración10/10/sieteanchos/noJS/reducido/axe, fotogramas18/18 y catálogo6/6PASS. Revisiones independientes sin bloqueantes. Se corrigió expectativa de URL normalizada en harness nuevo, sin cambiar producto. Evidencia/reversión en `docs/SARIN-PROYECTO-Y-VUELO.md`.
- Candidato `610652e6` de `663503b`: Pages4/4, catálogo6/6 y HTTPfocal8/8 PASS repetidos por Cronos; controlador y7assets exactos a dist. Chrome confirma flightplaying/5textos/selección/giro/0botones/sin overflow; capturas guardadas. Main permanece `6ef732f` hasta confirmación de publicar el conjunto con el nuevo proyecto.
- El titular confirma «Sí, publicar ambos cambios». Promover el artefacto público revisado de esta tarea y verificar www antes del cierre; SemanControl y movimiento de Proceso continúan por separado.
- Publicada en main `a19c91e`, despliegue `aeb5c225`: Cronos repitió www Pages4/4, catálogo6/6 y HTTPfocal8/8 PASS. Captura/informes conservados, sitio indexable y consentimiento/cabeceras conservados. Cierre documental sin cambios públicos; nueva tarea SemanControl/estabilidad en continuación.

## PORT-01 — Ampliación del portafolio — 2026-10-12
- Estado: aprobada (implementación local; sin desplegar).
- Alcance: corregir la vista previa de BPT; añadir Hampton Estates a su lado; incorporar Dialon y Vigia como proyectos en construcción en galería y carrusel.
- Capturas: pipeline existente ejecutado para BPT, Hampton Estates, Dialon y Vigia; 28 imágenes JPG/AVIF/WebP verificadas y 128 referencias locales existentes.
- QA: `node test-results/portfolio-qa.mjs` — PASS en Chromium a 320×568, 390×844, 430×932, 768×1024 y 1440×900; sin overflow, imágenes rotas, errores JavaScript ni respuestas locales fallidas. Galería y carrusel: 18 proyectos; filtros y enlaces verificados. Capturas de evidencia y resultados en `test-results/portfolio-*` (artefactos locales ignorados por Git).
- Previsualizaciones verificadas con las cabeceras de `vercel.json`: Hampton Estates y Dialon cargan en vivo; BPT y Vigia conservan la captura sin montar marcos bloqueados.
- Seguridad: enlaces HTTPS con `noopener`, orígenes de marcos permitidos explícitamente, sandbox existente conservado; sin dependencias nuevas, secretos, endpoints ni hallazgos críticos en el cambio.
- `node --check scripts/main.js` y `git diff --check`: PASS.

## Tareas anteriores

- [x] Auditoría de landing heredada y definición de alcance.
- [x] Consulta de assets de marca en `F:\Proyectos\ALS DevStudio\Img`.
- [x] Consulta pública de repositorios y demos de `andresleosan`.
- [x] Definir Design DNA en `STACK.md`.
- [x] Implementar rebranding, portafolio curado e interacciones.
- [x] Verificar sintaxis, rutas de assets, responsive y reduced motion.
- [x] Auditoría final de seguridad y QA con evidencia.

## Evidencia de cierre
- `node --check` sobre el JavaScript embebido: PASS.
- Validación de landing y assets: HTML publicado en Vercel `200`; 9 capturas de proyecto y 2 assets de marca presentes.
- Conteo verificado: 6 proyectos con imagen, 4 filtros, 6 slides de proyectos en el hero, marquesina a 14s y 20 enlaces externos seguros.
- Escaneo de seguridad estática: PASS sin secretos, `javascript:` ni `target="_blank"` sin `noopener`.

- [x] Refinar carrusel: logo de navegación, proporción de capturas, contacto por WhatsApp y limpieza del correo temporal.

## QA de esta iteración
- JavaScript embebido: sintaxis PASS.
- 6 tarjetas y 6 capturas verificadas; proporción 16:10 y altura mínima 420px.
- 15 enlaces externos seguros, cero URLs javascript: y correo temporal ausente.

- [x] Rediseñar contacto como mini brief interactivo con mensajes dinámicos de WhatsApp.

## QA de esta iteración
- JavaScript embebido: sintaxis PASS.
- Mini brief con 3 opciones, mensaje dinámico y enlace al +57 314 643 2135.
- Correo ausente; 15 enlaces externos conservan rel="noopener"; cero URLs javascript:.

- [x] Rediseñar proyectos con dos columnas equilibradas, capturas grandes y tarjetas completas clicables.

## QA de esta iteración
- JavaScript embebido: sintaxis PASS.
- 6 tarjetas con imagen y enlace directo a cada proyecto.
- Cero textos Demo/Código dentro de las tarjetas; 9 enlaces externos seguros.

- [x] Incorporar los 19 proyectos públicos restantes, excluyendo exactamente HTML-CSS, layoutresponsive, prueba2, ejercicio-react, performai, Analista y Fullstack-Challenge---E-commerce.

## QA de esta iteración
- 19 capturas de Chromium integradas en el carrusel inicial y la grilla.
- 19 tarjetas completas clicables; capturas de GitHub usadas solo cuando no existe demo pública verificada.

- [x] Validar y limpiar la sección de proyectos: retirar Cronos, ALS DevStudio y las demos sin sitio publicado; usar capturas web verificadas y enlaces directos a demos.

## QA de esta iteración
- `node --check` sobre el JavaScript embebido: PASS.
- 15 tarjetas y 15 slides visibles; 0 overlays `project-code`/`project-type`; 0 destinos GitHub en tarjetas.
- 15 assets locales verificados; 6 capturas web regeneradas desde demos públicas.
- 15 destinos web comprobados con HTTP 200; SurtiFacil y Coctelsops-F- se excluyeron porque sus demos declaradas respondieron HTTP 404.
- Auditoría estática: sin URLs `javascript:`, sin secretos nuevos y enlaces externos con `rel="noopener"`.

- [x] Consolidar la entrada única de la landing en `index.html` y retirar el HTML duplicado del repositorio.

## QA de esta iteración
- Hash SHA256 de ambos HTML idéntico antes de la eliminación.
- `STACK.md` actualizado; no quedan referencias al archivo eliminado.
- `node --check`, auditoría estática y comprobación de enlaces ejecutadas con PASS.

- [x] Actualizar captura web de Hachi Grecia Spa y conservar su enlace directo a la demo.

## QA de esta iteración
- Web `https://hachi-greciaspa.vercel.app/`: HTTP 200.
- Captura reemplazada: `assets/projects/hachi-greciaspa.png`, 2560×1600.
- `node --check`, auditoría estática y `git diff --check`: PASS.

- [x] Mejorar la captura de Hachi Grecia Spa para mostrar el hero real con logo central y navegación visible.

## QA de esta iteración
- Asset PNG actualizado en assets/projects/hachi-greciaspa.png, 1657×949.
- Carrusel local verificado: la captura se carga, el slide cambia a Hachi y la etiqueta Hachi Grecia Spa / pet care aparece correctamente.
- Tarjeta de proyecto verificada en el DOM con enlace directo a https://hachi-greciaspa.vercel.app/.
- Consola del navegador local: 0 errores.

- [x] Añadir fondo generativo reactivo y puntero personalizado con el logo ALS.

## QA de esta iteración
- node --check sobre el JavaScript embebido: PASS.
- Navegador local: canvas de fondo activo a 1680×949, puntero ALS visible en puntero fino y logo cargado desde favicon.svg.
- Interacción verificada: el puntero actualiza su posición, el fondo responde con halo y la landing conserva su navegación.
- prefers-reduced-motion: la rama estática evita la animación y desactiva el cursor personalizado.
- Consola del navegador local: 0 errores.
- Seguridad del código nuevo: sin eval, red, almacenamiento, cookies ni secretos.

- [x] Reducir el puntero personalizado con el isotipo ALS manteniendo su posición centrada.

## QA de esta iteración
- Puntero ALS reducido de 46×46 px a 36×36 px; isotipo de 28×28 px a 21×21 px.
- Navegador local: cursor visible con puntero fino, centrado y cargando favicon.svg; fondo reactivo continúa activo.
- prefers-reduced-motion y fallback táctil conservados.
- node --check: PASS; consola del navegador local: 0 errores.

- [x] Actualizar las vistas de Mercado Inteligente, PintuMaster y Coctels OPS con las capturas entregadas.

## QA de esta iteración
- Assets reemplazados: mercadointeligente.png, pintumaster.png y coctelsops.png.
- Carrusel y tarjetas reutilizan las rutas existentes; no se modificaron enlaces externos.
- Se actualizaron nombres y textos alternativos para Mercado Inteligente y Coctels OPS.

- [x] Priorizar el orden visual de proyectos solicitado en carrusel y galería.

## QA de esta iteración
- Primeros seis en carrusel y galería: Multiogar, tecnifullgas, BPT-Jersey, SiliconeSolutions, La Parada y The Coco Club.
- El resto conserva su orden relativo después de ese bloque prioritario.
- Enlaces, categorías, imágenes y filtros se mantienen sin cambios funcionales.

- [x] Retirar efectos decorativos de las capturas del portafolio.

## QA de esta iteración
- Eliminados los aros decorativos superpuestos sobre las capturas.
- Eliminados el zoom y el filtro de imagen al pasar el cursor; las interfaces permanecen fieles a sus capturas.
- La navegación, los enlaces y los filtros de proyectos permanecen intactos.

- [x] Ajustar el segundo bloque prioritario después de The Coco Club.

## QA de esta iteración
- Después de The Coco Club aparecen: Mundo Celular, Hachi Grecia Spa, PintuMaster y Coctels OPS.
- Los proyectos restantes conservan su orden relativo después del bloque prioritario.

- [x] Separar CSS y JavaScript del HTML y ordenar la estructura de recursos.

## QA de esta iteración
- `index.html` conserva únicamente la estructura y enlaza `styles/main.css` y `scripts/main.js`.
- CSS y JavaScript extraídos sin cambios funcionales; assets existentes permanecen en `assets/brand` y `assets/projects`.
- Estructura final: `index.html`, `styles/main.css`, `scripts/main.js` y `assets/`.

- [x] Añadir imagen social Open Graph y metadatos de preview para compartir ALS DevStudio.

## QA de esta iteración
- Imagen social generada en assets/brand/og-image.png con tamaño 1200×630 px.
- Añadidos metadatos og:*, twitter:* y canonical con la URL pública de ALS DevStudio.
- La imagen utiliza la identidad visual de la portada ALS y está optimizada como PNG.

- [x] Rediseñar el mini brief de contacto con rutas de Landing page, tienda virtual y solución web.

## QA de esta iteración
- Las opciones 01, 02 y 03 ahora representan Landing page, Tienda virtual y App o solución web.
- Cada ruta tiene copy propio y actualiza el mensaje de WhatsApp mediante data-message.
- Se añadió aria-pressed para comunicar la selección a tecnologías asistivas.

- [x] Refinar la sección de contacto y el mini brief para mejorar jerarquía, espaciado y conversión.

## QA de esta iteración
- El contacto ahora comunica una promesa más concreta y muestra tres pasos de inicio para reducir fricción.
- El mini brief usa títulos más escaneables, CTA más directo y una proporción de columnas con mejor balance visual.
- Añadido foco visible al selector y role region al panel para conservar una interacción accesible.
- QA real: node --check scripts/main.js PASS; git diff --check PASS; 36 referencias locales verificadas sin faltantes; sin eval, almacenamiento local, red nueva ni secretos en los archivos tocados.

- [x] Mostrar proyectos sin retraso al entrar en la sección.

## QA de esta iteración
- Retirado el atributo data-reveal del contenedor global de proyectos para evitar que toda la grilla permanezca invisible mientras espera al IntersectionObserver.
- Las imágenes mantienen loading lazy y decoding async para cargar progresivamente sin bloquear la aparición de las tarjetas.

- [x] Ocultar barra incrustada en la captura de Mundo Celular.

## QA de esta iteración
- El encuadre de Mundo Celular ahora prioriza la esquina superior izquierda y deja fuera la barra del navegador incluida en el screenshot.
- No se modificaron el enlace, el asset original ni el comportamiento global de las tarjetas.

- [x] Actualizar captura de PintuMaster con el dashboard entregado.

## QA de esta iteración
- Reemplazado assets/projects/pintumaster.png conservando la ruta usada por la tarjeta.
- La captura muestra el dashboard de PintuMaster y mantiene el enlace público del proyecto.

- [x] Actualizar captura de Coctels OPS con la vista de domicilio y Los más TOP.

## QA de esta iteración
- Reemplazado assets/projects/coctelsops.png conservando la ruta consumida por la tarjeta.
- La nueva captura muestra la navegación, el bloque de domicilio y la sección de productos destacados.

- [x] Actualizar captura de Mercado Inteligente con la vista de presupuesto y compras.

## QA de esta iteración
- Reemplazado assets/projects/mercadointeligente.png conservando la ruta consumida por la tarjeta.
- La nueva captura muestra Presupuesto diario y Registrar compra, con el enlace del proyecto intacto.

- [x] Corregir acentos dañados por codificación incorrecta.

## QA de esta iteración
- Corregidos los textos de Mercado Inteligente, AUDITORIA.md y tasks.md.
- Escaneo UTF-8 sobre archivos de texto: 0 coincidencias de mojibake; node --check PASS y git diff --check PASS.

- [x] Corregir encuadre de PintuMaster para mostrar el dashboard completo.

## QA de esta iteración
- La tarjeta respeta la proporción panorámica real de la captura y evita cortar el dashboard lateralmente.
- El ajuste es específico de PintuMaster; las demás tarjetas mantienen su proporción visual.

- [x] Elevar el lenguaje visual e interactivo de la landing completa.

## QA de esta iteración
- Refinada la jerarquía tipográfica y el contraste de selección/hover sin cambiar la identidad documentada.
- Añadida barra de progreso de lectura, navegación activa subrayada, botones magnéticos y halo direccional para tarjetas.
- Añadidas microinteracciones en capacidades, proceso y hero; las capturas no reciben zoom ni filtros invasivos.
- Conservado el fallback de prefers-reduced-motion; seguridad, sintaxis y referencias validadas con resultado limpio.

- [x] Crear mapa global interactivo para representar el alcance internacional de ALS.

## QA de esta iteración
- Añadida la sección 01 / alcance global con Estados Unidos, México, Colombia, Venezuela, Brasil, España y Jersey.
- Los puntos del mapa y los botones laterales comparten selección, estado accesible y mensaje contextual.
- Añadidas rutas animadas, pulsos de ubicación, rotación automática pausada al interactuar y soporte de teclado.

- [x] Rediseñar composición del mapa global para mejorar reconocimiento y balance visual.

## QA de esta iteración
- Sustituida la geometría rígida por una composición horizontal con continentes curvos y distribución más equilibrada.
- Conservados los 7 marcadores, las 6 rutas, la selección interactiva y el soporte de teclado.

- [x] Usar mapa geográfico real como base visual del alcance global.

## QA de esta iteración
- Añadido assets/brand/world-map.png con continentes reconocibles y fondo transparente.
- Sustituida la geometría SVG manual por el asset geográfico, conservando rutas, marcadores y selección interactiva.

- [x] Recalibrar el mapa con coordenadas geográficas y una composición más clara para las conexiones globales.
- Rutas y marcadores alineados con la nueva base geográfica.
- Panel del mapa ajustado para reducir espacio vacío y mejorar jerarquía visual.
- Añadida leyenda de conexiones verificadas y soporte responsive para el nuevo layout.
- Cada país cuenta ahora con una frontera vectorial real, un resaltado visible y un nombre completo para el punto seleccionado.
- La base cartográfica usa fronteras nacionales locales y excluye la Antártida del encuadre visual.
- Recompuesta la sección para eliminar el vacío inferior, añadir una señal contextual y reforzar la animación de red activa.

- [x] Unificar foco activo, coordenadas y señal global en una consola compacta del mapa.

## QA de esta iteración
- Coordenadas sincronizadas con los siete países y territorios activos.
- Consola responsive en dos columnas y una columna en móvil.
- Línea de nodos decorativa compatible con movimiento reducido.

- [x] Restaurar la rotación automática de países y compactar el espacio bajo el mapa.

## QA de esta iteración
- Eliminada la pausa por hover de toda la sección; la rotación continúa mientras el mapa está visible.
- La interacción manual reinicia el ciclo automático y el foco de teclado conserva la pausa accesible.
- Las ubicaciones pasan a una franja inferior compartida para equilibrar ambas columnas.
- [x] Igualar la tarjeta de PintuMaster con la altura visual de Coctels OPS.

## QA de esta iteración
- PintuMaster usa la misma proporción 16:10 y altura base que las demás tarjetas de proyecto.
- La captura conserva su encuadre completo mediante object-fit: contain y mantiene proporción fluida en móvil.
- Chrome headless: ambas tarjetas miden 579 × 477,625 px a 1280 px y 358 × 339,5 px a 390 px, sin desbordamiento horizontal.
- [x] Reubicar los países conectados dentro del espacio disponible de la columna izquierda del mapa.

## QA de esta iteración
- Chrome headless: la lista permanece dentro de .global-intro en escritorio, tableta y móvil, sin desbordamiento horizontal.
- Distribución verificada en 2 columnas a 1280 px, 4 columnas a 900 px y 2 columnas a 390 px.
- Selección sincronizada entre botón, país, marcador y etiqueta; rotación automática comprobada después de 4,4 segundos.

- [x] Actualizar la captura de La Parada e intercambiar su posición con Silicone Solutions en carrusel y galería.

## QA de esta iteración
- PNG adjunto aplicado byte a byte en `assets/projects/laparada.png`: 1626×952 px, SHA256 `888F0FDBA9F55BE9D589F37208E9F30C25CDF671647B4BD92C59706622C5C6C7`.
- Primeros seis del carrusel y la galería: Multiogar, Tecnifullgas, BPT-Jersey, La Parada, Silicone Solutions y The Coco Club.
- Chrome headless a 1238×912: BPT-Jersey y La Parada comparten la fila superior; Silicone Solutions ocupa la fila siguiente; las tres imágenes cargaron correctamente.
- `node --check scripts/main.js`, `git diff --check`, referencias locales y auditoría estática de enlaces/secretos: PASS.

- [x] Reemplazar la captura de La Parada por la versión final entregada.

## QA de esta iteración
- PNG final aplicado byte a byte en `assets/projects/laparada.png`: 1583×949 px, SHA256 `9821A8F4C7073F05DD7DAD6DEB0B755E4FFA17B56FF0B105214334CC60F59FCA`.
- Chrome headless a 1238×912: imagen cargada completamente con dimensiones naturales 1583×949; La Parada permanece en la posición 4 y Silicone Solutions en la 5.
- `node --check scripts/main.js`, `git diff --check`, referencias locales y auditoría estática de enlaces: PASS.

## Iteración pendiente — Optimización móvil, rendimiento, accesibilidad y descubrimiento

Orden de ejecución: OPT-01 → OPT-02 → OPT-03 → OPT-04 → OPT-05 → OPT-06. Ninguna tarea pasa a revisión o aprobación sin evidencia real de seguridad y QA.

- [x] **OPT-01 — Reestructurar el carrusel para móvil.**
  - **Alcance:** mover título, contador y controles fuera de la captura; añadir contador actual/total, controles anterior/pausa/siguiente de mínimo 44×44 px, swipe y CTA enlazado al proyecto activo.
  - **Aceptación:** cero solapamiento en 320, 360, 390 y 430 px; contador sincronizado con flechas, swipe, teclado y escritorio; pausa persistente y accesible; swipe sin bloquear el scroll vertical; CTA con URL verificada y protección `rel="noopener"`; escritorio sin regresiones.

- [x] **OPT-02 — Corregir altura, espaciado y wrapping del hero entre 320 y 430 px.**
  - **Dependencia:** OPT-01.
  - **Alcance:** recalibrar tipografía, gaps, metadata, CTA y altura de `.hero-visual` para adelantar el carrusel y hacer deliberados los cambios de línea.
  - **Aceptación:** borde superior del carrusel dentro del primer viewport móvil; espacio copy-carrusel máximo de 64 px; distribución estable en el barrido 320–430 px; cero recortes u overflow; Design DNA y jerarquía del H1 conservados.

### Evidencia de OPT-01 y OPT-02 — 2026-08-30

- Chrome headless/CDP: PASS en 320×568, 360×800, 390×844, 430×932, 768×1024 y 1440×900; cero overflow horizontal y cero solapamiento entre metadata, contador, controles y CTA.
- Barrido continuo 320–430 px cada 5 px: 23 anchos sin fallos; el carrusel comienza dentro del primer viewport móvil, el gap copy-carrusel es de 20 px y todos los controles miden al menos 44×44 px.
- Interacción: PASS para anterior/siguiente, `Home`, `End`, flechas de teclado, pausa/reanudación persistente, loop, swipe horizontal y conservación del scroll vertical; contador, nombre, región viva y CTA permanecen sincronizados.
- Movimiento reducido: autoplay detenido y control de pausa oculto; pausa ambiental verificada con foco, hover, visibilidad e intersección. La eliminación total del autoplay móvil continúa en OPT-05.
- Árbol accesible: una sola diapositiva del hero expuesta, 14 inertes y una única región viva; `axe-core` WCAG 2 A/AA y WCAG 2.2 AA en `.hero`: cero violaciones automáticas.
- Regresión técnica: `node --check scripts/main.js`, `git diff --check` sobre archivos propios, 47 referencias locales y consola/red del navegador: PASS, sin errores ni recursos fallidos. El único warning global es un espacio final del `SKILL.md` vendorizado de accesibilidad, preservado para mantener su hash de instalación.
- Revisión de seguridad: sin secretos, sinks de ejecución, entradas externas ni endpoints nuevos; el CTA reutiliza URLs internas existentes y conserva `rel="noopener noreferrer"`.

- [x] **OPT-03 — Implementar imágenes responsivas y carga progresiva.**
  - **Dependencia:** OPT-01; puede avanzar en paralelo con OPT-02 cuando la estructura sea estable.
  - **Alcance:** generar variantes AVIF/WebP de 480, 768 y 1200 px con fallback, dimensiones intrínsecas, `picture`, `srcset` y `sizes`; cargar solo la imagen activa y la siguiente.
  - **Aceptación:** primera imagen prioritaria; máximo dos imágenes del hero solicitadas inicialmente a 390 px; transferencia inicial de imágenes del hero no superior a 1,5 MiB con caché desactivada; cero imágenes rotas; encuadre útil sin recortar información esencial; galería inferior con lazy loading real.

### Evidencia de OPT-03 — 2026-08-30

- Pipeline: 45 AVIF y 45 WebP para 15 proyectos en 480, 768 y 1200 px; 90/90 derivados decodificados, con firmas, anchuras y proporciones válidas. Peso total generado: 1.816.752 bytes.
- HTML/SEO: 15 `picture` en hero y 15 en galería, 30 imágenes con `alt` y dimensiones intrínsecas, 110 referencias locales únicas y cero faltantes. Siete fuentes JPEG mal nombradas como PNG se corrigieron a `.jpg` sin recomprimir.
- Red fría a 390×844: de 15 solicitudes/9.229.146 bytes en el baseline a 2 AVIF/28.163 bytes en DPR 1; en DPR 3, 2 AVIF/100.897 bytes. Activa en `eager/high`, siguiente en `eager/low` y las otras 13 conservan placeholder sin URL de red.
- Carga progresiva: avanzar hidrata solo una imagen adicional; navegación `End` conserva contador y CTA correctos; antes de scroll no hay solicitudes exclusivas de la galería y, tras recorrerla, 15/15 imágenes tienen dimensiones naturales válidas.
- Resiliencia: bloqueo controlado de AVIF degrada a WebP; bloqueo de AVIF+WebP degrada a la fuente original tanto JPG como PNG. La misma recuperación fue verificada en galería, sin bucles ni imágenes rotas.
- Responsive/CDP: PASS en 320×568, 360×800, 390×844, 430×932, 768×1024 y 1440×900, además de 390×844 DPR 3; cero overflow horizontal, `object-fit: contain`, dos solicitudes iniciales y selección correcta de 480/768/1200. LCP de laboratorio entre 580 y 1.048 ms y CLS máximo 0,00003; no son métricas de campo.
- Regresión: `node --check` en ambos scripts, `git diff --check`, 45 firmas AVIF, 45 firmas WebP y `axe-core 4.13.0` WCAG 2 A/AA/2.2 AA en el hero: PASS, con cero violaciones.
- Seguridad: cero secretos o archivos sensibles rastreados, sinks de ejecución, entradas externas, endpoints o dependencias nuevas; el fallback solo acepta formatos permitidos y rutas declaradas en el HTML.

- [x] **OPT-04 — Corregir accesibilidad del carrusel, mapa, navegación y estados interactivos.**
  - **Dependencias:** OPT-01 y OPT-02.
  - **Alcance:** sanear árbol accesible, regiones vivas, contraste, navegación móvil, filtros, ubicaciones y progressive enhancement.
  - **Aceptación:** solo la slide activa expuesta; una sola región viva anuncia acciones del usuario; estados ARIA correctos; menú móvil operable con teclado y Escape, sin trampas de foco; recorrido completo por teclado; contraste normal mínimo 4,5:1; contenido utilizable sin JavaScript; estado inicial del mapa consistente.

### Evidencia de OPT-04 — 2026-08-30

- Menú móvil: `aria-expanded`, foco inicial en el primer enlace, cierre con `Escape` y retorno al botón; los enlaces siguen visibles sin JavaScript.
- Carrusel: una slide expuesta, 14 inertes y una sola región viva; filtros y capacidades sincronizan `aria-pressed`, `aria-selected`, `aria-controls` y `aria-labelledby`.
- Mapa: SVG visual no interactivo y lista de ubicaciones operable por teclado, sin controles anidados; estado inicial Estados Unidos consistente.
- Validación ejecutada: `node --check scripts/main.js`, `git diff --check`, axe WCAG 2 A/AA + WCAG 2.2 AA (0 violaciones), smoke Chromium de teclado/ARIA, barrido 320–430 px, movimiento reducido y navegación sin JavaScript.

- [x] **OPT-05 — Desactivar animación y autoplay innecesarios en dispositivos móviles.**
  - **Dependencias:** OPT-01 y OPT-04.
  - **Alcance:** hacer estático el canvas con puntero coarse, movimiento reducido o ahorro de datos; eliminar autoplay móvil y suspender trabajo fuera del viewport o con la pestaña oculta.
  - **Aceptación:** carrusel y mapa no avanzan automáticamente en móvil; canvas dibujado una sola vez; timers y `requestAnimationFrame` suspendidos cuando no corresponden; cambios de preferencia de movimiento aplicados sin recargar; firma orbital de escritorio conservada.

### Evidencia de OPT-05 — 2026-08-30

- Política de bajo consumo para viewport móvil, puntero grueso, `prefers-reduced-motion`, `prefers-reduced-data` y `navigator.connection.saveData`.
- Medición Chromium: móvil 390 px = 0 `requestAnimationFrame`, 0 intervalos activos, canvas oculto y control de pausa oculto; escritorio = 145 `requestAnimationFrame` en 700 ms y 1 intervalo del mapa al entrar en viewport.
- Cambio de preferencia sin recarga: el canvas pasó de 47 a 48 frames al activar movimiento reducido y luego reanudó hasta 77 al volver a `no-preference`; autoplay también se detiene.
- Validación: `node --check scripts/main.js`, `git diff --check` y axe WCAG 2/2.2 AA (0 violaciones): PASS. Revisión de seguridad sin secretos ni dependencias nuevas.

- [x] **OPT-06 — Mejorar casos de estudio, contacto, SEO técnico y cabeceras.**
  - **Dependencias:** OPT-01 y OPT-03; cualquier canal nuevo requiere confirmación del operador.
  - **Alcance:** enriquecer destacados con contexto verificable; añadir un canal alternativo confirmado; crear `robots.txt`, `sitemap.xml`, JSON-LD y configuración de cabeceras para Vercel.
  - **Aceptación:** problema, solución y alcance verificables por destacado; cero afirmaciones o datos inventados; WhatsApp operativo y canal alternativo confirmado; robots, sitemap, canonical y JSON-LD válidos; metadatos sociales completos; CSP compatible, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` y protección contra framing sin romper recursos.

### Evidencia de OPT-06 — 2026-08-30

- La galería mantiene los 15 destacados con descripciones de producto existentes, categoría y demo pública enlazada; el encabezado de la sección explicita el criterio de problema, solución y alcance sin publicar métricas no verificadas.
- Contacto verificado en navegador móvil: WhatsApp operativo y GitHub público (`andresleosan`) como canal alternativo documentado en `BRIEF.md`.
- `robots.txt`, `sitemap.xml`, canonical y JSON-LD (`Organization` + `WebSite`) validados por parseo; metadatos Open Graph/Twitter y `og:locale` presentes.
- `vercel.json` validado: `Content-Security-Policy` compatible con fuentes Google y recursos locales, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options` y `frame-ancestors`.
- QA real: servidor local respondió 200 para HTML, robots, sitemap y configuración; Playwright móvil sin errores de consola; axe WCAG 2/2.2 AA = 0 violaciones; `node --check` y `git diff --check`: PASS; barrido de secretos: limpio.

### Pruebas obligatorias de la iteración

- `node --check scripts/main.js` y `git diff --check`: PASS.
- QA en navegador a 320×568, 360×800, 390×844, 430×932, 768×1024 y 1440×900; barrido continuo de 320 a 430 px.
- Probar flechas, swipe, teclado, pausa, loop del carrusel, zoom al 200 %, movimiento reducido, touch/coarse, pestaña oculta y ejecución sin JavaScript.
- Inspeccionar árbol de accesibilidad, nombres, roles, estados, orden de foco y regiones vivas; ejecutar auditoría WCAG automatizada y revisión manual.
- Registrar una traza de red con caché desactivada: solicitudes, bytes, rutas, errores y LCP de laboratorio, sin presentarlo como Core Web Vitals de campo.
- Validar JSON-LD, sitemap, robots, canonical, metadatos, enlaces, secretos, afirmaciones y cabeceras en un preview autorizado.

### Restricciones y criterio de cierre

- Usar durante la implementación las skills `frontend-design`, `accessibility` y `seo`, además del ciclo `self-critique-loop` de Cronos.
- Mantener los 15 proyectos en la galería; el hero puede reducirse a una selección curada de 3 a 5.
- No publicar resultados, métricas, ubicaciones, testimonios ni canales de contacto sin evidencia o confirmación del operador, conforme a `BRIEF.md`.
- Documentar en `STACK.md` cualquier cambio al Design DNA o a la estrategia de animación antes de implementarlo.
- La iteración requiere evidencia real, cero hallazgos críticos de seguridad, cero regresiones, errores de consola, solicitudes fallidas, rutas rotas u overflow horizontal.
- No desplegar a producción sin aprobación explícita del operador.

## PRIV-01 — Privacidad, accesibilidad y cumplimiento — 2026-10-12
- Estado: revisión. Correcciones técnicas verificadas; documentos legales preparados con pendientes explícitos. Sin despliegue.
- Alcance autorizado: auditoría, eliminar terceros automáticos, preparar políticas según hechos confirmados, corregir barreras/afirmaciones, verificar red/almacenamiento/teclado/contraste y documentar pendientes.
- Evidencia e investigación: docs/PRIVACIDAD-Y-CUMPLIMIENTO.md.

### Evidencia PRIV-01
- node test-results/privacy-final.mjs: PASS; 8 auditorías axe 4.14.0 sin violaciones automáticas; cero terceros/cookies/errores en el recorrido local; teclado, 18 proyectos, filtros, páginas legales y restablecimiento verificados.
- Seguimiento: corregido rol de las notas de contacto; retirado fondo decorativo heredado por navegación legal. Ambas pruebas repetidas: privacy-final.mjs y a11y-followup.mjs PASS. Capturas estabilizadas inspeccionadas; 320 CSS px y ampliación CSS 200 % sin desbordamiento. La simulación no equivale a zoom nativo; contraste complejo y lector de pantalla mantienen sus límites documentados.
- Reforzado el contraste de navegación y etiquetas sobre imágenes: opacidad de fondo 0,9; cálculo conservador documentado para contenido blanco de fondo. Repetición final de QA registrada en el informe.
- Persisten verificaciones humanas y administrativas detalladas en docs/PRIVACIDAD-Y-CUMPLIMIENTO.md; no se afirma cumplimiento integral ni ausencia de riesgos.

## CONTACT-EMAIL — Correo visible — 2026-10-13
- Estado: aprobada para publicación; push autorizado por el titular el 2026-10-13.
- Dirección confirmada visible debajo de los pasos del contacto, con enlace mailto nativo y adaptación a móvil. Sin cambios al mini brief ni servicios adicionales.
- QA Chromium: dirección y enlace completos, foco visible con Tab/Shift+Tab, objetivo de 44–45 px, sin desbordamiento a 320/390/768/1440 px ni errores JavaScript. axe en contacto: cero violaciones automáticas. Capturas inspeccionadas; se añadió separación para que el contorno de foco no roce la etiqueta.
- Revisión independiente del fragmento: etiqueta 5,70:1; enlace 16,45:1; hover/foco 5,02:1. No se envió ningún correo ni se comprobó entrega del buzón.
- Release acotada: correo visible, siete reglas CSS y documentación de esta mejora. QA repetido sobre la versión exacta preparada para commit, con cabeceras de producción: teclado, 320/390/768/1440 px, cero errores JavaScript, cero violaciones axe en el bloque nuevo y enlace operativo sin JavaScript. Evidencia local: test-results/email-push-qa.json.
- Reversión: revertir el commit «feat: mostrar correo de contacto como alternativa a WhatsApp» y publicar la reversión. Sin migraciones ni datos que restaurar.

## DESIGN-01 · Antislop y referencias Mobbin · 2026-10-13
- Estado: revisión. Implementación y verificación local completadas; usuario eligió modo during. Sin publicación.
- Portada y capturas con menos capas; galería, proceso y contacto con jerarquías distintas; limpieza de CSS y comentarios dentro del alcance.
- Verificar: 18 proyectos y orden, filtros, carrusel, selección y enlace WhatsApp, correo, menú y anclas, teclado, 320/390/768/1024/1440 px, movimiento reducido, consola, red y axe. Inspección visual antes/después.
- Conservar los borradores legales y el resto de trabajo previo. Sin push ni despliegue en esta iteración.
- Evidencia final: `node test-results/design-qa.mjs` PASS (19 comprobaciones, cinco anchos, cero errores y cero violaciones automáticas axe); `node --check` y `git diff --check` PASS; JSON-LD válido. Capturas inspeccionadas con movimiento normal y reducido.
- Corrección adicional verificada: `transform-style:flat` en la escena de portada evita el recorte de pintura del pie del carrusel en Chromium. Galería y contacto conservan posiciones estables al interactuar.
- Revisión independiente: DOM, proyectos y referencias preservados; eliminados cálculos de parallax sin uso y corregido comentario desactualizado. Sin hallazgos críticos en el alcance revisado.
- Delivery Gate, referencias Mobbin, contraste, decisiones y límites: `docs/DESIGN-01-REVISION.md`. Persisten pendientes legales y verificaciones manuales fuera del alcance; no se afirma certificación integral.

## MASCOT-01 · Integración de mascota ALS · 2026-10-13
- Estado: revisión. Integración y verificación local completadas. El titular confirmó el procesamiento local el 2026-10-13; cuadrícula retirada y dos PNG transparentes incorporados.
- Incorporar la mascota del titular en portada y contacto con archivos locales y dimensiones reservadas. Conservar diseño pixel art, controles, proyectos y avisos existentes.
- Verificar carga, proporción, ausencia de solapamientos y desbordamiento, teclado, móvil, movimiento reducido y funcionamiento sin JavaScript. Inspeccionar capturas y repetir regresión del diseño.
- Sin publicación ni cambios de Git en esta iteración.
- Evidencia: `node test-results/mascot-qa.mjs` PASS en ocho anchos, sin solapamientos, desbordamiento ni errores; imágenes operativas sin JavaScript. `node test-results/design-qa.mjs` PASS en las 19 comprobaciones y dos auditorías axe sin violaciones automáticas. Capturas de portada/contacto inspeccionadas en 1440 y 390 px; `git diff --check` PASS. Detalles y límites en `docs/MASCOT-01-REVISION.md`.

## RELEASE-DESIGN-MASCOT · 2026-10-13
- Estado: aprobada para publicación. Push solicitado expresamente por el titular; DESIGN-01 y MASCOT-01 incluidos. Copia exacta del índice verificada: `design-qa.mjs` PASS (19 comprobaciones, axe sin violaciones automáticas), `mascot-qa.mjs` PASS (ocho anchos), comprobación estática de referencias/fuentes/exclusión de borradores y sintaxis PASS. Captura final inspeccionada.
- Incluye correcciones técnicas de PRIV-01: tipografías propias, eliminación de marcos externos, limpieza de preferencia antigua y cabeceras. Los documentos legales y sus enlaces permanecen pendientes en local.
- Reversión documentada en `docs/RELEASE-DESIGN-MASCOT.md`; sin migraciones ni cambios de datos.

## LEGAL-RELEASE · 2026-10-13
- Estado: desplegada. Publicación solicitada expresamente; datos esenciales y criterio de retención recibidos del titular. Revisión normativa oficial, técnica y de textos completada con límites documentados. Commit publicado: `6da5a7ac32cc29169f755e2e818e41becf599407`.
- Completar políticas y enlaces, corregir restablecimiento al volver con historial y documentar la gestión manual de autorizaciones, conservación y solicitudes.
- Validar ocho auditorías de accesibilidad, red/almacenamiento, navegación legal, teclado y preferencias; publicar únicamente textos completos según la información recibida y verificar el despliegue.
- Evidencia local: `privacy-final.mjs` PASS (ocho auditorías axe sin violaciones automáticas); `privacy-reset-regression.mjs` PASS (cuatro comprobaciones); `a11y-followup.mjs` PASS (móvil y ampliación CSS); `legal-release-smoke.mjs` PASS (textos, cabeceras, enlaces, teclado, reset y sin JavaScript). Revisión independiente sin bloqueantes; sin hallazgos críticos de seguridad en el cambio. No certifica cumplimiento integral ni verifica cuentas privadas.
- Alcance, pendientes y reversión en `docs/RELEASE-POLITICAS.md`. Comprobar contenido y red en producción después del push normal con identidad andresleosan.
- Producción verificada: `LEGAL_BASE=https://www.alsdevstudio.com node test-results/legal-release-smoke.mjs` PASS; ocho archivos coinciden, enlaces/anclas, reset por teclado, 1440/320 px, sin JavaScript, cero cookies, orígenes externos o errores en el recorrido. Informe local: `test-results/legal-release-live.json`. Autor y committer andresleosan; push normal y hash remoto comprobado.

## PROJECT-HOVER · 2026-10-13
- Estado: aprobada en local. Recuperados inclinación, elevación y brillo al pasar el cursor sobre las tarjetas, conservando el diseño actual.
- Verificar seguimiento y retorno, filtros, foco y enlaces, cambio dinámico a movimiento reducido, móvil, ausencia de desbordamiento y de nuevas conexiones externas.
- `node test-results/project-hover-qa.mjs`: PASS (cinco comprobaciones: seguimiento/retorno, foco, preferencias, filtros/anchos y táctil). `node test-results/design-qa.mjs`: PASS (19 comprobaciones y dos auditorías axe sin violaciones automáticas). `node --check scripts/modules/depth.js` y `git diff --check`: PASS. Inspección visual de reposo y hover completada. Sin hallazgos críticos de seguridad ni conexiones nuevas.
- Revisión independiente: objetivos limitados al modo de puntero con capacidad de hover; limpieza y remontaje del mapa conservados. En este Chromium, `emulateMedia` cambió CSS/matches sin emitir `change`: se verificó el freno CSS y se ejercitó explícitamente el evento para comprobar limpieza/reinicio. No se afirma una prueba del ajuste nativo del sistema operativo.
- El ensayo general midió inicialmente el correo durante su animación de entrada (42,77 px, opacity 0); se ajustó la prueba para esperar el fin de esa transición antes de verificar los 44 px. No se modificó el correo. Código y documentación preparados; esta tarea no incluye push.

## MAP-AUTOPLAY · 2026-10-13
- Estado: aprobada en local. Recuperado recorrido de siete países cada 4,2 segundos con pausa/reanudación, selección manual persistente en memoria y anuncios solo al elegir.
- Verificar ciclo, pausa y reanudación, sincronización de SVG/coordenadas/lista, foco/hover, visibilidad, cambio de preferencias, móvil y ausencia de temporizadores duplicados o almacenamiento nuevo.
- Evidencia: `map-autoplay-qa.mjs` PASS (nueve comprobaciones y axe del mapa sin violaciones automáticas); `map-keyboard-qa.mjs` PASS (Tab/Enter y clic con intervalos reales); `design-qa.mjs` PASS (19 comprobaciones y axe a 320/1440 px sin violaciones automáticas). Sintaxis y `git diff --check` PASS. Capturas de escritorio y móvil inspeccionadas. Sin errores, conexiones externas, cookies ni almacenamiento nuevo en el recorrido local.
- Revisión independiente: corregido nombre accesible para incluir la etiqueta visible; el gesto de puntero se detecta con pointerdown, sin deducirlo de focus-visible. Entrar con teclado pausa y el clic conserva su acción. Un solo temporizador y controles nativos; sin hallazgos críticos de seguridad en el alcance.
- Límites del ensayo: primer avance y controles también probados con tiempo real; ciclo extendido con reloj controlado, document.hidden y evento MQL change simulados. La secuencia larga con reloj controlado no reprodujo de forma estable el reingreso con Tab; el ensayo independiente verifica ese caso con tiempo real. No equivale a probar preferencias nativas del sistema ni un lector de pantalla. Esta tarea y PROJECT-HOVER siguen pendientes de push.

## PROCESS-DESIGN · 2026-10-13
- Estado: aprobada en local. Sustituidas las filas por tres etapas conectadas, con ilustraciones propias, jerarquía más clara y adaptación vertical. Conservados texto y navegación de proceso.
- Verificar visualmente escritorio/móvil, 320–1440 px, lectura sin JS, movimiento reducido, semántica, contraste y regresión general. Conservar hover y mapa pendientes de publicación; sin push en esta tarea.
- `node test-results/process-design-qa.mjs`: PASS en seis anchos (320, 390, 768, 900, 901, 1440 px), sin desbordamiento; dos auditorías axe sin violaciones automáticas, lectura sin JS con movimiento normal y contenido estable con movimiento reducido. `node test-results/design-qa.mjs`: PASS en las 19 comprobaciones y dos auditorías axe. `git diff --check`: PASS. Capturas de escritorio, tablet y móvil inspeccionadas; las vistas aisladas ocultan navegación flotante y cursor solo durante la captura.
- Corregida visibilidad sin JS: el proceso ya no depende de data-reveal. Lista ordenada y SVG decorativos sin foco; sin JavaScript nuevo, dependencias, solicitudes externas ni cambios en los compromisos del texto. Revisión independiente sin regresiones concretas; seguridad sin hallazgos críticos en el alcance. Contraste calculado sobre fondo sólido: títulos 17,64:1, párrafos 9,41:1 y números 10,26:1. No se afirma auditoría manual con lector de pantalla ni certificación integral.

## SERVICES-BANNER · 2026-10-13
- Estado: aprobada en local. Recuperado banner continuo con ocho frases distintas, espacios amplios, pausa/reanudación y alternativa estática legible.
- Verificar avance, unión del bucle, pausa con ratón y teclado, ausencia de huecos/desbordamiento, móvil, movimiento reducido y sin JS. Conservar los cambios locales previos; sin push.
- `node test-results/services-banner-qa.mjs`: PASS en seis comprobaciones; cinco anchos entre 320 y 3840 px, una sola lista accesible, pausa con clic/Enter/Espacio/toque, hover, preferencias dinámicas y lectura completa sin JS. Unión comprobada mediante posiciones de la animación: error inferior a 0,001 px; avance y controles probados con tiempo real. Cero violaciones automáticas axe en la banda, errores, conexiones externas o cookies. Capturas de 1440/390 px inspeccionadas.
- `node test-results/design-qa.mjs`: PASS en las 19 comprobaciones y dos auditorías axe sin violaciones automáticas. Sintaxis de main.js/marquee.js y `git diff --check`: PASS. Las mediciones de pausa esperan dos frames para excluir el frame de composición en curso y la geometría admite redondeo subpíxel.
- Revisión independiente sin regresiones concretas; seguridad sin hallazgos críticos en este cambio. Sin dependencias, temporizadores, almacenamiento ni solicitudes nuevos. La pausa solo se conserva mientras permanece la página; no se afirma evaluación manual con lector de pantalla. Pendiente de push junto con hover, mapa y proceso.

## RELEASE-INTERACCIONES · 2026-10-13
- Estado: aprobada para publicación. El titular solicitó push de PROJECT-HOVER, MAP-AUTOPLAY, PROCESS-DESIGN y SERVICES-BANNER. Esta autorización reemplaza el estado pendiente de publicación de esas cuatro tareas.
- Revisión integrada sin bloqueantes; publicación normal con identidad andresleosan, sin reescribir historia. Alcance, evidencia y reversión: `docs/RELEASE-INTERACCIONES.md`.
- Verificación previa al commit: `design-qa.mjs` PASS (19 comprobaciones y dos auditorías axe), `services-banner-qa.mjs` PASS (seis comprobaciones y axe de la banda), `map-keyboard-qa.mjs` PASS (dos comprobaciones con tiempo real). Sin errores ni conexiones nuevas en los recorridos; autor y committer confirmados con correo noreply de andresleosan.

## VERCEL-PRIVACIDAD · 2026-10-13
- Estado: revisión del panel completada y textos aprobados en local. El titular solicita comprobar la configuración privada de Vercel; no solicita banner.
- Comprobar dashboard, contrastar documentación oficial y excluir este proyecto del entrenamiento opcional. Registrar límites y la compatibilidad del plan Hobby con la oferta de servicios.
- Actualizar políticas locales según los hechos verificados y ejecutar las comprobaciones de documentos legales. Sin push ni cambio de plan en esta tarea.
- Evidencia: estado de entrenamiento desactivado tras guardar y recargar; Analytics, Speed Insights, integraciones, Drains, Observability, Logs, miembros/2FA y Compliance inspeccionados en el panel autenticado. Alcance y pendientes en `docs/VERCEL-PRIVACIDAD.md`.
- `node test-results/legal-release-smoke.mjs` PASS (documentos, cabeceras, enlaces, teclado, reset, 1440/320 px y sin JS; cero cookies, orígenes externos o errores). `git diff --check` PASS. Revisión independiente sin bloqueantes; corregidas frases históricas ambiguas y minimizados detalles de seguridad. Sin código ejecutable, dependencias ni almacenamiento nuevos.
- Pendientes concretos: decisión sobre alojamiento apto para uso comercial; acuerdos/tratamiento internacional y conservación interna; sesiones, tokens y aplicaciones autorizadas fuera de esta inspección. El ajuste de entrenamiento ya está aplicado; las políticas y notas actualizadas esperan publicación.

## ANALYTICS-01 · 2026-10-13
- Estado: desplegada. El titular solicitó activar estadísticas de visitas; modalidad incluida habilitada y código publicado en `712784207154376f8354a728e902e4be9441012a`, mediante push normal con identidad andresleosan.
- Verificar ausencia de script/envíos antes de aceptar, rechazo, consentimiento guardado/expirado/inválido, fallo de almacenamiento, retirada entre pestañas/historial, una vista por documento, bloqueo de eventos/URLs no permitidos, teclado, móvil, sin JS y red/errores. Contrastar el runtime oficial con pruebas de red aisladas y comprobar recepción en producción.
- Conservar la exclusión de entrenamiento del proyecto. No contratar ni cambiar de plan. Documentar límites de consentimiento, retención y uso comercial; revisión independiente y comprobaciones antes del push normal con identidad andresleosan.
- Evidencia repetida por Cronos: `analytics-consent-qa.mjs` 49/49 PASS; `legal-release-smoke.mjs` PASS; `design-qa.mjs` 19 comprobaciones PASS; sintaxis y `git diff --check` PASS. Teclado, 320–1440 px, 16 auditorías axe de diálogo sin violaciones automáticas y revisión visual/contraste; limitaciones y reversión en `docs/RELEASE-ANALITICA.md`. Corregidos fallos de retirada/persistencia hallados en revisión independiente. Sin hallazgos críticos de seguridad; pendiente verificación de recepción real tras desplegar.
- Recepción real comprobada: Chrome no envió Analytics antes de aceptar, tras rechazar ni después de retirar/recargar; aceptar produjo una vista HTTP 200 y el dashboard mostró Visitors 1 / Page Views 1 (visita de prueba). Regresión de producción PASS, nueve archivos coincidentes. Esto cierra el pendiente de recepción y publica también los textos de VERCEL-PRIVACIDAD. Los pendientes profesionales y de alojamiento comercial permanecen documentados.

## ANALYTICS-COPY · 2026-10-13
- Estado: desplegada. ALS DevStudio en el párrafo principal y nombre completo del responsable en texto secundario junto al contacto existente.
- Verificar redacción renderizada, lectura y controles a 320–1440 px, accesibilidad del diálogo y regresión de consentimiento. Push a `origin/main` autorizado expresamente por el titular el 2026-10-13.
- Evidencia: `node test-results/analytics-consent-qa.mjs` 49/49 PASS, incluidas 16 comprobaciones de diálogo/axe en cuatro páginas y anchos 320, 390, 768 y 1440 px. `node --check scripts/analytics.js` y `git diff --check` PASS; revisión visual de móvil y escritorio. Revisión independiente sin bloqueantes; contenido fijo, sin cambios en consentimiento, solicitudes ni almacenamiento.
- Antes del push: `node test-results/legal-release-smoke.mjs` PASS; rama `main` sincronizada con `origin/main`, identidad de Git `andresleosan` comprobada. Reversión: restaurar las dos líneas anteriores de `scripts/analytics.js` mediante un nuevo commit y push normal; sin reescribir historia ni cambiar las preferencias guardadas.
- Publicado en `0dae3814fa31f9d0a4670d6eb51122ea45f7ecdd`, confirmado en `origin/main`. Verificación en `https://www.alsdevstudio.com`: script actualizado HTTP 200 y prueba `LEGAL_BASE=https://www.alsdevstudio.com node test-results/legal-release-smoke.mjs` PASS; nueve archivos coincidentes, móvil/escritorio y recorrido rechazado sin errores ni solicitudes externas.

## CF-MIGRATION · 2026-10-13
- Estado: desplegada y verificada tras autorización explícita del titular. Migración desde Vercel Hobby a Cloudflare completada, conservando portafolio, dominio y correo. Rama final `main`, despliegues automáticos Pages habilitados; estadísticas manuales de Cloudflare con consentimiento.
- Preparar build público dedicado, cabeceras, 404, rutas de Pages, políticas y consentimiento renovado para analítica manual de Cloudflare; comprobar empaquetado y regresiones de navegador con red aislada.
- Crear y verificar candidato en Pages con integración GitHub. Mantener la inserción automática de analítica apagada. El corte del dominio espera aprobación explícita con candidato y reversión revisables; sin gasto ni eliminación del alojamiento previo.
- Evidencia repetida por Cronos: build 12/12 PASS; analítica con runtime oficial y red aislada Chromium 20/20, WebKit 20/20, Firefox 19 PASS/1 omitida por limitación de referente en Playwright. BFCache simulado, no se afirma prueba del historial nativo. QA real sobre `wrangler pages dev`: cuatro pruebas PASS, artefacto/cabeceras/redirects/404, 18 proyectos, mapa tras rechazar, 320/1440 px, dos axe de diálogo sin violaciones y lectura sin JS. Sintaxis y `git diff --check` PASS; revisión independiente sin hallazgos críticos.
- Se corrigió la barrera CSP en rechazo inicial para conservar el fetch del mapa. La prueba integrada corrigió su propio uso del control de autoplay oculto con movimiento reducido; se verificó navegación manual, sin cambiar el carrusel.
- Pages construyó `migration/cloudflare` en `98dd612`, deployment `a1a10f4b-212b-44a9-82ad-bc0382d13f2f`, proyecto `alsdevstudio` y `NODE_VERSION=22`. Candidato https://alsdevstudio.pages.dev/ verificado: QA pública 4/4 PASS, contenido coincidente normalizando CRLF/LF e imagen social idéntica, headers/noindex, diálogo sin inserción automática y recorrido sin conexiones externas ni cookies. Capturas a 320/1440 px inspeccionadas. TTL anteriores 600 segundos, siete registros DNS respaldados en el plan; la recepción real de Analytics se reservó para el dominio canónico tras el corte.
- Producción https://www.alsdevstudio.com/ verificada en `5cd5576`, deployment `79e1c44a-c219-4023-a578-662718b757d6`; panel Active / SSL enabled. QA real 4/4 PASS y visita sintética Analytics PASS: SDK solo tras aceptar, POST2xx, retirada y recarga sin SDK ni solicitudes nuevas, cero cookies. HTTPS válido, producción indexable, apex301HTTP/HTTPS con ruta/query preservadas, DNS CNAME confirmado en autoritativo/Cloudflare/Google; NS/MX/SPF/TXT conservados. Respaldo Vercel `c6a6436` Ready y script anterior HTTP200 comprobado con DNS fijado a216.198.79.1 y TLS validado. Evidencia, límites y reversión en `docs/MIGRACION-CLOUDFLARE.md`; captura final `test-results/cloudflare-produccion.png`. Sin gasto ni servicios pagados nuevos.

## MASCOT-02 · Nueva mascota ilustrada · 2026-10-13
- Estado: desplegada y verificada tras autorización explícita del titular. Reemplazados los dos PNG de la mascota con el robot blanco/gris de la nueva referencia del titular, con ojos turquesa, visor oscuro y transparencia real.
- Preparar bienvenida y pose con portátil del mismo personaje; adaptar renderizado suave y dimensiones reservadas, manteniendo ubicaciones y tamaños de la web.
- Verificar transparencia, peso, build Pages y recorrido de las dos ubicaciones en ocho anchos, sin solapamientos ni desbordamiento; inspeccionar capturas de portada y contacto en 1440/390 px. Preparar reversión con el commit anterior y presentar el resultado antes del push de producción.
- Evidencia Cronos: `node test-results/mascot-qa.mjs` PASS en 320, 390, 680, 681, 900, 901, 1024 y 1440 px; proporciones reservadas correctas, cero errores, sin solapamientos/desbordamiento y lectura sin JavaScript a 320 px. Cuatro capturas de portada/contacto a 1440/390 px inspeccionadas. Build Pages PASS (182 archivos, aproximadamente 4,7 MB); transparencia alfa real y esquinas transparentes comprobadas en ambos PNG. Tamaño conjunto 82.490 bytes, renderizado suave y sin dependencias/conexiones nuevas. `git diff --check` PASS; reversión en `docs/MASCOT-02-REVISION.md`.
- Preview https://6a97985c.alsdevstudio.pages.dev/ verificado en `3b3a8ae`: QA real PASS en ocho anchos/sin JS; ambos PNG idénticos y `noindex` comprobados. Revisión independiente sin bloqueantes. El titular autorizó publicar mediante push a `main`; verificar dominio definitivo después del despliegue.
- Publicada en `e19cf57`, deployment Pages `9cb52863-9760-4940-aaff-4f65d6563f02`. QA real https://www.alsdevstudio.com/ PASS en los ocho anchos y sin JavaScript; PNG idénticos, renderizado suave, HTTPS y producción indexable comprobados. Capturas finales regeneradas y notas de publicación guardadas. Sin cambios de analítica, correo ni servicios.

## CF-CANONICAL · Redirección Pages a www · 2026-10-13
- Estado: aplicada y verificada. Configuración del dominio concreto solicitada explícitamente por el titular: `alsdevstudio.pages.dev` → `https://www.alsdevstudio.com`.
- Crear lista y regla Bulk Redirect dedicadas: 301, HTTP/HTTPS, rutas y query conservadas, sin incluir subdominios. Comprobar raíz, documentos, asset, ruta desconocida y previews; destino sin bucles y HTTPS válido.
- Reversión documentada: deshabilitar únicamente la nueva regla de redirección. Mantener la lista para inspección; no borrar servicios ni alterar código/DNS/correo. Sin gasto nuevo ni cambio de plan.
- Lista `als_pages_to_www` y regla `ALS Pages a www` creadas y Enabled. `node test-results/pages-canonical-qa.mjs` PASS: siete 301 (HTTP/HTTPS, documentos, query codificada, asset y 404 final), rutas/queries conservadas, destino www200 sin bucles/indexable y preview por hash200/noindex. Evidencia y reversión en `docs/PAGES-CANONICAL.md`; sin cambios de código cliente, DNS, correo ni regla BPT existente.

## MAP-ARGENTINA · Argentina y recorrido de dos segundos · 2026-10-13
- Estado: desplegada y verificada en producción. Añadir Argentina después de Brasil en lista/datos/SVG y actualizar las referencias de siete a ocho. Usar geometría local disponible y ubicación ilustrativa coherente.
- Cambiar el recorrido a 2000 ms y verificar sincronización, pausa/manual, temporizador único, visibilidad, teclado, movimiento reducido y móvil.
- QA `map-autoplay-qa.mjs` repetida por Cronos: diez comprobaciones PASS, corte1999/2000, ciclo completo, controles y sincronización. Axe sin violaciones, sin errores ni solicitudes externas. Revisión estática sin hallazgos críticos; límites del emulador y reversión en `docs/ARGENTINA-SARIN.md`.

## PROCESS-SARIN · Sarin bot explica las etapas · 2026-10-13
- Estado: desplegada y verificada en producción. Sustituir los tres SVG por el robot ALS en poses de bienvenida, construcción con portátil y revisión. Texto de Sarin en globos, conservando los tres títulos y el alcance real del servicio.
- Comprobar build público/PNG, dimensiones reservadas, lectura y controles en 320–1440 px, teclado, axe y funcionamiento sin JavaScript. Preparar preview y reversión antes de solicitar la publicación.
- Operador eligió globos de texto. Build 12/12 PASS y salida 183 archivos; QA del proceso repetida por Cronos, siete anchos, PNG/proporciones, axe320/1440, reduced-motion y sinJS PASS. Sin hallazgos críticos. Evidencia y reversión en `docs/ARGENTINA-SARIN.md`.
- Preview `https://8f2ced74.alsdevstudio.pages.dev/`, funcional7c981e1: Pages4/4PASS, PNGidénticos/textosnormalizados CRLF/LF, revisión Chrome real de Argentina/Sarin y redirección301preservada. Documentación posterior conserva los archivos públicos.

## CONTACT-ORDER · WhatsApp a la izquierda, correo a la derecha · 2026-10-13
- Estado: desplegada y verificada en producción. Reordenar bloques HTML, columnas y divisor CSS; WhatsApp primero en móvil y teclado. Mantener selección, mensajes y mailto; jerarquía de encabezados coherente.
- QA proporcional: 320/390/900/901/1440, geometría, Tab/Shift+Tab, tres opciones y mensajes, axe y lectura sin JavaScript. No se envían mensajes de prueba.
- El operador solicitó el ajuste y autorizó publicar los cambios pendientes. Incorporar a la misma entrega y verificar el candidato antes de promover a main.
- Build12/12PASS y QA de navegador320/390/900/901/1440: orden y teclado, mensajes, mailto, noJS y axe320/1440PASS. Sin hallazgos críticos ni bloqueo en revisión independiente. Ver `docs/ARGENTINA-SARIN.md` y `test-results/contact-order-results.json`.
- Preview final123b8648 Pages4/4PASS. Entrega completa promovida a main: fuenteeb484ee, desplieguefuncional4603e875. Producciónwww Pages4/4PASS, PNG/textos de mapa comprobados, redirección301preservada y contacto revisado en Chrome. Evidencia final y reversión en `docs/ARGENTINA-SARIN.md`; commits de cierre no cambian assets públicos.

## CF-PREVIEW-CANONICAL · Vista previa8f2ced74 hacia www · 2026-10-13
- Estado: aplicada y verificada; configuración solicitada y autorizada expresamente por el titular. Añadir origen exacto8f2ced74 a la lista existente,301 con rutas/query conservadas e includesubdomainsOFF.
- Verificar raíz HTTP/HTTPS, documento/ruta histórica/asset/query/404 final, www sin bucles y previews restantes. Revisión de seguridad: origen/destino fijos, alcance exacto y sin ampliación de acceso. Reversión antes de aplicar: retirar solo la nueva entrada; ver `docs/PAGES-CANONICAL.md`.
- Entrada añadida y parámetros guardados; raíz anterior íntegra. QA HTTP14/14PASS, otros dos previews200/noindex ywww200sinbucle/indexable. Chrome real terminaenwww al abrir el enlace solicitado. Informe/captura en `test-results/` y registro/reversión en `docs/PAGES-CANONICAL.md`; sin hallazgos críticos ni cambios de código/DNS/correo/plan.

## PROCESS-EQUAL · Globos de proceso con igual altura · 2026-10-13
- Estado: desplegada y verificada en producción como corrección del componente Sarin autorizado en la sesión. Retirar únicamente el prefijo señalado de la tercera explicación; párrafo inicia «Comprobamos». Igualar alturas de los tres globos de forma adaptativa, conservando lectura completa y poses.
- Verificar con QA de proceso existente los siete anchos, comparar geometría de globos, axe, reduced-motion y sinJS; build público y revisión estática. Reversión: revertir el commit funcional de este ajuste mediante nuevo commit normal, tomando3de42d6 como base.
- Build12/12PASS, 183archivos/4.756.905bytes. QA de proceso existente PASS en320/390/680/681/900/901/1440: alturas de los tres globos idénticas en cada ancho, contenido restante intacto, poses/proporciones, sin overflow/solapamientos, axe320/1440sinviolaciones, reduced-motion ysinJS correctos. Revisión independiente sin bloqueantes. Reporte/capturas en `test-results/process-design-qa.json` y `process-*.png`.
- Candidato39699e3a con HTML/CSS idénticos al build ynoindex; fuente7755120 promovida a main y desplegada como3649cae6. Producciónwww200/indexable con HTML/CSS revisados; Chrome real1780px confirma globos252,6875px los tres, frase retirada y sinoverflow. Captura `test-results/process-equal-live-chrome.jpg`. Cierre documental conserva los archivos públicos.

## SECTION-LABELS · Quitar las cinco etiquetas señaladas · 2026-10-13
- Estado: desplegada y verificada en producción. Retirar los cinco rótulos solicitados y sus espacios asociados, conservando títulos/anclas/navegación y controles.
- QA proporcional: build, revisión estática y navegador320/390/900/901/1440; contenido y geometría, axe320/1440 y lectura sinJS. Incorporar al flujo de correcciones del sitio publicado autorizado en la sesión. Reversión: revertir solo el nuevo commit funcional mediante commit normal; basef8d12e4.
- Build12/12PASS, 183archivos/4.756.627bytes. Navegador cinco anchosPASS: rótulos retirados, títulos íntegros y márgenes0; globos conservanigualaltura; mapaArgentina y selección/mensaje/Tab deWhatsApp correctos. Axe main320/1440sinviolaciones, sin overflow/errores/red externa. SinJS, HTML de encabezados y enlaces nativos conservados. Revisión independiente sin bloqueantes; `test-results/section-labels-qa.json` y `labels-*.png`.
- Candidatoc422d312200/noindex con HTML/CSS revisados; fuenteab1e275 promovida a main. Producciónwww200/indexable, artefactos HTML/CSS iguales al build y Chrome real confirma cinco etiquetas ausentes, cinco márgenes0 y sinoverflow. Vista principal abierta enalcance; captura `test-results/section-labels-live-chrome.jpg`. Commits de cierre no cambian archivos públicos.

## SARIN-SCENES · Tres escenas al entrar con scroll · 2026-10-13
- Estado: desplegada y verificada en producción, con autorización expresa del titular («Sí, publicar las animaciones»). Vuelo antes de Alcance, presentación de Proyectos y portátil en Contacto; duración 2–3 segundos y una reproducción por zona/documento, móvil suave y movimiento reducido estático.
- Preparar asset de vuelo con identidad actual y HTML/CSS reservados, módulo vanilla y empaquetado público. TDD de ciclo de vida: una vez, cancelación por salida/visibilidad/preferencia y fallback sin APIs. Verificar lectura/controles, sinJS, 320–1440 px, reducido dinámico, axe y build; repetir pruebas y revisión de seguridad antes de aprobar.
- Preparar candidato Pages revisable antes del corte de producción. Reversión: revertir el commit funcional mediante un commit nuevo y push normal, con cd0536d como base pública conocida; no cambia DNS, analítica ni almacenamiento.
- Evidencia repetida por Cronos: módulo13/13PASS (fase de vuelo, once, cancelación, imágenes lentas/fallidas, móvil/puntero grueso/ahorro de datos, reducido dinámico y fallback), build12/12PASS185archivos/4.809.408bytes, QA integrada10casosPASS320/390/680/681/900/901/1440 (axe3201440sinviolaciones, noJS/main/18proyectos/WhatsApp/mail), seis fotogramas y dos anclas3901440sinrecortes/errores. Hallazgos corregidos: duración visual del vuelo, ascenso que cortaba cabeza, espera de imágenes y reveal oculto sinJS; ancla Alcance ajustada para despejar menú fijo. Revisión de seguridad: contenido fijo, sin datos/secretos ni dependencias, CSP intacta; sin críticos abiertos. Informes `test-results/sarin-scenes-results.json` y `sarin-motion-frames.json`; release/reversión en `docs/SARIN-ESCENAS.md`.
- Candidato final bf38aa53 de2e24e54: Pages4/4 y fotogramas/anclas8/8 PASS en línea; Chrome real confirma Sarin completo al saltar a Alcance, sin overflow. Candidato inicial17604170 también integración10/10PASS; scripts/PNG iguales al build. Main permanece cd0536d hasta autorización de esta funcionalidad. TSC aislado nuevo móduloPASS; global mantiene11errores en analytics.js idéntico a la base, documentados como límite.
- Publicada en main2403932 y desplieguee977d5b9, mediante fast-forward de la rama candidata. Producción www: Pages4/4, integración10/10 y fotogramas/anclas8/8PASS; revisión independiente siete recursos y seis redireccionesPASS, sitio indexable y CSP/analytics conservados. Cierre documental no cambia archivos públicos; registro y reversión en `docs/SARIN-ESCENAS.md`.

## SARIN-TYPING · Vuelo con parada y escritura en Proyectos · 2026-10-13
- Estado: desplegada y verificada en producción, como corrección de animaciones autorizada en la sesión. El titular confirma vuelo repetido mientras visible. Sarin avanza, se detiene y continúa; control de pausa, móvil suave y reducido estático. Proyectos usa portátil con dos frames de tecleo y texto existente progresivo.
- TDD de ciclo repetido/parada/reanudación/manual/reducido y typing semántico/cleanup. QA integrada 320–1440, noJS/axe, geometría estable, texto completo y contacto conservado; build público y revisión de seguridad.
- Preparar candidato verificado dentro de la revisión de animaciones publicada y autorizada en la sesión. Reversión mediante commit normal de esta revisión, base pública8102a6a, sin tocar DNS/analítica/correo ni el resto de escenas.
- Cronos repitió módulo26/26PASS, build12/12PASS187archivos/4.888.291bytes, QA integrada10casos siete anchos+noJS/axe y6registros de pausa/tecleo/ancla3901440PASS. Sintaxis/TSC aisladoPASS; revisión independiente sin bloqueantes. Texto accesible intacto, rAF acotado y cleanup en errores/resize/reducido, sin cambios de proveedores/datos/CSP. Release y reversión: `docs/SARIN-VUELO-TECLEO.md`.
- Candidato d4833e50 deabe29f5: Pages4/4, integración10/10 y pausa/tecleo/ancla6/6PASS en línea. Chrome real confirma Pausar→Reanudar, estado paused y sin overflow; globo completo accesible. Promoción por fast-forward de los archivos públicos revisados.
- Publicada en main7a9ca2b, desplieguecd0637de. Cronos repitió en www Pages4/4, integración10/10 y pausa/tecleo/ancla6/6PASS; revisión HTTP independiente confirma recursos exactos, indexable/canonical, CSP/analytics y redirecciones conservadas. Cierre documental sin cambios públicos.
## SARIN-GREETING-PROCESS · Saludo en vuelo y tecleo del proceso · 2026-10-13
- Estado: desplegada y verificada en producción. Solicitud concreta del titular sobre las animaciones publicadas y autorizadas: saludo con mensaje en la parada central, continuación repetida visible, sin rótulo Pausar vuelo, y tecleo en el encabezado del proceso.
- TDD del saludo/poses/fases, control por icono y cuarta escena con sus fallbacks/cleanup. Repetir módulo/build, siete anchos, noJS/reducido, axe, geometría de globos, fotogramas de saludo y proceso; revisión de seguridad. Candidato Pages antes de publicación y verificación real de www.
- Reversión mediante commit normal, base pública `69d4b7a`. Sin cambios de DNS, analítica, correo, planes ni contenido de las tres tarjetas.
- Cronos repitió módulo36/36PASS, build12/12PASS (187archivos/4.893.101bytes), integración10casos en siete anchos con noJS/reducido/axe y8registros reales saludo/tecleo/ancla3901440PASS. Sintaxis/TSC aislado y diff-checkPASS; revisión independiente sin bloqueantes. Texto y tarjetas conservados; globo sin recortes y overlay con rectángulo idéntico. Registro/reversión en `docs/SARIN-SALUDO-PROCESO.md`.
- Candidato `b861a9ea` de `a92d843`: Pages4/4, integración10/10 y fotogramas8/8PASS en línea. Chrome real confirma cuarta escena, texto completo, globos iguales y sin overflow. Se mantiene autorización explícita previa del titular para publicar las animaciones y esta revisión concreta dentro de la misma sesión.
- Publicada en main`2c1e6d5`, despliegue`ca074137`. Cronos repitió www Pages4/4, integración10/10 y fotogramas8/8PASS. Chrome real confirma saludo/mensaje en fase playing, control sin texto y sin overflow. Revisión HTTP independiente: siete recursos exactos, canonical/indexable/CSP/analytics y cuatro301conruta/query conservados. Cierre documental sin cambios públicos; registro completo en `docs/SARIN-SALUDO-PROCESO.md`.
## SARIN-STEPS · Animación y escritura de las tres etapas · 2026-10-13
- Estado: desplegada y verificada en producción. Solicitud del titular de animar las tres tarjetas existentes y sus textos. Saludo, portátil tecleando y aprobación; título seguido de párrafo, igualdad de alturas y texto completo conservados.
- TDD de múltiples pares semánticos, sincronización con cada gesto, umbral de entrada y cierres/fallbacks; repetir módulo/build, integración siete anchos/noJS/reducido/axe y capturas de tarjetas en390/1440. Revisar seguridad y candidato antes de publicar dentro de la revisión de animaciones autorizada en la sesión.
- Reversión mediante commit normal de la revisión; base `f007f93`. Sin nuevas imágenes generadas, dependencias, proveedores, datos ni cambios comerciales.
- Cronos repitió módulo42/42PASS (36regresiones previas incluidas), build12/12PASS187archivos/4.898.563bytes, integración10casos/sieteanchos/noJS/reducido/axe y14registros saludo/encabezados/tarjetas/ancla3901440PASS. Rectángulos full/clone idénticos y alturas iguales/estables; capturas inspeccionadas. Sintaxis/TSCaislado/diff-checkPASS, revisión independiente sin bloqueantes; registro/reversión `docs/SARIN-ETAPAS-ANIMADAS.md`.
- Candidato `1783acac` de`7ef33d7`: Pages4/4, integración10/10 y fotogramas14/14PASS en línea. Chrome real confirma tres scenesfinished y tres globos252,6875px iguales, textos completos y sin overflow. Publicación dentro de la extensión concreta solicitada de las animaciones autorizadas en esta sesión.
- Publicada en main`14eff0a`, despliegue`6868de73`. Cronos repitió www Pages4/4, integración10/10 y fotogramas14/14PASS. Chrome real confirma tres finished, clones limpios y globos252,6875px iguales; captura `sarin-steps-live-chrome.jpg`. Revisión HTTP independiente: ocho recursos exactos, indexable/canonical/CSP/analytics y cuatro301conruta/query conservados. Cierre documental sin cambios públicos.
## SARIN-AUTHOR · Firma animada de la portada · 2026-10-13
- Estado: desplegada y verificada en producción. Animar e innovar la presentación existente: saludo, halo y globo; nombre y descripción progresivos, textos originales/CTA/carrusel conservados.
- TDD de author, pares/partes, umbral, una vez y gate de diálogo creado dinámicamente/defer. Repetir módulo/build y QA ocho escenas en siete anchos, noJS/reducido/axe, demorar Analytics y capturar firma parcial/final390/1440 con geometría estable; revisar candidato antes de publicar extensión autorizada.
- Reversión normal de commit funcional, base `3a69dec`. Sin nuevos assets, servicios, datos, permisos o gasto. Registro y evidencia en `docs/SARIN-PRESENTACION-PORTADA.md`.
- Cronos repitió módulo52/52PASS (42regresiones incluidas), build12/12PASS187archivos/4.903.370bytes, integración10casos/ochoescenas/sieteanchos/noJS/reducido/axe y16registros firma/escenas previas3901440PASS. Analytics demorado800ms y modalabierto700ms no consumen author; cierre reproduce. Rectángulos iguales, altura84/108estable y biografía normal/muted; capturas inspeccionadas. Sintaxis/TSCaislado/diff-checkPASS y revisión independiente sin bloqueantes.
- Candidato `7e452ba7` de`f46e181`: Pages4/4, integración10/10 y fotogramas16/16PASS en línea. Chrome real confirma idle con diálogo abierto y finished/cloneslimpios tras cerrar/bajar hasta la firma; sin overflow y foto completa. Publicación dentro de la revisión de animaciones autorizada expresamente en la sesión y ampliada por el titular.
- Publicada en main `a3fe19a`, despliegue `34d57bd6`; cierre 2026-10-14. Cronos repitió www Pages 4/4, integración 10/10 y fotogramas 16/16 PASS. El ensayo de fotogramas ahora retiene Analytics hasta observar author sin consumir, en lugar de depender de un plazo fijo de 800 ms; repetición con módulo retrasado 1200 ms PASS. Producto sin cambios respecto al candidato. Chrome confirma presentación completa/clones limpios y sin overflow; captura `sarin-author-live-chrome.jpg`. Revisión HTTP independiente: ocho recursos exactos, indexable/canonical/CSP/analytics y cuatro 301 conservados. Cierre documental sin cambios públicos; evidencia y reversión en `docs/SARIN-PRESENTACION-PORTADA.md`.
## SARIN-NO-PAUSE-ICON · Retirar botón circular del vuelo · 2026-10-14
- Estado: desplegada y verificada en producción. Corrección concreta solicitada sobre las animaciones publicadas y autorizadas en la sesión. Retirar el botón circular y toda pausa manual de Sarin; conservar ciclo repetido, saludo y fase.
- Actualizar la regresión existente sin botón, repetir módulo/build y comprobar ausencia del control en móvil/escritorio, parada/continuación y suspensión fuera de pantalla/pestaña. Reduced-motion y noJS estáticos; ninguna interacción externa ni cambio de datos o servicios.
- Reversión: revertir el commit funcional mediante commit nuevo y push normal, base `933256b`; verificar retorno del botón y vuelo. Preparar candidato antes de continuar publicación autorizada.
- La revisión detectó el límite de WCAG 2.2.2 al retirar la pausa manual. Se verificó W3C y se presentó una alternativa; el titular la descarta expresamente y solicita continuar el ciclo normal. Se retira el borrador compartido antes de publicar; sin cambios al banner. El límite queda registrado en `docs/SARIN-SIN-ICONO.md`; no es un hallazgo crítico de seguridad.
- Cronos repitió versión final: módulo 52/52 PASS, build tests 12/12 PASS y build 187 archivos / 4.901.633 bytes; TSC aislado/diff-check PASS. QA focal seis casos 390/1440 PASS, sin errores/red externa; ausencia del botón, parada/saludo/continuación y viewport/reducido/noJS verificados. Revisión independiente sin bloqueantes de seguridad y sin cambios al banner; evidencia local en `test-results/sarin-no-icon-local.json`.
- Candidato `5f9682d3` de `645a8e1`: Cronos repitió Pages 4/4 y QA focal 6/6 PASS, captura inspeccionada. Revisión HTTP independiente: cinco recursos exactos, ausencia círculo/shared, noindex/canonical/CSP/analytics y cuatro 301 con ruta/query conservadas. Promoción dentro de la corrección de animaciones autorizada en la sesión, con elección explícita de seguir sin pausa manual.
- Publicada en main `8a1c866`, despliegue `641a174b`. Cronos repitió www Pages 4/4 y QA focal 6/6 PASS. Chrome real: playing, cero controles de vuelo/shared y sin overflow; captura `sarin-no-icon-live-chrome.jpg`. HTTP independiente: cinco recursos exactos, indexable/canonical/CSP/analytics y cuatro 301 conservados. El banner permanece intacto; cierre documental sin cambios públicos. Registro/reversión en `docs/SARIN-SIN-ICONO.md`.
## SARIN-DISTINCT-POSES · Tecleo en Alcance y pose nueva en Proceso · 2026-10-14
- Estado: desplegada y verificada en producción. Dos poses distintas del mismo Sarin con dos fotogramas cada una, escritura del encabezado de Alcance y pose nueva en el encabezado de Proceso.
- Reutilizar controller con novena escena `global`; texto completo accesible, figura decorativa, geometría reservada y fallback estático. TDD acotado de global y QA de poses/alfa, tecleo, siete anchos, noJS/reducido y artefactos publicados.
- Extensión concreta de las animaciones publicadas/autorizadas en esta sesión. Generación integrada sin API de pago nueva, dependencias o datos; reversión por commit normal, base `5a8c880`, después de verificar candidato.
- Cronos repitió módulo56/56, build tests12/12, TSC aislado/diff-checkPASS; build191archivos/5.030.365bytes. QA integrada10/10 en siete anchos/noJS/reducido/axe, fotogramas18/18 con geometría estable y texto completo. Cuatro PNG320×384/alfa inspeccionados en390/1440; revisión independiente sin bloqueantes. Evidencia y prompts exactos en `docs/SARIN-POSES-DISTINTAS.md`; producción pendiente.
- Candidato`2711ab6c` de`8962f2e`: Pages4/4 y fotogramas18/18PASS repetidos por Cronos; Chrome confirma nueve scenes/textos/poses distintos/sin overflow. HTTP independiente ocho recursos exactos/noindex/canonical/CSP/Analytics y cuatro301PASS. Promoción dentro de la revisión concreta solicitada de las animaciones autorizadas en la sesión.
- Publicada en main`2ee0626`, despliegue`808ea77d`: Cronos repitió www Pages4/4, integración10/10 y fotogramas18/18PASS. Chrome real global/process finished, textos completos y sin overflow; capturas guardadas y entregable abierto. HTTP independiente ocho recursos exactos/indexable/canonical/CSP/Analytics/cuatro301PASS. Cierre documental sin cambios públicos; registro y reversión en `docs/SARIN-POSES-DISTINTAS.md`.


## CAPTURAS-DIARIAS · Vistas y ejemplos de Sarin · 2026-10-16
- Estado: desplegada y verificada en producción desde `main`, según solicitud del titular de actualizar GitHub.
- [x] Capturas reales y variantes AVIF/WebP de Dialon, Vigia demo, Sarin Bot y SemanControl; enlace de Vigia a `/demo/`, SemanControl enlazado en galería y carrusel, 20 proyectos y estados/descripciones revisados.
- [x] Workflow existente programado a las 00:00 y 12:00 Colombia (`0 5,17 * * *` UTC), ejecución manual conservada, input aislado del shell, checkout de main y build antes del commit.
- [x] Alcance y ejemplos comerciales de Sarin documentados en `docs/SARIN-ASISTENTE-COMERCIAL.md`: landing pages, tiendas, soluciones web y chatbot; DeepSeek exclusivo y continuación por WhatsApp. La integración conversacional sigue pendiente.
- Evidencia: `node --test .github/cloudflare/build.test.mjs` 12/12 PASS; build 212 archivos/5.231.811 bytes; Pages 4/4 PASS con Wrangler 4.150.0; QA focal cinco anchos 320–1440, axe 0, sin overflow/errores, 20 destinos/imágenes del carrusel y lectura sin JS correctos. Capturas inspeccionadas y revisión independiente sin bloqueantes. `git diff --check` PASS.
- Registro, programación y recuperación: `docs/CAPTURAS-PROYECTOS.md`; base `9f3d263`, reversión por commit normal sin force push.
- Publicada `a7ba4fb`, Cloudflare Pages `76ed08cd-2cb5-4295-a4c0-5c461cf8f001` con éxito. QA de Pages repetido en producción 4/4 PASS, HTML idéntico al build y 28/28 imágenes idénticas; workflow remoto activo con cron correcto. Cierre documental sin cambios públicos.
