// @ts-check
import { createPlatform } from './platform.mjs';
import { el, actionButton, badge, money, dateTime, periodLabel, minorUnits, emptyState, selectPage, datasetLimited, totals, table, pager, STATUS_LABELS } from './render.mjs';

const $ = selector => document.querySelector(selector);
const workspace = /** @type {HTMLElement} */ ($('#workspace'));
const workDialog = /** @type {HTMLDialogElement} */ ($('#work-dialog'));
const discardDialog = /** @type {HTMLDialogElement} */ ($('#discard-dialog'));
const labels = { resumen: 'Resumen', productos: 'Productos', suscripciones: 'Suscripciones', pagos: 'Pagos', actividad: 'Actividad' };
const actionLabels = {
  'subject.create': 'Sujeto creado', 'product.plan.save': 'Plan configurado',
  'subscription.create': 'Suscripción creada', 'subscription.trial.start': 'Prueba iniciada',
  'payment.preview': 'Vista previa de pago', 'payment.confirm': 'Pago confirmado',
  'subscription.suspend': 'Suscripción suspendida', 'subscription.reactivate': 'Suscripción reactivada',
};
let platform;
let session = null;
let snapshot = null;
let currentView = 'resumen';
let loadNumber = 0;
let toastTimer;
let modal = null;
let returnFocus = null;
let sessionReady = false;
let signingOut = false;
const pendingRequests = new Map();
const draftCache = new Map();

function announce(message) {
  $('#announcer').textContent = '';
  setTimeout(() => { $('#announcer').textContent = message; }, 20);
}

function notify(message) {
  clearTimeout(toastTimer);
  $('#toast').textContent = message;
  $('#toast').hidden = false;
  toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 6500);
}

function errorMessage(error) {
  if (!navigator.onLine) return 'No hay conexión. Conservamos los datos; vuelve a intentar cuando estés en línea.';
  if (error?.status === 401) return 'La sesión venció. Vuelve a entrar para continuar; conservamos tu borrador en esta pestaña.';
  return error?.message || 'No pudimos completar la operación. Conservamos los datos para que puedas reintentar.';
}

function showGlobalError(error) {
  const message = el('p', { text: errorMessage(error) });
  $('#global-error').replaceChildren(message, actionButton('Volver a cargar', () => loadState(), 'small secondary'));
  $('#global-error').hidden = false;
}

function newRequestId() {
  return crypto.randomUUID();
}

function persistRequests() {
  if (!session) return;
  try { sessionStorage.setItem(`als-control:requests:${session.uid}`, JSON.stringify([...pendingRequests])); } catch { /* La clave sigue en memoria. */ }
}

function restoreRequests() {
  pendingRequests.clear();
  try {
    for (const [fingerprint, id] of JSON.parse(sessionStorage.getItem(`als-control:requests:${session.uid}`) || '[]')) pendingRequests.set(fingerprint, id);
  } catch { /* Un almacenamiento dañado nunca altera un comando. */ }
}

function pendingPayment(value = undefined, uid = session?.uid) {
  const key = `als-control:confirmation:${uid}`;
  try {
    if (value === null) sessionStorage.removeItem(key);
    else if (value !== undefined) sessionStorage.setItem(key, JSON.stringify(value));
    else return JSON.parse(sessionStorage.getItem(key) || 'null');
  } catch { /* Antes de recargar se mantiene el aviso de operación pendiente. */ }
  return null;
}

// Una operación incierta conserva su clave; un cambio de contenido recibe otra.
async function command(action, payload, explicitId) {
  const fingerprint = `${action}:${JSON.stringify(payload)}`;
  const requestId = pendingRequests.get(fingerprint) || explicitId || newRequestId();
  pendingRequests.set(fingerprint, requestId);
  persistRequests();
  const response = await platform.command(action, payload, requestId);
  pendingRequests.delete(fingerprint);
  persistRequests();
  return response.result;
}

async function loadState({ focus = false } = {}) {
  if (!session) return;
  const generation = ++loadNumber;
  const sessionUid = session.uid;
  workspace.setAttribute('aria-busy', 'true');
  if (!snapshot) workspace.replaceChildren(el('div', { class: 'loading-state', text: 'Cargando tu centro de control…' }));
  try {
    const state = await platform.getState();
    if (generation !== loadNumber || session?.uid !== sessionUid) return;
    snapshot = state;
    $('#global-error').hidden = true;
    $('#snapshot-time').textContent = `Actualizado ${dateTime(state.serverTime, true)} · Bogotá`;
    renderView(focus);
  } catch (error) {
    if (generation !== loadNumber) return;
    if (!snapshot) workspace.replaceChildren(emptyState('No pudimos cargar el panel', 'Puedes volver a intentarlo. No se ha realizado ningún cambio.', actionButton('Volver a cargar', () => loadState(), 'primary')));
    showGlobalError(error);
  } finally {
    if (generation === loadNumber) workspace.setAttribute('aria-busy', 'false');
  }
}

function productFor(id) { return snapshot.products.find(product => product.id === id); }
function subjectFor(id) { return snapshot.subjects.find(subject => subject.id === id); }
function subscriptionFor(id) { return snapshot.subscriptions.find(subscription => subscription.id === id); }
function subjectName(id) { return subjectFor(id)?.name || 'Sujeto fuera de los registros cargados'; }
function productName(id) { return productFor(id)?.name || 'Producto'; }
function hasLimited(collection) { return datasetLimited(snapshot?.meta, collection); }
function anyLimited() { return ['products', 'subjects', 'subscriptions', 'payments', 'auditEvents'].some(hasLimited); }

function pageHeading(title, description, buttons = []) {
  return el('div', { class: 'page-heading' }, [el('div', {}, [el('h1', { tabindex: '-1', text: title }), el('p', { text: description })]), el('div', { class: 'page-actions' }, buttons)]);
}

function limitedNotice(collection) {
  return hasLimited(collection) ? el('p', { class: 'partial-note', text: 'Se alcanzó el límite de registros cargados. La búsqueda, la paginación y los totales de esta vista solo incluyen este conjunto; hay más datos en el centro.' }) : null;
}

function navigate(view, focus = true) {
  currentView = Object.hasOwn(labels, view) ? view : 'resumen';
  if (snapshot) renderView(focus);
}

