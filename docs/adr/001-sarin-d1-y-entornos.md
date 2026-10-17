# ADR-001: D1 exclusiva de Sarin y aislamiento de entornos

Fecha: 16 de octubre de 2026. Estado: aceptada para preparación de infraestructura; chat público apagado.

## Contexto

El historial comercial de ALS DevStudio contiene datos personales y necesita retención de 30 días, cuotas atómicas y administración privada. La cuenta aloja otros proyectos, incluida otra base llamada Sarin; no corresponden a este flujo. Preparar infraestructura no autoriza recoger conversaciones antes de completar los avisos y condiciones efectivas de la API.

## Decisión

Crear la base exclusiva `alsdevstudio-sarin`, UUID `ba6d723c-57fb-472d-b9c0-1308c24912e3`, con jurisdicción D1 `us`. Pages de producción y Worker de purga comparten únicamente esta base. Desarrollo conserva el identificador simulado `00000000-0000-0000-0000-000000000002`; previews no tienen binding D1, claves de IA ni administración activa.

## Alternativas consideradas

- Reutilizar la base de otra aplicación: mezclaría finalidades, cuotas y ciclo de vida.
- Localización automática o preferencia `enam`: no fija una jurisdicción; se eligió una restricción explícita para documentar ubicación de la base.
- Jurisdicción europea: válida técnicamente, con mayor distancia al público inicial colombiano y sin eliminar la verificación internacional de DeepSeek.

## Consecuencias

La base ejecuta y persiste datos en Estados Unidos; la jurisdicción no limita toda ejecución Workers, soporte o proveedores. Read replication permanece desactivada. La jurisdicción se fija al crear D1 y cambiarla requiere otra base y migración; por eso se documenta antes de usar datos reales. Esto no certifica cumplimiento colombiano ni elimina las obligaciones de contratos y tratamiento internacional. [Documentación D1](https://developers.cloudflare.com/d1/configuration/data-location/).

El cron solo se activa con `--env production`; el Worker por defecto queda apagado y usa D1 simulada. No publica HTTP. Chat, historial y administración permanecen desactivados en Pages mientras se completa la activación. Se verificó backup del esquema vacío, restauración SQLite y dos migraciones sin conversaciones. Reversión: cerrar flags/cron y conservar base para inspección; no borrar recursos o historiales automáticamente ni restaurar presupuesto monetario desde una copia antigua.
