// @ts-check
// Sin IntersectionObserver o con reduced-motion se muestran todos los bloques.
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