function renderView(focus = false) {
  for (const link of document.querySelectorAll('[data-view]')) {
    if (link.getAttribute('data-view') === currentView) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  document.title = `${labels[currentView]} · ALS Control`;
  const content = { resumen: renderOverview, productos: renderProducts, suscripciones: renderSubscriptions, pagos: renderPayments, actividad: renderActivity }[currentView]();
  workspace.replaceChildren(...content);
  if (focus) workspace.querySelector('h1')?.focus({ preventScroll: true });
}

function renderOverview() {
  const summary = totals(snapshot);
  const metric = (label, number, note) => el('article', { class: 'metric' }, [el('p', { text: label }), el('strong', { text: number }), el('small', { text: note })]);
  const received = Object.entries(summary.received).map(([currency, amount]) => el('div', { class: 'financial-line' }, [el('p', { class: 'financial-value', text: money(amount, currency) }), el('small', { text: currency })]));
  const recurring = Object.entries(summary.recurring).map(([key, amount]) => {
    const [currency, interval] = key.split('|');
    return el('div', { class: 'financial-line' }, [el('p', { class: 'financial-value', text: money(amount, currency) }), el('small', { text: `${currency} · ${interval}` })]);
  });
  const panel = (title, body, note) => el('section', { class: 'panel' }, [el('div', { class: 'panel-head' }, [el('h2', { text: title })]), el('div', { class: 'panel-body' }, [...body, el('p', { class: 'subtle-note', text: note })])]);
  const steps = [
    { title: 'Configura tus planes', text: 'Define el precio y el período de cada producto.', complete: snapshot.products.some(product => product.plan), action: () => { location.hash = 'productos'; } },
    { title: 'Registra personas o negocios', text: 'Cada suscripción pertenece a un contratante.', complete: snapshot.subjects.length > 0, action: openSubject },
    { title: 'Asigna la primera suscripción', text: 'Elige un producto con plan y un contratante compatible.', complete: snapshot.subscriptions.length > 0, action: () => openSubscription() },
    { title: 'Registra un pago recibido', text: 'Revisa su período antes de confirmar el registro.', complete: snapshot.payments.length > 0, action: () => openPayment() },
  ];
  const onboarding = el('section', { class: 'panel' }, [el('div', { class: 'panel-head' }, [el('div', {}, [el('h2', { text: snapshot.subscriptions.length ? 'Tu operación, a mano' : 'Prepara tu centro de control' }), el('p', { text: 'Cuatro productos. Planes y registros bajo tu control.' })]), actionButton('Ver productos', () => { location.hash = 'productos'; }, 'text-button small')]), el('div', { class: 'setup-list' }, steps.map(step => el('div', { class: 'setup-row' }, [el('span', { class: 'setup-state', text: step.complete ? 'Listo' : 'Por hacer' }), el('div', { class: 'setup-copy' }, [el('h3', { text: step.title }), el('p', { text: step.text })]), actionButton(step.complete ? 'Revisar' : 'Empezar', step.action, 'secondary small')])))]);
  return [
    pageHeading('Todo bajo control.', 'Una vista de tus suscripciones, pagos y próximos pasos.', [actionButton('Actualizar', () => loadState(), 'secondary'), actionButton('Crear suscripción', () => openSubscription(), 'primary')]),
    anyLimited() ? el('p', { class: 'partial-note', text: 'Resumen parcial: los indicadores cuentan únicamente los registros cargados. Hay más datos disponibles en el centro.' }) : null,
    el('div', { class: 'metrics' }, [metric('Suscripciones', summary.subscriptions, 'Registradas en el centro'), metric('Con vigencia', summary.current, 'Vigentes o en prueba'), metric('Por renovar', summary.pending, 'Pendientes o vencidas'), metric('Suspendidas', summary.suspended, 'Requieren decisión manual')]),
    el('div', { class: 'overview-finances' }, [panel(platform.mode === 'demo' ? 'Pagos recibidos · prueba local' : 'Pagos recibidos', received.length ? received : [el('p', { class: 'financial-value', text: money(0) })], platform.mode === 'demo' ? 'Registros de prueba locales. No corresponden a pagos de tus productos reales.' : 'Total de pagos manuales registrados. No representa cobros bancarios automáticos.'), panel('Valor periódico previsto', recurring.length ? recurring : [el('p', { class: 'financial-value muted', text: 'Sin vigencias activas' })], 'Suma del plan contratado de suscripciones vigentes y en prueba, agrupada por período. No son ingresos recibidos.')]),
    onboarding,
  ].filter(Boolean);
}

function renderProducts() {
  return [pageHeading('Productos', 'Define las condiciones comerciales de cada producto. Los cambios de plan se aplican a nuevas suscripciones.'), limitedNotice('products'), el('div', { class: 'catalog-grid' }, snapshot.products.map(product => {
    const count = snapshot.subscriptions.filter(subscription => subscription.productId === product.id).length;
    const trialDays = product.plan?.trialDays ?? product.trialDays ?? 0;
    const initials = { laparada: 'LP', sarinbotsaas: 'SB', dialon: 'Di', semancontrol: 'SC' }[product.id] || product.name.slice(0, 2);
    return el('article', { class: 'product-card', 'data-product': product.id }, [
      el('div', { class: 'product-top' }, [el('span', { class: 'product-mark', 'aria-hidden': 'true', text: initials }), el('div', {}, [el('h2', { text: product.name }), el('p', { text: product.subjectKind === 'person' ? 'Suscripción individual' : 'Suscripción por negocio' })])]),
      el('div', { class: 'product-state' }, [badge(product.connectionStatus || 'disconnected'), badge(product.plan ? 'active' : 'pending', product.plan ? 'Plan configurado' : 'Plan borrador')]),
      el('p', { class: `product-price${product.plan ? '' : ' is-draft'}`, text: product.plan ? money(product.plan.amountMinor, product.plan.currency) : 'Precio por definir' }),
      el('p', { class: 'product-period', text: product.plan ? `${product.plan.name} · ${periodLabel(product.plan)}` : 'Configura un plan para crear suscripciones.' }),
      el('dl', { class: 'product-details' }, [el('dt', { text: 'Contratante' }), el('dd', { text: STATUS_LABELS[product.subjectKind] }), el('dt', { text: 'Prueba disponible' }), el('dd', { text: trialDays ? `${trialDays} días · una vez` : 'Sin prueba' }), el('dt', { text: 'Suscripciones cargadas' }), el('dd', { text: count })]),
      el('div', { class: 'button-row' }, [actionButton(product.plan ? 'Editar plan' : 'Configurar plan', () => openPlan(product), product.plan ? 'secondary' : 'primary'), actionButton('Crear suscripción', () => openSubscription(product.id), 'text-button small', { disabled: !product.plan, title: !product.plan ? 'Primero configura el plan y su precio.' : undefined })]),
    ]);
  }))].filter(Boolean);
}

function searchField(id, label, type = 'search') {
  const input = el('input', { id, type, placeholder: 'Nombre, producto o referencia…', autocomplete: 'off' });
  return { control: input, node: el('div', { class: 'filter-field search' }, [el('label', { for: id, text: label }), input]) };
}
function selectFilter(id, label, choices) {
  const select = el('select', { id }, choices.map(([value, text]) => el('option', { value, text })));
  return { control: select, node: el('div', { class: 'filter-field' }, [el('label', { for: id, text: label }), select]) };
}

function recordsView({ key, collection, records, columns, row, search, filters = [], empty, caption }) {
  const queryField = searchField(`${key}-search`, 'Buscar');
  const controls = filters.map(filter => ({ ...selectFilter(`${key}-${filter.key}`, filter.label, filter.choices), test: filter.test }));
  const container = el('div', { class: 'records-container' });
  let page = 1;
  function refresh() {
    const selection = selectPage(records, { query: queryField.control.value, page, searchable: search, test: record => controls.every(filter => filter.test(record, filter.control.value)) });
    page = selection.page;
    const body = selection.rows.length ? table(columns, selection.rows.map(row), caption) : emptyState(queryField.control.value || controls.some(filter => filter.control.value) ? 'Sin coincidencias' : empty.title, queryField.control.value || controls.some(filter => filter.control.value) ? 'Prueba otra búsqueda o cambia los filtros.' : empty.description, queryField.control.value || controls.some(filter => filter.control.value) ? actionButton('Limpiar filtros', () => { queryField.control.value = ''; controls.forEach(filter => { filter.control.value = ''; }); page = 1; refresh(); queryField.control.focus(); }, 'secondary') : empty.action);
    container.replaceChildren(body, pager(selection, next => { page = next; refresh(); container.querySelector('.table-scroll')?.focus({ preventScroll: true }); announce(`Página ${page} de ${selection.pages}`); }));
  }
  queryField.control.addEventListener('input', () => { page = 1; refresh(); });
  for (const filter of controls) filter.control.addEventListener('change', () => { page = 1; refresh(); });
  refresh();
  return el('div', {}, [el('div', { class: 'filters' }, [queryField.node, ...controls.map(filter => filter.node)]), container]);
}

function nameCell(primary, secondary) {
  return el('div', {}, [el('span', { class: 'primary-line', text: primary }), secondary ? el('span', { class: 'secondary-line', text: secondary }) : null]);
}
function subscriptionSearch(subscription) { return `${subjectName(subscription.subjectId)} ${subjectFor(subscription.subjectId)?.email || ''} ${productName(subscription.productId)} ${subscription.id}`; }
function subscriptionChoices() { return snapshot.subscriptions.map(subscription => [subscription.id, `${subjectName(subscription.subjectId)} · ${productName(subscription.productId)}`]); }
function statusFilters() { return ['', 'pending', 'trial', 'active', 'expired', 'suspended'].map(status => [status, STATUS_LABELS[status] || 'Todas las vigencias']); }

function renderSubscriptions() {
  const subscriptions = recordsView({
    key: 'subscriptions', collection: 'subscriptions', records: snapshot.subscriptions,
    columns: ['Contratante / Producto', 'Vigencia', 'Hasta', 'Conexión', 'Acciones'], caption: 'Suscripciones cargadas',
    search: subscriptionSearch,
    filters: [
      { key: 'product', label: 'Producto', choices: [['', 'Todos los productos'], ...snapshot.products.map(product => [product.id, product.name])], test: (record, value) => !value || record.productId === value },
      { key: 'status', label: 'Vigencia', choices: statusFilters(), test: (record, value) => !value || record.accessStatus === value },
    ],
    row: subscription => {
      const until = subscription.accessStatus === 'trial' ? subscription.trialEndsAt : subscription.paidUntil || subscription.trialEndsAt;
      const canTrial = Boolean(subscription.plan?.trialDays > 0 && !subscription.trialStartedAt && !subscription.paidUntil && !subscription.suspendedAt);
      return [nameCell(subjectName(subscription.subjectId), `${productName(subscription.productId)} · ${subscription.plan?.name || ''}`), badge(subscription.accessStatus), el('div', { class: 'period-cell' }, [dateTime(until, true), el('small', { class: 'secondary-line', text: until ? 'Hora de Bogotá' : 'Sin período iniciado' })]), el('div', {}, [badge(subscription.connectionStatus || 'disconnected'), el('small', { class: 'secondary-line', text: `Deseada v${subscription.desiredVersion ?? 0} · Confirmada ${subscription.confirmedVersion ?? '—'}` })]), el('div', { class: 'row-actions' }, [actionButton('Registrar pago', () => openPayment(subscription.id), 'secondary small'), canTrial ? actionButton('Iniciar prueba', () => openTrial(subscription), 'secondary small') : null, actionButton(subscription.suspendedAt ? 'Reactivar' : 'Suspender', () => openSuspension(subscription), subscription.suspendedAt ? 'secondary small' : 'danger-button small')])];
    },
    empty: { title: 'Aún no hay suscripciones', description: 'Configura un plan y asigna un producto a una persona o negocio.', action: actionButton('Crear suscripción', () => openSubscription(), 'primary') },
  });
  const subjects = recordsView({
    key: 'subjects', collection: 'subjects', records: snapshot.subjects, columns: ['Contratante', 'Tipo', 'Contacto', 'Registrado'], caption: 'Personas y negocios cargados',
    search: subject => `${subject.name} ${subject.email} ${subject.kind}`,
    filters: [{ key: 'kind', label: 'Tipo', choices: [['', 'Personas y negocios'], ['person', 'Personas'], ['business', 'Negocios']], test: (record, value) => !value || record.kind === value }],
    row: subject => [nameCell(subject.name), badge(subject.kind), subject.email, el('span', { class: 'period-cell', text: dateTime(subject.createdAt) })],
    empty: { title: 'Registra tu primer contratante', description: 'Dialon se asigna a personas; los demás productos se asignan a negocios.', action: actionButton('Crear persona o negocio', openSubject, 'primary') },
  });
  return [pageHeading('Suscripciones', 'Administra la vigencia de cada producto y sus contratantes.', [actionButton('Crear persona o negocio', openSubject, 'secondary'), actionButton('Crear suscripción', () => openSubscription(), 'primary')]), limitedNotice('subscriptions'), el('section', { class: 'records-section', 'aria-label': 'Suscripciones' }, [subscriptions]), el('section', { class: 'records-section', 'aria-labelledby': 'subjects-title' }, [el('div', { class: 'records-heading' }, [el('div', {}, [el('h2', { id: 'subjects-title', text: 'Personas y negocios' }), el('p', { text: 'El tipo de contratante se conserva después de crearlo.' })])]), limitedNotice('subjects'), subjects])].filter(Boolean);
}

function renderPayments() {
  return [pageHeading('Pagos', platform.mode === 'demo' ? 'Pruebas locales de pagos por Nequi o transferencia. Estos registros no corresponden a operaciones reales.' : 'Registra pagos ya recibidos por Nequi o transferencia. Cada registro confirmado es inmutable.', [actionButton('Registrar pago', () => openPayment(), 'primary')]), limitedNotice('payments'), recordsView({
    key: 'payments', collection: 'payments', records: [...snapshot.payments].sort((a, b) => String(b.receivedAt).localeCompare(String(a.receivedAt))),
    columns: ['Contratante / Producto', 'Importe', 'Medio / Referencia', 'Recibido', 'Período aplicado'], caption: 'Pagos manuales registrados',
    search: payment => `${subjectName(payment.subjectId || subscriptionFor(payment.subscriptionId)?.subjectId)} ${productName(payment.productId || subscriptionFor(payment.subscriptionId)?.productId)} ${payment.reference} ${payment.id}`,
    filters: [{ key: 'method', label: 'Medio de pago', choices: [['', 'Todos los medios'], ['nequi', 'Nequi'], ['transfer', 'Transferencia']], test: (record, value) => !value || record.method === value }],
    row: payment => [nameCell(subjectName(payment.subjectId || subscriptionFor(payment.subscriptionId)?.subjectId), productName(payment.productId || subscriptionFor(payment.subscriptionId)?.productId)), el('span', { class: 'mono', text: money(payment.amountMinor, payment.currency) }), nameCell(STATUS_LABELS[payment.method] || payment.method, payment.reference || 'Sin referencia'), el('span', { class: 'period-cell', text: dateTime(payment.receivedAt, true) }), el('div', { class: 'period-cell' }, [dateTime(payment.periodStart, true), el('span', { class: 'secondary-line', text: `a ${dateTime(payment.periodEnd, true)}` })])],
    empty: { title: 'Tu historial de pagos empieza aquí', description: 'Elige una suscripción, registra el importe recibido y revisa la vigencia antes de confirmar.', action: actionButton('Registrar pago', () => openPayment(), 'primary') },
  })].filter(Boolean);
}

function renderActivity() {
  const targetLabel = event => {
    const target = event.after?.subscription || event.after;
    return target?.subjectId ? `${subjectName(target.subjectId)} · ${productName(target.productId)}` : event.action === 'product.plan.save' ? productName(target?.id) : event.action === 'subject.create' ? target?.name : event.targetId || 'Registro administrativo';
  };
  return [pageHeading('Actividad', 'Historial de decisiones y cambios realizados en el centro.'), limitedNotice('auditEvents'), recordsView({
    key: 'activity', collection: 'auditEvents', records: [...snapshot.auditEvents].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))),
    columns: ['Acción', 'Registro / Motivo', 'Administrador', 'Fecha'], caption: 'Historial de actividad',
    search: event => `${actionLabels[event.action] || event.action} ${targetLabel(event)} ${event.reason || ''} ${event.actor?.email || event.admin?.email || ''}`,
    filters: [{ key: 'action', label: 'Acción', choices: [['', 'Todas las acciones'], ...Object.entries(actionLabels).map(([value, label]) => [value, label])], test: (record, value) => !value || record.action === value }],
    row: event => {
      const name = targetLabel(event);
      return [el('span', { class: 'activity-action', text: actionLabels[event.action] || event.action || 'Cambio registrado' }), nameCell(name, event.reason || event.details?.reason || ''), event.actor?.email || event.admin?.email || 'Administrador', el('span', { class: 'period-cell', text: dateTime(event.createdAt || event.at, true) })];
    },
    empty: { title: 'Cada decisión deja su registro', description: 'Al configurar planes, crear suscripciones o registrar pagos, encontrarás aquí su historial.' },
  })].filter(Boolean);
}

