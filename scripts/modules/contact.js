// @ts-check
/**
 * Mini brief de contacto: la opción elegida define el resultado y el mensaje de WhatsApp.
 */
import { query, queryAll } from './dom.js';

const WHATSAPP_NUMBER = '573146432135';

export function initContact() {
  const options = queryAll('.playground-option', HTMLButtonElement);
  const result = query('#contact-result', HTMLElement);
  const whatsappLink = query('#whatsapp-link', HTMLAnchorElement);
  if (!options.length) return;

  /** @param {HTMLButtonElement} option */
  const select = option => {
    options.forEach(item => {
      const selected = item === option;
      item.classList.toggle('is-selected', selected);
      item.setAttribute('aria-pressed', String(selected));
    });
    if (result) result.textContent = option.dataset.result ?? '';
    if (whatsappLink) whatsappLink.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(option.dataset.message ?? '')}`;
  };

  options.forEach(option => option.addEventListener('click', () => select(option)));
  select(options[0]);
}
