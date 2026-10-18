# Auditoría de Sarin para WhatsApp de ALS Dev Studio

Fecha: 18 de octubre de 2026, Colombia. Número confirmado por el titular: **+57 305 277 8047**. Este documento corresponde a ALS Dev Studio; no a Sarin Bot SaaS ni al número terminado en 8028.

## Conclusión y alcance

No se encontró daño en la conexión publicada atribuible a la confusión de proyectos. Sí se reprodujo un defecto del candidato local del panel WhatsApp, que debe corregirse antes de publicar las respuestas. La recepción piloto ya está conectada; no hay que repetir el alta ni crear otra compañía.

La auditoría consultó código, historial Git, YCloud, configuración de Cloudflare y metadatos agregados de D1. No leyó conversaciones privadas, reveló secretos, envió mensajes, modificó cuentas, aplicó migraciones ni publicó código. Se descargó exclusivamente el objeto Git remoto para compararlo, sin integrar ramas ni reemplazar archivos. Los cinco archivos de trabajo previos se conservaron.

## Estado remoto comprobado

| Componente | Evidencia actual |
| --- | --- |
| YCloud | Compañía ALS DevStudio, Free; número `+573052778047` con estado `Connected`, WABA `1107224555589307`. La verificación empresarial sigue pendiente. |
| Webhook | Endpoint `6ad4515b0af8375d27636917`, `https://www.alsdevstudio.com/api/sarin/whatsapp`, activo. Descripción: piloto de recepción sin respuestas automáticas. |
| Eventos | Seleccionados `whatsapp.inbound_message.received` y `whatsapp.smb.message.echoes`. `whatsapp.message.updated` no está seleccionado. Se cerró la consulta con Cancel, sin guardar. |
| Pages | Proyecto `alsdevstudio`, dominio `www.alsdevstudio.com`; última publicación listada `68a0f9d6-73a0-42bc-94b5-3e6ae74e63fa`, fuente `3c60634`. |
| Configuración | Recepción, chat e historial activos. D1 `SARIN_DB` vinculado a `alsdevstudio-sarin`; no aparece binding Queue. Cinco secretos del receptor y `DEEPSEEK_API_KEY` presentes y cifrados; no se abrieron sus valores. |
| D1 | Sólo las cuatro tablas WhatsApp de 0004: inbox, peers, receipts y state. Una entrada, un eco, dos recibos y un contacto pausado con revisión 1. Tablas de respuestas 0005 ausentes. Consultas con cero filas escritas. |
| HTTP | Portada 200 con chat habilitado; Staff 200 con acceso Google; API privada anónima 403; GET del webhook 405. Esto no sustituye una nueva prueba de entrega completa. |

La recepción y el eco reales anteriores están documentados en [el registro del piloto](SARIN-WHATSAPP-PILOTO.md). En esta auditoría se comprobaron los metadatos conservados, sin enviar mensajes adicionales.

Evidencias locales, excluidas del artefacto público, en `test-results/whatsapp-audit-20261018/`: `ycloud-als-connected.png`, `http-check.json` y reproducción sintética del contrato Staff.

## Defecto local reproducido: API Staff y consultas incompatibles

`server/sarin/whatsapp/admin.js` exige `masked_phone` y `updated_at`, pero `listPeers()` y `getPeer()` de `server/sarin/whatsapp/work-store.js` no los devuelven. Con un contacto sintético en SQLite real, lista y detalle responden **503**.

Al suplir únicamente esos dos campos en memoria, el detalle responde 200 pero muestra **0 eventos aunque el store entrega 1**: sus consultas omiten `expires_at`, necesario para la proyección segura de contenido. También hay que completar las fechas de eventos/salidas y la representación de consentimiento, sin debilitar el filtro de vencimiento.

La suite existente de API/UI pasó 26/26 y la selección de procesador, Worker, API, consentimiento, entregas y conciliación pasó 82/82; ambos grupos se solapan y no deben sumarse. Esas pruebas usan stores simulados o prueban capas aisladas. La reproducción real demuestra una brecha de integración que esos resultados no cubren.

Reproducción sin proveedores reales:

```powershell
node test-results/whatsapp-audit-20261018/reproduce-staff-contract.mjs
```

