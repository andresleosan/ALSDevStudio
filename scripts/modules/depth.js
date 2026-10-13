// @ts-check
// reduced-motion desactiva la profundidad; en gama baja se limitan sus efectos.
import {
  pointerDepthEnabled,
  touchDepthEnabled,
  frameThrottle,
  clamp,
  lowTierDevice,
  onMediaChange,
  finePointerQuery,
  coarsePointerQuery,
  reducedMotionQuery,
  mobileQuery,
} from './env.js';
import { query, queryAll, relativePointer } from './dom.js';

/** Elementos que se inclinan y su ángulo máximo en grados. */
const TILT_TARGETS = [
  ['.global-map-wrap', 3],
];

const HERO_TILT = { x: 9, y: 12, orbit: 24, scroll: 8, gyro: 10 };

/** Giroscopio: suavizado, deriva del punto neutro, zona muerta y recorrido útil (grados). */
const GYRO = { smooth: 0.16, drift: 0.0015, deadzone: 1.2, range: 26 };

/** Pulsación táctil: proporción del ángulo máximo y holgura antes de tratarlo como scroll. */
const PRESS = { ratio: 0.8, slop: 10 };

/** Margen del observador: la tarjeta llega ya inclinada al borde de la pantalla. */
const TILT_MARGIN = '15% 0px';

/** Variables inline que puede dejar cualquiera de los dos modos. */
const SCENE_VARS = [
  '--rx', '--ry', '--tilt-x', '--tilt-y',
  '--orbit-x', '--orbit-y', '--glare-x', '--glare-y',
  '--mag-x', '--mag-y',
];

/** @typedef {{ element: HTMLElement, max: number }} TiltTarget */
/** @typedef {{ center: number, top: number, left: number, width: number, height: number }} Metrics */

export function initDepth() {
  /** @type {(() => void) | null} */
  let teardown = null;
  /** @type {'pointer' | 'touch' | 'off'} */
  let mode = 'off';
  let lowTier = lowTierDevice();
  if (lowTier) document.body.classList.add('is-low-tier');

  function currentMode() {
    if (pointerDepthEnabled()) return 'pointer';
    if (touchDepthEnabled()) return 'touch';
    return 'off';
  }

  function start() {
    mode = currentMode();
    if (mode === 'off') return;
    const heroVisual = query('.hero-visual', HTMLElement);
    const heroCard = query('.hero-card', HTMLElement);
    const orbit = query('.orbit', HTMLElement);
    /** @type {TiltTarget[]} */
    const targets = TILT_TARGETS.flatMap(([selector, max]) =>
      queryAll(String(selector), HTMLElement).map(element => ({ element, max: Number(max) })),
    );
    targets.forEach(({ element }) => element.classList.add('tilt-3d'));

    if (mode === 'pointer') teardown = initPointerDepth(heroVisual, heroCard, orbit, targets);
    else teardown = initTouchDepth(heroVisual, targets, lowTier, degrade);
  }

  /**
   * Remonta la capa al cambiar de modo; `force` permite aplicar una degradación sin cambiarlo.
   * @param {boolean} [force]
   */
  function restart(force) {
    if (!force && currentMode() === mode) return;
    teardown?.();
    teardown = null;
    resetScene();
    start();
  }

  /** Los frames lentos activan las mismas restricciones que la detección de gama baja. */
  function degrade() {
    if (lowTier) return;
    lowTier = true;
    document.body.classList.add('is-low-tier');
    restart(true);
  }

  start();
  onMediaChange([finePointerQuery, coarsePointerQuery, reducedMotionQuery, mobileQuery], () => restart());
  return {
    restart: () => restart(true),
    stop: () => {
      teardown?.();
      teardown = null;
      mode = 'off';
      resetScene();
    },
  };
}

/** Borra lo que dejó el modo anterior para que no se quede una inclinación congelada. */
function resetScene() {
  queryAll('.tilt-3d,.hero-visual,.orbit,.hero-card,.magnetic', HTMLElement).forEach(element => {
    SCENE_VARS.forEach(name => element.style.removeProperty(name));
    element.style.removeProperty('will-change');
    element.classList.remove('is-pressed-3d');
  });
  query('.hero-visual', HTMLElement)?.classList.remove('is-tilting');
}

/**
 * @param {HTMLElement | null} heroVisual
 * @param {HTMLElement | null} heroCard
 * @param {HTMLElement | null} orbit
 * @param {TiltTarget[]} targets
 * @returns {() => void}
 */
