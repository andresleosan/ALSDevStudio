// @ts-check
// Vuelo y saludo controlables; tecleo en proyectos/proceso y contacto de una sola entrada.
const initialized = new WeakSet();
const KINDS = new Set(['flight', 'projects', 'process', 'contact']);
const TYPING_KINDS = new Set(['projects', 'process']);

/** @typedef {'finished' | 'static'} FinalState */
/** @typedef {{scene: HTMLElement, actor: HTMLElement | null, kind: string, consumed: boolean,
 * inView: boolean, playing: boolean, remaining: number, userPaused: boolean,
 * toggle: HTMLButtonElement | null, toggleHandler: (() => void) | null,
 * clock: Animation | null, raf: number | null, copy: HTMLElement | null, typed: HTMLElement | null,
 * images: HTMLImageElement[], imageHandlers: Map<HTMLImageElement, {load: () => void, error: () => void}>,
 * animations: Map<Animation, {finish: () => void, cancel: () => void}>}} Scene */

export function initMascotScenes() {
  /** @type {Scene[]} */
  const scenes = [];
  const toggles = Array.from(document.querySelectorAll('button[data-mascot-toggle]'));
  document.querySelectorAll('[data-mascot-scene]').forEach(element => {
    if (!(element instanceof HTMLElement) || initialized.has(element)) return;
    initialized.add(element);
    element.dataset.mascotState = 'idle';
    const actor = element.querySelector('[data-mascot-actor]');
    const toggle = toggles.find(button => button instanceof HTMLButtonElement && !button.disabled &&
      element.id && button.dataset.mascotToggle === element.id &&
      button.getAttribute('aria-controls') === element.id && !element.contains(button));
    scenes.push({ scene: element, actor: actor instanceof HTMLElement ? actor : null,
      kind: element.dataset.mascotScene ?? '', consumed: false, inView: false,
      playing: false, remaining: 0, userPaused: false,
      toggle: toggle instanceof HTMLButtonElement ? toggle : null, toggleHandler: null,
      clock: null, raf: null, copy: null, typed: null, animations: new Map(),
      images: Array.from(element.querySelectorAll('img')), imageHandlers: new Map() });
  });
  if (!scenes.length) return;

  const reduced = typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  /** @type {IntersectionObserver | null} */
  let observer = null;
  let listening = false;

  const removeListeners = () => {
    observer?.disconnect();
    if (!listening) return;
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pagehide', onPageHide);
    window.removeEventListener('resize', onResize);
    reduced?.removeEventListener?.('change', onReducedMotion);
    reduced?.removeListener?.(onReducedMotion);
    listening = false;
  };
  const releaseWhenDone = () => {
    // Un vuelo pausado conserva sus efectos y necesita los listeners para poder volver.
    if (scenes.every(item => item.consumed && item.animations.size === 0)) removeListeners();
  };
  /** @param {Scene} item */
  const clearImageListeners = item => {
    for (const [image, handlers] of item.imageHandlers) {
      image.removeEventListener('load', handlers.load);
      image.removeEventListener('error', handlers.error);
    }
    item.imageHandlers.clear();
  };
  /** @param {Scene} item */
  const clearTyping = item => {
    if (item.raf !== null) window.cancelAnimationFrame(item.raf);
    item.raf = null;
    item.copy?.classList.remove('is-typing');
    if (item.typed) item.typed.textContent = '';
    item.copy = null;
    item.typed = null;
  };
  /** El CSS mantiene la pose y el contenido completos cuando se retiran los efectos.
   * @param {Scene} item @param {FinalState} state */
  const finalize = (item, state) => {
    item.consumed = true;
    item.playing = false;
    clearTyping(item);
    for (const [animation, handlers] of item.animations) {
      animation.removeEventListener('finish', handlers.finish);
      animation.removeEventListener('cancel', handlers.cancel);
      animation.cancel();
    }
    item.animations.clear();
    item.clock = null;
    clearImageListeners(item);
    item.remaining = 0;
    if (item.toggle) {
      if (item.toggleHandler) item.toggle.removeEventListener('click', item.toggleHandler);
      item.toggle.hidden = true;
    }
    item.toggleHandler = null;
    item.scene.classList.remove('is-playing');
    item.scene.dataset.mascotState = state;
    observer?.unobserve(item.scene);
    releaseWhenDone();
  };
  /** Espera imágenes sin consumir la escena ni añadir timers/promesas.
   * @param {Scene} item @returns {boolean} */
  const imagesReady = item => {
    if (item.images.some(image => image.complete && image.naturalWidth === 0)) {
      finalize(item, 'static');
      return false;
    }
    if (item.images.every(image => image.complete && image.naturalWidth > 0)) {
      clearImageListeners(item);
      return true;
    }
    item.images.forEach(image => {
      if (image.complete || item.imageHandlers.has(image)) return;
      const load = () => {
        const handlers = item.imageHandlers.get(image);
        if (!handlers) return;
        image.removeEventListener('load', handlers.load);
        image.removeEventListener('error', handlers.error);
        item.imageHandlers.delete(image);
        if (!item.consumed && item.inView && !document.hidden) play(item);
      };
      const error = () => { if (!item.consumed) finalize(item, 'static'); };
      item.imageHandlers.set(image, { load, error });
      image.addEventListener('load', load, { once: true });
      image.addEventListener('error', error, { once: true });
    });
    return false;
  };
  const isCompact = () => {
    const connection = /** @type {{saveData?: boolean} | undefined} */ (
      /** @type {any} */ (navigator).connection
    );
    return window.matchMedia('(max-width: 680px)').matches ||
      window.matchMedia('(pointer: coarse)').matches ||
      window.matchMedia('(prefers-reduced-data: reduce)').matches || connection?.saveData === true;
  };
  /** @param {Scene} item @param {Element | null} element @param {Keyframe[]} frames
   * @param {number} duration @param {KeyframeAnimationOptions} [options] @returns {Animation | null} */
  const animate = (item, element, frames, duration, options = {}) => {
    if (!element) return null;
    const animation = element.animate(frames, {
      duration, iterations: 1, fill: 'both',
      easing: item.kind === 'flight' ? 'linear' : 'cubic-bezier(.22,1,.36,1)', ...options,
    });
    const finish = () => {
      if (!item.playing) return;
      animation.removeEventListener('finish', finish);
      animation.removeEventListener('cancel', cancel);
      item.remaining -= 1;
      if (item.remaining === 0) finalize(item, 'finished');
    };
    const cancel = () => { if (item.animations.size) finalize(item, 'static'); };
    item.animations.set(animation, { finish, cancel });
    item.remaining += 1;
    animation.addEventListener('finish', finish);
    animation.addEventListener('cancel', cancel);
    // Eventos poseen el ciclo de vida: no se leen .finished/.ready ni se crean promesas.
    return animation;
  };
  /** @param {Scene} item @param {boolean} compact @returns {Keyframe[]} */
  const flightFrames = (item, compact) => {
    const actor = item.actor;
    if (!actor) return [];
    const width = item.scene.clientWidth;
    const left = compact ? -28 : -actor.offsetLeft - actor.offsetWidth;
    const center = compact ? 0 : (width - actor.offsetWidth) / 2 - actor.offsetLeft;
    const right = compact ? 28 : width - actor.offsetLeft + actor.offsetWidth;
    const crest = compact ? -4 : -8;
    return [
      { transform: `translate3d(${left}px,0,0) rotate(-2deg)`, opacity: 0, offset: 0 },
      { transform: `translate3d(${left}px,0,0) rotate(-2deg)`, opacity: 1, offset: .03 },
      { transform: `translate3d(${center}px,${crest}px,0) rotate(0deg)`, opacity: 1, offset: .27 },
      { transform: `translate3d(${center}px,${crest}px,0) rotate(0deg)`, opacity: 1, offset: .72 },
      { transform: `translate3d(${right}px,0,0) rotate(2deg)`, opacity: 1, offset: .9 },
      { transform: `translate3d(${right}px,0,0) rotate(2deg)`, opacity: 0, offset: .97 },
      { transform: `translate3d(${left}px,0,0) rotate(-2deg)`, opacity: 0, offset: 1 },
    ];
  };
  /** @param {boolean} compact @returns {Keyframe[]} */
  const trailFrames = compact => [
    { opacity: 0, offset: 0 }, { opacity: compact ? .25 : .6, offset: .16 },
    { opacity: 0, offset: .27 }, { opacity: 0, offset: .72 },
    { opacity: compact ? .25 : .6, offset: .8 }, { opacity: 0, offset: .97 }, { opacity: 0, offset: 1 },
  ];
  /** @param {Scene} item */
  const syncFlight = item => {
    if (!item.animations.size) return;
    const active = item.inView && !document.hidden && !item.userPaused && !reduced?.matches;
    try {
      for (const animation of item.animations.keys()) {
        if (active) animation.play();
        else animation.pause();
      }
      item.playing = active;
      item.scene.classList.toggle('is-playing', active);
      item.scene.dataset.mascotState = active ? 'playing' : 'paused';
      if (item.toggle) {
        const label = item.userPaused ? 'Reanudar animación de Sarin' : 'Pausar animación de Sarin';
        item.toggle.setAttribute('aria-label', label);
        item.toggle.setAttribute('title', label);
        item.toggle.dataset.paused = String(item.userPaused);
      }
    } catch {
      finalize(item, 'static');
    }
  };
  /** @param {Scene} item @param {HTMLElement} copy @param {HTMLElement} full
   * @param {HTMLElement} typed @param {Animation} clock */
  const startTyping = (item, copy, full, typed, clock) => {
    const characters = Array.from(full.textContent ?? '');
    let lastIndex = -1;
    item.copy = copy;
    item.typed = typed;
    typed.textContent = '';
    const tick = () => {
      item.raf = null;
      if (!item.playing || !item.clock) return;
      try {
        const time = clock.currentTime;
        if (time === null && clock.pending) {
          item.raf = window.requestAnimationFrame(tick);
          return;
        }
        if (typeof time !== 'number' || !Number.isFinite(time)) {
          finalize(item, 'static');
          return;
        }
        const progress = Math.max(0, Math.min(1, (time / 3000 - .08) / .8));
        const index = Math.floor(progress * characters.length);
        if (index !== lastIndex) {
          typed.textContent = characters.slice(0, index).join('');
          lastIndex = index;
        }
        if (time < 3000) item.raf = window.requestAnimationFrame(tick);
      } catch {
        finalize(item, 'static');
      }
    };
    // El overlay, su copia y el reloj están preparados antes de ocultar visualmente el full.
    item.raf = window.requestAnimationFrame(tick);
    copy.classList.add('is-typing');
  };
  /** @param {Scene} item */
  const play = item => {
    if (item.consumed || document.hidden || !item.inView) return;
    if (reduced?.matches || !item.actor || !KINDS.has(item.kind)) {
      finalize(item, 'static');
      return;
    }
    /** @param {string} name */
    const part = name => item.scene.querySelector(`[data-mascot-part="${name}"]`);
    const copy = part('window');
    const full = copy?.querySelector('[data-mascot-copy-full]');
    const typed = copy?.querySelector('[data-mascot-copy-typed]');
    if (item.kind === 'flight' && (!item.toggle || !part('flying') || !part('landed') || !(part('greeting') instanceof HTMLElement)) ||
        TYPING_KINDS.has(item.kind) && (!(copy instanceof HTMLElement) || !(full instanceof HTMLElement) ||
          !(typed instanceof HTMLElement) || typed.getAttribute('aria-hidden') !== 'true' ||
          !part('typing-a') || !part('typing-b') || typeof window.requestAnimationFrame !== 'function' ||
          typeof window.cancelAnimationFrame !== 'function')) {
      finalize(item, 'static');
      return;
    }
    if (!imagesReady(item)) return;
    // Consumir antes de crear los efectos evita reinicios por entradas consecutivas del observer.
    item.consumed = true;
    item.playing = true;
    item.scene.dataset.mascotState = 'playing';
    item.scene.classList.add('is-playing');
    const compact = isCompact();
    try {
      if (item.kind === 'flight') {
        const duration = compact ? 8000 : 8800;
        const options = { iterations: Infinity };
        item.clock = animate(item, item.actor, flightFrames(item, compact), duration, options);
        animate(item, part('flying'), [
          { opacity: 1, offset: 0 }, { opacity: 1, offset: .26 },
          { opacity: 0, offset: .27 }, { opacity: 0, offset: .72 },
          { opacity: 1, offset: .74 }, { opacity: 1, offset: 1 },
        ], duration, options);
        animate(item, part('landed'), [
          { opacity: 0, transform: 'rotate(0deg)', offset: 0 },
          { opacity: 0, transform: 'rotate(0deg)', offset: .26 },
          { opacity: 1, transform: 'rotate(0deg)', offset: .27 },
          { opacity: 1, transform: 'rotate(-4deg)', offset: .35 },
          { opacity: 1, transform: 'rotate(4deg)', offset: .43 },
          { opacity: 1, transform: 'rotate(-4deg)', offset: .51 },
          { opacity: 1, transform: 'rotate(4deg)', offset: .59 },
          { opacity: 1, transform: 'rotate(0deg)', offset: .67 },
          { opacity: 1, transform: 'rotate(0deg)', offset: .72 },
          { opacity: 0, transform: 'rotate(0deg)', offset: .74 },
          { opacity: 0, transform: 'rotate(0deg)', offset: 1 },
        ], duration, options);
        animate(item, part('greeting'), [
          { opacity: 0, offset: 0, easing: 'steps(1,end)' },
          { opacity: 1, offset: .29 },
          { opacity: 1, offset: .7, easing: 'steps(1,start)' },
          { opacity: 0, offset: .72 }, { opacity: 0, offset: 1 },
        ], duration, options);
        animate(item, part('trail'), trailFrames(compact), duration, options);
        if (item.toggle) {
          item.toggleHandler = () => { item.userPaused = !item.userPaused; syncFlight(item); };
          item.toggle.addEventListener('click', item.toggleHandler);
          item.toggle.hidden = false;
        }
        syncFlight(item);
      } else if (TYPING_KINDS.has(item.kind)) {
        item.clock = animate(item, item.actor, [
          { transform: 'rotate(0deg)', offset: 0 },
          { transform: 'rotate(0deg)', offset: 1 },
        ], 3000, { easing: 'linear' });
        for (const name of ['typing-a', 'typing-b']) {
          const first = name === 'typing-a' ? 1 : 0;
          animate(item, part(name), [
            { opacity: first, offset: 0, easing: 'steps(1,end)' },
            { opacity: 1 - first, offset: .5, easing: 'steps(1,end)' },
            { opacity: first, offset: 1 },
          ], 280, { delay: 240, iterations: 9, easing: 'linear' });
        }
        if (item.clock && copy instanceof HTMLElement && full instanceof HTMLElement && typed instanceof HTMLElement) {
          startTyping(item, copy, full, typed, item.clock);
        }
      } else {
        const duration = compact ? 2200 : 2400;
        animate(item, item.actor, [
          { transform: 'rotate(0deg)', offset: 0 }, { transform: 'rotate(2deg)', offset: .4 },
          { transform: 'rotate(2deg)', offset: .65 }, { transform: 'rotate(0deg)', offset: 1 },
        ], duration);
        animate(item, part('window'), [
          { opacity: 0, transform: `translateY(${compact ? 6 : 12}px)`, offset: 0 },
          { opacity: 1, transform: 'translateY(0)', offset: .4 },
          { opacity: 1, transform: 'translateY(0)', offset: 1 },
        ], duration);
        item.scene.querySelectorAll('[data-mascot-part="line"]').forEach((line, index) => {
          const phase = Math.min(index, 2);
          animate(item, line, [
            { opacity: 1, offset: 0 }, { opacity: .4, offset: .24 + phase * .16 },
            { opacity: 1, offset: .38 + phase * .16 }, { opacity: .65, offset: .65 + phase * .1 },
            { opacity: 1, offset: 1 },
          ], duration);
        });
      }
    } catch {
      finalize(item, 'static');
    }
  };

  function onReducedMotion() {
    if (reduced?.matches) scenes.forEach(item => finalize(item, 'static'));
  }
  function onVisibility() {
    scenes.forEach(item => {
      if (item.kind === 'flight' && item.animations.size) syncFlight(item);
      else if (document.hidden && item.playing) finalize(item, 'finished');
      else if (!document.hidden && item.inView && !item.consumed) play(item);
    });
  }
  function onResize() {
    scenes.forEach(item => {
      if (TYPING_KINDS.has(item.kind) && item.playing) finalize(item, 'finished');
      if (item.kind !== 'flight' || !item.clock || !item.animations.size) return;
      const compact = isCompact();
      const duration = compact ? 8000 : 8800;
      try {
        const previousDuration = Number(item.clock.effect?.getTiming().duration);
        const time = typeof item.clock.currentTime === 'number' ? item.clock.currentTime : 0;
        const phase = previousDuration > 0 ? time / previousDuration : 0;
        for (const animation of item.animations.keys()) {
          const effect = /** @type {KeyframeEffect | null} */ (animation.effect);
          if (!effect) continue;
          if (animation === item.clock) effect.setKeyframes(flightFrames(item, compact));
          else if (effect.target instanceof HTMLElement && effect.target.dataset.mascotPart === 'trail') {
            effect.setKeyframes(trailFrames(compact));
          }
          effect.updateTiming({ duration });
          animation.currentTime = phase * duration;
        }
        syncFlight(item);
      } catch {
        finalize(item, 'static');
      }
    });
  }
  function onPageHide() {
    scenes.forEach(item => { if (!item.consumed || item.animations.size) finalize(item, 'finished'); });
    removeListeners();
  }

  if (!reduced || reduced.matches || typeof Element.prototype.animate !== 'function' ||
      typeof window.IntersectionObserver !== 'function') {
    scenes.forEach(item => finalize(item, 'static'));
    return;
  }
  try {
    observer = new IntersectionObserver(entries => entries.forEach(entry => {
      const item = scenes.find(candidate => candidate.scene === entry.target);
      if (!item) return;
      item.inView = entry.isIntersecting && entry.intersectionRatio >= .3;
      if (item.kind === 'flight' && item.animations.size) syncFlight(item);
      else if (!entry.isIntersecting && item.playing) finalize(item, 'finished');
      else if (item.inView && !item.consumed) play(item);
    }), { threshold: [0, .3] });
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('resize', onResize);
    if (typeof reduced.addEventListener === 'function') reduced.addEventListener('change', onReducedMotion);
    else reduced.addListener?.(onReducedMotion);
    listening = true;
    scenes.forEach(item => {
      const missingTypingApi = TYPING_KINDS.has(item.kind) &&
        (typeof window.requestAnimationFrame !== 'function' || typeof window.cancelAnimationFrame !== 'function');
      const missingFlightPart = item.kind === 'flight' && (!item.toggle ||
        !(item.scene.querySelector('[data-mascot-part="greeting"]') instanceof HTMLElement));
      if (!item.actor || !KINDS.has(item.kind) || missingFlightPart || missingTypingApi) {
        finalize(item, 'static');
      }
      else observer?.observe(item.scene);
    });
  } catch {
    scenes.forEach(item => finalize(item, 'static'));
    removeListeners();
  }
}
