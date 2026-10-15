// @ts-check
// Coordina las secciones y sus cambios de modo de rendimiento.
import { lowPowerMotion, onMediaChange, reducedMotionQuery, mobileQuery, coarsePointerQuery, saveDataQuery } from './modules/env.js';
import { initSpace } from './modules/space.js';
import { initCursor } from './modules/cursor.js';
import { initHeroCarousel } from './modules/hero-carousel.js';
import { initProjects } from './modules/projects.js';
import { initGlobalMap } from './modules/global-map.js';
import { initNav } from './modules/nav.js';
import { initContact } from './modules/contact.js';
import { initDepth } from './modules/depth.js';
import { initReveal } from './modules/reveal.js';
import { initMarquee } from './modules/marquee.js';
import { initMascotScenes } from './modules/mascot-scenes.js';

/**
 * Aísla errores síncronos de inicialización; no cubre imports ni callbacks posteriores.
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
safely('proyectos', initProjects);
safely('banner de servicios', initMarquee);
const globalMap = safely('mapa global', initGlobalMap);
safely('navegación', initNav);
safely('contacto', initContact);
safely('capa 3D', initDepth);
safely('escenas de Sarin', initMascotScenes);

const refreshPerformanceMode = () => {
  space?.sync();
  if (reducedMotionQuery.matches) {
    hero?.stop();
    globalMap?.stop();
  } else {
    hero?.sync();
    if (lowPowerMotion()) {
      globalMap?.stop();
    } else {
      globalMap?.start();
    }
  }
};

window.addEventListener('resize', refreshPerformanceMode, { passive: true });
onMediaChange([mobileQuery, coarsePointerQuery, saveDataQuery, reducedMotionQuery], refreshPerformanceMode);
refreshPerformanceMode();
