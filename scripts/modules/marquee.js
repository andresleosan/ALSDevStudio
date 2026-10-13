// @ts-check
// El banner solo se anima cuando su control de pausa está disponible.
import { query } from './dom.js';

export function initMarquee() {
  const marquee = query('.marquee', HTMLElement);
  const toggle = query('[data-marquee-toggle]', HTMLButtonElement);
  const label = query('[data-marquee-label]', HTMLElement);
  if (!marquee || !toggle || !label) return;

  toggle.addEventListener('click', () => {
    const paused = marquee.classList.toggle('is-paused');
    const action = paused ? 'Reanudar' : 'Pausar';
    label.textContent = action;
    toggle.setAttribute('aria-label', `${action} banner de servicios`);
  });
  toggle.hidden = false;
  marquee.classList.add('is-ready');
}
