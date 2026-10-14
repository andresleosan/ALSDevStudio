# Migración de ALS DevStudio a Cloudflare

Fecha: 2026-10-13. Estado: candidato público verificado; corte de producción
autorizado explícitamente por el titular y en ejecución.

## Alcance y ruta

Migrar el sitio comercial estático a Cloudflare Pages Free desde el repositorio
`andresleosan/ALSDevStudio`, preservando `https://www.alsdevstudio.com`, diseño,
proyectos, contacto y correo. Sin cambio de registrador, nameservers, servicios de
correo ni contratación de un plan. Pages permite usar `www` con DNS externo;
Workers Static Assets requeriría una zona activa para el dominio personalizado.

El comando de build será `node .github/cloudflare/build.mjs`, con salida `dist`.
Proyecto Pages `alsdevstudio`, integración GitHub existente y `NODE_VERSION=22`.
La rama de Pages durante la preparación es `migration/cloudflare`; al promover
la versión aprobada, cambiarla a `main` después de integrar el código mediante
push normal. No usar el `main` anterior para construir este candidato.
Promoción ejecutada mediante fast-forward y push normal a `main` en `e4cdabd`.
Se copia una lista permitida de archivos públicos, nunca la raíz del repositorio.
No se publican documentos internos, resultados de QA, configuración de cuentas
ni herramientas. Cabeceras mediante `_headers` y un 404 propio. El build adapta
enlaces, canonicals y sitemap a las rutas sin extensión de Pages; las URLs `.html`
anteriores siguen resolviendo mediante la normalización del proveedor.

## Analítica y privacidad

Instalación manual de Cloudflare Web Analytics; no habilitar la inserción automática
de Pages. Carga únicamente tras una elección específica del proveedor y en dominios
canónicos. No se reutiliza la aceptación guardada para Vercel. Sin eventos comerciales
personalizados, publicidad ni seguimiento de History API (`spa: false`).

El beacon incluye visitas, páginas y métricas de rendimiento real. Se mantienen el
filtrado de referentes admisibles y los límites de rutas. El código oficial inspeccionado
limpia query y fragmentos de la URL principal y del referente; los recursos LCP se
mantienen locales y sin parámetros. No hay callback `beforeSend` público.

Al retirar la elección, una CSP adicional bloquea nuevas conexiones de medición antes
de la recarga; el documento siguiente no carga el beacon. Esto no cancela solicitudes
ya iniciadas ni elimina estadísticas previas. La implementación y los payloads deben
validarse con el runtime oficial y red interceptada antes de aprobar el candidato.

Las políticas del sitio se actualizan para identificar Cloudflare como alojamiento y
analítica, sus datos y límites reales. La revisión de Vercel se conserva como historia.
Los requisitos jurídicos profesionales ya documentados no se dan por resueltos por
un cambio de proveedor.

## Costos y continuidad

Previsión: USD 0/mes de alojamiento y analítica dentro de Pages Free (500 builds/mes,
20.000 archivos y 25 MiB por archivo). No se activan Functions, R2 ni un plan pagado.
El workflow existente de capturas mantiene su ejecución; sus commits deben generar
una reconstrucción en Pages mediante la integración de GitHub.

`vercel.json` desactiva nuevos despliegues automáticos de este proyecto para que el
push de la rama candidata y el posterior merge no sobrescriban el respaldo de Vercel.
Esto no elimina proyectos ni versiones existentes. Si se decide volver a desplegar en
Vercel, reactivar `git.deploymentEnabled` como parte de la reversión.

Primero se valida el candidato de Cloudflare. Después se presenta el corte del dominio
para aprobación explícita. No se elimina Vercel durante el corte; se conserva su última
versión válida como reversión y se evita que la migración sobrescriba ese respaldo.

## DNS anterior y reversión

Verificado antes de la migración:

- Nameservers: `curitiba.ns.porkbun.com`, `fortaleza.ns.porkbun.com`,
  `maceio.ns.porkbun.com`, `salvador.ns.porkbun.com`.
- `www` CNAME: `9d0c498e4c157bb8.vercel-dns-017.com`.
- Apex A: `216.198.79.1`.
- MX: `fwd1.porkbun.com` prioridad 10 y `fwd2.porkbun.com` prioridad 20.
- TTL observado en Porkbun: 600 segundos para los siete registros existentes.
  El TXT SPF y los dos TXT `_acme-challenge` existentes se conservan. Sin CAA
  en el panel antes del corte.