El archivo API es local sin seguimiento y no existe en el commit remoto publicado. Este defecto no está activo en producción.

## Conservación del trabajo y repositorio

HEAD local: `bca3f22`. GitHub main: `3c606342afd679ad66bbb96d1f3263cceab6feb0`. Base común: `d59c900`. Hay 12 commits exclusivos locales y uno remoto. El remoto sólo regenera 21 imágenes del portafolio; no cambia Sarin. Las rutas son disjuntas.

Los cinco archivos pendientes corresponden al API/UI Staff y sus pruebas. No se encontró el teléfono 8028 ni sus identificadores de WhatsApp dentro del código o documentación de ALS. Las referencias existentes a `sarinbotsaas` son proyectos legítimos del portafolio. No se debe hacer reset, descartar estos archivos ni forzar un push para resolver la divergencia.

El teléfono público previo de la política de privacidad sigue siendo distinto del número del piloto; esto ya estaba documentado antes y no demuestra daño de esta sesión. Alinear el contacto público puede tratarse al preparar la apertura del canal.

## Siguiente trabajo concreto

1. Conservar una copia de los cambios pendientes y corregir el contrato Staff con pruebas API + SQLite real; verificar lista, detalle, vencimiento y consentimiento. Integrar la actualización remota de imágenes sobre main sin perder ninguno de los trabajos.
2. Completar y verificar el candidato de respuestas existente. Ya incluye consentimiento, pausa humana, outbox, conciliación y procesador que reutiliza DeepSeek; no hace falta construirlo otra vez.
3. Preparar publicación inicialmente apagada: respaldo, migración 0005, retención compatible, Queue, Worker y productor Pages. El Worker local aún tiene D1 ficticio y las flags de generación/envío en false.
4. Configurar privadamente la clave de envío YCloud y credenciales del consumidor; añadir `whatsapp.message.updated` al endpoint existente conservando entrada y eco.
5. Activar sólo el participante piloto configurado y verificar mensaje nuevo → aviso entregado → ACEPTO → consulta ficticia → respuesta entregada → intervención humana que pausa el bot. No reprocesar las capturas antiguas ni abrir automáticamente el piloto a todos los contactos.

No se ejecutó ninguno de estos cambios de producción durante la auditoría. Los límites y presupuesto previstos permanecen en el [plan de respuestas](superpowers/plans/2026-10-18-sarin-whatsapp-replies.md); no se contrataron servicios ni recargas.

## Corrección autorizada posterior: paso 1

El titular autorizó corregir el panel, publicar el servicio y probar un solo contacto. Antes de editar se guardó una copia byte a byte de los seis archivos pendientes, con hashes y parche Git, en `.wrangler/wa-replies-release-20261018/recovery-before-step1-2026-10-18T06-24-31-825Z/`.

Se corrigieron las proyecciones del store y se añadió la consulta del estado del piloto que faltaba. Lista y detalle devuelven el teléfono enmascarado, actividad real, consentimiento acreditado y fechas de caducidad. La API conserva sus filtros de contenido vencido y omite el texto de los ecos humanos.

Verificación: 11 pruebas nuevas API + SQLite que fallaban antes y pasan después; conjunto de regresión de 825 pruebas Node aprobado. El tipado focal del store y la UI pasa; la comparación completa conserva los mismos 55 diagnósticos previos en access/policy/deepseek, sin errores nuevos. La revisión independiente no encontró problemas P1/P2.

QA con navegador real y base efímera: lista, detalle, pausa/reactivación, apagado/activación del piloto, teclado con foco visible y ancho de 320/1440 px sin desbordamiento horizontal. El teléfono completo y texto privado del eco no aparecen; el contenido con HTML se representa como texto. Capturas y logs: `test-results/whatsapp-audit-20261018/`. Esta prueba no usó proveedores ni mensajes reales.

El consumidor, retención y recuperación también pasaron en workerd con proveedores ficticios y las fuentes actuales. La configuración candidata queda vinculada a la D1 de ALS y a su Queue, inicialmente con respuestas y envíos apagados. El paso 2 se registra por separado cuando se publique; estos resultados locales no acreditan una entrega real.
