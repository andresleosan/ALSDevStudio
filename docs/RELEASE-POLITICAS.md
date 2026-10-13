# Publicación de políticas · 13 de octubre de 2026

Publicación solicitada expresamente por el titular: «subamos las politicas y todo lo que organizamos al inicio». Base de esta entrega: `ee0ac237be2558a07363e428ceee1abad7a75f6c`.

## Cambios

- Privacidad, términos con cancelaciones/reembolsos y cookies, enlazados desde el pie de página y la información de contacto. Enlace visible a protección al consumidor de la SIC, canonical y sitemap.
- Identificación aportada y autorizada para publicación por el titular; Gmail como destino del reenvío de Porkbun, acceso exclusivo declarado y conservación adoptada: revisión mensual, consultas sin contrato tras seis meses sin actividad, otras categorías según necesidad legal/contractual y revisión al cierre.
- Condiciones de consumo preservan derechos imperativos. No se incorpora una cláusula absoluta de «sin reembolsos», porcentajes de anticipo, garantías comerciales ni penalidades inventadas.
- Restablecimiento de la pausa de la pestaña desde cookies; al volver, el carrusel relee la elección y conserva la pausa en memoria si el almacenamiento está bloqueado. Alternativa visible sin JavaScript.
- Auditoría, inventario de recursos y guía operativa con plantillas vacías. Borradores del 12 de octubre conservados e identificados como históricos, sin vigencia. Los HTML son la referencia para visitantes.

No hay migraciones, formularios, CRM, nuevas dependencias, envíos de mensajes, servicios de pago nuevos ni cambios en cuentas privadas. Las fuentes locales y la retirada de iframes ya estaban publicadas en la base.

## Pruebas y límites

Las ejecuciones del 13 de octubre se detallan en [la auditoría](PRIVACIDAD-Y-CUMPLIMIENTO.md): pruebas funcionales de privacidad y teclado, ocho auditorías axe sin violaciones automáticas, navegación móvil y sin JavaScript, cuatro comprobaciones de regresión del reset, inspección de capturas y ampliación CSS del 200 %. Cero cookies y solicitudes externas observadas durante los recorridos locales; no equivale a revisar ajustes privados del alojamiento.

La revisión de seguridad del cambio no encontró hallazgos críticos. El código no introduce transmisiones nuevas ni HTML dinámico; usa textContent para el estado de borrado y mantiene CSP y enlaces externos con protección de referencia. La revisión independiente comprobó coherencia entre hechos, políticas y guía. Se conservan pendientes de cuentas/DPA/copias, licencias y contratos, retención por categoría y alcance internacional con revisión profesional; no se afirma una web libre de riesgos.

Los procedimientos de autorización, atención y eliminación son manuales y deben aplicarse por el responsable. Esta publicación no prueba que ya haya atendido casos, borrado chats o cambiado respaldos. Los registros privados deben mantenerse fuera del repositorio y de Vercel.

## Publicación y reversión

Hacer push normal a origin/main con autor y committer de andresleosan. Verificar luego que portada, tres HTML, CSS, dos scripts y sitemap coincidan con los archivos aprobados; recorrer enlaces, reset y regreso al carrusel, revisar móvil, cookies y red en https://www.alsdevstudio.com/.

Si es necesario revertir, usar `git revert <commit-de-esta-publicacion>` desde un árbol limpio y publicar ese nuevo commit con `git push origin main`. Conserva la historia y no requiere force push. Revertir la entrega completa retira páginas y enlaces legales; valorar una corrección localizada para no volver a dejar el sitio sin información. No hay datos de clientes ni bases que restaurar.

La autorización para esta publicación no autoriza futuros cambios de condiciones ni borrados ajenos al alcance.

## Comprobación posterior al push

Commit publicado: `6da5a7ac32cc29169f755e2e818e41becf599407`, con autor y committer Andres Santiago y correo noreply de andresleosan. Push normal confirmado en origin/main.

`LEGAL_BASE=https://www.alsdevstudio.com node test-results/legal-release-smoke.mjs`: PASS. Ocho archivos públicos coinciden con la versión aprobada, las tres políticas responden HTTP 200 y conservan las cabeceras restrictivas. En navegador se comprobaron enlaces, ancla de cancelaciones, restablecimiento por teclado y regreso al carrusel, 1440/320 px, lectura sin JavaScript y alternativa al botón. Cero cookies, solicitudes a otros orígenes y errores en ese recorrido. Evidencia local: `test-results/legal-release-live.json`. No se enviaron consultas a terceros ni se verificaron cuentas privadas.
