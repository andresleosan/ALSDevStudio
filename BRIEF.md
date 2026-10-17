# Brief — ALS DevStudio

## Revisión publicada de privacidad y accesibilidad · 2026-10-16

- Estado actual: commit funcional `81784d3`, Pages `7f36ae7e-7543-49cb-ae17-3ec5bbc2515c`. Chat público apagado; administración y prueba privada conservadas con la misma D1, secretos y Access.
- Políticas v2 ajustadas al uso real, cookie privada y administración; revisión de cancelación/garantía, inventario de recursos y OFL Chakra oficial. Analítica excluida de la prueba privada, HSTS, correo sin JavaScript, pausa y foco corregidos. No se acreditan licencias de proyectos ni se cierran condiciones de DeepSeek para visitantes.
- Verificación: 370 pruebas iniciales, regresión adicional de correo, 18 de build y 6 de Pages versionadas; 12 escaneos axe limpios y 14 HTTP finales. Chrome comprueba módulos de la misma revisión y consentimiento v2 con caché normal, más tres turnos ficticios de café/Mundial/retorno al negocio, seis mensajes y una señal fuera de alcance, sin errores. Resumen revisado manualmente; ningún envío a WhatsApp.
- [Auditoría, evidencias, fuentes y pendientes](docs/PRIVACIDAD-Y-CUMPLIMIENTO.md). Video de 73,5 s fuera del repositorio en `../Entregables/Sarin-Promo/entrega/`, con datos ficticios y sin exponer el panel. Voz colombiana para revisión, permiso comercial pendiente de acreditar o sustituir; se incluye copia sin voz, subtítulos y textos de redes.

## Primera publicación de la prueba privada · 2026-10-16

- El titular autorizó publicar la prueba privada para probar Sarin en la misma web con datos ficticios. Pages publicó correctamente el despliegue canónico `03625efb-fe06-4678-b847-b7cbfac6ebe1`, commit `828bdd5`, con build `npm ci --prefix .github/sarin && node .github/cloudflare/build.mjs`. La fase anterior de panel vacío quedó publicada en `658f002` / `9ab95b55-6214-4b76-a0b8-126b468cc537`.
- D1 exclusiva `alsdevstudio-sarin`, jurisdicción `us`/ubicación ENAM, migraciones 0001/0002 aplicadas y respaldo vacío restaurado en prueba. Producción conserva su enlace D1 y seis secretos privados. Lectura de metadatos anterior a la prueba privada: cero conversaciones y mensajes. Preview mantiene cuatro flags apagadas y no tiene D1 ni secretos. [ADR-001](docs/adr/001-sarin-d1-y-entornos.md).
- Panel y API protegidos en `www`, `pages.dev` y previews, solo para el titular, con sesión de 6 h y TOTP requerido cada 6 h. El titular introdujo el código directamente; en la publicación inicial el panel mostró su identidad, listado vacío y limpieza de las 22:00 Colombia. El agente no leyó QR, secreto ni código. Evidencia inicial local excluida de Git: `test-results/sarin-remote/panel-produccion.jpg`.
- Worker de retención operativo, cron horario y sin HTTP público ni URLs de preview. Primera ejecución remota correcta: `2026-10-17T03:00:34.515Z` / 16 de octubre `22:00:34.515` Colombia; último error nulo y cero pendientes.
- Producción: `SARIN_ADMIN_ENABLED=true` y `SARIN_PRIVATE_TEST_ENABLED=true`; `SARIN_ENABLED=false` y `SARIN_HISTORY_ENABLED=false` mantienen apagados el chat y el historial públicos. El titular accede desde el panel a `/?sarin=prueba`; la sesión real reconoce el permiso privado y muestra el aviso de datos ficticios y la autorización sin premarcar. La prueba exige Access del propietario y CSRF en cada POST, con cookie y hash separados de las sesiones públicas; conserva cuotas, presupuesto y retención. Las condiciones API, entrenamiento/retención y tratamiento internacional de DeepSeek siguen pendientes **para admitir visitantes**. [Estado y pasos restantes](docs/SARIN-OPERACION.md).
- Prueba real privada completada en Chrome con datos explícitamente ficticios: dos turnos HTTP 200 sobre una tienda y cobro con tarjetas, ejemplos MundoCelular/CoctelsOPS y respuesta sin inventar pasarela. El panel confirmó dos turnos, cuatro mensajes, autorización registrada y vencimiento el 15 de noviembre de 2026 a las 23:03 Colombia, a 30 días del primer mensaje. Uso verificado: 0,001232 USD y cero retenido; limpieza más reciente mostrada a las 23:00. Resumen revisable de 836 caracteres, referencia y destinatario WhatsApp correctos, sin abrir ni enviar WhatsApp. Evidencias locales fuera de Git: `test-results/sarin-remote/sarin-www-prueba.jpg` y `sarin-www-historial.jpg`. La conversación ficticia permanece disponible para revisión del titular.
- Verificación del candidato: 282/282 pruebas, 6/6 de Pages, compilación y 14/14 HTTP independientes tanto en preview como en producción. En producción: portada, query de prueba y políticas 200 sin beacons automáticos; fuente pública con chat apagado, rutas privadas y POST de prueba sin Access 302, internos 404 y sesión pública 503 sin cookie de Sarin. Estas comprobaciones anónimas no crearon conversaciones ni llamaron a IA. Preview revisada: `https://cd64f7c1.alsdevstudio.pages.dev/`, aislada de D1 y secretos.
- Regla de analítica activa «ALS - Analítica solo con consentimiento», ID `8c5eb63c31fc477c8cff625f25835e81`, limitada a `(http.host eq "www.alsdevstudio.com")` y solo `disable_rum=true`. Se conserva la verificación previa de aceptación/rechazo. Durante la publicación privada, assets sin huella conservaban `max-age=14400`; una recarga sin caché en Chrome mostró el código nuevo. No se hicieron cambios persistentes de caché ni seguridad.
- Registro histórico de preparación: primero se publicó la preview `https://f2dd9eee.alsdevstudio.pages.dev/`, sin D1, secretos ni IA; producción permanecía entonces en `38c298b7`. Después se publicó y verificó el panel vacío y, finalmente, la prueba privada descrita arriba. El lanzador local conserva administración y prueba privada apagadas; solo `--live` permite probar el chat con D1 simulada.

