// @ts-check
// Presentación pura y creación de nodos; los datos siempre se insertan como texto.

export const STATUS_LABELS = Object.freeze({
  pending: 'Pendiente', trial: 'En prueba', active: 'Vigente', expired: 'Vencida',
  suspended: 'Suspendida', disconnected: 'Sin conectar', connected: 'Conectado',
  business: 'Negocio', person: 'Persona', nequi: 'Nequi', transfer: 'Transferencia',
});

/** @param {string} tag @param {Record<string, any>} [attributes] @param {any[]} [children] */
export function el(tag, attributes = {}, children = []) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) {
    if (value === undefined || value === null || value === false) continue;
    if (name === 'class') node.className = value;
    else if (name === 'text') node.textContent = String(value);
    else if (name.startsWith('on') && typeof value === 'function') node.addEventListener(name.slice(2).toLowerCase(), value);
    else if (name === 'value') /** @type {HTMLInputElement} */ (node).value = String(value);
    else node.setAttribute(name, value === true ? '' : String(value));
  }
  for (const child of children.flat(Infinity)) {
    if (child !== null && child !== undefined && child !== false) node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

export function money(amountMinor, currency = 'COP') {
  if (!Number.isFinite(amountMinor)) return 'Sin precio';
  try { return new Intl.NumberFormat('es-CO', { style: 'currency', currency, minimumFractionDigits: amountMinor % 100 ? 2 : 0, maximumFractionDigits: 2 }).format(amountMinor / 100); }
  catch { return `${currency} ${(amountMinor / 100).toFixed(2)}`; }
}

export function dateTime(value, includeTime = false) {
  if (!value) return '—';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium', ...(includeTime ? { timeStyle: 'short' } : {}), timeZone: 'America/Bogota',
  }).format(date);
}

export function periodLabel(plan) {
  if (!plan?.billing) return 'Plan por configurar';
  return plan.billing.mode === 'fixedDays' ? `Cada ${plan.billing.days} días` : 'Cada mes calendario';
}

export function minorUnits(value) {
  const normalized = String(value).trim().replace(',', '.');
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) throw new Error('Escribe un importe positivo con máximo dos decimales.');
  const [whole, decimals = ''] = normalized.split('.');
  const amount = Number(whole) * 100 + Number(decimals.padEnd(2, '0'));
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error('El importe debe ser mayor que cero y estar dentro del límite permitido.');
  return amount;
}

export function badge(status, label) {
  return el('span', { class: `badge badge-${/^[a-z]+$/.test(status || '') ? status : 'neutral'}`, text: label || STATUS_LABELS[status] || status || 'Pendiente' });
}

export function actionButton(label, onClick, style = 'secondary', attributes = {}) {
  return el('button', { type: 'button', class: `button ${style}`, onclick: onClick, ...attributes }, [label]);
}

export function emptyState(title, description, action) {
  return el('div', { class: 'empty-state' }, [el('span', { class: 'empty-mark', 'aria-hidden': 'true', text: '—' }), el('h3', { text: title }), el('p', { text: description }), action]);
}

/** Búsqueda insensible a acentos, con páginas acotadas a diez registros. */
export function selectPage(records, { query = '', page = 1, test = () => true, searchable = record => JSON.stringify(record) } = {}) {
  const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
  const needle = normalize(query.trim());
  const filtered = records.filter(record => test(record) && (!needle || normalize(searchable(record)).includes(needle)));
  const pages = Math.max(1, Math.ceil(filtered.length / 10));
  const current = Math.min(Math.max(1, page), pages);
  return { rows: filtered.slice((current - 1) * 10, current * 10), count: filtered.length, page: current, pages };
}

export function datasetLimited(meta, collection) {
  if (!meta) return false;
  const info = meta.collections?.[collection] ?? meta[collection];
  return Boolean(meta.hasMore || meta.truncated === true || meta.truncated?.[collection] || meta.truncated?.includes?.(collection) || info?.hasMore || info?.truncated);
}

export function totals(snapshot) {
  const subscriptions = snapshot.subscriptions || [];
  const received = {};
  const recurring = {};
  for (const payment of snapshot.payments || []) received[payment.currency] = (received[payment.currency] || 0) + payment.amountMinor;
  for (const subscription of subscriptions) {
    if (!['active', 'trial'].includes(subscription.accessStatus) || !subscription.plan) continue;
    const key = `${subscription.plan.currency}|${periodLabel(subscription.plan)}`;
    recurring[key] = (recurring[key] || 0) + subscription.plan.amountMinor;
  }
  return {
    subscriptions: subscriptions.length,
    current: subscriptions.filter(subscription => ['active', 'trial'].includes(subscription.accessStatus)).length,
    pending: subscriptions.filter(subscription => ['pending', 'expired'].includes(subscription.accessStatus)).length,
    suspended: subscriptions.filter(subscription => subscription.accessStatus === 'suspended').length,
    received, recurring,
  };
}

/** @param {string[]} headers @param {any[][]} rows @param {string} caption */
export function table(headers, rows, caption) {
  const result = el('table', {}, [el('caption', { class: 'sr-only', text: caption }), el('thead', {}, [el('tr', {}, headers.map(header => el('th', { scope: 'col', text: header })))]), el('tbody', {}, rows.map(row => el('tr', {}, row.map(cell => el('td', {}, [cell])))))]);
  return el('div', {}, [el('p', { class: 'table-hint', text: 'Desliza la tabla para ver todos los datos y acciones.' }), el('div', { class: 'table-scroll', tabindex: '0', role: 'region', 'aria-label': caption }, [result])]);
}

export function pager(selection, onPage) {
  return el('div', { class: 'pagination' }, [
    el('span', { text: `${selection.count} ${selection.count === 1 ? 'registro' : 'registros'} · Página ${selection.page} de ${selection.pages}` }),
    el('div', { class: 'button-row' }, [actionButton('Anterior', () => onPage(selection.page - 1), 'small secondary', { disabled: selection.page <= 1, 'aria-label': 'Página anterior' }), actionButton('Siguiente', () => onPage(selection.page + 1), 'small secondary', { disabled: selection.page >= selection.pages, 'aria-label': 'Página siguiente' })]),
  ]);
}