// Los borradores viven en la pestaña actual y se separan por sesión administrativa.
function storageKey(key) { return `als-control:draft:${session?.uid || 'anonymous'}:${key}`; }
function readDraft(key) {
  try { return JSON.parse(sessionStorage.getItem(storageKey(key)) || 'null') || draftCache.get(storageKey(key)) || null; }
  catch { return draftCache.get(storageKey(key)) || null; }
}
function writeDraft(key, data) {
  draftCache.set(storageKey(key), data);
  try { sessionStorage.setItem(storageKey(key), JSON.stringify(data)); } catch { /* Memoria de respaldo si el navegador bloquea almacenamiento. */ }
}
function removeDraft(key) {
  draftCache.delete(storageKey(key));
  try { sessionStorage.removeItem(storageKey(key)); } catch { /* Sin almacenamiento disponible. */ }
}
function clearDrafts(uid = session?.uid) {
  const prefix = `als-control:draft:${uid || 'anonymous'}:`;
  for (const key of draftCache.keys()) if (key.startsWith(prefix)) draftCache.delete(key);
  try {
    for (const key of Object.keys(sessionStorage)) if (key.startsWith(prefix)) sessionStorage.removeItem(key);
    sessionStorage.removeItem(`als-control:requests:${uid}`);
    sessionStorage.removeItem(`als-control:confirmation:${uid}`);
  } catch { /* Memoria únicamente. */ }
}
function hasDrafts() {
  const prefix = `als-control:draft:${session?.uid || 'anonymous'}:`;
  try { return Object.keys(sessionStorage).some(key => key.startsWith(prefix)) || [...draftCache.keys()].some(key => key.startsWith(prefix)); }
  catch { return [...draftCache.keys()].some(key => key.startsWith(prefix)); }
}

