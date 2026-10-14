# Redirección del dominio Pages a www

Fecha: 2026-10-13. Estado: aplicada y verificada por solicitud expresa del titular:
`https://alsdevstudio.pages.dev/` debe redirigir a `www.alsdevstudio.com`.

## Configuración aplicada

Cloudflare Bulk Redirects de la cuenta existente. Lista dedicada
`als_pages_to_www`, ID `a04babe469224dd8b76a5825021b5202`, con este registro inicial:

| Campo | Valor |
| --- | --- |
| Source URL | `alsdevstudio.pages.dev/` |
| Target URL | `https://www.alsdevstudio.com/` |
| Status | 301 |
| Preserve query string | Sí |
| Subpath matching | Sí |
| Preserve path suffix | Sí |
| Include subdomains | No |

Regla `ALS Pages a www`, ID `3f3b0736e57641a3b1e8e4616011ff15`, estado **Enabled**,
asociada únicamente a esa lista. Origen sin esquema para cubrir HTTP y HTTPS.
Los previews por hash/rama conservan su hostname al excluir subdominios, excepto los orígenes exactos retirados después a petición del titular (ver8f2ced74 abajo).
Se mantuvo la regla de BPT existente; no hubo cambio de plan, DNS, correo,
Functions, scripts ni `_redirects` del proyecto.

Se usó la ruta oficial de Cloudflare para el hostname de Pages. `_redirects`
no admite reglas por dominio y una redirección global de rutas podría causar
un bucle en el propio dominio canónico.

## Evidencia

Antes: `alsdevstudio.pages.dev/` respondía 200 y `www` respondía 200.
Después: panel Enabled y lista Active.
`node test-results/pages-canonical-qa.mjs`: PASS con siete entradas:

- Raíz HTTPS y HTTP: 301 directo a `https://www.alsdevstudio.com/`, destino 200.
- `/privacidad`: ruta conservada, destino 200.
- `/cookies?qa=canonical&valor=a%2Fb`: query conservada exactamente, destino 200.
- `/privacidad.html?qa=canonical`: dominio cambiado con ruta/query preservadas;
  normalización histórica posterior a `/privacidad`, destino 200.
- `/assets/brand/mascot-welcome.png?qa=canonical`: mismo asset/query, destino 200.
- `/no-existe/anidado?qa=canonical`: misma ruta/query, 404 final correcto.

Preview `6a97985c.alsdevstudio.pages.dev` conserva 200 sin redirección y `noindex`.
En `www`, raíz, privacidad y cookies responden 200 sin Location ni `noindex`;
TLS validado durante las solicitudes y sin bucles. Informe local:
`test-results/pages-canonical-qa.json`.
Captura de los valores guardados en el panel:
`test-results/pages-canonical-rule.jpg`.

Revisión de seguridad: origen y destino fijos, alcance limitado al hostname
solicitado, sin destinos controlados por entradas ni ampliación de acceso.
No se recopilaron registros de visitantes. La configuración permanece activa
entre despliegues de Pages porque vive en Bulk Redirects de la cuenta.

## Reversión

En Bulk Redirects, deshabilitar solamente `ALS Pages a www`. Conservar la lista
para revisión y verificar que `alsdevstudio.pages.dev` vuelve a servir el sitio.
No eliminar la regla existente de BPT ni cambiar dominios/DNS/proyecto.

## Fuentes

- [Pages a dominio personalizado](https://developers.cloudflare.com/pages/how-to/redirect-to-custom-domain/).
- [Creación de Bulk Redirects](https://developers.cloudflare.com/rules/url-forwarding/bulk-redirects/create-dashboard/).
- [Parámetros](https://developers.cloudflare.com/rules/url-forwarding/bulk-redirects/reference/parameters/).
- [Límites de `_redirects`](https://developers.cloudflare.com/pages/configuration/redirects/).

## Vista previa compartida8f2ced74 hacia www

2026-10-13. Estado: aplicada y verificada, solicitud explícita del titular. Antes del cambio, raíz, documento con query y PNG en `8f2ced74.alsdevstudio.pages.dev` respondían200/noindex; estaban alojados públicamente en Cloudflare, no en el equipo local.

Se añadió una segunda entrada a la misma lista/regla:

| Campo | Valor |
| --- | --- |
| Source URL | `8f2ced74.alsdevstudio.pages.dev/` |
| Target URL | `https://www.alsdevstudio.com/` |
| Status | 301 |
| Preserve query string | Sí |
| Subpath matching | Sí |
| Preserve path suffix | Sí |
| Include subdomains | No |

Conservar la entrada raíz anterior y el resto de previews para revisión futura. No cambiar DNS, código ni plan. El origen sin esquema cubre HTTP/HTTPS.

Verificación repetida por Cronos: `node test-results/pages-canonical-qa.mjs` PASS,14redirecciones301 (siete del hostname raíz y siete de8f2ced74), HTTP/HTTPS, rutas/query codificada, documento histórico, PNG y404final correctos. www sirve200 sinLocation ni noindex; sin bucles. Otros previews6a97985c y123b8648 conservan200/noindex. Reporte `test-results/pages-canonical-qa.json` y captura de ambos registros guardados `test-results/pages-preview-canonical-rule.jpg`.

Chrome del operador: abrir `https://8f2ced74.alsdevstudio.pages.dev/` terminó en `https://www.alsdevstudio.com/`. Revisión de seguridad: origen/destino fijos, solo el hostname solicitado, sin destinos configurables por query ni cambios de acceso. Sin hallazgos críticos. Configuración permanente de la cuenta, independiente de los despliegues de documentación.

Reversión de este ajuste: retirar únicamente la entrada cuyo origen sea `8f2ced74.alsdevstudio.pages.dev/`, manteniendo `alsdevstudio.pages.dev/` y la regla Enabled. Comprobar que8f2ced74 vuelve a200/noindex y la entrada raíz continúa301haciawww. La reversión original de toda la regla se mantiene separada, arriba.
