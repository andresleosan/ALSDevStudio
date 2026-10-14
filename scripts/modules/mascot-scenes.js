// @ts-check
// Escenas decorativas de Sarin: una entrada por zona y regreso al final definido por CSS.
const initialized = new WeakSet();
const KINDS = new Set(['flight', 'projects', 'contact']);

/** @typedef {'finished' | 'static'} FinalState */
/** @typedef {{scene: HTMLElement, actor: Element | null, kind: string, consumed: boolean,
 * inView: boolean, playing: boolean, remaining: number,
 * images: HTMLImageElement[], imageHandlers: Map<HTMLImageElement, {load: () => void, error: () => void}>,
 * animations: Map<Animation, {finish: () => void, cancel: () => void}>}} Scene */

export function initMascotScenes() {
  /** @type {Scene[]} */
  const scenes = [];
  document.querySelectorAll('[data-mascot-scene]').forEach(element => {
    if (!(element instanceof HTMLElement) || initialized.has(element)) return;
    initialized.add(element);
    element.dataset.mascotState = 'idle';
    scenes.push({ scene: element, actor: element.querySelector('[data-mascot-actor]'),
      kind: element.dataset.mascotScene ?? '', consumed: false, inView: false,
      playing: false, remaining: 0, animations: new Map(),
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
    reduced?.removeEventListener?.('change', onReducedMotion);
    reduced?.removeListener?.(onReducedMotion);
    listening = false;
  };
  const releaseWhenDone = () => {
    if (scenes.every(item => item.consumed && !item.playing)) removeListeners();
  };
  /** @param {Scene} item */
  const clearImageListeners = item => {
    for (const [image, handlers] of item.imageHandlers) {
      image.removeEventListener('load', handlers.load);
      image.removeEventListener('error', handlers.error);
    }
    item.imageHandlers.clear();
  };

  /** Libera efectos y listeners; el CSS ya mantiene poses y contenido finales visibles.
   * @param {Scene} item @param {FinalState} state */
  const finalize = (item, state) => {
    item.consumed = true;
    item.playing = false;
    for (const [animation, handlers] of item.animations) {
      animation.removeEventListener('finish', handlers.finish);
      animation.removeEventListener('cancel', handlers.cancel);
      animation.cancel();
    }
    item.animations.clear();
    clearImageListeners(item);
    item.remaining = 0;
    item.scene.classList.remove('is-playing');
    item.scene.dataset.mascotState = state;
    observer?.unobserve(item.scene);
    releaseWhenDone();
  };

  /** Espera las imágenes sin consumir la escena ni añadir timers/promesas.
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

  /** @param {Scene} item @param {Element | null} element @param {Keyframe[]} frames @param {number} duration */
  const animate = (item, element, frames, duration) => {
    if (!element) return;
    const animation = element.animate(frames, {
      duration, iterations: 1, fill: 'both',
      easing: item.kind === 'flight' ? 'linear' : 'cubic-bezier(.22,1,.36,1)',
    });
    const finish = () => {
      if (!item.playing) return;
      animation.removeEventListener('finish', finish);
      animation.removeEventListener('cancel', cancel);
      item.remaining -= 1;
      if (item.remaining === 0) finalize(item, 'finished');
    };
    const cancel = () => { if (item.playing) finalize(item, 'finished'); };
    item.animations.set(animation, { finish, cancel });
    item.remaining += 1;
    animation.addEventListener('finish', finish);
    animation.addEventListener('cancel', cancel);
    // No se leen .finished/.ready ni se crean promesas: los eventos poseen el ciclo de vida.
  };

  /** @param {Scene} item */
  const play = item => {
    if (item.consumed || document.hidden) return;
    if (reduced?.matches || !item.actor || !KINDS.has(item.kind)) {
      finalize(item, 'static');
      return;
    }
    if (!imagesReady(item)) return;
    // Consumir justo antes de crear efectos impide dobles entradas y reinicios tras cancelar.
    item.consumed = true;
    const connection = /** @type {{saveData?: boolean} | undefined} */ (
      /** @type {any} */ (navigator).connection
    );
    const compact = window.matchMedia('(max-width: 680px)').matches ||
      window.matchMedia('(pointer: coarse)').matches ||
      window.matchMedia('(prefers-reduced-data: reduce)').matches || connection?.saveData === true;
    const duration = compact ? 2200 : item.kind === 'flight' ? 2600 : item.kind === 'projects' ? 2500 : 2400;
    /** @param {string} name */
    const part = name => item.scene.querySelector(`[data-mascot-part="${name}"]`);
    item.playing = true;
    item.scene.dataset.mascotState = 'playing';
    item.scene.classList.add('is-playing');
    try {
      if (item.kind === 'flight') {
        const distance = compact ? Math.min(32, item.scene.clientWidth * .1) : item.scene.clientWidth;
        animate(item, item.actor, [
          { transform: `translate3d(${-distance}px,0,0) rotate(${compact ? -2 : -7}deg)`, offset: 0 },
          { transform: `translate3d(${-distance * .48}px,${compact ? -4 : -8}px,0) rotate(2deg)`, offset: .46 },
          { transform: 'translate3d(-8px,-4px,0) rotate(-1deg)', offset: .82 },
          { transform: 'translate3d(0,0,0) rotate(0deg)', offset: 1 },
        ], duration);
        animate(item, part('flying'), [
          { opacity: 1, offset: 0 }, { opacity: 1, offset: .74 },
          { opacity: 0, offset: .91 }, { opacity: 0, offset: 1 },
        ], duration);
        animate(item, part('landed'), [
          { opacity: 0, offset: 0 }, { opacity: 0, offset: .74 },
          { opacity: 1, offset: .91 }, { opacity: 1, offset: 1 },
        ], duration);
        animate(item, part('trail'), [
          { opacity: 0, transform: 'translateX(-8px)', offset: 0 },
          { opacity: compact ? .25 : .6, transform: 'translateX(0)', offset: .25 },
          { opacity: 0, transform: 'translateX(8px)', offset: .84 },
          { opacity: 0, transform: 'translateX(0)', offset: 1 },
        ], duration);
      } else if (item.kind === 'projects') {
        animate(item, item.actor, [
          { opacity: 0, transform: `translateY(${compact ? 8 : 18}px) rotate(-3deg)`, offset: 0 },
          { opacity: 1, transform: 'translateY(0) rotate(3deg)', offset: .32 },
          { opacity: 1, transform: 'translateY(0) rotate(-2deg)', offset: .7 },
          { opacity: 1, transform: 'translateY(0) rotate(0deg)', offset: 1 },
        ], duration);
        animate(item, part('window'), [
          { opacity: 0, transform: `translate(${compact ? -6 : -14}px,8px) scale(.94)`, offset: 0 },
          { opacity: 1, transform: 'translate(0,0) scale(1)', offset: .5 },
          { opacity: 1, transform: 'translate(0,0) scale(1)', offset: 1 },
        ], duration);
        animate(item, part('pointer'), [
          { opacity: 0, transform: 'translate(10px,12px) scale(1)', offset: 0 },
          { opacity: 0, transform: 'translate(10px,12px) scale(1)', offset: .36 },
          { opacity: 1, transform: 'translate(0,0) scale(1)', offset: .58 },
          { opacity: 1, transform: 'translate(-3px,-2px) scale(.9)', offset: .8 },
          { opacity: 1, transform: 'translate(0,0) scale(1)', offset: 1 },
        ], duration);
      } else {
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
      // Una implementación parcial de WAAPI tampoco deja efectos ni una pose escondida.
      finalize(item, 'static');
    }
  };

  function onReducedMotion() {
    if (reduced?.matches) scenes.forEach(item => finalize(item, 'static'));
  }
  function onVisibility() {
    scenes.forEach(item => {
      if (document.hidden && item.playing) finalize(item, 'finished');
      else if (!document.hidden && item.inView && !item.consumed) play(item);
    });
  }
  function onPageHide() {
    scenes.forEach(item => { if (!item.consumed || item.playing) finalize(item, 'finished'); });
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
      if (!entry.isIntersecting && item.playing) finalize(item, 'finished');
      else if (item.inView && !item.consumed) play(item);
    }), { threshold: [0, .3] });
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    if (typeof reduced.addEventListener === 'function') reduced.addEventListener('change', onReducedMotion);
    else reduced.addListener?.(onReducedMotion);
    listening = true;
    scenes.forEach(item => {
      if (!item.actor || !KINDS.has(item.kind)) finalize(item, 'static');
      else observer?.observe(item.scene);
    });
  } catch {
    scenes.forEach(item => finalize(item, 'static'));
    removeListeners();
  }
}
