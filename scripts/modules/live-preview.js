// @ts-check
/**
 * Previsualización en vivo de los proyectos (LIVE-01).
 *
 * Cada tarjeta conserva su captura estática — es la que pinta el LCP, la que se ve mientras
 * el sitio carga y la que queda si algo falla. Encima se monta un <iframe> con el sitio real,
 * de modo que la landing muestra el estado actual del proyecto y no una foto envejecida.
 *
 * Las tarjetas que están en pantalla se muestran en vivo desde el primer momento, sin esperar
 * a que el puntero pase por encima. Como cada marco es un sitio completo, hay un tope de marcos
 * simultáneos: quedan vivas las tarjetas más cercanas al centro del viewport, y la que tiene el
 * puntero o el foco nunca se queda fuera del cupo.
 *
 * No se monta nada con `prefers-reduced-motion`, con `prefers-reduced-data`, con el ahorro de
 * datos del sistema, ni en las tarjetas marcadas con `data-live="off"` (sitios que rechazan ser
 * embebidos). El marco es decorativo: no recibe puntero ni foco, y la tarjeta sigue siendo un
 * enlace normal.
 */
import { finePointerQuery, saveDataQuery, reducedMotionQuery, frameThrottle } from './env.js';
import { query, queryAll } from './dom.js';

/** Ancho de escritorio que se simula dentro del marco antes de escalarlo a la tarjeta.
 *  El alto va fijado en el CSS a 900px (1440 / 1.6), la misma proporción 16/10 de .project-visual. */
