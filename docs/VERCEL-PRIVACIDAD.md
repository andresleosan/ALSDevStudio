# Verificación privada de Vercel · 13 de octubre de 2026

Nota de vigencia: esta revisión se conserva como evidencia histórica. La migración solicitada a Cloudflare y el cierre del pendiente de alojamiento comercial se registran en [MIGRACION-CLOUDFLARE.md](MIGRACION-CLOUDFLARE.md); este documento no describe la configuración del proveedor nuevo.

**Actualización posterior:** a petición del titular, Web Analytics se habilitó ese mismo día en la modalidad incluida de Hobby. La integración con consentimiento previo, sus pruebas y publicación se registran en [RELEASE-ANALITICA.md](RELEASE-ANALITICA.md). Los resultados de «Analytics desactivado» y «sin banner» que siguen describen la inspección inicial, anterior a esa nueva solicitud. La exclusión de entrenamiento permanece aplicada y no se cambió de plan.

## Alcance y método

El titular pidió resolver la revisión pendiente de configuración privada, no añadir un banner. Se inspeccionó el dashboard con la sesión autenticada del navegador y se contrastaron sus estados con documentación oficial abierta el mismo día. Proyecto: `alsdevstudio`, asociado al repositorio `andresleosan/ALSDevStudio` y al dominio `www.alsdevstudio.com`. No se leyeron credenciales, variables de entorno ni conversaciones; no se exportaron logs de visitantes.

La inspección confirma los siguientes estados en esta fecha. No prueba la configuración histórica, todos los accesos mediante aplicaciones/tokens ni el funcionamiento interno de Vercel.

## Evidencia observada

| Área del dashboard | Resultado | Alcance |
| --- | --- | --- |
| Equipo | Plan Hobby | La barra lateral lo identifica como Hobby; Observability Plus y Drains ofrecen actualizar el plan. |
| Proyecto → Analytics | Botón Enable y gráficos Demo Data | Web Analytics desactivado; los gráficos de demostración no son visitantes del sitio. |
| Proyecto → Speed Insights | Get Started, No events collected y sin datos en últimos siete días de producción/escritorio | La página solicita instalar el paquete. El código publicado no lo incluye y la prueba del navegador no detectó envíos. No se afirma una desactivación histórica ni ausencia de datos en todos los entornos. |
| Proyecto → Integrations | No Integrations Installed | Sin integraciones instaladas en este proyecto; la conexión GitHub para desplegar es distinta. |
| Equipo → Drains | Get started with Drains; Add Drain deshabilitado; requiere Pro para crear el primero | Sin destinos configurados de exportación de telemetría en el equipo. |
| Proyecto → Observability | Solicitudes CDN y transferencia, Last 12 hours; sin datos de funciones en ese intervalo | Hay observabilidad técnica del alojamiento aunque no haya analítica del navegador. Plus no está contratado en esta cuenta. |
| Proyecto → Logs | There are no request logs in this time range | Ningún registro en la ventana consultada; no acredita que nunca existan ni que Vercel no conserve otros registros. |
| Equipo → Members | Accesos y doble factor comprobados en el panel | Se revisaron los miembros y filtros de 2FA. Se omiten los identificadores de cuenta en este registro público. No se inspeccionaron tokens, sesiones ni aplicaciones autorizadas. |
| Equipo → Security & Privacy | Revisados los controles de visibilidad de IP y autenticación | Son ajustes de equipo que afectan a otros proyectos; se conservaron. La configuración detallada de seguridad se omite de este registro público. Un interruptor de visibilidad de IP no prueba por sí solo una exportación activa. |
| Equipo/proyecto → Vercel Toolbar | Hereda el valor de equipo, activado por defecto | El panel explica que en producción requiere extensión o habilitación del dominio por miembros. No se detectó inyección para el visitante de la prueba pública. |
| Equipo → Compliance | Documentos de seguridad/atestaciones restringidos a Pro/Enterprise | No se descargaron ni aceptaron acuerdos. Esta restricción no demuestra ausencia de DPA; el acuerdo aplicable y su adecuación internacional requieren revisión documental. |

## Ajuste realizado