## Sarin: administración e historial · solicitud del 16-10-2026

- El titular solicita un panel privado para consultar cada conversación y su historial y revisar posibles abusos. Confirma conservar las conversaciones completas durante **30 días** con borrado automático; los contactos que siguen por WhatsApp mantienen su política aparte.
- Ampliación aprobada: panel nuevo protegido con Cloudflare Access, historial fiable del servidor, señales técnicas de uso y autorización informada antes del primer mensaje. El panel anterior permanece retirado; no se restaura Firebase.
- Registro de alcance y preparación inicial: historial, autorización, panel y purga se implementaron y probaron primero en local. El estado actual superior añade prueba privada del titular a la publicación del panel, sesión TOTP funcional y primer cron correcto; las conversaciones de visitantes permanecen apagadas por las verificaciones contractuales/internacionales de DeepSeek pendientes. [Diseño](docs/superpowers/specs/2026-10-16-sarin-admin-historial-design.md) y [revisión de datos/términos](docs/legal/SARIN-REVISION-DATOS-Y-TERMINOS.md).

## Sarin comercial · entrega inicial previa al historial · 2026-10-16

- Chat para explorar páginas web, tiendas virtuales, aplicaciones y chatbots, con ejemplos del catálogo real. Resumen revisable de hasta 1800 caracteres y continuación manual con Andrés por WhatsApp; Andrés confirma alcance y cotización.
- Implementación Vanilla JS + Pages Function + D1 para metadatos de cuotas, con `deepseek-flash` y pensamiento desactivado como única IA. Conversación solo en memoria, contexto de cuatro intercambios y máximo quince turnos por conversación. Sin registro ni apertura o consulta automática.
- Registro histórico de la entrega inicial: versión local validada entonces con DeepSeek real, desactivada por defecto y aún sin publicar. Probados ejemplos de landing, tienda y chatbot, pregunta ajena y resumen editable hasta WhatsApp; no se enviaron mensajes automáticamente ni se contrataron planes. La publicación administrativa posterior no habilita el chat. [Operación y controles de costo](docs/SARIN-OPERACION.md).

