// @ts-check
/**
 * Navegación: enlace activo por sección, barra de progreso de scroll, menú móvil y año del footer.
 */
import { desktopQuery } from './env.js';
import { query, queryAll } from './dom.js';

export function initNav() {
  const links = queryAll('.nav-links a', HTMLAnchorElement);
  const sections = queryAll('main section[id]', HTMLElement);
  const shell = query('.nav-shell', HTMLElement);
  const root = document.documentElement;

  const activeObserver = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    links.forEach(link => link.classList.toggle('is-active', link.getAttribute('href') === `#${entry.target.id}`));
  }), { rootMargin: '-35% 0px -55% 0px' });
  sections.forEach(section => activeObserver.observe(section));

  const updateScrollState = () => {
    const scrollMax = Math.max(1, root.scrollHeight - window.innerHeight);
    const progress = Math.min(1, Math.max(0, window.scrollY / scrollMax));
    root.style.setProperty('--scroll-progress', progress.toFixed(4));
    shell?.classList.toggle('is-scrolled', window.scrollY > 18);
  };
  window.addEventListener('scroll', updateScrollState, { passive: true });
  updateScrollState();

  const year = query('#year', HTMLElement);
  if (year) year.textContent = String(new Date().getFullYear());

  initMobileMenu();
}

function initMobileMenu() {
  const toggle = query('.nav-menu-toggle', HTMLButtonElement);
  const menu = query('#mobile-menu', HTMLElement);
  if (!toggle || !menu) return;
  const icon = query('.nav-menu-toggle-icon', HTMLElement, toggle);
  const links = queryAll('a', HTMLAnchorElement, menu);

  /** @param {boolean} open */
  const setOpen = open => {
    menu.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    if (icon) icon.textContent = open ? '×' : '+';
    if (open) links[0]?.focus();
  };

  menu.hidden = true;
  toggle.addEventListener('click', () => setOpen(menu.hidden));
  links.forEach(link => link.addEventListener('click', () => setOpen(false)));
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || menu.hidden) return;
    setOpen(false);
    toggle.focus();
  });
  document.addEventListener('click', event => {
    if (menu.hidden || !(event.target instanceof Node)) return;
    if (!menu.contains(event.target) && !toggle.contains(event.target)) setOpen(false);
  });
  desktopQuery.addEventListener('change', event => { if (event.matches) setOpen(false); });
}
