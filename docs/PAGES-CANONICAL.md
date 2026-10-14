# Redirección del dominio Pages a www

Fecha: 2026-10-13. Estado: aplicada y verificada por solicitud expresa del titular:
`https://alsdevstudio.pages.dev/` debe redirigir a `www.alsdevstudio.com`.

## Configuración aplicada

Cloudflare Bulk Redirects de la cuenta existente. Lista dedicada
`als_pages_to_www`, ID `a04babe469224dd8b76a5825021b5202`, con un único registro:

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
Los previews por hash/rama conservan su hostname al excluir subdominios.
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