## Sarin comercial y vistas de proyectos · 2026-10-16
- Sarin orientará sobre páginas web/landing pages, tiendas virtuales, aplicaciones a medida, soluciones web y chatbots; dará ejemplos reales según el problema del visitante. Objetivo confirmado: continuar por WhatsApp con un resumen revisable. Cotización final a cargo de Andrés; único proveedor DeepSeek, sin IA local. [Alcance y ejemplos](docs/SARIN-ASISTENTE-COMERCIAL.md).
- Actualizar las vistas de Dialon, Vigia (`/demo/`), Sarin Bot y SemanControl. Incorporar enlace/captura/carrusel de SemanControl y reflejar los estados públicos actuales sin atribuir funciones operativas a prototipos.
- El titular solicita actualizar GitHub y ejecutar las capturas todos los días a medianoche y mediodía, hora de Colombia. [Programación y recuperación](docs/CAPTURAS-PROYECTOS.md).

## Espacio SemanControl y tecleo estable · 2026-10-14
- El titular está construyendo SemanControl; aún no ha hecho push ni está publicado. Añadir su espacio en la galería como tarjeta no clicable «En construcción», sin inventar captura/funcionalidades y sin reutilizar el enlace de Sarin Bot que figura en el Markdown recibido.
- Corregir el movimiento extraño de la pose de Sarin ante la mesa en Proceso. Diagnóstico: el PNG B está desplazado40px frente a A, causando un salto de14px/11px en pantalla; el controlador mantiene neutral el actor. Alinear el segundo fotograma conservando tecleo y texto progresivo.

## Proyecto Sarin Bot y vuelo con mensajes · 2026-10-14
- Añadir el enlace proporcionado por el titular `https://sarinbotsaas.pages.dev/` al catálogo y al carrusel, después de los 18 proyectos actuales. Nombre visible Sarin Bot, categoría Producto y estado Próximamente: el sitio público declara que registro, reservas y chats aún no están disponibles. Descripción: «Producto en preparación para organizar las citas y la agenda de un negocio».
- Cambiar el vuelo existente por ida y vuelta con paradas y cinco textos distintos, sin «Hola». El titular confirma que los mensajes deben hablar de los servicios de ALS DevStudio. Conservar la ausencia de controles manuales y la suspensión por viewport/pestaña/reducido.

## Objetivo
Convertir la landing heredada de Santel en el portafolio público de ALS DevStudio, una marca de soluciones de software que muestra capacidad real de diseño, desarrollo web y construcción de productos digitales.

## Audiencia
Emprendedores, negocios locales, equipos técnicos y clientes que necesitan una aplicación, plataforma o sitio web que resuelva un problema concreto.

## V1 imprescindible
- Rebranding completo de Santel a ALS DevStudio.
- Uso de logo y portada de marca existentes.
- Portafolio curado con proyectos públicos del perfil de GitHub `andresleosan`.
- Navegación por filtros, enlaces a demos y repositorios.
- Interacciones visibles: cursor/orbita, reveal al scroll, hover en tarjetas y transiciones respetando `prefers-reduced-motion`.
- Contacto accionable por WhatsApp y GitHub.

## Ampliación del portafolio — 2026-10-12
- Conservar BPT-Jersey con su dominio `https://www.bptjersey.com/` y corregir su previsualización.
- Añadir Hampton Estates inmediatamente después de BPT, compartiendo fila en escritorio.
- Añadir Dialon y Vigia con enlaces públicos y estado «En construcción».

## Restricciones
- Restricción inicial del portafolio: HTML/CSS/JavaScript nativos. La ampliación Sarin autorizada añade Pages Functions, D1 y dependencias aisladas de build/autenticación, sin introducir un framework de frontend.
- No afirmar métricas o capacidades que no estén verificadas.
- La carpeta de assets fuente encontrada es `F:\Proyectos\ALS DevStudio\Img`.

## Referencia de datos
El usuario proporcionó `https://github.com/andresleosanayudame`, pero esa URL devuelve 404. Los repositorios que coinciden con la landing y el perfil público consultado pertenecen a `https://github.com/andresleosan`.

