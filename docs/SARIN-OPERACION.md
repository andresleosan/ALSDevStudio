# Operación local de Sarin

Fecha: 16 de octubre de 2026. Estado: implementación **LOCAL validada**, no publicada. DeepSeek responde desde la Pages Function con D1 local y cuotas activas.

## Preparar y abrir

Desde la raíz del repositorio, con Node y Wrangler 4.150 o posterior disponibles:

```powershell
node .github/sarin/dev.mjs --prepare
node .github/sarin/dev.mjs
```

`--prepare` construye `dist` y aplica las migraciones pendientes de D1 **local**, sin iniciar un servidor. La segunda orden abre el entorno en `http://127.0.0.1:8791`, con IA desactivada por defecto. El formulario muestra contacto cuando la IA está apagada; no simula respuestas. Para usar otro puerto se admite `--port 8792`. Detener con Ctrl+C.

Los secretos están exclusivamente en `.dev.vars`, ignorado por Git junto con `.dev.vars.*`. Nombres: `DEEPSEEK_API_KEY` y `SARIN_IP_SECRET`; no copiar sus valores a documentación, terminales compartidas, capturas ni mensajes. El launcher conserva la clave existente y genera un secreto de pseudonimización si falta. No incluir `.dev.vars` en `dist`.

Solo para una comprobación real local, con la clave configurada y controles de consumo activos:

```powershell
node .github/sarin/dev.mjs --live
```

Esta opción habilita solicitudes facturables al **enviar** mensajes; abrir el panel no llama al proveedor. `--live --prepare` solo prepara el entorno. El launcher no contiene una ruta de despliegue y limita Wrangler al desarrollo y las migraciones locales. La persistencia local reside en `.wrangler/sarin-local`; `wrangler.sarin.local.jsonc` configura el binding `SARIN_DB` para las migraciones. No se crean bases de datos remotas.

## Datos, límites y costo

El frontend Vanilla JS usa la Pages Function del mismo origen `/api/sarin`. Único proveedor: DeepSeek, modelo `deepseek-flash`, pensamiento desactivado, sin streaming ni reintentos. D1 guarda metadatos de cuotas y reservas; no guarda conversación ni resumen. Los mensajes permanecen en memoria de la pestaña y durante la petición. Nueva conversación o recarga borran la memoria del navegador.

La función admite diez turnos/minuto y cincuenta/día por IP pseudonimizada. Los períodos diarios y mensuales se calculan en UTC. La interfaz limita cada conversación a quince turnos y remite como máximo los últimos cuatro pares completos. El resumen admite hasta 1800 caracteres con corrección manual, sin truncado silencioso. Continuar por WhatsApp prepara el mensaje para `573146432135`; la persona decide enviarlo desde WhatsApp.

Precios de cálculo configurados: entrada `300000` y salida `1200000` microUSD por millón de tokens (0,30 y 1,20 USD). El contador global limita reservas a `1000000` microUSD diarios y `10000000` mensuales (1 y 10 USD). Antes de cada llamada reserva `ceil(((2 × bytesUTF8 + 1024) × precioEntrada + tokensSalida × precioSalida) / 1000000)`; solo liquida uso verificado y conserva la reserva ante incertidumbre.

Estos importes son controles internos de la aplicación, no una garantía sobre la factura o cambios de tarifas. Con IA apagada no hay inferencias. La muestra local tiene 2110 microUSD de uso verificado y 12196 microUSD retenidos por intentos inciertos o respuestas inválidas: 0,014306 USD contabilizados en esa base. No incluye las pruebas aisladas en memoria ni acredita la factura de la cuenta. No se han verificado límites ni alertas configurados en la cuenta del proveedor. No se contrata un plan de pago en esta entrega.

## Evidencia y pendientes

La suite conjunta pasa 120/120: build 13, lanzador 3, cuotas 19, backend 78 e interfaz 7. La regresión adicional de Pages y escenas pasa 64/64. Cinco anchos entre 320 y 1440, axe del diálogo sin violaciones, teclado, IME, foco, prioridad de analítica, timeout, cancelación, resumen y no-JS. TypeScript no encuentra errores en los módulos nuevos; permanecen doce errores previos en analítica y proyectos, archivos que no se modificaron.

La prueba real en `workerd` devuelve 200 para landing con ejemplos, tienda con Mundo Celular/Coctels OPS, chatbot con Sarin/Dialon y consulta ajena con redirección a los servicios. En navegador de 390 px se verificaron respuesta real, dos enlaces, resumen editable, enlace con el texto revisado exacto y cero errores JavaScript, sin enviar mensajes a WhatsApp. Evidencia local ignorada por Git: `test-results/sarin-live-*.json`, `test-results/sarin-local-usage.json`, `test-results/sarin-tests-final.txt` y `test-results/sarin/live-*.png`.

Se corrigió una incompatibilidad reproducida de `workerd`: `redirect: error` fallaba antes de la red; `manual` permite rechazar 3xx sin seguir el destino. También se reforzó la extracción literal del borrador tras detectar reformulaciones del modelo. Las respuestas que incumplen el contrato siguen rechazándose; los diagnósticos registran únicamente categorías técnicas cerradas. La revisión independiente final no encontró bloqueantes ni riesgos medios/altos. La muestra real es acotada y no garantiza cada futura respuesta del modelo ni verifica contención concurrente de D1 remoto.

Antes de activar producción quedan: revisar las condiciones de tratamiento/retención del proveedor y los avisos, contrastar uso/factura y límites/alertas de cuenta, configurar D1 remoto y secretos mediante mecanismos privados y comprobar Functions/cabeceras/rutas en el despliegue autorizado. La expiración lógica de cuotas es de 48 horas para metadatos por IP y 35 días para globales/reservas, con purga oportunista; no equivale a una promesa de eliminación en DeepSeek.

Mantener `SARIN_ENABLED=false` en producción y previews mientras la activación esté pendiente. La desactivación posterior se realiza con ese mismo interruptor; el contacto humano y el resumen siguen disponibles. No aplicar migraciones locales contra producción ni convertir estos comandos en un despliegue.

Referencias internas: [diseño](superpowers/specs/2026-10-16-sarin-chat-web-design.md), [plan](superpowers/plans/2026-10-16-sarin-chat-web.md) y [stack](../STACK.md).
