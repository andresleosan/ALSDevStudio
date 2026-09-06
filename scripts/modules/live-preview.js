// @ts-check
/**
 * Previsualización en vivo de los proyectos (LIVE-01).
 *
 * Cada tarjeta conserva su captura estática — es la que pinta el LCP y la que se ve si algo falla.
 * Encima, bajo demanda, se monta un <iframe> con el sitio real para que lo que muestra la landing
 * sea el estado actual del proyecto y no una foto envejecida.
 *
 * - Escritorio (puntero fino): se monta al pasar el puntero o al enfocar la tarjeta con el teclado.
 * - Táctil: se monta en la tarjeta más centrada del viewport, una sola a la vez.
 * - Nunca se monta con `prefers-reduced-data`, con el ahorro de datos del sistema activo,
 *   ni en las tarjetas marcadas con `data-live="off"` (sitios que rechazan ser embebidos).
 *
 * El iframe es decorativo: no recibe puntero ni foco, y la tarjeta sigue siendo un enlace normal.
 */
import { finePointerQuery, coarsePointerQuery, saveDataQuery, reducedMotionQuery, frameThrottle, clamp } from './env.js';
import { query, queryAll } from './dom.js';

/** Ancho de escritorio que se simula dentro del iframe antes de escalarlo a la tarjeta.
 *  El alto va fijado en el CSS a 900px (1440 / 1.6), la misma proporción 16/10 de .project-visual. */
const FRAME_WIDTH = 1440;
/** Si el sitio no carga en este tiempo, se retira el iframe y se queda la captura. */
const LOAD_TIMEOUT = 9000;
/** Cuánto tiene que estar visible una tarjeta para considerarla candidata en táctil. */
const VISIBILITY_THRESHOLD = 0.55;
/** Clave de la preferencia de la persona. */
const STORAGE_KEY = 'als:live-preview:v1';

/** @typedef {{ card: HTMLAnchorElement, visual: HTMLElement, name: string, url: string }} LiveCard */

