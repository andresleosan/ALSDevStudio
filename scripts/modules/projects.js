// @ts-check
/**
 * Galería de proyectos: filtros por categoría con estado accesible.
 */
import { queryAll } from './dom.js';

export function initProjects() {
  const filters = queryAll('.filter', HTMLButtonElement);
  const cards = queryAll('.project-card', HTMLElement);

  filters.forEach(filter => {
    filter.setAttribute('aria-pressed', String(filter.classList.contains('is-active')));
    filter.addEventListener('click', () => {
      const category = filter.dataset.filter;
      filters.forEach(button => {
        const active = button === filter;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', String(active));
      });
      cards.forEach(card => {
        card.classList.toggle('is-hidden', category !== 'all' && card.dataset.category !== category);
      });
    });
  });
}