function formValues(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function field(name, label, { value = '', type = 'text', required = true, help, options, ...attributes } = {}) {
  const id = `field-${name}`;
  const input = options ? el('select', { id, name, required, ...attributes }, options.map(([optionValue, text]) => el('option', { value: optionValue, text }))) : el(type === 'textarea' ? 'textarea' : 'input', { id, name, type: type === 'textarea' ? undefined : type, required, ...attributes });
  input.value = String(value);
  if (help) input.setAttribute('aria-describedby', `${id}-help`);
  return { input, node: el('div', { class: 'field' }, [el('label', { for: id, text: label }), input, help ? el('small', { id: `${id}-help`, text: help }) : null]) };
}

function beginModal(title, description, key = null) {
  if (workDialog.open) closeModal(true);
  returnFocus = document.activeElement;
  modal = { key, dirty: false, busy: false, form: null, save: null, confirmPending: false };
  const content = $('#dialog-content');
  content.replaceChildren(el('div', { class: 'dialog-header' }, [el('div', {}, [el('h2', { id: 'dialog-title', text: title }), el('p', { text: description })]), actionButton('×', requestCloseModal, 'dialog-close', { 'aria-label': 'Cerrar diálogo' })]));
  workDialog.showModal();
  return content;
}

function closeModal(force = false) {
  if (!force && modal?.busy) return;
  workDialog.close();
  modal = null;
  const focusTarget = returnFocus;
  if (focusTarget?.isConnected) focusTarget.focus();
  else workspace.querySelector('h1')?.focus({ preventScroll: true });
}

function askDiscard({ title = 'Hay cambios sin guardar', description = 'Puedes guardar un borrador en esta pestaña antes de cerrar.', discard, save }) {
  const content = $('#discard-content');
  const stay = () => { discardDialog.close(); };
  content.replaceChildren(el('div', { class: 'dialog-header' }, [el('h2', { id: 'discard-title', text: title })]), el('div', { class: 'dialog-body' }, [el('p', { class: 'muted', text: description }), el('div', { class: 'form-actions' }, [actionButton('Volver', stay, 'secondary'), actionButton('Descartar y salir', () => { discardDialog.close(); discard(); }, 'danger-button'), save ? actionButton('Guardar borrador', () => { discardDialog.close(); save(); }, 'primary') : null])]));
  discardDialog.showModal();
  content.querySelector('button')?.focus();
}

function requestCloseModal() {
  if (modal?.busy) { announce('Espera a que termine la operación.'); return; }
  if (modal?.confirmPending) {
    askDiscard({ title: 'Confirmación pendiente de respuesta', description: 'Reintenta la confirmación con la misma clave para comprobar si el pago quedó registrado. Conserva este diálogo mientras no haya respuesta.', discard: () => {}, save: null });
    $('#discard-content').querySelector('.danger-button')?.remove();
    return;
  }
  if (modal?.dirty) askDiscard({ discard: () => { if (modal?.key) removeDraft(modal.key); closeModal(true); }, save: modal.save });
  else closeModal();
}

function formModal({ title, description, key, fields, initial = {}, note, submitLabel = 'Guardar', onSubmit, update }) {
  const draft = readDraft(key);
  const content = beginModal(title, description, key);
  const form = /** @type {HTMLFormElement} */ (el('form', { class: 'dialog-form' }));
  const values = { ...initial, ...(draft || {}) };
  const inputs = {};
  for (const definition of fields) {
    const item = field(definition.name, definition.label, { ...definition, value: values[definition.name] ?? definition.value ?? '' });
    inputs[definition.name] = item.input;
    form.append(item.node);
  }
  const error = el('p', { class: 'form-error', role: 'alert', tabindex: '-1', hidden: true });
  const status = el('p', { class: 'draft-indicator', text: draft ? 'Borrador recuperado de esta pestaña.' : 'Puedes guardar un borrador para continuar después en esta pestaña.' });
  const submit = el('button', { type: 'submit', class: 'button primary', text: submitLabel });
  const save = () => { writeDraft(key, formValues(form)); modal.dirty = false; notify('Borrador guardado en esta pestaña.'); closeModal(true); };
  modal.form = form;
  modal.save = save;
  if (note) form.prepend(el('div', { class: 'form-note' }, [note]));
  form.append(error, status, el('div', { class: 'form-actions' }, [actionButton('Guardar borrador', save, 'text-button draft-control'), actionButton('Cancelar', requestCloseModal, 'secondary'), submit]));
  const markDirty = () => { if (modal) modal.dirty = true; status.textContent = 'Hay cambios sin guardar.'; error.hidden = true; update?.(inputs); };
  form.addEventListener('input', markDirty);
  form.addEventListener('change', markDirty);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (modal?.busy || !form.reportValidity()) return;
    modal.busy = true;
    const values = formValues(form);
    modal.values = values;
    submit.disabled = true;
    submit.textContent = 'Guardando…';
    form.setAttribute('aria-busy', 'true');
    const controls = [...form.querySelectorAll('button,input,select,textarea')].map(control => [control, control.disabled]);
    for (const [control] of controls) control.disabled = true;
    error.hidden = true;
    try {
      await onSubmit(values, form);
    } catch (failure) {
      error.textContent = errorMessage(failure);
      error.hidden = false;
      error.focus();
    } finally {
      if (modal?.form === form) {
        modal.busy = false;
        form.setAttribute('aria-busy', 'false');
        for (const [control, disabled] of controls) control.disabled = disabled;
        submit.disabled = false;
        submit.textContent = submitLabel;
        update?.(inputs);
      }
    }
  });
  content.append(form);
  update?.(inputs);
  form.querySelector('input:not(:disabled),select:not(:disabled),textarea')?.focus();
  return { form, inputs, submit };
}