export function initLivePreview() {
  const toggle = query('[data-live-toggle]', HTMLButtonElement);
  const cards = queryAll('.project-card', HTMLAnchorElement)
    .filter(card => card.dataset.live !== 'off' && card.href.startsWith('https://'))
    .map(card => {
      const visual = query('.project-visual', HTMLElement, card);
      const name = query('.project-body h3', HTMLElement, card)?.textContent?.trim() ?? 'el proyecto';
      return visual ? { card, visual, name, url: card.href } : null;
    })
    .filter(/** @returns {item is LiveCard} */ item => item !== null);

  if (!cards.length) {
    if (toggle) toggle.hidden = true;
    return;
  }

  /** El sistema pide ahorrar datos: la vista en vivo no se ofrece siquiera. */
  const dataSaver = () => {
    const connection = /** @type {{ saveData?: boolean } | undefined} */ (
      /** @type {any} */ (navigator).connection
    );
    return saveDataQuery.matches || connection?.saveData === true;
  };

  // Con «reducir movimiento» tampoco se ofrece: dentro del iframe corre el sitio real con
  // todas sus animaciones y no hay forma de silenciarlas desde fuera del documento embebido.
  if (dataSaver() || reducedMotionQuery.matches) {
    if (toggle) toggle.hidden = true;
    return;
  }

  let enabled = readPreference();
  /** @type {LiveCard | null} */
  let mounted = null;

  /** Escala el iframe para que su ancho simulado ocupe exactamente el hueco de la tarjeta. */
  const rescale = (/** @type {LiveCard} */ item) => {
    item.visual.style.setProperty('--live-scale', String(item.visual.clientWidth / FRAME_WIDTH));
  };

  const resizeObserver = new ResizeObserver(entries => entries.forEach(entry => {
    const item = cards.find(candidate => candidate.visual === entry.target);
    if (item) rescale(item);
  }));

  const unmount = () => {
    if (!mounted) return;
    const item = mounted;
    mounted = null;
    resizeObserver.unobserve(item.visual);
    item.visual.classList.remove('is-live', 'is-live-ready');
    item.card.classList.remove('is-live-host');
    query('.project-live', HTMLElement, item.visual)?.remove();
    delete item.visual.dataset.liveState;
  };

  const mount = (/** @type {LiveCard} */ item) => {
    if (!enabled || mounted === item) return;
    if (item.visual.dataset.liveFailed === 'true') return;
    unmount();
    mounted = item;

    const shell = document.createElement('div');
    shell.className = 'project-live';
    // Decorativo: ni el puntero ni el lector de pantalla ni el tabulador entran aquí.
    shell.setAttribute('aria-hidden', 'true');
    shell.inert = true;

    const frame = document.createElement('iframe');
    frame.className = 'project-live-frame';
    frame.src = item.url;
    frame.title = `Vista en vivo de ${item.name}`;
    frame.loading = 'lazy';
    frame.tabIndex = -1;
    // Sin navegación de la ventana superior, sin popups, sin descargas ni modales.
    frame.setAttribute('sandbox', 'allow-scripts allow-same-origin');
    // Sin permisos de dispositivo dentro del marco.
    frame.setAttribute('allow', '');
    frame.setAttribute('referrerpolicy', 'no-referrer');
    frame.setAttribute('scrolling', 'no');

    const timer = window.setTimeout(() => {
      // El sitio no respondió a tiempo (o rechazó el embebido): se vuelve a la captura y no se reintenta.
      item.visual.dataset.liveFailed = 'true';
      if (mounted === item) unmount();
    }, LOAD_TIMEOUT);

    frame.addEventListener('load', () => {
      window.clearTimeout(timer);
      if (mounted === item) item.visual.classList.add('is-live-ready');
    });

    shell.append(frame);
    rescale(item);
    item.visual.append(shell);
    item.visual.classList.add('is-live');
    // La tarjeta anfitriona se marca para congelar su inclinación 3D: transformar en 3D un
    // ancestro del iframe obliga a re-rasterizar el documento anidado en cada frame.
    item.card.classList.add('is-live-host');
    resizeObserver.observe(item.visual);
  };

  // --- Escritorio: la tarjeta bajo el puntero o con el foco ---
  if (finePointerQuery.matches) {
    cards.forEach(item => {
      item.card.addEventListener('pointerenter', () => mount(item));
      item.card.addEventListener('focusin', () => mount(item));
      item.card.addEventListener('pointerleave', () => { if (mounted === item) unmount(); });
      item.card.addEventListener('focusout', event => {
        if (mounted === item && !item.card.contains(/** @type {Node | null} */ (event.relatedTarget))) unmount();
      });
    });
  }

  // --- Táctil: una sola tarjeta viva, la más cercana al centro del viewport ---
  /** @type {Set<LiveCard>} */
  const visible = new Set();

  const pickCentered = frameThrottle(() => {
    if (!enabled || !coarsePointerQuery.matches) return;
    const center = window.innerHeight / 2;
    /** @type {LiveCard | null} */
    let best = null;
    let bestDistance = Infinity;
    visible.forEach(item => {
      if (item.visual.dataset.liveFailed === 'true') return;
      const box = item.card.getBoundingClientRect();
      const distance = Math.abs(box.top + box.height / 2 - center);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = item;
      }
    });
    // Solo se monta si de verdad está en la banda central; si no, se descarga para no gastar datos.
    if (best && bestDistance < clamp(window.innerHeight * 0.4, 160, 420)) mount(best);
    else unmount();
  });

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const item = cards.find(candidate => candidate.card === entry.target);
      if (!item) return;
      if (entry.isIntersecting && entry.intersectionRatio >= VISIBILITY_THRESHOLD) visible.add(item);
      else visible.delete(item);
    });
    pickCentered.run();
  }, { threshold: [0, VISIBILITY_THRESHOLD, 1] });
  cards.forEach(item => observer.observe(item.card));

  window.addEventListener('scroll', pickCentered.run, { passive: true });
  window.addEventListener('resize', pickCentered.run, { passive: true });
  // Una pestaña en segundo plano no necesita mantener un sitio ajeno cargado.
  document.addEventListener('visibilitychange', () => { if (document.hidden) unmount(); });

  // --- Interruptor visible ---
  const syncToggle = () => {
    if (!toggle) return;
    toggle.hidden = false;
    toggle.setAttribute('aria-pressed', String(enabled));
    const text = query('[data-live-toggle-text]', HTMLElement, toggle);
    if (text) text.textContent = enabled ? 'Vista en vivo' : 'Vista estática';
    toggle.setAttribute('aria-label', enabled
      ? 'Desactivar la vista en vivo de los proyectos'
      : 'Activar la vista en vivo de los proyectos');
  };

  toggle?.addEventListener('click', () => {
    enabled = !enabled;
    writePreference(enabled);
    syncToggle();
    if (enabled) pickCentered.run();
    else unmount();
  });
  syncToggle();
  pickCentered.run();
}

/** Lee la preferencia guardada; por defecto la vista en vivo está activa. */
function readPreference() {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'off';
  } catch {
    return true;
  }
}

/** @param {boolean} value */
function writePreference(value) {
  try {
    localStorage.setItem(STORAGE_KEY, value ? 'on' : 'off');
  } catch {
    // Almacenamiento bloqueado: la preferencia dura lo que la sesión.
  }
}
