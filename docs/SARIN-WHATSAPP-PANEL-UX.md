# Bandeja WhatsApp de Sarin · 18 de octubre de 2026

El titular reportó que «Reactivar Sarin» desaparecía al leer el historial. El control era hijo de la misma región desplazable que los mensajes. Además, las cabeceras y avisos dejaban aproximadamente 150 píxeles para la conversación en una ventana de 1450 × 765.

## Referencias y adaptación

- [Klaviyo en Mobbin](https://mobbin.com/screens/60f81417-34b0-4bf4-9afe-f2a681c0572d): bandeja de contactos y barra de acciones junto a la identidad de la conversación.
- [Meetup en Mobbin](https://mobbin.com/screens/0f6b1335-602b-4840-a3ce-7ff6fc78ec33): separación entre listado, cabecera y mensajes, con distinción visual entre participantes.

Se adaptan patrones de interacción conservando los colores, tipografías y materiales de ALS. No se incorporan recursos de esas aplicaciones, frameworks ni dependencias nuevas.

## Cambio

Cabecera compacta; estado global y condiciones del piloto en una franja. El contacto seleccionado tiene una barra propia con su estado y Reactivar/Pausar. Sólo `#wa-thread` desplaza los mensajes. Aceptación, instrucciones de reactivación y entregas siguen accesibles en desplegables. Las actualizaciones conservan posición, foco y apertura de los detalles. Los controles siguen requiriendo datos vigentes y revisión del servidor.

No cambia la API, las credenciales, el consentimiento, la lista autorizada, el consumidor ni la configuración del bot. La comprobación de acciones utiliza exclusivamente el contacto ficticio del harness local; el participante real permanece pausado.

## Validación

- 43/43 pruebas Node: administración, integración SQLite y empaquetado público.
- TSC del módulo `sarin-whatsapp-admin.js`, `node --check` y `git diff --check`: correctos.
- QA con Chrome mediante CUA, harness loopback y proveedores ficticios: 1450 × 765, 1366 × 768 y 320 × 780; control fuera del scroll, visible al leer el historial, navegación por teclado, reactivación/pausa local y ausencia de desbordamiento horizontal.
- Sondeo local con metadatos cambiantes para forzar reconstrucción del DOM: foco y apertura de detalles conservados.
- Pruebas UI del repositorio actualizadas con regresiones de geometría, desplazamiento y foco tras sondeo. No se ejecutó la suite externa de Playwright; la comprobación de navegador fue mediante CUA.
- Revisión independiente sin P1/P2 pendientes. Se corrigió durante la revisión la restauración del foco de los nuevos desplegables y el cálculo del scroll tras abrirlos.

Capturas y mediciones locales: `test-results/sarin-panel-ux-20261018/` (ignoradas por Git).

## Publicación y recuperación

Se publica sólo la presentación mediante Pages, dentro del trabajo de publicación ya autorizado. El build conserva 223 recursos públicos y versiona los assets para refrescar caché. La versión anterior de Pages es `62a8afcd-a557-4bf6-8645-2cf8eb50474f`.

Para revertir, restaurar únicamente `control-sarin/index.html`, `styles/sarin-admin.css` y `scripts/modules/sarin-whatsapp-admin.js` desde `5d20739` mediante un nuevo commit en `main`, recompilar y publicar. También puede restaurarse la versión anterior de Pages. No se revierten D1, Queue, secretos ni Workers.
