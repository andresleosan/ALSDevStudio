// @ts-check
/**
 * Entorno y preferencias del dispositivo.
 * Centraliza las media queries y los modos de rendimiento que usan los demás módulos.
 */

export const finePointerQuery = window.matchMedia('(pointer: fine)');
export const coarsePointerQuery = window.matchMedia('(pointer: coarse)');
export const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
export const reducedTransparencyQuery = window.matchMedia('(prefers-reduced-transparency: reduce)');
export const mobileQuery = window.matchMedia('(max-width: 680px)');
export const saveDataQuery = window.matchMedia('(prefers-reduced-data: reduce)');
export const desktopQuery = window.matchMedia('(min-width: 681px)');

/** Puntero fino (ratón o trackpad) disponible al cargar. */
export const finePointer = finePointerQuery.matches;

/** Modo de rendimiento móvil: pantalla pequeña, puntero grueso o ahorro de datos. */
export function mobilePerformanceMode() {
  const connection = /** @type {{ saveData?: boolean } | undefined} */ (
    /** @type {any} */ (navigator).connection
  );
  return mobileQuery.matches || coarsePointerQuery.matches || saveDataQuery.matches || connection?.saveData === true;
}

/** El usuario pidió reducir el movimiento. */
export function reducedMotion() {
  return reducedMotionQuery.matches;
}

/** El usuario pidió reducir la transparencia (desenfoques de fondo incluidos). */
export function reducedTransparency() {
  return reducedTransparencyQuery.matches;
}

/**
 * Dispositivo de gama baja.
 *
 * `deviceMemory` solo existe en Chromium y devuelve 0,25 / 0,5 / 1 / 2 / 4 / 8.
 * `hardwareConcurrency` no sirve por sí solo: los iPhone declaran 4 núcleos siendo
 * rápidos y muchos Android modestos declaran 8 por el big.LITTLE. Por eso los núcleos
 * solo cuentan cuando la RAM declarada también es baja.
 */
export function lowTierDevice() {
  const hints = /** @type {{ deviceMemory?: number, hardwareConcurrency?: number }} */ (
    /** @type {any} */ (navigator)
  );
  const memory = typeof hints.deviceMemory === 'number' ? hints.deviceMemory : 0;
  const cores = typeof hints.hardwareConcurrency === 'number' ? hints.hardwareConcurrency : 0;
  if (memory && memory <= 2) return true;
  if (memory && memory <= 4 && cores && cores <= 4) return true;
  return false;
}

/** Movimiento decorativo pesado (canvas, autoplays) debe estar apagado. */
export function lowPowerMotion() {
  return reducedMotion() || mobilePerformanceMode();
}

/** Interacciones 3D con puntero (escritorio). Se consulta en vivo: una tablet puede ganar ratón. */
export function pointerDepthEnabled() {
  return finePointerQuery.matches && !lowPowerMotion();
}

/** Interacciones 3D por scroll, pulsación y giroscopio (móvil y tablet). */
export function touchDepthEnabled() {
  return !reducedMotion() && (coarsePointerQuery.matches || mobileQuery.matches);
}

/**
 * Ejecuta `handler` como máximo una vez por frame.
 * @template {unknown[]} A
 * @param {(...args: A) => void} handler
 * @returns {{ run: (...args: A) => void, cancel: () => void }}
 */
export function frameThrottle(handler) {
  /** @type {number | undefined} */
  let frame;
  /** @type {A | undefined} */
  let lastArgs;
  return {
    run(...args) {
      lastArgs = args;
      if (frame !== undefined) return;
      frame = requestAnimationFrame(() => {
        frame = undefined;
        if (lastArgs) handler(...lastArgs);
      });
    },
    cancel() {
      if (frame !== undefined) cancelAnimationFrame(frame);
      frame = undefined;
    },
  };
}

/**
 * Suscribe un manejador a varias media queries.
 * @param {MediaQueryList[]} queries
 * @param {() => void} handler
 */
export function onMediaChange(queries, handler) {
  queries.forEach(query => query.addEventListener?.('change', handler));
}

/**
 * Limita un número a un rango.
 * @param {number} value
 * @param {number} min
 * @param {number} max
 */
export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
