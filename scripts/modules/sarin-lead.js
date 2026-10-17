// @ts-check
// Validación compartida. Estos datos no verifican la identidad ni el correo.
export const SARIN_LEAD_LIMITS = Object.freeze({ firstName: 80, lastName: 80, email: 254 });

/** @typedef {{firstName: string, lastName: string, email: string}} SarinLead */
/** @typedef {'firstName'|'lastName'|'email'|'lead'} LeadField */
/** @typedef {{ok: true, lead: SarinLead}|{ok: false, field: LeadField, message: string}} LeadResult */

const unsafe = /[\p{C}\p{Zl}\p{Zp}<>]/u;
const namePattern = /^\p{L}[\p{L}\p{M} .'’ʼ‐‑·-]*$/u;
const localPattern = /^[a-z0-9!#$%&'*+/=?^_`{|}~.-]+$/i;
const domainLabelPattern = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;

/** @param {LeadField} field @param {string} message @returns {LeadResult} */
function invalid(field, message) { return { ok: false, field, message }; }

/**
 * Acepta sólo tres campos; no convierte valores ni refleja datos en los errores.
 * Se admiten dominios ASCII/punycode, no direcciones de correo internacionalizadas.
 * @param {unknown} value
 * @returns {LeadResult}
 */
export function validateSarinLead(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).length !== 3
    || !['firstName', 'lastName', 'email'].every(key => Object.hasOwn(value, key))) {
    return invalid('lead', 'Completa tu nombre, apellido y correo electrónico.');
  }
  const input = /** @type {Record<string, unknown>} */ (value);
  /** @type {Record<'firstName'|'lastName', string>} */
  const names = { firstName: '', lastName: '' };
  for (const field of /** @type {const} */ (['firstName', 'lastName'])) {
    const raw = input[field];
    const label = field === 'firstName' ? 'nombre' : 'apellido';
    if (typeof raw !== 'string' || raw.length > 320 || unsafe.test(raw)) {
      return invalid(field, `Escribe un ${label} válido, sin caracteres de control ni símbolos de marcado.`);
    }
    const normalized = raw.normalize('NFC').trim().replace(/\p{Zs}+/gu, ' ');
    if (!normalized || normalized.length > SARIN_LEAD_LIMITS[field] || !namePattern.test(normalized)) {
      return invalid(field, `Escribe tu ${label} (máximo ${SARIN_LEAD_LIMITS[field]} caracteres).`);
    }
    names[field] = normalized;
  }
  const rawEmail = input.email;
  const emailError = 'Escribe un correo válido, por ejemplo nombre@empresa.com (máximo 254 caracteres).';
  if (typeof rawEmail !== 'string' || rawEmail.length > 1024 || unsafe.test(rawEmail)) return invalid('email', emailError);
  const email = rawEmail.trim();
  const parts = email.split('@');
  if (email.length > SARIN_LEAD_LIMITS.email || parts.length !== 2) return invalid('email', emailError);
  const [local, domain] = parts;
  if (!local || local.length > 64 || !localPattern.test(local) || local.startsWith('.') || local.endsWith('.') || local.includes('..')
    || !domain || domain.split('.').length < 2 || !domain.split('.').every(label => domainLabelPattern.test(label))) {
    return invalid('email', emailError);
  }
  return { ok: true, lead: { ...names, email: `${local}@${domain.toLowerCase()}` } };
}