async function finishMutation(action, payload, key, message) {
  const result = await command(action, payload);
  if (key) removeDraft(key);
  closeModal(true);
  notify(message);
  await loadState({ focus: true });
  return result;
}

function openPlan(product) {
  const key = `plan:${product.id}`;
  const current = product.plan;
  const isSarin = product.id === 'sarinbotsaas';
  const fixedTrial = ['laparada', 'sarinbotsaas'].includes(product.id);
  formModal({
    title: current ? `Editar plan · ${product.name}` : `Configurar plan · ${product.name}`,
    description: 'Define las condiciones para nuevas suscripciones. Las existentes conservan su plan contratado.', key,
    initial: { name: current?.name || '', amount: current ? String(current.amountMinor / 100) : '', billing: current?.billing.mode || (isSarin ? 'fixedDays' : 'calendarMonth'), trialDays: String(current?.trialDays ?? product.trialDays ?? 0) },
    fields: [
      { name: 'name', label: 'Nombre del plan', maxlength: 100, autocomplete: 'off', placeholder: 'Nombre comercial' },
      { name: 'amount', label: 'Precio del período (COP)', type: 'number', min: '0.01', step: '0.01', inputmode: 'decimal', help: 'Pesos colombianos, sin separadores de miles. Ejemplo: 50000.' },
      { name: 'billing', label: 'Período de renovación', options: isSarin ? [['fixedDays', '30 días exactos']] : [['calendarMonth', 'Un mes calendario'], ['fixedDays', '30 días exactos']], help: isSarin ? 'Sarin Bot renueva por períodos de 30 días.' : 'Un mes calendario conserva el ancla de renovación; no equivale a 30 días.' },
      { name: 'trialDays', label: 'Días de prueba', type: 'number', min: fixedTrial ? '7' : '0', max: fixedTrial ? '7' : '90', step: '1', readonly: fixedTrial, help: fixedTrial ? 'Este producto tiene una prueba de siete días, disponible una sola vez.' : '0 desactiva la prueba. Cada suscripción puede iniciarla una sola vez.' },
    ],
    submitLabel: 'Guardar plan',
    onSubmit: values => finishMutation('product.plan.save', { productId: product.id, plan: { name: values.name.trim(), amountMinor: minorUnits(values.amount), currency: 'COP', billing: values.billing === 'fixedDays' ? { mode: 'fixedDays', days: 30 } : { mode: 'calendarMonth', months: 1 }, trialDays: Number(values.trialDays) } }, key, 'Plan guardado. Se aplicará a las nuevas suscripciones.'),
  });
}