function initPointerDepth(heroVisual, heroCard, orbit, targets) {
  const controller = new AbortController();
  const { signal } = controller;
  /** @type {(() => void)[]} */
  const pending = [];

  if (heroVisual) {
    const move = frameThrottle(/** @param {PointerEvent} event */ event => {
      const { x, y } = relativePointer(heroVisual, event);
      heroVisual.classList.add('is-tilting');
      setVars(heroVisual, {
        '--tilt-y': `${(x * HERO_TILT.y).toFixed(2)}deg`,
        '--tilt-x': `${(-y * HERO_TILT.x).toFixed(2)}deg`,
      });
      if (orbit) setVars(orbit, { '--orbit-x': `${(x * HERO_TILT.orbit).toFixed(1)}px`, '--orbit-y': `${(y * HERO_TILT.orbit).toFixed(1)}px` });
      if (heroCard) {
        const glare = relativePointer(heroCard, event);
        setVars(heroCard, { '--glare-x': `${((glare.x + 0.5) * 100).toFixed(1)}%`, '--glare-y': `${((glare.y + 0.5) * 100).toFixed(1)}%` });
      }
    });
    pending.push(move.cancel);
    heroVisual.addEventListener('pointermove', move.run, { passive: true, signal });
    heroVisual.addEventListener('pointerleave', () => {
      move.cancel();
      heroVisual.classList.remove('is-tilting');
      setVars(heroVisual, { '--tilt-x': '0deg', '--tilt-y': '0deg' });
      if (orbit) setVars(orbit, { '--orbit-x': '0px', '--orbit-y': '0px' });
    }, { signal });
  }

  targets.forEach(({ element, max }) => {
    const move = frameThrottle(/** @param {PointerEvent} event */ event => {
      const { x, y } = relativePointer(element, event);
      setVars(element, { '--ry': `${(x * max * 2).toFixed(2)}deg`, '--rx': `${(-y * max * 2).toFixed(2)}deg` });
    });
    pending.push(move.cancel);
    element.addEventListener('pointermove', move.run, { passive: true, signal });
    element.addEventListener('pointerleave', () => {
      move.cancel();
      setVars(element, { '--rx': '0deg', '--ry': '0deg' });
    }, { signal });
  });

  queryAll('.hero-actions .button', HTMLElement).forEach(item => {
    item.classList.add('magnetic');
    const magnet = frameThrottle(/** @param {PointerEvent} event */ event => {
      const { x, y } = relativePointer(item, event);
      setVars(item, { '--mag-x': `${(x * 8).toFixed(1)}px`, '--mag-y': `${(y * 6).toFixed(1)}px` });
    });
    pending.push(magnet.cancel);
    item.addEventListener('pointermove', magnet.run, { passive: true, signal });
    item.addEventListener('pointerleave', () => {
      magnet.cancel();
      setVars(item, { '--mag-x': '0px', '--mag-y': '0px' });
    }, { signal });
  });

  return () => {
    controller.abort();
    pending.forEach(cancel => cancel());
    queryAll('.magnetic', HTMLElement).forEach(item => item.classList.remove('magnetic'));
  };
}

/**
 * @param {HTMLElement | null} heroVisual
 * @param {TiltTarget[]} targets
 * @param {boolean} lowTier
 * @param {() => void} onLowTier
 * @returns {() => void}
 */
