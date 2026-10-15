# Contrato del núcleo administrativo

Este contrato coordina el hito local de ALS DevStudio. Fechas ISO UTC; importes enteros en unidades menores, por ejemplo COP 50.000 = `5000000`. IDs opacos, sin barras y con límites de longitud. La API exige sesión administrativa para leer o escribir.

## Servicio y almacenamiento

`createControlService({store, now = () => new Date(), newId = randomUUID})` produce `getState(admin)` y `execute({requestId, action, payload}, admin)`. `admin` contiene `{uid,email}` ya verificados. El servicio valida de nuevo todas las entradas comerciales. El almacén `runTransaction(callback)` da al callback `get(collection,id)`, `list(collection,limit)` y `set(collection,id,value)` asíncronos; una excepción descarta todas las escrituras. Las transacciones Firestore no envían escrituras antes de terminar las lecturas del callback.

El catálogo inicial usa IDs `laparada`, `sarinbotsaas`, `dialon`, `semancontrol`, nombres La Parada, Sarin Bot, Dialon y SemanControl, y `subjectKind` business, business, person, business. Todos tienen `connectionStatus: disconnected` y `plan: null`. `trialDays` inicial es 7, 7, 0, 0; no se inventan precios.

## HTTP

- `GET /api/state`: snapshot administrativo.
- `POST /api/commands`: JSON `{requestId, action, payload}`, con clave idempotente estable de cliente para cada operación.
- Resultado de acción: `{result}`. Error: `{error:{code,message}}`, con estado HTTP apropiado y sin detalles internos.
- Snapshot: `{serverTime,environment,admin,products,subjects,subscriptions,payments,auditEvents,commands,meta}`. `meta` indica límite y truncamiento; el resumen solo cuenta registros cargados y lo identifica si hay truncamiento.

## Acciones

| Acción | Payload | Resultado |
| --- | --- | --- |
| `subject.create` | `{kind:person\|business,name,email}` | sujeto con `id`, `kind`, `name`, `email`, `createdAt` |
| `product.plan.save` | `{productId,plan:{name,amountMinor,currency:COP,billing:{mode:calendarMonth,months:1}\|{mode:fixedDays,days:30},trialDays}}` | producto actualizado; afecta nuevas suscripciones |
| `subscription.create` | `{productId,subjectId}` | suscripción única con copia del plan vigente |
| `subscription.trial.start` | `{subscriptionId}` | suscripción con prueba única según su plan |
| `payment.preview` | `{subscriptionId,amountMinor,method:nequi\|transfer,reference,receivedAt}` | cotización `{id,subscriptionId,amountMinor,currency,periodStart,periodEnd,expiresAt,expectedVersion,amountDifference}` almacenada por diez minutos |
| `payment.confirm` | `{quoteId,acceptAmountDifference:boolean}` | `{payment,subscription}`; rechaza cotización vencida o cuya versión cambió |
| `subscription.suspend` | `{subscriptionId,reason}` | suscripción suspendida con auditoría y orden pendiente |
| `subscription.reactivate` | `{subscriptionId,reason}` | suscripción con suspensión retirada y vigencia real recalculada |

La misma clave con contenido diferente produce conflicto. Reintentar la confirmación con la misma clave devuelve el pago original incluso después de consumir la cotización. Pagar no quita una suspensión. Las cotizaciones no conceden acceso. Cada cambio de licencia incrementa `desiredVersion`, crea una orden absoluta y conserva `connectionStatus: disconnected`, `confirmedVersion: null` hasta implementar un conector real.

Los sujetos tienen su tipo estable. Suscripciones incluyen `id`, `productId`, `subjectId`, `plan`, `trialStartedAt`, `trialEndsAt`, `paidUntil`, `suspendedAt`, `desiredVersion`, `confirmedVersion`, `connectionStatus`, `accessStatus` y `createdAt`. Los pagos incluyen IDs relacionados, importe, moneda, método, referencia, fecha recibida, fechas de período y actor confirmante. El servidor produce `accessStatus`: pending, trial, active, expired o suspended.

## Navegador

`createPlatform()` en `web/scripts/platform.mjs` produce `{mode,onSession,signIn,signOut,getState,command}`. `onSession(callback)` notifica `{uid,email}` o `null` y devuelve función de cleanup. `signIn()` usa identidad ficticia únicamente en entorno demo local; en producción usa Firebase Google. `command(action,payload,requestId?)` devuelve `{result}`. Los errores lanzados exponen `code`, `message` y `status`, sin cuerpos internos ni tokens. El modo sin configurar informa el problema y no simula sesión.

La UI guarda una clave idempotente hasta obtener resultado de una operación y refetchea el snapshot después de mutar. Usa nodos de texto para datos del operador, nunca HTML. Permite páginas de diez registros, filtros y navegación por teclado. El panel muestra que los pagos son registros locales y las plataformas todavía están pendientes de conexión.