function openSubject() {
  formModal({
    title: 'Crear persona o negocio', description: 'Registra el contratante y su contacto de facturación.', key: 'subject',
    initial: { kind: 'business' },
    fields: [
      { name: 'kind', label: 'Tipo de contratante', options: [['business', 'Negocio'], ['person', 'Persona']], help: 'Dialon requiere una persona. La Parada, Sarin Bot y SemanControl requieren un negocio.' },
      { name: 'name', label: 'Nombre de la persona o negocio', maxlength: 160, autocomplete: 'organization' },
      { name: 'email', label: 'Correo de contacto', type: 'email', maxlength: 254, autocomplete: 'email' },
    ],
    submitLabel: 'Crear contratante',
    onSubmit: values => finishMutation('subject.create', { kind: values.kind, name: values.name.trim(), email: values.email.trim() }, 'subject', 'Contratante creado. Ya puedes asignarle una suscripción.'),
  });
}

function blockedModal(title, description, actionLabel, action) {
  const content = beginModal(title, description);
  content.append(el('div', { class: 'dialog-body' }, [emptyState(title, description, actionButton(actionLabel, () => { closeModal(true); action(); }, 'primary'))]));
}

function openSubscription(productId = '') {
  const configured = snapshot.products.filter(product => product.plan);
  if (!configured.length) return blockedModal('Primero configura un plan', 'Los productos están en borrador. Define un precio y un período para crear una suscripción.', 'Ver productos', () => { location.hash = 'productos'; });
  if (!snapshot.subjects.length) return blockedModal('Crea un contratante', 'Necesitas una persona o negocio para asignar la suscripción.', 'Crear persona o negocio', openSubject);
  const key = 'subscription';
  let inputRefs;
  formModal({
    title: 'Crear suscripción', description: 'El precio, el período y la prueba se conservan como parte de la suscripción.', key,
    initial: { productId: configured.some(product => product.id === productId) ? productId : configured[0].id },
    fields: [
      { name: 'productId', label: 'Producto', options: configured.map(product => [product.id, product.name]) },
      { name: 'subjectId', label: 'Persona o negocio', options: [['', 'Selecciona un contratante']] },
    ],
    note: 'Solo aparecen productos con plan configurado y contratantes compatibles. La suscripción comienza pendiente; crearla no inicia la prueba ni registra un pago.',
    update: inputs => {
      const product = productFor(inputs.productId.value);
      const selected = inputs.subjectId.value || (inputRefs ? '' : readDraft(key)?.subjectId || '');
      const candidates = snapshot.subjects.filter(subject => subject.kind === product?.subjectKind && !snapshot.subscriptions.some(subscription => subscription.productId === product?.id && subscription.subjectId === subject.id));
      inputs.subjectId.replaceChildren(el('option', { value: '', text: candidates.length ? 'Selecciona un contratante' : 'No hay contratantes compatibles disponibles' }), ...candidates.map(subject => el('option', { value: subject.id, text: `${subject.name} · ${subject.email}` })));
      inputs.subjectId.value = candidates.some(subject => subject.id === selected) ? selected : '';
      const help = $(`#field-subjectId`).closest('.field');
      help.querySelector('.compatibility-note')?.remove();
      help.append(el('small', { class: 'compatibility-note', text: product ? `${STATUS_LABELS[product.subjectKind]} · ${money(product.plan.amountMinor, product.plan.currency)} · ${periodLabel(product.plan)}` : 'Selecciona un producto disponible.' }));
      inputs.subjectId.disabled = !candidates.length;
      inputRefs = inputs;
    },
    submitLabel: 'Crear suscripción',
    onSubmit: values => {
      if (!values.subjectId) throw new Error('Selecciona un contratante compatible para continuar.');
      return finishMutation('subscription.create', { productId: values.productId, subjectId: values.subjectId }, key, 'Suscripción creada. Su vigencia está pendiente.');
    },
  });
}

function openTrial(subscription) {
  const content = beginModal('Iniciar prueba', `${subjectName(subscription.subjectId)} · ${productName(subscription.productId)}`);
  const body = el('div', { class: 'dialog-body' });
  const error = el('p', { class: 'form-error', role: 'alert', tabindex: '-1', hidden: true });
  const button = actionButton(`Iniciar prueba de ${subscription.plan.trialDays} días`, async () => {
    modal.busy = true;
    button.disabled = true;
    error.hidden = true;
    try { await finishMutation('subscription.trial.start', { subscriptionId: subscription.id }, null, 'Prueba iniciada. La vigencia fue calculada por el centro.'); }
    catch (failure) { error.textContent = errorMessage(failure); error.hidden = false; error.focus(); }
    finally { if (modal) modal.busy = false; button.disabled = false; }
  }, 'primary');
  body.append(el('p', { text: `Esta prueba dura ${subscription.plan.trialDays} días desde el momento de su inicio y solo se puede utilizar una vez.` }), el('p', { class: 'subtle-note', text: 'El centro registra la vigencia. La plataforma continúa pendiente de conexión.' }), error, el('div', { class: 'form-actions' }, [actionButton('Cancelar', requestCloseModal, 'secondary'), button]));
  content.append(body);
  button.focus();
}