## Revisión de privacidad y accesibilidad — 2026-10-12
- Responsable confirmado: Andrés Leonardo Santiago González, persona natural freelancer, Medellín, Colombia; alsdevstudio@alsdevstudio.com y WhatsApp +57 314 643 2135.
- Servicios para empresas y personas naturales de cualquier país; pagos por transferencia bancaria previo acuerdo. La ausencia de reembolsos declarada requiere ajuste a derechos imperativos; no se publica como exclusión absoluta.
- Sin base separada de consultas declarada. Los chats permanecen en WhatsApp, solo el titular accede y no tiene plazo de borrado definido. Configuración y registros de Vercel pendientes de verificar.
- Eliminar conexiones automáticas a terceros, revisar accesibilidad y preparar textos legales verificables; no inventar identidad, licencias ni plazos.

## Correo visible en contacto — 2026-10-13
- Integrar alsdevstudio@alsdevstudio.com como alternativa visible a WhatsApp en la sección de contacto, con enlace para abrir el cliente de correo y diseño adaptable a móvil.

## Refinamiento con Antislop y Mobbin · 2026-10-13
- Aplicar Antislop durante la implementación, según elección expresa del titular.
- Mantener la identidad ALS, los 18 proyectos, sus destinos y las correcciones locales de privacidad. Priorizar capturas, lectura y contacto; reducir adornos repetidos y comentarios sin información.
- Mejorar portada, galería, proceso y contacto con las referencias de Mobbin. Mantener BPT junto a Hampton Estates y Dialon/Vigia identificados como proyectos en construcción.
- Preparar y verificar los cambios en local. Esta iteración no incluye publicación ni cambios en los documentos legales pendientes.

## Mascota ALS · 2026-10-13
- Integrar la mascota pixel art proporcionada por el titular como recurso de identidad en la portada y el contacto. Conservar su dibujo y colores; usar los archivos originales cuando estén disponibles.
- Mantener los proyectos y las acciones como contenido principal, sin superposiciones, controles nuevos ni animación continua. Adaptar su tamaño a móvil.

## Publicación autorizada · 2026-10-13
- El titular solicitó push del diseño y la mascota. Se incluyen las correcciones técnicas verificadas de privacidad que acompañan esta versión; los borradores legales con datos pendientes se conservan en local.

## Publicación de políticas · 2026-10-13
- El titular solicita publicar las políticas y el trabajo de la auditoría inicial. Completar los datos esenciales sin inventarlos; distinguir compromisos adoptados de configuración de proveedores sin verificar.
- Corregir el restablecimiento de preferencias al volver mediante el historial, conectar los documentos desde el footer y comprobar su lectura y navegación en móvil.
- El titular aportó dirección y NIT para publicar, confirmó Porkbun → Gmail con acceso exclusivo y adoptó revisión mensual con eliminación de consultas sin contrato tras seis meses sin actividad. Para proyectos, pagos y reclamaciones adopta conservación por necesidad legal/contractual y revisión al cierre. No se revisaron documentos de identidad ni cuentas privadas.

## Recuperar animación de proyectos · 2026-10-13
- El titular solicita recuperar la animación de las tarjetas al pasar el cursor. Restaurar inclinación, elevación y brillo del efecto anterior dentro de la galería actual, con retorno suave al salir y respeto a movimiento reducido.

## Recuperar recorrido de países · 2026-10-13
- Recuperar la selección automática de países del mapa. Incorporar pausa/reanudación visible y conservar la elección manual, las etiquetas de mapa ilustrativo y las preferencias de movimiento.

## Rediseñar proceso · 2026-10-13
- El titular solicita mejorar la sección de proceso porque no le convence su presentación en filas. Dar forma visual a las tres etapas reales, conservando el alcance acordado y el contenido sobre revisiones y mejoras posteriores.

## Recuperar banner de servicios · 2026-10-13
- Recuperar el desplazamiento continuo de la banda y ampliar/separar las frases para evitar repeticiones cercanas. Usar servicios y descripciones ya presentes en el sitio.