const FRAME_WIDTH = 1440;
/** Marcos vivos a la vez. Cada uno es un sitio completo, así que el tope es el presupuesto. */
const CONCURRENT = { fino: 4, grueso: 2 };
/** Separación entre montajes: evita disparar varias cargas de sitio en el mismo instante. */
const MOUNT_STAGGER = 200;
/** Si el sitio no carga en este tiempo, se retira el marco y se queda la captura. */
const LOAD_TIMEOUT = 12000;
/** Se empieza a cargar un poco antes de que la tarjeta entre en pantalla. */
const PRELOAD_MARGIN = '20% 0px';
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

  // Con «reducir movimiento» tampoco se ofrece: dentro del marco corre el sitio real con
  // todas sus animaciones y no hay forma de silenciarlas desde fuera del documento embebido.
  if (dataSaver() || reducedMotionQuery.matches) {
    if (toggle) toggle.hidden = true;
    return;
  }

  let enabled = readPreference();
  /** Tarjetas con marco montado. @type {Map<LiveCard, { shell: HTMLElement, timer: number }>} */
  const live = new Map();
  /** Tarjetas dentro del viewport, o a punto de entrar. @type {Set<LiveCard>} */
  const visible = new Set();
  /** La que tiene el puntero encima o el foco. @type {LiveCard | null} */
  let hovered = null;
  /** @type {number | undefined} */
  let staggerTimer;

  const cupo = () => (finePointerQuery.matches ? CONCURRENT.fino : CONCURRENT.grueso);

  /** Escala el marco para que su ancho simulado ocupe exactamente el hueco de la tarjeta. */
  const rescale = (/** @type {LiveCard} */ item) => {
    item.visual.style.setProperty('--live-scale', String(item.visual.clientWidth / FRAME_WIDTH));
  };

  const resizeObserver = new ResizeObserver(entries => entries.forEach(entry => {
    const item = cards.find(candidate => candidate.visual === entry.target);
    if (item) rescale(item);
  }));

  const unmount = (/** @type {LiveCard} */ item) => {
    const entry = live.get(item);
    if (!entry) return;
    window.clearTimeout(entry.timer);
    live.delete(item);
    resizeObserver.unobserve(item.visual);
    entry.shell.remove();
    item.visual.classList.remove('is-live', 'is-live-ready');
    item.card.classList.remove('is-live-host');
  };

  const mount = (/** @type {LiveCard} */ item) => {
    if (live.has(item) || item.visual.dataset.liveFailed === 'true') return;

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
      // El sitio no respondió a tiempo, o rechazó el embebido: se vuelve a la captura y no se reintenta.
      item.visual.dataset.liveFailed = 'true';
      unmount(item);
    }, LOAD_TIMEOUT);

    frame.addEventListener('load', () => {
      window.clearTimeout(timer);
      if (live.has(item)) item.visual.classList.add('is-live-ready');
    });

    shell.append(frame);
    rescale(item);
    item.visual.append(shell);
    item.visual.classList.add('is-live');
    // La tarjeta anfitriona se marca para que el CSS congele su inclinación 3D donde resulta
    // cara: en táctil el scroll inclina todas las tarjetas visibles a la vez.
    item.card.classList.add('is-live-host');
    live.set(item, { shell, timer });
    resizeObserver.observe(item.visual);
  };

  /** Distancia de la tarjeta al centro del viewport; la señalada por el puntero manda. */
  const score = (/** @type {LiveCard} */ item) => {
    if (item === hovered) return -1;
    const box = item.card.getBoundingClientRect();
    return Math.abs(box.top + box.height / 2 - window.innerHeight / 2);
  };

  /** Decide qué tarjetas deben estar vivas y ajusta la diferencia. */
  const sync = frameThrottle(() => {
    window.clearTimeout(staggerTimer);
    if (!enabled) {
      [...live.keys()].forEach(unmount);
      return;
    }
    const elegidas = [...visible]
      .filter(item => item.visual.dataset.liveFailed !== 'true')
      .sort((a, b) => score(a) - score(b))
      .slice(0, cupo());

    // Primero se libera cupo y después se ocupa, así nunca se supera el tope.
    [...live.keys()].forEach(item => { if (!elegidas.includes(item)) unmount(item); });

    // Los montajes se escalonan para no lanzar varias cargas de sitio en el mismo frame.
    const pendientes = elegidas.filter(item => !live.has(item));
    const siguiente = () => {
      const item = pendientes.shift();
      if (!item) return;
      if (enabled && visible.has(item)) mount(item);
      if (pendientes.length) staggerTimer = window.setTimeout(siguiente, MOUNT_STAGGER);
    };
    siguiente();
  });

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const item = cards.find(candidate => candidate.card === entry.target);
      if (!item) return;
      if (entry.isIntersecting) {
        visible.add(item);
      } else {
        visible.delete(item);
        unmount(item);
      }
    });
    sync.run();
  }, { threshold: 0, rootMargin: PRELOAD_MARGIN });
  cards.forEach(item => observer.observe(item.card));

  // El puntero y el teclado solo cambian la prioridad: la tarjeta señalada nunca se queda fuera.
  cards.forEach(item => {
    const marcar = () => { hovered = item; sync.run(); };
    const desmarcar = () => { if (hovered === item) { hovered = null; sync.run(); } };
    item.card.addEventListener('pointerenter', marcar, { passive: true });
    item.card.addEventListener('focusin', marcar);
    item.card.addEventListener('pointerleave', desmarcar, { passive: true });
    item.card.addEventListener('focusout', event => {
      if (!item.card.contains(/** @type {Node | null} */ (event.relatedTarget))) desmarcar();
    });
  });

  window.addEventListener('scroll', sync.run, { passive: true });
  window.addEventListener('resize', sync.run, { passive: true });
  // Una pestaña en segundo plano no necesita mantener sitios ajenos cargados.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) [...live.keys()].forEach(unmount);
    else sync.run();
  });
  // Al filtrar proyectos cambian las tarjetas visibles.
  queryAll('.filter', HTMLButtonElement).forEach(filter =>
    filter.addEventListener('click', () => sync.run()));

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
    sync.run();
  });
  syncToggle();
  sync.run();
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