function openSuspension(subscription) {
  const reactivate = Boolean(subscription.suspendedAt);
  const verb = reactivate ? 'Reactivar' : 'Suspender';
  const key = `${reactivate ? 'reactivate' : 'suspend'}:${subscription.id}`;
  formModal({
    title: `${verb} suscripción`, description: `${subjectName(subscription.subjectId)} · ${productName(subscription.productId)}`, key,
    fields: [{ name: 'reason', label: 'Motivo', type: 'textarea', minlength: 3, maxlength: 500, help: 'Quedará registrado en el historial de actividad.' }],
    note: reactivate ? 'Reactivar retira la suspensión y recupera la vigencia real. No añade días de prueba ni períodos pagados.' : 'La suspensión es independiente de la vigencia. Registrar un pago no la retira automáticamente.',
    submitLabel: `${verb} suscripción`,
    onSubmit: values => finishMutation(reactivate ? 'subscription.reactivate' : 'subscription.suspend', { subscriptionId: subscription.id, reason: values.reason.trim() }, key, reactivate ? 'Suscripción reactivada según su vigencia real.' : 'Suscripción suspendida. El motivo quedó registrado.'),
  });
}

function localDateValue() {
  const parts = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date());
  return parts.replace(' ', 'T');
}

function openPayment(subscriptionId = '') {
  if (!snapshot.subscriptions.length) return blockedModal('Crea una suscripción primero', 'Cada pago debe aplicarse a una suscripción existente.', 'Crear suscripción', () => openSubscription());
  const key = 'payment';
  const selected = subscriptionFor(subscriptionId) || snapshot.subscriptions[0];
  let previousId;
  formModal({
    title: 'Registrar pago', description: 'Registra un pago que ya recibiste. Antes de confirmarlo, revisarás el período que aplicará el centro.', key,
    initial: { subscriptionId: selected.id, amount: String(selected.plan.amountMinor / 100), method: 'nequi', receivedAt: localDateValue() },
    fields: [
      { name: 'subscriptionId', label: 'Suscripción', options: subscriptionChoices() },
      { name: 'amount', label: 'Importe recibido (COP)', type: 'number', min: '0.01', step: '0.01', inputmode: 'decimal', help: 'Importe en pesos, sin separadores de miles.' },
      { name: 'method', label: 'Medio de pago', options: [['nequi', 'Nequi'], ['transfer', 'Transferencia']] },
      { name: 'reference', label: 'Referencia o comprobante', maxlength: 160, placeholder: 'Identificador de la transferencia', help: 'Usa una referencia que permita identificar el pago.' },
      { name: 'receivedAt', label: 'Fecha y hora de recepción · Bogotá', type: 'datetime-local', help: 'Hora de Colombia (UTC−05:00).' },
    ],
    note: 'Este registro no realiza un cobro ni verifica tu cuenta bancaria. Un pago confirmado no puede editarse ni anularse desde este panel.',
    submitLabel: 'Revisar pago',
    update: inputs => {
      if (previousId && previousId !== inputs.subscriptionId.value) {
        const subscription = subscriptionFor(inputs.subscriptionId.value);
        if (subscription) inputs.amount.value = String(subscription.plan.amountMinor / 100);
      }
      previousId = inputs.subscriptionId.value;
    },
    onSubmit: async values => {
      const receivedAt = new Date(`${values.receivedAt}:00-05:00`);
      if (!Number.isFinite(receivedAt.getTime())) throw new Error('Selecciona una fecha y hora de recepción válidas.');
      const payload = { subscriptionId: values.subscriptionId, amountMinor: minorUnits(values.amount), method: values.method, reference: values.reference.trim(), receivedAt: receivedAt.toISOString() };
      const quote = await command('payment.preview', payload);
      writeDraft(key, values);
      openPaymentConfirmation(quote, payload);
    },
  });
}

function openPaymentConfirmation(quote, payload, retainedRequestId = null, recovering = false, retainedPayload = null) {
  const subscription = subscriptionFor(payload.subscriptionId);
  if (!subscription) return;
  const requestId = retainedRequestId || newRequestId();
  const ownerUid = session?.uid;
  const content = beginModal('Confirmar pago', `${subjectName(subscription.subjectId)} · ${productName(subscription.productId)}`);
  modal.confirmPending = recovering;
  modal.quoteId = quote.id;
  const body = el('div', { class: 'dialog-body' });
  const detail = (label, value, className = '') => el('div', { class: className }, [el('dt', { text: label }), el('dd', { text: value })]);
  const error = el('p', { class: 'form-error', role: 'alert', tabindex: '-1', hidden: true });
  const different = Boolean(quote.amountDifference);
  // El contenido confirmado queda fijado con su clave, incluso al recargar o autenticar de nuevo.
  let confirmationPayload = recovering ? Object.freeze({ ...(retainedPayload || { quoteId: quote.id, acceptAmountDifference: different }) }) : null;
  const acceptance = el('input', { type: 'checkbox', id: 'accept-amount-difference', name: 'acceptAmountDifference' });
  const check = el('label', { class: 'check-field', for: 'accept-amount-difference' }, [acceptance, `Acepto registrar un importe diferente al precio del plan (${money(subscription.plan.amountMinor, subscription.plan.currency)}). Este pago aplica el período mostrado.`]);
  const confirm = actionButton('Confirmar registro del pago', async () => {
    if (!confirmationPayload && different && !acceptance.checked) { acceptance.focus(); announce('Acepta la diferencia de importe antes de confirmar.'); return; }
    if (!confirmationPayload) confirmationPayload = Object.freeze({ quoteId: quote.id, acceptAmountDifference: different && acceptance.checked });
    modal.busy = true;
    modal.confirmPending = true;
    acceptance.disabled = true;
    pendingPayment({ quote, payload, requestId, confirmationPayload }, ownerUid);
    confirm.disabled = true;
    edit.disabled = true;
    confirm.textContent = 'Confirmando…';
    error.hidden = true;
    try {
      await command('payment.confirm', confirmationPayload, requestId);
      pendingPayment(null, ownerUid);
      removeDraft('payment');
      closeModal(true);
      notify('Pago registrado. La vigencia y el historial se actualizaron.');
      await loadState({ focus: true });
    } catch (failure) {
      error.textContent = errorMessage(failure);
      error.hidden = false;
      error.focus();
      // El dominio consulta requests antes de validar la cotización. Solo estos rechazos
      // comerciales de la MISMA clave y contenido prueban que no confirmó ese pago.
      // Autenticación, permisos, límites y QUOTE_CONSUMED no resuelven la incertidumbre.
      const definitive = failure?.status === 409 && ['QUOTE_EXPIRED', 'QUOTE_STALE', 'AMOUNT_DIFFERENCE'].includes(failure?.code);
      if (definitive) pendingPayment(null, ownerUid);
      if (!modal || modal.quoteId !== quote.id) return;
      modal.confirmPending = !definitive;
      confirm.textContent = 'Reintentar confirmación';
      edit.disabled = !definitive;
      if (definitive) edit.textContent = 'Generar nueva vista previa';
    } finally {
      if (modal) modal.busy = false;
      confirm.disabled = !confirmationPayload && different && !acceptance.checked;
    }
  }, 'primary', { disabled: different });
  const edit = actionButton('Volver a los datos', () => openPayment(payload.subscriptionId), 'secondary');
  acceptance.addEventListener('change', () => { confirm.disabled = !acceptance.checked; });
  body.append(el('dl', { class: 'confirmation-details' }, [detail('Importe recibido', money(quote.amountMinor, quote.currency), 'amount'), detail('Medio', STATUS_LABELS[payload.method]), detail('Referencia', payload.reference), detail('Recibido', `${dateTime(payload.receivedAt, true)} · Bogotá`), detail('Inicio del período', `${dateTime(quote.periodStart, true)} · Bogotá`), detail('Fin del período', `${dateTime(quote.periodEnd, true)} · Bogotá`)]), el('p', { class: 'quote-expiration', text: `Vista previa válida hasta ${dateTime(quote.expiresAt, true)} · Bogotá` }), different ? check : null, subscription.suspendedAt ? el('div', { class: 'form-note', text: 'Esta suscripción está suspendida. El pago actualizará su período, pero no retirará la suspensión.' }) : null, el('p', { class: 'subtle-note', text: 'Las fechas provienen del centro. La vista previa no concede vigencia y el producto sigue pendiente de conexión.' }), error, el('div', { class: 'form-actions' }, [edit, confirm]));
  content.append(body);
  if (recovering) {
    acceptance.checked = confirmationPayload.acceptAmountDifference;
    acceptance.disabled = true;
    confirm.disabled = false;
    confirm.textContent = 'Reintentar confirmación';
    edit.disabled = true;
    error.textContent = 'Esta confirmación quedó sin respuesta. Reintenta para recuperar el resultado de la misma operación, sin duplicar el pago.';
    error.hidden = false;
  }
  (different && !recovering ? acceptance : confirm).focus();
}

