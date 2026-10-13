# Analítica opcional de visitas · 13 de octubre de 2026

## Alcance y autorización

El titular solicitó activar estadísticas para conocer las visitas del sitio. Se habilitó **Vercel Web Analytics en la modalidad incluida de Hobby**, sin contratar Pro, Plus, eventos personalizados ni otros servicios de pago. Se integra medición después de una elección afirmativa y se actualizan las políticas para describir la práctica real. La activación incluye publicar la integración y comprobarla; se conservan proyectos, contactos y animaciones existentes.

Panel: https://vercel.com/andres-leo-san-s-projects/alsdevstudio/analytics?environment=all

La habilitación se verificó en el dashboard autenticado: desaparecieron Enable/Demo Data y apareció el panel real con instrucciones de instalación y contadores inicialmente en cero. No se alteraron la exclusión de entrenamiento de IA, controles de equipo, miembros ni proveedores de contacto. La revisión privada previa se conserva en [VERCEL-PRIVACIDAD.md](VERCEL-PRIVACIDAD.md).

## Funcionamiento y datos

- `scripts/analytics.js` carga el endpoint propio `/_vercel/insights/script.js` solo después de aceptar, en ALS y sus páginas públicas conocidas. Sin dependencias de build ni secretos; CSP y Referrer-Policy restrictivas permanecen sin cambios.
- Se deshabilita el seguimiento automático del runtime oficial mediante `data-disable-auto-track="1"`. La API pública registra una sola vista por documento; no cuenta anclas, clics, formulario ni aceptar de nuevo dentro de la misma página.
- El hook `beforeSend` comprueba de nuevo la elección, elimina consulta/fragmento de la URL y descarta eventos o rutas no permitidos. Se omite toda medición si el referente contiene consulta/fragmento o una ruta externa distinta de la raíz, porque la API documentada no permite sustituirlo. La cabecera documental `Referrer-Policy: no-referrer` protege también el Referer HTTP.
- El proveedor puede recibir página, referente admisible, fecha, ubicación aproximada, navegador, sistema operativo y dispositivo. No se envían chats, contactos ni contenido del mini brief. La política atribuye al proveedor su descripción de estadísticas agregadas, sin garantizar ausencia absoluta de tratamiento personal.
- Preferencia `als:analytics-consent:v1` con elección/fecha y validez de 180 días, sin identificador. Rechazo y aceptación tienen igual presencia. Escape/X no aceptan. El pie de las cuatro páginas permite cambiar la decisión; las políticas pueden leerse sin elegir.
- Antes de enviar se relee el almacenamiento; retirada entre pestañas y retorno mediante historial bloquean eventos futuros. Si no puede persistir una elección, esa página no mide y muestra el error. Al retirar intenta borrar la aceptación anterior si no puede sobrescribirla; si ambas operaciones fallan, avisa que deben borrarse los datos del sitio antes de navegar. No promete cancelar solicitudes en curso ni eliminar estadísticas anteriores.
- Sin JavaScript, sin soporte de diálogo, en rutas desconocidas o en entornos ajenos a los dominios de producción no se carga Analytics. Las preferencias del carrusel siguen siendo independientes.

## Límites, coste y pendientes

- La modalidad actual incluye 50.000 eventos mensuales compartidos por equipo; la recopilación se pausa al superar el límite, sin autorizar gasto adicional. Los bloqueadores, el rechazo, los referentes descartados y el límite producen subregistro. Las estadísticas empiezan con esta integración; no reconstruyen visitas anteriores.
- Vercel indica descarte de hash/sesión a las 24 horas y una ventana garantizada de un mes para consultar datos en Hobby. No equivalen a eliminación total en esos plazos; el proveedor admite conservar estadísticas más tiempo.
- **Pendiente alto:** Hobby se reserva a uso personal no comercial; anunciar servicios entra en uso comercial según Vercel. La integración no resuelve esa incompatibilidad. El titular debe decidir alojamiento compatible, plan autorizado o aclaración con el proveedor; no se cambió de plan ni se contrató nada.
- **Revisión profesional:** adecuación de acuerdos/subencargados y tratamiento internacional, conservación interna y prueba de autorización. El dato local de elección permite control técnico, pero no es un registro central duradero bajo control de ALS; no se inventa una base de datos ni se promete cumplimiento integral.

## Verificación

Comprobación local completada por Cronos después de revisión independiente:

- `node test-results/analytics-consent-qa.mjs`: **49/49 PASS**. Sin SDK/envíos antes de aceptar o tras rechazo, una vista por documento, retirada con runtime cargado o pendiente, sincronización entre pestañas, carreras sin evento storage, preferencias inválidas/expiradas y fallos simples/dobles/triples de almacenamiento. Incluye minimización de payload/Referer, rutas y dominios, error de carga, reset independiente, cuatro páginas sin JavaScript y 16 combinaciones de diálogo/página/ancho entre 320 y 1440 px.
- El ensayo utiliza el runtime oficial descargado, SHA-256 `b1fa9fc8104da15958badc63bbebbe46eeea4d9ce88e587d7732b2c4f4238d8af`. Toda la red se intercepta: no envía pruebas locales a Vercel. Solo en ese entorno aislado se usa UA normal y `webdriver=false`, porque el proveedor omite navegadores automatizados. No prueba recepción remota ni TLS real.
- Axe del diálogo sin violaciones automáticas; contraste mantiene comprobaciones manuales pendientes en el motor por superposición/carácter ×. Colores sólidos revisados: texto secundario 9,41:1, títulos 17,64:1, verde 10,26:1 y botones 14,12:1 (hover 12,13:1). Capturas 320/1440 inspeccionadas, controles/enlaces al menos 44 px, foco y Escape comprobados. No sustituye lector de pantalla ni certificación WCAG.
- `node test-results/legal-release-smoke.mjs`: **PASS**, nueve archivos/cabeceras, enlaces, teclado, reset/regreso al carrusel, 1440/320 px y lectura sin JavaScript; sin errores ni conexiones externas en el recorrido rechazado.
- `node test-results/design-qa.mjs`: **PASS**, 19 comprobaciones, cinco anchos, proyectos/contacto/animaciones preservados y dos auditorías axe sin violaciones automáticas. Persisten comprobaciones manuales de contraste complejo en portada.
- `node --check scripts/analytics.js` y `git diff --check`: **PASS**. Revisión de seguridad: HTML del diálogo fijo, ningún parámetro de visitante interpolado, no hay secretos ni ampliación de CSP. Corregidos los defectos de retirada/persistencia encontrados por la revisión independiente. Sin hallazgos críticos en este cambio.

Evidencia local regenerable en `test-results/analytics-consent-qa-results.json`, capturas `analytics-dialog-*.png` y reportes de regresión. El historial del navegador/bfcache real no se presenta como ensayado: sí se probó la relectura antes de cada envío y la retirada entre pestañas.

## Publicación y recepción real

Publicado mediante push normal de `712784207154376f8354a728e902e4be9441012a`, con autor y committer `Andres Santiago` y correo noreply de `andresleosan`; hash confirmado en origin/main. Sin reescritura de historia.

- `LEGAL_BASE=https://www.alsdevstudio.com node test-results/legal-release-smoke.mjs`: **PASS**, nueve archivos publicados coinciden con la fuente; cabeceras, enlaces, teclado, restablecimiento, móvil y sin JavaScript correctos. Cero cookies, errores u orígenes externos en el recorrido rechazado.
- Chrome real con sesión del navegador, sin modificar UA ni webdriver: antes de aceptar y después de rechazar, **cero solicitudes** al servicio de Analytics. Al aceptar, una descarga del script HTTP 200 y un POST de vista HTTP 200. Payload observado: origen/ruta pública, versión del runtime, fecha y referente vacío; no contenía consulta ni datos de contacto, y Referer HTTP vacío.
- Retirar mediante el pie y recargar produjo **cero solicitudes** adicionales de Analytics. La prueba terminó con analítica rechazada en ese navegador.
- Dashboard autenticado mostró **Visitors 1 / Page Views 1**, ruta `/`, país Colombia y sistema Windows. Se trata de la visita de prueba, no de tráfico orgánico. Panel dejado abierto para el titular; evidencia visual observada en la sesión. Desde aquí empiezan las estadísticas; no se recupera historial anterior a la integración.

Los contadores prueban recepción de este ensayo, no exactitud universal de medición ni ausencia de subregistro. Persisten los límites contractuales y profesionales descritos arriba.

## Reversión

Si aparece una regresión, revertir mediante un nuevo commit el commit de esta integración y hacer push normal; no reescribir historia. Esa reversión elimina script, controles y actualizaciones asociadas. Deshabilitar Web Analytics en el panel si se desea detener también la recopilación para páginas antiguas que continúen abiertas. Verificar después cero solicitudes de Analytics en una sesión nueva. No hay migración ni datos de aplicación que restaurar; la reversión no elimina estadísticas ya recibidas. La exclusión de entrenamiento de IA es un ajuste independiente que debe conservarse.

## Fuentes oficiales consultadas

- [Inicio y vanilla JS](https://vercel.com/docs/analytics/quickstart), [configuración](https://vercel.com/docs/analytics/package), [minimización](https://vercel.com/docs/analytics/redacting-sensitive-data), [SDK oficial](https://github.com/vercel/analytics/blob/main/packages/web/src/generic.ts).
- [Datos y privacidad](https://vercel.com/docs/analytics/privacy-policy), [límites y precios](https://vercel.com/docs/analytics/limits-and-pricing), [uso comercial](https://vercel.com/docs/limits/fair-use-guidelines#commercial-usage).
- [Ley 1581](https://www.cancilleria.gov.co/normograma/compilacion/docs/ley_1581_2012.htm), [Decreto 1074](https://cancilleria.gov.co/sites/default/files/Normograma/docs/decreto_1074_2015_pr025.htm). No se identificó una exención colombiana general por tratarse de analítica sin cookies.