## Verificar configuración privada de Vercel · 2026-10-13
- El titular aclara que desea resolver la revisión pendiente del alojamiento, sin añadir un banner de cookies. Inspeccionar el panel autenticado de ALS DevStudio y contrastar los límites con documentación oficial.
- Documentar analítica, rendimiento, registros, integraciones y acceso; reducir el uso opcional de datos para entrenamiento en este proyecto. Cualquier cambio de plan o proveedor queda sujeto a decisión del titular.

## Analítica de visitas solicitada · 2026-10-13
- El titular solicita activar estadísticas de visitas. Integrar Vercel Web Analytics básico para visitas y páginas, sin eventos personalizados, publicidad ni Speed Insights.
- Ofrecer autorización opcional previa, rechazo equivalente y acceso permanente para cambiar o retirar la elección. Informar de datos, finalidades y límites reales; la ausencia de cookies del proveedor no se presenta como exención automática.
- Activación incluida en Hobby, sin contratar un plan. Mantener documentado el pendiente de adecuar el alojamiento a la actividad comercial. La solicitud de activación incluye publicar la integración necesaria y comprobar su funcionamiento.

## Identificación en el aviso de analítica · 2026-10-13
- Redacción aprobada por el titular: destacar ALS DevStudio en el párrafo principal y ubicar el nombre completo del responsable en texto secundario junto al contacto, con acceso a la política de privacidad.

## Migración de alojamiento a Cloudflare · 2026-10-13
- El titular solicita migrar el portafolio comercial desde Vercel Hobby a Cloudflare. Conservar dominio, diseño, proyectos, contacto, correo en Porkbun y despliegues desde GitHub.
- Preparar Cloudflare Pages con una salida pública dedicada, cabeceras de seguridad y páginas legales actualizadas. Mantener estadísticas opcionales mediante instalación manual de Cloudflare Web Analytics y solicitar una elección nueva para este proveedor.
- Validar una versión de prueba antes del cambio del dominio. Sin contratación de servicios de pago ni traslado del registro del dominio. La aprobación del corte de producción se solicita con la versión revisable y el plan de reversión preparados.

## Nueva mascota ilustrada · 2026-10-13
- El titular solicita reemplazar la mascota pixel art usando su nueva lámina de tres robots como referencia. Robot blanco y gris con visor oscuro, ojos turquesa y marca ALS; ilustración suave, fondo transparente y personalidad cercana.
- Mantener las dos ubicaciones existentes: bienvenida en portada y robot con portátil en contacto. Conservar el protagonismo del contenido y comprobar tamaños, proporciones y lectura en móvil antes de publicar.

## Redirección del dominio Pages · 2026-10-13
- El titular solicita expresamente que `https://alsdevstudio.pages.dev/` redirija a `https://www.alsdevstudio.com/`. Conservar rutas y parámetros de los enlaces; mantener los previews para revisar cambios futuros.

## Argentina y proceso explicado por Sarin bot · 2026-10-13
- Añadir Argentina a las referencias del mapa y reducir el cambio automático entre países a dos segundos, conservando pausa, selección manual y respeto al movimiento reducido.
- Reemplazar las tres ilustraciones genéricas del proceso por Sarin bot, el robot ALS existente, explicando definir, construir y entregar mediante poses y globos de texto. Conservar el alcance y los compromisos comerciales actuales.
- Contacto: WhatsApp en la columna izquierda y presentación/correo en la derecha; WhatsApp primero en móvil y en el recorrido por teclado.

## Redirección de la vista previa compartida · 2026-10-13
- El titular pide que `https://8f2ced74.alsdevstudio.pages.dev/`, accesible en línea, también redirija a `https://www.alsdevstudio.com/`. Aplicar al hostname exacto compartido y conservar rutas/parámetros.

## Globos de proceso del mismo tamaño · 2026-10-13
- Quitar la frase «Te cuento cómo cerramos:» del tercer globo y hacer que los tres recuadros tengan igual altura, manteniendo el contenido restante y las poses de Sarin.

## Retirar etiquetas de sección · 2026-10-13
- El titular pide quitar «01 / alcance global», «02 / proyectos», «03 / proceso», «Por WhatsApp» y «04 / contacto». Conservar los títulos principales y ajustar los espacios que dejan.

