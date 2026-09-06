// @ts-check
/**
 * Aparición progresiva de bloques `[data-reveal]` al entrar en el viewport.
 * Con reduced-motion o sin IntersectionObserver todo se muestra de inmediato.
 */
import { reducedMotion } from './env.js';

export function initReveal() {
  const items = [...document.querySelectorAll('[data-reveal]')];
  if (!('IntersectionObserver' in window) || reducedMotion()) {
    items.forEach(item => item.classList.add('is-visible'));
    return;
  }
  const observer = new IntersectionObserver((entries, self) => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('is-visible');
    self.unobserve(entry.target);
  }), { threshold: 0.12 });
  items.forEach(item => observer.observe(item));
}
