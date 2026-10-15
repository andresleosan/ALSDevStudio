# Panel central: primer hito local

> **Actualización de infraestructura:** Firebase real ya está publicado en <https://alsdevstudio.firebaseapp.com/>, con Firestore, Auth y `controlApi` activos. La primera sesión Google del titular aún requiere comprobación manual; está pendiente publicar la redirección de `/admin` hacia el panel para completar ese ingreso. Los productos siguen desconectados y no hay clientes, suscripciones ni pagos reales cargados. Este documento conserva la evidencia histórica del primer hito local; el estado vigente está en [CONEXION-FIREBASE.md](CONEXION-FIREBASE.md).

Implementado y verificado el 14 de octubre de 2026; código consolidado en `main`, dentro de `control/`. La implementación original se probó en `.worktrees/control`, conservado como copia local sin rama propia. El alcance es una versión local funcional del centro administrativo. El proyecto Firebase real `alsdevstudio`, la VPS de Dialon y los demás productos no se han modificado.

## Qué permite probar

- Configurar planes de La Parada, Sarin Bot, Dialon y SemanControl sin precios comerciales precargados.
- Crear negocios o personas y asignar productos compatibles: Dialon individual; los otros tres por negocio.
- Iniciar una prueba única de siete días para La Parada o Sarin Bot. Dialon y SemanControl no ofrecen prueba hasta configurarla.
- Registrar un pago recibido por Nequi o transferencia, revisar su importe y fechas en una vista previa emitida por servidor y confirmarlo una sola vez.
- Renovar por mes calendario o por 30 días, conservar el ancla de fin de mes y consultar pagos e historial.
- Suspender o reactivar con motivo; recibir un pago no levanta por sí solo una suspensión.

Cada cambio comercial produce una orden versionada de licencia. La interfaz muestra que está pendiente de conexión; todavía no activa ni suspende cuentas en las plataformas reales. Los planes se copian al crear cada suscripción: editar el precio de un producto afecta las nuevas suscripciones.

## Probarlo

Desde el worktree, entra en `control/` y ejecuta:

```powershell
npm ci --ignore-scripts
npm --prefix functions ci --ignore-scripts
npm run dev
```

Abre <http://127.0.0.1:8788> y pulsa **Entrar a la demostración**. Primero configura un plan en Productos; después crea un contratante y su suscripción en Suscripciones. Puedes iniciar la prueba y registrar un pago para observar el cambio de vigencia.

El acceso es sintético y solo sirve en Firebase Emulator Suite (`demo-alsdevstudio`). No solicita cuenta Google, credenciales ni facturación real. Usa datos ficticios: permanecen mientras funcionan los emuladores y se pierden al detenerlos. El servidor escucha solo en loopback. Las instrucciones completas, puertos y preparación de Java están en [control/README.md](../control/README.md).

## Seguridad y consistencia verificadas

El backend comprueba UID fijo, correo administrativo verificado, proveedor Google, claim `admin:true`, proyecto, expiración y revocación. La identidad sintética se admite únicamente con el proyecto demo y hosts locales de emuladores. Las reglas Firestore deniegan acceso directo desde clientes; el panel usa la API.

Las confirmaciones usan una transacción y una clave idempotente. Si se pierde la respuesta, aparece un límite temporal o caduca la sesión, el navegador conserva la misma operación hasta reconciliarla con el servidor. Dos confirmaciones simultáneas de esa operación generan un solo pago. Una cotización modificada o vencida exige nueva vista previa; nunca se cambian silenciosamente las fechas mostradas. Los pagos confirmados son inmutables en este hito.

Los datos del operador se muestran como texto. La API limita el cuerpo, valida acciones y orígenes y oculta errores internos. El límite de solicitudes actual es por proceso; no sustituye un control distribuido de producción.

## Evidencia de cierre

| Verificación | Resultado |
| --- | --- |
| `npm run qa` desde `control/` | 63/63 pruebas, cero fallidas u omitidas; emuladores iniciados y detenidos automáticamente |
| Dominio y persistencia | Fin de mes, año bisiesto, prueba única, cuotas, concurrencia, rollback y reglas Firestore |
| Smoke UI | Borradores, recuperación tras respuesta perdida → 429 → 401 → recarga/reautenticación, un solo pago y foco tras guardar |
| E2E con Firebase emulado | Siete escenarios: planes/compatibilidad, prueba/pago, suspensión, concurrencia/permisos, texto malicioso, recarga y cierre de sesión |
| Responsive, movimiento reducido y axe | 320, 390, 768 y 1440 px; cero hallazgos axe, desbordamientos o errores JavaScript en el recorrido |
| Build administrativo de producción sin configurar | Acceso deshabilitado, sin ruta demo ni conexiones externas; noscript visible y axe de login sin hallazgos |
| Regresión del sitio público | `node --test .github/cloudflare/build.test.mjs`: 12/12; build de 205 archivos / 4.909.852 bytes, panel excluido |
| Dependencias de producción | `npm audit --omit=dev` en ambos paquetes: cero vulnerabilidades |
| Revisión independiente | Corregidos recuperación idempotente y foco; sin bloqueantes pendientes |

Capturas y resultados regenerables quedan en `test-results/control/`, ignorados por Git. Las dependencias de la CLI conservan siete nodos afectados de desarrollo (tres altos y cuatro moderados); el detalle está en el README. No se fuerzan versiones mayores incompatibles. La validación local usó Node 24.18.0, Firebase CLI 15.34.0 y Java portable 21.0.12.1; Functions declara Node 22 y falta verificar el runtime desplegado cuando corresponda.

## Pendientes para el uso real

1. Confirmar la aplicación web de `alsdevstudio`, habilitar Google y el dominio elegido, fijar el UID definitivo de Andrés y asignar el claim administrativo mediante un procedimiento autorizado. Preparar configuración y revisar costos antes del despliegue.
2. Conectar primero un producto con un adaptador de servidor que aplique licencias absolutas, compruebe versión e idempotencia y confirme recepción. Sarin Bot ya dispone de lógica de pagos y pruebas que debe reconciliarse antes de importar datos.
3. Conectar La Parada, preparar identidad/backend de Dialon en la VPS y resolver aislamiento por negocio y pendientes offline de SemanControl según la [especificación](superpowers/specs/2026-10-14-panel-central-suscripciones-design.md).
4. Añadir importación histórica, gracia por comprobantes y ajustes/anulaciones con auditoría antes de necesitarlos. Este hito no recibe comprobantes ni procesa cobros automáticamente.
5. Ampliar consultas y paginación de servidor al crecer: el snapshot actual limita cada colección a 500 registros, avisa si trunca y calcula el resumen sobre los registros cargados.

El código está versionado en GitHub y consolidado en `main`. El build del panel vive aparte; no se han modificado DNS, desplegado Functions ni escrito datos en producción. La [consolidación de ramas](GIT-MAIN.md) conserva el historial anterior sin cambiar los archivos públicos del portafolio.