El corte sustituye únicamente la resolución web de `www` y la redirección del apex
a `https://www.alsdevstudio.com`, conservando URI. Antes de ejecutarlo se registran
los valores y TTL del panel DNS. Se verifican HTTPS, redirecciones, archivos,
cabeceras, navegación y MX tras el cambio.
Registrar primero `www.alsdevstudio.com` en Custom domains de Pages y usar
la opción de proveedor DNS externo. Tras el corte autorizado, comprobar también
la carga del beacon después de aceptar, su recepción por Cloudflare y la retirada
en el dominio canónico. El candidato `pages.dev` no permite acreditar recepción
porque allí la medición está desactivada por hostname.

Si falla el candidato público, restaurar el CNAME anterior de `www` y el A anterior
del apex, retirar la redirección nueva de Porkbun si fue creada y verificar Vercel.
No reescribir Git ni eliminar servicios durante la reversión. Los cambios de DNS
pueden tardar en propagarse; conservar la evidencia del estado previo.

## Evidencia del candidato

- Despliegue inicial de Pages completado desde `migration/cloudflare`, commit
  `98dd61272ed57667b98fae4026982f3f67ea75f2`, deployment
  `a1a10f4b-212b-44a9-82ad-bc0382d13f2f`.
  [Candidato](https://alsdevstudio.pages.dev/) y
  [versión inmutable](https://a1a10f4b.alsdevstudio.pages.dev/).
- `PAGES_QA_BASE=https://alsdevstudio.pages.dev node --test .github/cloudflare/pages.test.mjs`:
  4/4 PASS contra Cloudflare real. Archivos publicados coinciden con `dist`;
  sin inserción automática del beacon, sin conexiones externas antes de consentir,
  cabeceras y `noindex` de preview comprobados. Incluye 18 proyectos, mapa tras
  rechazar, redirecciones, 404 de documentos internos, lectura sin JavaScript y
  dos auditorías axe del diálogo sin violaciones a 320/1440 px.
  Capturas locales: `test-results/cloudflare-pages-aviso-320.png` y
  `test-results/cloudflare-pages-aviso-1440.png`; revisión visual completada.

- Build: 182 archivos públicos, aproximadamente 4,7 MB; ninguno supera 25 MiB.
  Doce pruebas de empaquetado pasan, incluidos límites, referencias, rutas y protección
  del destino. Los documentos internos y herramientas no están en `dist`.
- El titular confirmó conservar estadísticas de Cloudflare. El sitio está registrado
  para instalación manual en la cuenta existente; no se ha instalado el script en
  producción ni cambiado el DNS durante esta preparación.
- Beacon público inspeccionado: versión `2026.10.0`, 31.679 bytes, SHA-256
  `3e5bc7ca508f5d5aa7255341243840c8d2b70c8aea323800b51610df3f5a8a2c`.
  Para reproducir, descargar `https://static.cloudflareinsights.com/beacon.min.js`
  en `test-results/cloudflare-beacon.min.js` y verificar ese hash antes del ensayo.
- `node --test .github/cloudflare/analytics.test.mjs`: Chromium 20 PASS, WebKit
  20 PASS, Firefox 19 PASS/1 omitida. Selección mediante `CF_QA_BROWSER`.
  Toda la red de este ensayo se intercepta; no se enviaron datos a Cloudflare.
  Firefox/Playwright entregó `document.referrer` vacío, por lo que el filtro de
  referentes no vacíos se verificó en Chromium/WebKit, sin simularlo en Firefox.
  La restauración BFCache se ejercita mediante `pageshow persisted` sintético.
- `node --test .github/cloudflare/pages.test.mjs`: cuatro pruebas PASS contra
  `http://127.0.0.1:8788`, servido por Wrangler 4.150.0. Incluye artefacto, cabeceras,
  URLs históricas, 404 real para internos/anidados, mapa tras rechazar, 18 proyectos,
  controles, dos auditorías axe a 320/1440 px y documentos sin JavaScript.
  Puede repetirse contra el candidato público con `PAGES_QA_BASE`.
- Revisión independiente y sintaxis sin bloqueantes. No se afirma certificación
  jurídica integral ni auditoría manual con lector de pantalla.

## Fuentes verificadas

- [Dominios de Pages](https://developers.cloudflare.com/pages/configuration/custom-domains/).
- [Cabeceras](https://developers.cloudflare.com/pages/configuration/headers/) y
  [rutas de Pages](https://developers.cloudflare.com/pages/configuration/serving-pages/).
- [Límites de Pages](https://developers.cloudflare.com/pages/platform/limits/).
- [Instalación de Web Analytics](https://developers.cloudflare.com/web-analytics/get-started/),
  [FAQ](https://developers.cloudflare.com/web-analytics/faq/) y
  [opción SPA](https://developers.cloudflare.com/web-analytics/get-started/web-analytics-spa/).
- [Redirección HTTPS en Porkbun](https://porkbun.com/products/url_forwarding).
- [Recomendación general de Workers](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/).
