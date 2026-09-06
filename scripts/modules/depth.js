// @ts-check
/**
 * Capa de profundidad 3D (DEPTH-01 / DEPTH-02).
 *
 * - Escritorio (puntero fino): inclinación y brillo siguiendo el puntero, parallax de chips,
 *   órbita magnética y botones magnéticos.
 * - Móvil y tablet (puntero grueso): inclinación dirigida por el scroll, por la pulsación
 *   del dedo y por el giroscopio. En Android el giroscopio se activa solo; en iOS requiere
 *   permiso y se ofrece un botón «3D».
 *
 * En táctil no se mide nada dentro del bucle de scroll: las posiciones se cachean y solo se
 * invalidan al redimensionar, al girar el dispositivo o cuando cambia el alto del documento.
 *
 * Todo se apaga con `prefers-reduced-motion` y se recorta en dispositivos de gama baja.
 */
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
  ['.project-card', 7],
  ['.capability-panel', 4],
  ['.process-item', 6],
  ['.playground-option', 8],
  ['.global-map-wrap', 3],
  ['.contact-playground', 2.5],
];

const HERO_TILT = { x: 9, y: 12, parallax: 18, orbit: 24, scroll: 8, gyro: 10 };

/** Giroscopio: suavizado, deriva del punto neutro, zona muerta y recorrido útil (grados). */
const GYRO = { smooth: 0.16, drift: 0.0015, deadzone: 1.2, range: 26 };

/** Pulsación táctil: proporción del ángulo máximo y holgura antes de tratarlo como scroll. */
const PRESS = { ratio: 0.8, slop: 10 };

/** Margen del observador: la tarjeta llega ya inclinada al borde de la pantalla. */
const TILT_MARGIN = '15% 0px';

/** Variables inline que puede dejar cualquiera de los dos modos. */
const SCENE_VARS = [
  '--rx', '--ry', '--tilt-x', '--tilt-y', '--px', '--py',
  '--orbit-x', '--orbit-y', '--glare-x', '--glare-y',
  '--card-x', '--card-y', '--mag-x', '--mag-y',
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

  /** Modo que corresponde ahora mismo al dispositivo y a las preferencias del usuario. */
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
   * Vuelve a montar la capa: al conectar un ratón a la tablet, al girar el dispositivo
   * o al cambiar `prefers-reduced-motion`. Si el modo no cambia, no se toca nada.
   * @param {boolean} [force]
   */
  function restart(force) {
    if (!force && currentMode() === mode) return;
    teardown?.();
    teardown = null;
    resetScene();
    start();
  }

  /** El vigilante de frames detectó que el dispositivo no llega: se recorta y se remonta. */
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
        '--px': `${(x * HERO_TILT.parallax).toFixed(1)}px`,
        '--py': `${(y * HERO_TILT.parallax).toFixed(1)}px`,
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
      setVars(heroVisual, { '--tilt-x': '0deg', '--tilt-y': '0deg', '--px': '0px', '--py': '0px' });
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

  // Brillo radial de las tarjetas de proyecto siguiendo el puntero.
  // Igual que el tilt: una lectura de layout por frame, no una por evento. Un ratón de
  // alta frecuencia entrega varios pointermove coalescidos en el mismo frame.
  queryAll('.project-card', HTMLElement).forEach(card => {
    const glow = frameThrottle(/** @param {PointerEvent} event */ event => {
      const { x, y } = relativePointer(card, event);
      setVars(card, { '--card-x': `${((x + 0.5) * 100).toFixed(1)}%`, '--card-y': `${((y + 0.5) * 100).toFixed(1)}%` });
    });
    pending.push(glow.cancel);
    card.addEventListener('pointermove', glow.run, { passive: true, signal });
    card.addEventListener('pointerleave', glow.cancel, { passive: true, signal });
  });

  // Botones magnéticos.
  queryAll('.button,.nav-cta', HTMLElement).forEach(item => {
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

  const state = { scrollTilt: 0, scrollParallax: 0, gyroX: 0, gyroY: 0, heroVisible: false, frozen: false };
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
   * Escribe una custom property solo si cambió de verdad: cada escritura invalida el
   * estilo del elemento y con varias tarjetas por frame eso se nota en móvil.
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
   * Guarda el centro del elemento en coordenadas de documento.
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

  /** Pasada de medición: se lee TODO seguido, sin escribir en medio, para un solo reflow. */
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
    setVar(heroVisual, '--px', `${(state.gyroX * HERO_TILT.parallax * scale).toFixed(1)}px`);
    setVar(heroVisual, '--py', `${(state.scrollParallax + state.gyroY * HERO_TILT.parallax * scale).toFixed(1)}px`);
  };

  // Vigilancia del ritmo de frames: en iOS no hay `deviceMemory`, así que se mide el coste
  // real durante los primeros frames de scroll y se degrada si el móvil no llega.
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

  // Inclinación por scroll: ni un `getBoundingClientRect` dentro del bucle, todo sale de la caché.
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
      state.scrollParallax = t * 14 * scale;
      applyHero();
    }
  });

  // `scrollY` se lee en el propio evento de scroll, cuando el layout ya está limpio.
  // Leerlo dentro del rAF, después de haber escrito variables, costaría un reflow por frame.
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
        // Capa de compositor solo mientras se ve: promocionar 15 tarjetas a la vez
        // agota la memoria de vídeo de un móvil modesto.
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
    // El alto del documento cambia al filtrar proyectos, al cambiar de pestaña de
    // capacidades o al cargar una imagen: basta con marcar la caché como sucia.
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

  // Mientras el dedo arrastra el carrusel la escena se congela: si el plano 3D gira
  // bajo el dedo, el swipe pierde precisión y los botones del card bailan.
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

  // Pulsación: la tarjeta se inclina hacia el dedo y vuelve al soltar. Todos los
  // listeners son pasivos, así que nunca bloquean el scroll ni el swipe.
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

  // Giroscopio.
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
    // Deriva muy lenta del punto neutro (~10 s): recentra si cambias de postura sin
    // comerse la inclinación que estás haciendo en este momento.
    baseline.x += (raw.x - baseline.x) * GYRO.drift;
    baseline.y += (raw.y - baseline.y) * GYRO.drift;
    const targetX = clamp(deadzone(raw.x - baseline.x), -GYRO.range, GYRO.range) / GYRO.range;
    const targetY = clamp(deadzone(raw.y - baseline.y), -GYRO.range, GYRO.range) / GYRO.range;
    // Filtro paso bajo: quita el temblor del sensor sin retardo perceptible.
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

  /** Pide permiso de sensores; devuelve true si se concedió. */
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

  // Chrome concede el permiso sin gesto; iOS lo rechaza fuera de un gesto y entonces
  // se ofrece el botón «3D» del carrusel.
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