async function signOut() {
  const uid = session?.uid;
  signingOut = true;
  try {
    await platform.signOut();
    clearDrafts(uid);
    pendingRequests.clear();
    notify('Sesión cerrada.');
  } catch (error) { showGlobalError(error); }
  finally { signingOut = false; }
}

function onSession(user) {
  const previous = session;
  if (previous && !user && modal?.form && modal?.key) writeDraft(modal.key, modal.busy && modal.values ? modal.values : formValues(modal.form));
  session = user;
  sessionReady = true;
  $('#login').hidden = Boolean(user);
  $('#app-shell').hidden = !user;
  $('#sign-in').disabled = platform.mode === 'unconfigured';
  if (user) {
    if (previous?.uid !== user.uid) restoreRequests();
    $('#account-email').textContent = user.email;
    $('#environment-label').textContent = platform.mode === 'demo' ? 'Entorno de prueba local' : 'Centro administrativo';
    $('#sidebar-mode').textContent = platform.mode === 'demo' ? 'Prueba local' : 'Producción';
    navigate(location.hash.slice(1), false);
    loadState({ focus: previous?.uid !== user.uid }).then(() => {
      const retained = pendingPayment();
      if (snapshot && !workDialog.open && retained) openPaymentConfirmation(retained.quote, retained.payload, retained.requestId, true, retained.confirmationPayload || { quoteId: retained.quote.id, acceptAmountDifference: Boolean(retained.accepted) });
    });
  } else {
    ++loadNumber;
    snapshot = null;
    workspace.replaceChildren();
    $('#global-error').hidden = true;
    if (workDialog.open) closeModal(true);
    if (discardDialog.open) discardDialog.close();
    if (previous) {
      if (!signingOut) {
        $('#login-error').textContent = 'Tu sesión venció. Vuelve a entrar para continuar. Conservamos el formulario como borrador en esta pestaña.';
        $('#login-error').hidden = false;
      }
      $('#sign-in').focus();
    }
  }
}

async function init() {
  platform = await createPlatform();
  const mode = platform.mode;
  const description = mode === 'demo' ? 'Estás en una prueba local. Puedes trabajar con los emuladores y una identidad de prueba, sin modificar los productos reales.' : mode === 'production' ? 'Continúa con tu cuenta de Google autorizada para entrar al centro.' : 'El panel todavía no tiene un entorno de acceso configurado. Configura el servicio antes de iniciar una sesión.';
  $('#login-environment').textContent = mode === 'demo' ? 'Entorno de prueba local' : mode === 'production' ? 'Acceso privado' : 'Entorno sin configurar';
  $('#login-description').textContent = description;
  $('#sign-in').textContent = mode === 'demo' ? 'Entrar al entorno de prueba' : mode === 'production' ? 'Continuar con Google' : 'Acceso no configurado';
  $('#sign-in').disabled = mode === 'unconfigured';
  $('#sign-in').addEventListener('click', async () => {
    $('#sign-in').disabled = true;
    $('#login-error').hidden = true;
    try { await platform.signIn(); }
    catch (error) { $('#login-error').textContent = errorMessage(error); $('#login-error').hidden = false; }
    finally { $('#sign-in').disabled = mode === 'unconfigured'; }
  });
  $('#sign-out').addEventListener('click', () => {
    if (hasDrafts()) askDiscard({ title: 'Cerrar sesión', description: 'Al salir se borrarán los borradores guardados en esta pestaña.', discard: signOut, save: null });
    else signOut();
  });
  platform.onSession(onSession);
  window.addEventListener('hashchange', () => { if (session) navigate(location.hash.slice(1)); });
  workDialog.addEventListener('cancel', event => { event.preventDefault(); requestCloseModal(); });
  window.addEventListener('beforeunload', event => { if (modal?.dirty || modal?.busy || modal?.confirmPending) { event.preventDefault(); event.returnValue = ''; } });
  window.addEventListener('offline', () => { if (session) showGlobalError(new Error('Sin conexión. Conservamos los datos.')); });
  window.addEventListener('online', () => { if (session) { announce('Conexión recuperada.'); loadState(); } });
  if (!sessionReady && mode === 'unconfigured') onSession(null);
}

init().catch(error => {
  $('#login-description').textContent = 'No pudimos preparar el acceso al panel. Vuelve a cargar la página.';
  $('#login-error').textContent = errorMessage(error);
  $('#login-error').hidden = false;
  $('#sign-in').textContent = 'Acceso no disponible';
  $('#sign-in').disabled = true;
});