## Sarin en tres escenas de scroll · 2026-10-13
- Propuesta aprobada expresamente por el titular: vuelo en el espacio previo a Alcance, presentación de Proyectos y portátil animado en Contacto. Animaciones de dos a tres segundos, una vez al entrar en cada zona.
- Mantener identidad, contenido y controles actuales. En móvil, entradas más suaves; con movimiento reducido o sin JavaScript, pose estática. No añadir audio, reproducción continua ni nuevos rótulos de sección.

## Vuelo con pausas y Sarin tecleando · 2026-10-13
- El titular solicita que Sarin se detenga y vuelva a volar; aclara expresamente «Repetir mientras la zona esté visible». Esta revisión sustituye la ejecución única solo para el vuelo. Añadir pausa manual y suspender fuera de pantalla o con la pestaña oculta.
- En Proyectos, sustituir la pose de saludo y ventana genérica por Sarin con portátil, gesto de escritura y aparición progresiva del texto actual. Mantener el texto completo accesible, lectura sin JS y movimiento reducido estático. Contacto conserva su escena existente.
### Saludo en vuelo y tecleo del proceso · 2026-10-13
- Corrección solicitada sobre las animaciones publicadas: Sarin se detiene a mitad del vuelo, saluda, muestra «¡Hola! Una buena idea puede llegar lejos. ¿Le damos vuelo a la tuya?» y continúa; repite mientras la zona esté visible. Retirar el rótulo «Pausar vuelo», conservando un pequeño control de movimiento por icono.
- Añadir portátil con dos poses de tecleo al encabezado de «Cómo trabajaremos», con el texto existente apareciendo progresivamente. Conservar las tres tarjetas y sus alturas, el contenido completo accesible y una composición estática con movimiento reducido o sin JavaScript.
### Tres etapas animadas · 2026-10-13
- El titular solicita animar las tres tarjetas de «Cómo trabajaremos» y que el texto aparezca junto con cada animación. Definir: saludo; Construir: tecleo del portátil; Entregar: gesto y señal de aprobación. Título seguido de explicación, conservando los textos, la lectura completa y la igualdad de alturas.
- Reproducción única por tarjeta al quedar suficientemente visible; vista estática con movimiento reducido o sin JavaScript. Extensión de las animaciones del sitio publicadas y autorizadas en la misma sesión.
### Presentación animada de la portada · 2026-10-13
- El titular solicita animar e innovar también la firma de la portada. Sarin saluda con un destello suave y globo «¡Hola! ¿Qué idea construimos hoy?», mientras aparecen en orden «Andrés Santiago» y «Desarrollo independiente · Trabajo remoto».
- Conservar los dos textos, el CTA y la columna izquierda. Una entrada al estar visible, después del aviso de analítica; originales completos accesibles y vista estática sin JavaScript o con movimiento reducido. Reutilizar la ilustración actual.
### Retirar el icono de pausa del vuelo · 2026-10-14
- El titular señala el botón circular de pausa y solicita quitarlo. Retirar el control visible, conservando vuelo repetido, parada central, saludo y continuación. La animación sigue suspendiéndose fuera de pantalla o con la pestaña oculta; movimiento reducido y sin JavaScript conservan la pose estática.
- El titular aclara expresamente: «no quiero que aparezca ni ue se pause, debe seguir el ciclo normal». No vincular la pausa de la franja ni añadir otra pausa manual para Sarin. Conservar el ciclo visible solicitado y los modos de suspensión ya existentes.
### Poses distintas en Alcance y Proceso · 2026-10-14
- El titular solicita Sarin tecleando junto al texto «Ideas que cruzan fronteras…» de Alcance y una pose diferente para el encabezado de Proceso. Mantener el mismo personaje, pero dos siluetas y posiciones diferentes: flotando con portátil en Alcance, de pie ante mesa compacta en Proceso.
- Dos fotogramas de tecleo por pose y texto existente progresivo, una entrada al ser visible. Movimiento reducido/sin JavaScript muestran texto y pose completos. El vuelo sigue el ciclo normal sin pausa manual; resto de escenas conserva su comportamiento.
