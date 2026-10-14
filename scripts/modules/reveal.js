// @ts-check
// El HTML es visible de base; solo preparar entradas cuando la API está disponible.
import { reducedMotion } from './env.js';

export function initReveal() {
  const items = [...document.querySelectorAll('[data-reveal]')];
  if (typeof window.IntersectionObserver !== 'function' || reducedMotion()) {
    items.forEach(item => item.classList.add('is-visible'));
    return;
  }
  const observer = new IntersectionObserver((entries, self) => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('is-visible');
    self.unobserve(entry.target);
  }), { threshold: 0.12 });
  items.forEach(item => {
    item.classList.add('reveal-ready');
    observer.observe(item);
  });
}
