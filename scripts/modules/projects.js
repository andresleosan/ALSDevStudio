// @ts-check
import { query, queryAll } from './dom.js';

const ITEMS_PER_PAGE = 4;
const STAGGER_STEP_MS = 60;

export function initProjects() {
  const filters = queryAll('.filter', HTMLButtonElement);
  const cards = queryAll('.project-card', HTMLElement);
  const paginationNav = query('.projects-pagination', HTMLElement);
  const pagesContainer = query('.pagination-pages', HTMLElement);
  const prevBtn = query('.pagination-prev', HTMLButtonElement);
  const nextBtn = query('.pagination-next', HTMLButtonElement);
  const statusEl = query('#projects-pagination-status', HTMLElement);
  const counterRange = query('#projects-counter-range', HTMLElement);
  const counterTotal = query('#projects-counter-total', HTMLElement);

  if (!cards.length) return;

  // Contadores dinámicos por cada categoría existente
  const categoryCounts = {
    all: cards.length,
    product: cards.filter(c => c.dataset.category === 'product').length,
    web: cards.filter(c => c.dataset.category === 'web').length,
    systems: cards.filter(c => c.dataset.category === 'systems').length,
  };

  filters.forEach(filter => {
    const category = filter.dataset.filter || 'all';
    const countBadge = filter.querySelector('.filter-count');
    if (countBadge) {
      countBadge.textContent = String(categoryCounts[category] ?? 0);
    }
  });

  let currentCategory = 'all';
  let currentPage = 1;

  function getMatchingCards() {
    return cards.filter(card => currentCategory === 'all' || card.dataset.category === currentCategory);
  }

  /**
   * Actualiza las tarjetas visibles con animación escalonada y la barra de paginación.
   * @param {{ scroll?: boolean }} [options]
   */
  function updateView(options = {}) {
    const matchingCards = getMatchingCards();
    const totalPages = Math.max(1, Math.ceil(matchingCards.length / ITEMS_PER_PAGE));

    if (currentPage > totalPages) {
      currentPage = 1;
    }

    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;

    let visibleIndex = 0;
    cards.forEach(card => {
      const matchIndex = matchingCards.indexOf(card);
      if (matchIndex >= startIndex && matchIndex < endIndex) {
        card.classList.remove('is-hidden');
        card.style.setProperty('--stagger', `${visibleIndex * STAGGER_STEP_MS}ms`);
        visibleIndex++;
        card.classList.remove('is-page-active');
        // Breve reflujo para relanzar la animación de entrada suave
        void card.offsetWidth;
        card.classList.add('is-page-active');
      } else {
        card.classList.add('is-hidden');
        card.classList.remove('is-page-active');
        card.style.removeProperty('--stagger');
      }
    });

    if (paginationNav && pagesContainer) {
      const restorePageFocus = pagesContainer.contains(document.activeElement);
      paginationNav.classList.toggle('is-single-page', totalPages <= 1);

      if (prevBtn) prevBtn.disabled = currentPage <= 1;
      if (nextBtn) nextBtn.disabled = currentPage >= totalPages;

      pagesContainer.innerHTML = '';
      for (let p = 1; p <= totalPages; p++) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `pagination-number${p === currentPage ? ' is-active' : ''}`;
        btn.textContent = String(p).padStart(2, '0');
        btn.setAttribute('aria-label', `Ir a página ${String(p).padStart(2, '0')} de ${totalPages}`);
        if (p === currentPage) {
          btn.setAttribute('aria-current', 'page');
        }
        btn.addEventListener('click', () => {
          if (currentPage !== p) {
            currentPage = p;
            updateView({ scroll: true });
          }
        });
        pagesContainer.appendChild(btn);
      }
      if (restorePageFocus) {
        const activePage = pagesContainer.querySelector('button[aria-current="page"]');
        if (activePage instanceof HTMLButtonElement) activePage.focus({ preventScroll: true });
      }
    }

    // Actualizar indicador de rango superior
    const currentStart = matchingCards.length ? startIndex + 1 : 0;
    const currentEnd = Math.min(endIndex, matchingCards.length);
    if (counterRange) {
      const startFmt = String(currentStart).padStart(2, '0');
      const endFmt = String(currentEnd).padStart(2, '0');
      counterRange.textContent = `${startFmt}–${endFmt}`;
    }
    if (counterTotal) {
      counterTotal.textContent = String(matchingCards.length).padStart(2, '0');
    }

    if (statusEl) {
      statusEl.textContent = `Página ${currentPage} de ${totalPages}. Mostrando proyectos ${currentStart} al ${currentEnd} de un total de ${matchingCards.length}.`;
    }

    if (options.scroll) {
      const section = document.getElementById('proyectos');
      if (section) {
        const rect = section.getBoundingClientRect();
        if (rect.top < -20) {
          section.scrollIntoView({ behavior: 'smooth' });
        }
      }
    }
  }

  // Eventos de los filtros de categoría
  filters.forEach(filter => {
    filter.setAttribute('aria-pressed', String(filter.classList.contains('is-active')));
    filter.addEventListener('click', () => {
      const category = filter.dataset.filter || 'all';
      if (category === currentCategory) return;
      currentCategory = category;
      currentPage = 1;
      filters.forEach(button => {
        const active = button === filter;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', String(active));
      });
      updateView({ scroll: false });
    });
  });

  // Eventos de botones Anterior / Siguiente
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        updateView({ scroll: true });
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      const totalPages = Math.ceil(getMatchingCards().length / ITEMS_PER_PAGE);
      if (currentPage < totalPages) {
        currentPage++;
        updateView({ scroll: true });
      }
    });
  }

  // Render inicial
  updateView({ scroll: false });
}