function initTouchDepth(heroVisual, targets, lowTier, onLowTier) {
  const controller = new AbortController();
  const { signal } = controller;
  /** En gama baja se conserva la escena del hero y se renuncia al tilt por scroll de cada bloque. */
  const scrollTargets = lowTier ? [] : targets;
  const scale = lowTier ? 0.6 : 1;

  const state = { scrollTilt: 0, gyroX: 0, gyroY: 0, heroVisible: false, frozen: false };
  /** @type {Set<HTMLElement>} */
  const visibleTargets = new Set();
  const targetMax = new Map(targets.map(({ element, max }) => [element, max]));
  /** @type {Map<HTMLElement, Metrics>} */
  const metrics = new Map();
  /** @type {Map<HTMLElement, { id: number, x: number, y: number }>} */
  const pressing = new Map();
  /** @type {WeakMap<HTMLElement, Map<string, string>>} */
  const written = new WeakMap();

  let disposed = false;
  let metricsDirty = true;
  let viewportHeight = window.innerHeight;
  let scrollTop = window.scrollY;

  /**
   * Evita escrituras repetidas de custom properties para reducir invalidaciones de estilo.
   * @param {HTMLElement} element
   * @param {string} name
   * @param {string} value
   */
  function setVar(element, name, value) {
    let cache = written.get(element);
    if (!cache) {
      cache = new Map();
      written.set(element, cache);
    }
    if (cache.get(name) === value) return;
    cache.set(name, value);
    element.style.setProperty(name, value);
  }

  /**
   * `top` y `center` usan coordenadas de documento; `left` permanece relativo al viewport.
   * @param {HTMLElement} element
   * @returns {Metrics}
   */
  function measureOne(element) {
    const box = element.getBoundingClientRect();
    const entry = {
      center: box.top + box.height / 2 + scrollTop,
      top: box.top + scrollTop,
      left: box.left,
      width: box.width,
      height: box.height,
    };
    metrics.set(element, entry);
    return entry;
  }

  /** Agrupa lecturas de geometría sin escrituras intermedias para evitar reflows repetidos. */
  function measure() {
    viewportHeight = window.innerHeight;
    scrollTop = window.scrollY;
    visibleTargets.forEach(element => measureOne(element));
    if (heroVisual && state.heroVisible) measureOne(heroVisual);
    metricsDirty = false;
  }

  const applyHero = () => {
    if (!heroVisual || state.frozen) return;
    setVar(heroVisual, '--tilt-x', `${(state.scrollTilt - state.gyroY * HERO_TILT.gyro * scale).toFixed(1)}deg`);
    setVar(heroVisual, '--tilt-y', `${(state.gyroX * HERO_TILT.gyro * 1.2 * scale).toFixed(1)}deg`);
  };

  // Los primeros frames de scroll permiten detectar lentitud aunque deviceMemory no esté disponible.
  let budgetDone = lowTier;
  let budgetSamples = 0;
  let budgetSlow = 0;
  let budgetLast = 0;
  /** @param {number} now */
  function checkBudget(now) {
    if (budgetDone) return;
    if (budgetLast) {
      const delta = now - budgetLast;
      // Solo cuentan frames encadenados: un hueco largo es una pausa del scroll, no un frame lento.
      if (delta < 400) {
        budgetSamples += 1;
        if (delta > 34) budgetSlow += 1;
      }
    }
    budgetLast = now;
    if (budgetSamples < 90) return;
    budgetDone = true;
    if (budgetSlow / budgetSamples > 0.35) onLowTier();
  }

  // La inclinación por scroll usa geometría en caché para evitar lecturas de layout por tarjeta.
  const onScroll = frameThrottle(() => {
    checkBudget(performance.now());
    if (disposed) return; // el vigilante pudo degradar y remontar la capa en este mismo frame
    if (metricsDirty) measure();
    const center = viewportHeight / 2;
    /** @param {HTMLElement} element */
    const offset = element => {
      const box = metrics.get(element);
      return box ? clamp((box.center - scrollTop - center) / center, -1, 1) : 0;
    };
    visibleTargets.forEach(element => {
      if (pressing.has(element)) return; // mientras el dedo pulsa, manda la pulsación
      const max = (targetMax.get(element) ?? 6) * scale;
      setVar(element, '--rx', `${(offset(element) * max * 0.9).toFixed(1)}deg`);
    });
    if (heroVisual && state.heroVisible) {
      const t = offset(heroVisual);
      state.scrollTilt = t * HERO_TILT.scroll * scale;
      applyHero();
    }
  });

  // Lee scrollY antes de escribir estilos en rAF para evitar un reflow entre tarjetas.
  const onScrollEvent = () => {
    scrollTop = window.scrollY;
    onScroll.run();
  };
  const invalidate = () => {
    metricsDirty = true;
    onScrollEvent();
  };

  const observer = new IntersectionObserver(
    entries => entries.forEach(entry => {
      const element = entry.target;
      if (!(element instanceof HTMLElement)) return;
      if (element === heroVisual) {
        state.heroVisible = entry.isIntersecting;
        metricsDirty = true;
        if (!lowTier) {
          if (entry.isIntersecting) element.style.willChange = 'transform';
          else element.style.removeProperty('will-change');
        }
        syncGyro();
        return;
      }
      if (entry.isIntersecting) {
        visibleTargets.add(element);
        // Limita las capas de compositor a tarjetas visibles para reducir el uso de memoria de vídeo.
        if (!lowTier) element.style.willChange = 'transform';
        metricsDirty = true;
        onScroll.run();
      } else {
        visibleTargets.delete(element);
        metrics.delete(element);
        element.style.removeProperty('will-change');
        setVar(element, '--rx', '0deg');
      }
    }),
    { threshold: 0, rootMargin: TILT_MARGIN },
  );
  scrollTargets.forEach(({ element }) => observer.observe(element));
  if (heroVisual) observer.observe(heroVisual);

  /** @type {ResizeObserver | undefined} */
  let resizeObserver;
  if ('ResizeObserver' in window) {
    // Los filtros y las imágenes pueden cambiar posiciones; la geometría se recalcula en el próximo frame.
    resizeObserver = new ResizeObserver(() => {
      metricsDirty = true;
      onScroll.run();
    });
    resizeObserver.observe(document.documentElement);
    scrollTargets.forEach(({ element }) => resizeObserver?.observe(element));
  }

  window.addEventListener('scroll', onScrollEvent, { passive: true, signal });
  window.addEventListener('resize', invalidate, { passive: true, signal });
  window.visualViewport?.addEventListener('resize', invalidate, { passive: true, signal });
  document.addEventListener('visibilitychange', () => {
    syncGyro();
    if (!document.hidden) invalidate();
  }, { signal });

  // Congela la escena durante el arrastre para mantener estable el plano del swipe.
  const carousel = query('[data-hero-carousel]', HTMLElement);
  if (carousel) {
    const thaw = () => {
      state.frozen = false;
      onScroll.run();
    };
    carousel.addEventListener('pointerdown', event => {
      if (event.pointerType !== 'mouse') state.frozen = true;
    }, { passive: true, signal });
    carousel.addEventListener('pointerup', thaw, { passive: true, signal });
    carousel.addEventListener('pointercancel', thaw, { passive: true, signal });
  }

  // Los listeners pasivos conservan el scroll y el swipe nativos durante la pulsación.
  targets.forEach(({ element, max }) => {
    /** @param {PointerEvent} event */
    const release = event => {
      const press = pressing.get(element);
      if (!press || press.id !== event.pointerId) return;
      pressing.delete(element);
      element.classList.remove('is-pressed-3d');
      setVar(element, '--ry', '0deg');
      if (!visibleTargets.has(element)) setVar(element, '--rx', '0deg');
      onScroll.run();
    };
    element.addEventListener('pointerdown', event => {
      if (event.pointerType === 'mouse' || !event.isPrimary) return;
      const box = metrics.get(element) ?? measureOne(element);
      if (!box.width || !box.height) return;
      const x = clamp((event.clientX - box.left) / box.width - 0.5, -0.5, 0.5);
      const y = clamp((event.clientY - (box.top - scrollTop)) / box.height - 0.5, -0.5, 0.5);
      const amount = max * scale * PRESS.ratio;
      pressing.set(element, { id: event.pointerId, x: event.clientX, y: event.clientY });
      element.classList.add('is-pressed-3d');
      setVar(element, '--ry', `${(x * amount * 2).toFixed(1)}deg`);
      setVar(element, '--rx', `${(-y * amount * 2).toFixed(1)}deg`);
    }, { passive: true, signal });
    element.addEventListener('pointermove', event => {
      const press = pressing.get(element);
      if (!press || press.id !== event.pointerId) return;
      // Si el dedo se desliza es un scroll, no una pulsación: se suelta el efecto.
      if (Math.abs(event.clientX - press.x) + Math.abs(event.clientY - press.y) > PRESS.slop) release(event);
    }, { passive: true, signal });
    element.addEventListener('pointerup', release, { passive: true, signal });
    element.addEventListener('pointercancel', release, { passive: true, signal });
    element.addEventListener('pointerleave', release, { passive: true, signal });
  });

  onScrollEvent();

  /** @type {{ x: number, y: number } | null} */
  let baseline = null;
  const smooth = { x: 0, y: 0 };
  let gyroEnabled = false;
  let gyroListening = false;
  const motionToggle = query('[data-hero-motion]', HTMLButtonElement);
  const OrientationEvent = /** @type {{ requestPermission?: () => Promise<string> } | undefined} */ (
    /** @type {any} */ (window).DeviceOrientationEvent
  );
  const needsPermission = typeof OrientationEvent?.requestPermission === 'function';

  /** Ángulo de la pantalla: en apaisado beta y gamma intercambian su papel. */
  function screenAngle() {
    const angle = /** @type {{ orientation?: { angle?: number } } | undefined} */ (
      /** @type {any} */ (window).screen
    )?.orientation?.angle;
    if (typeof angle === 'number') return ((angle % 360) + 360) % 360;
    const legacy = /** @type {any} */ (window).orientation;
    return typeof legacy === 'number' ? ((legacy % 360) + 360) % 360 : 0;
  }

  /** Con el móvil en reposo el sensor tiembla: por debajo de la zona muerta no hay giro. */
  const deadzone = /** @param {number} value */ value =>
    (Math.abs(value) <= GYRO.deadzone ? 0 : value - Math.sign(value) * GYRO.deadzone);

  const onOrientation = frameThrottle(/** @param {DeviceOrientationEvent} event */ event => {
    const { beta, gamma } = event;
    if (beta === null || gamma === null) return;
    const angle = screenAngle();
    const raw = angle === 90 ? { x: beta, y: -gamma }
      : angle === 270 ? { x: -beta, y: gamma }
      : angle === 180 ? { x: -gamma, y: -beta }
      : { x: gamma, y: beta };
    if (!baseline) baseline = { x: raw.x, y: raw.y };
    // Recentrar lentamente adapta el punto neutro a cambios de postura sin cancelar el giro actual.
    baseline.x += (raw.x - baseline.x) * GYRO.drift;
    baseline.y += (raw.y - baseline.y) * GYRO.drift;
    const targetX = clamp(deadzone(raw.x - baseline.x), -GYRO.range, GYRO.range) / GYRO.range;
    const targetY = clamp(deadzone(raw.y - baseline.y), -GYRO.range, GYRO.range) / GYRO.range;
    // El filtro paso bajo suaviza el temblor del sensor.
    smooth.x += (targetX - smooth.x) * GYRO.smooth;
    smooth.y += (targetY - smooth.y) * GYRO.smooth;
    state.gyroX = smooth.x;
    state.gyroY = smooth.y;
    applyHero();
  });

  /** Reinicia el punto neutro: al girar el móvil, al volver a la pestaña o al apagar el sensor. */
  function recalibrate() {
    baseline = null;
    smooth.x = 0;
    smooth.y = 0;
    state.gyroX = 0;
    state.gyroY = 0;
    applyHero();
  }

  function syncGyro() {
    const shouldListen = gyroEnabled && state.heroVisible && !document.hidden;
    if (shouldListen === gyroListening) return;
    gyroListening = shouldListen;
    recalibrate();
    if (shouldListen) {
      window.addEventListener('deviceorientation', onOrientation.run, { signal });
    } else {
      window.removeEventListener('deviceorientation', onOrientation.run);
      onOrientation.cancel();
    }
  }

  const onOrientationChange = () => {
    recalibrate();
    invalidate();
  };
  window.addEventListener('orientationchange', onOrientationChange, { signal });
  const screenOrientation = /** @type {{ addEventListener?: Function } | undefined} */ (
    /** @type {any} */ (window.screen).orientation
  );
  screenOrientation?.addEventListener?.('change', onOrientationChange, { signal });

  function enableGyro() {
    gyroEnabled = true;
    syncGyro();
    motionToggle?.setAttribute('aria-pressed', 'true');
  }

  const requestGyro = async () => {
    try {
      return (await OrientationEvent?.requestPermission?.()) === 'granted';
    } catch {
      return false;
    }
  };

  /** Deja el 3D del giroscopio a un botón: en gama baja no se enciende el sensor solo. */
  function offerToggle() {
    if (!motionToggle) return;
    motionToggle.hidden = false;
    motionToggle.addEventListener('click', async () => {
      if (gyroEnabled) {
        gyroEnabled = false;
        syncGyro();
        motionToggle.setAttribute('aria-pressed', 'false');
        return;
      }
      if (!needsPermission || (await requestGyro())) enableGyro();
      else motionToggle.hidden = true;
    }, { signal });
  }

  const stop = () => {
    disposed = true;
    controller.abort();
    observer.disconnect();
    resizeObserver?.disconnect();
    onScroll.cancel();
    onOrientation.cancel();
    window.removeEventListener('deviceorientation', onOrientation.run);
    pressing.clear();
    if (motionToggle) {
      motionToggle.hidden = true;
      motionToggle.setAttribute('aria-pressed', 'false');
    }
  };

  if (!OrientationEvent) return stop;
  if (!needsPermission) {
    if (lowTier) offerToggle();
    else enableGyro();
    return stop;
  }

  // Si el permiso requiere un gesto del usuario, el botón 3D permite volver a solicitarlo.
  requestGyro().then(granted => {
    if (granted && !lowTier) enableGyro();
    else offerToggle();
  });
  return stop;
}

/**
 * @param {HTMLElement} element
 * @param {Record<string, string>} vars
 */
function setVars(element, vars) {
  Object.entries(vars).forEach(([name, value]) => element.style.setProperty(name, value));
}
