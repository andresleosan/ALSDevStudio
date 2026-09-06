// @ts-check
/**
 * Punto de entrada de ALS DevStudio.
 * Cada módulo se encarga de una sección; aquí solo se inicializan y se coordinan
 * los cambios de modo de rendimiento (móvil, ahorro de datos, reduced-motion).
 */
import { lowPowerMotion, onMediaChange, reducedMotionQuery, mobileQuery, coarsePointerQuery, saveDataQuery } from './modules/env.js';
import { initSpace } from './modules/space.js';
import { initCursor } from './modules/cursor.js';
import { initHeroCarousel } from './modules/hero-carousel.js';
import { initCapabilities } from './modules/capabilities.js';
import { initProjects } from './modules/projects.js';
import { initGlobalMap } from './modules/global-map.js';
import { initNav } from './modules/nav.js';
import { initContact } from './modules/contact.js';
import { initDepth } from './modules/depth.js';
import { initReveal } from './modules/reveal.js';
import { initLivePreview } from './modules/live-preview.js';

/**
 * Aísla cada sección: un fallo en una no puede dejar sin JavaScript al resto de la página.
 * @template T
 * @param {string} nombre
 * @param {() => T} init
 * @returns {T | null}
 */
const safely = (nombre, init) => {
  try {
    return init();
  } catch (error) {
    console.error(`[ALS] falló la sección «${nombre}»`, error);
    return null;
  }
};

const space = safely('fondo espacial', initSpace);
safely('cursor', initCursor);
safely('reveal', initReveal);
const hero = safely('carrusel', initHeroCarousel);
safely('capacidades', initCapabilities);
safely('proyectos', initProjects);
const globalMap = safely('mapa global', initGlobalMap);
safely('navegación', initNav);
safely('contacto', initContact);
safely('capa 3D', initDepth);
safely('vista en vivo', initLivePreview);

const refreshPerformanceMode = () => {
  space?.sync();
  if (lowPowerMotion()) {
    hero?.stop();
    globalMap?.stop();
  } else {
    hero?.sync();
    globalMap?.start();
  }
};

window.addEventListener('resize', refreshPerformanceMode, { passive: true });
onMediaChange([mobileQuery, coarsePointerQuery, saveDataQuery, reducedMotionQuery], refreshPerformanceMode);
refreshPerformanceMode();