En **Project Settings → Data Preferences**, `Improve models with this project’s data` estaba activado. Se desmarcó, se guardó y se verificó otra vez tras recargar: desactivado y botón Save sin cambios pendientes. Se capturó evidencia visual en la sesión del navegador.

El cambio afecta únicamente a ALS DevStudio. No se modificó la preferencia global ni la de otros proyectos, no se activaron servicios ni se cambió el plan. La [explicación oficial de Vercel](https://vercel.com/changelog/updates-to-terms-of-service-march-2026) incluye código, chats existentes y telemetría en el programa opcional; el opt-out se aplica inmediatamente hacia el futuro. No demuestra que existieran chats de IA ni una cesión histórica concreta, y no permite revertir datos ya compartidos. El funcionamiento, seguridad y usos de mejora sin entrenamiento siguen sujetos a los términos del proveedor.

Reversión técnica: volver a marcar esa misma opción y guardar. No se recomienda hacerlo sin decidir de nuevo sobre la cesión opcional. El ajuste no requiere despliegue.

## Conservación: qué se puede afirmar

- [Runtime Logs](https://vercel.com/docs/logs/runtime): retención documentada de una hora para Hobby.
- [Observability](https://vercel.com/docs/observability/observability-plus): métricas de doce horas en Hobby; coincide con la ventana vista en el panel. No se activó Plus.
- No convertir esos límites en una promesa de borrado completo de IP, registros de seguridad, compilaciones, actividad administrativa o copias. El [aviso del proveedor](https://vercel.com/legal/privacy-notice) contempla tratamiento técnico más amplio; no se verificó el borrado interno, sus regiones concretas ni todos los subencargados/acuerdos de la cuenta.

## Hallazgos y decisiones pendientes

1. **Alta · Compatibilidad comercial del alojamiento.** Las [reglas de uso de Vercel](https://vercel.com/docs/limits/fair-use-guidelines#commercial-usage) reservan Hobby a uso personal no comercial e incluyen anunciar productos o servicios entre los usos comerciales. ALS ofrece desarrollo remunerado: la aplicación de esa regla a este sitio indica incompatibilidad con Hobby, aunque se cobre por transferencia fuera de la web. El titular debe decidir un plan autorizado para actividad comercial, otro alojamiento compatible o aclaración expresa con Vercel. No se contrató, migró ni contactó soporte.
2. **Media · Entrenamiento opcional.** Corregido para el proyecto hacia adelante. El uso histórico permanece sin verificar. Otros proyectos están fuera de esta revisión.
3. **Media · Datos técnicos y contratos internacionales.** Documentar acuerdos aplicables, subencargados, tratamiento internacional y conservación interna con apoyo jurídico cuando corresponda. El panel no permite cerrar estas cuestiones con una prueba de navegador.
4. **Revisión periódica · Acceso y exposición de IP.** Miembros y estado de 2FA revisados; quedan fuera sesiones, tokens y aplicaciones autorizadas. Valorar la visibilidad de IP a nivel del equipo según las necesidades de seguridad de todos sus proyectos; no se alteró durante esta revisión de ALS.

## Cambios documentales y límites

Se actualizaron en local `privacidad.html` y `cookies.html` para sustituir el pendiente genérico de cuenta privada por estos hechos y límites. No se añadió banner, almacenamiento ni script; no se publicó la actualización ni se cambió el sitio desplegado. El ajuste de entrenamiento sí quedó aplicado en Vercel.

La prueba pública previa de este turno devolvió HTTP 200, cero cookies, almacenamiento vacío al entrar y únicamente la preferencia del carrusel tras pulsar pausa; todas las solicitudes observadas fueron del mismo origen. Esa prueba y el dashboard se complementan, pero ninguno certifica por sí solo cumplimiento integral.

Validación local posterior: `node test-results/legal-release-smoke.mjs` PASS. Ocho archivos y cabeceras correctos; navegación legal, restablecimiento por teclado, retorno al carrusel y ancla de cancelaciones; lectura a 1440/320 px y sin JavaScript. Cero cookies, peticiones externas o errores en ese recorrido. `git diff --check` PASS. La revisión independiente no encontró bloqueantes; se aclararon afirmaciones históricas de la auditoría y se minimizaron detalles de seguridad en esta documentación.
