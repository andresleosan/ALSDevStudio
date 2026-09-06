// @ts-check
/**
 * Carrusel del hero: navegación accesible, autoplay respetuoso, swipe táctil
 * e hidratación progresiva de imágenes (solo el slide activo y el siguiente).
 */
import { mobilePerformanceMode, reducedMotionQuery } from './env.js';
import { query, queryAll } from './dom.js';

const AUTOPLAY_DELAY = 6000;
const PAUSE_STORAGE_KEY = 'als:hero-autoplay-paused:v1';

/** @typedef {'init' | 'auto' | 'user' | 'programmatic'} SlideOrigin */

export function initHeroCarousel() {
  const carousel = query('[data-hero-carousel]', HTMLElement);
  const track = query('#hero-slides', HTMLElement);
  const slides = queryAll('.hero-slide', HTMLElement);
  const slideLabel = query('#hero-slide-label', HTMLElement);
  const slideCurrent = query('#hero-slide-current', HTMLElement);
  const slideTotal = query('#hero-slide-total', HTMLElement);
  const status = query('#hero-carousel-status', HTMLElement);
  const prevButton = query("[data-hero-step='-1']", HTMLButtonElement);
  const nextButton = query("[data-hero-step='1']", HTMLButtonElement);
  const toggle = query('[data-hero-toggle]', HTMLButtonElement);
  const toggleIcon = query('[data-hero-toggle-icon]', HTMLElement);
  const toggleText = query('[data-hero-toggle-text]', HTMLElement);
  const projectLink = query('#hero-project-link', HTMLAnchorElement);
  const projectCards = new Map(
    queryAll('.project-card[data-project-key]', HTMLAnchorElement).map(card => [card.dataset.projectKey, card]),
  );

  if (!carousel || !slides.length) return null;

  let index = 0;
  /** @type {number | undefined} */
  let timer;
  let announcementFrame = 0;
  let visible = !('IntersectionObserver' in window);
  let pointerInside = false;
  let focusWithin = false;
  /** @type {{ id: number, startX: number, startY: number, lastX: number, lastY: number, direction: 'horizontal' | 'vertical' | null } | null} */
  let swipe = null;
  let userPaused = readStoredPause();

  function readStoredPause() {
    try {
      return sessionStorage.getItem(PAUSE_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  }

  function storePause() {
    try {
      sessionStorage.setItem(PAUSE_STORAGE_KEY, String(userPaused));
    } catch {
      /* almacenamiento no disponible */
    }
  }

  function stop() {
    clearTimeout(timer);
    timer = undefined;
  }

  /** @param {string} message */
  function announce(message) {
    if (!status) return;
    cancelAnimationFrame(announcementFrame);
    status.textContent = '';
    announcementFrame = requestAnimationFrame(() => { status.textContent = message; });
  }

  /**
   * Activa las fuentes reales de un slide. Se desmonta el `picture` durante el
   * cambio para que el navegador no descargue dos candidatos.
   * @param {HTMLElement | undefined} slide
   * @param {'high' | 'low'} fetchPriority
   */
  function hydratePicture(slide, fetchPriority) {
    const picture = slide ? query('[data-progressive-picture]', HTMLElement, slide) : null;
    const image = picture ? query('img', HTMLImageElement, picture) : null;
    if (!picture || !image) return;
    image.loading = 'eager';
    image.fetchPriority = fetchPriority;
    if (picture.dataset.hydrated === 'true') return;

    const marker = document.createComment('hero-picture-hydration');
    const wasConnected = picture.isConnected;
    if (wasConnected) picture.replaceWith(marker);
    picture.querySelectorAll('source[data-srcset]').forEach(source => {
      if (!(source instanceof HTMLSourceElement)) return;
      source.srcset = source.dataset.srcset ?? '';
      source.removeAttribute('data-srcset');
    });
    if (image.dataset.src) {
      image.src = image.dataset.src;
      image.removeAttribute('data-src');
    }
    picture.dataset.hydrated = 'true';
    if (wasConnected) marker.replaceWith(picture);
  }

  /** @param {number} activeIndex */
  function hydrateWindow(activeIndex) {
    hydratePicture(slides[activeIndex], 'high');
    if (slides.length > 1) hydratePicture(slides[(activeIndex + 1) % slides.length], 'low');
  }

  function canAutoplay() {
    return slides.length > 1
      && !reducedMotionQuery.matches
      && !mobilePerformanceMode()
      && !userPaused
      && visible
      && !document.hidden
      && !pointerInside
      && !focusWithin
      && !swipe;
  }

  function updateToggle() {
    if (!toggle) return;
    toggle.hidden = slides.length < 2 || reducedMotionQuery.matches || mobilePerformanceMode();
    const action = userPaused ? 'Reanudar' : 'Pausar';
    if (toggleText) toggleText.textContent = action;
    if (toggleIcon) toggleIcon.textContent = userPaused ? '▶' : 'Ⅱ';
    toggle.setAttribute('aria-label', `${action} rotación automática`);
  }

  /** @param {HTMLElement} slide */
  function syncProjectLink(slide) {
    if (!projectLink) return;
    const source = projectCards.get(slide.dataset.projectKey);
    const projectName = slide.dataset.projectName || slide.dataset.label;
    if (!source?.href) {
      projectLink.hidden = true;
      projectLink.removeAttribute('href');
      return;
    }
    projectLink.hidden = false;
    projectLink.href = source.href;
    projectLink.setAttribute('aria-label', `Ver proyecto ${projectName} (se abre en una pestaña nueva)`);
  }

  function syncAutoplay() {
    stop();
    updateToggle();
    if (canAutoplay()) timer = window.setTimeout(() => setSlide(index + 1, 'auto'), AUTOPLAY_DELAY);
  }

  /**
   * @param {number} nextIndex
   * @param {SlideOrigin} origin
   */
  function setSlide(nextIndex, origin = 'programmatic') {
    index = (nextIndex + slides.length) % slides.length;
    hydrateWindow(index);
    slides.forEach((slide, slideIndex) => {
      const active = slideIndex === index;
      slide.classList.toggle('is-active', active);
      slide.setAttribute('aria-hidden', String(!active));
      slide.toggleAttribute('inert', !active);
    });

    const activeSlide = slides[index];
    const projectName = activeSlide.dataset.projectName || activeSlide.dataset.label;
    if (slideLabel) slideLabel.textContent = activeSlide.dataset.label ?? '';
    if (slideCurrent) slideCurrent.textContent = String(index + 1).padStart(2, '0');
    if (slideTotal) slideTotal.textContent = String(slides.length).padStart(2, '0');
    syncProjectLink(activeSlide);
    if (origin === 'user') announce(`Proyecto ${index + 1} de ${slides.length}: ${projectName}.`);
    syncAutoplay();
  }

  slides.forEach((slide, slideIndex) => {
    slide.setAttribute('aria-label', `${slideIndex + 1} de ${slides.length}: ${slide.dataset.projectName || slide.dataset.label}`);
  });

  prevButton?.addEventListener('click', () => setSlide(index - 1, 'user'));
  nextButton?.addEventListener('click', () => setSlide(index + 1, 'user'));
  toggle?.addEventListener('click', () => {
    userPaused = !userPaused;
    storePause();
    updateToggle();
    announce(userPaused ? 'Rotación automática pausada.' : 'Rotación automática activada.');
    syncAutoplay();
  });

  carousel.addEventListener('keydown', event => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    /** @type {Record<string, number>} */
    const destinations = { ArrowLeft: index - 1, ArrowRight: index + 1, Home: 0, End: slides.length - 1 };
    if (!(event.key in destinations)) return;
    event.preventDefault();
    setSlide(destinations[event.key], 'user');
  });
  carousel.addEventListener('mouseenter', () => { pointerInside = true; syncAutoplay(); });
  carousel.addEventListener('mouseleave', () => { pointerInside = false; syncAutoplay(); });
  carousel.addEventListener('focusin', () => { focusWithin = true; syncAutoplay(); });
  carousel.addEventListener('focusout', event => {
    if (event.relatedTarget instanceof Node && carousel.contains(event.relatedTarget)) return;
    focusWithin = false;
    syncAutoplay();
  });

  if (track) {
    track.addEventListener('pointerdown', event => {
      if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
      swipe = { id: event.pointerId, startX: event.clientX, startY: event.clientY, lastX: event.clientX, lastY: event.clientY, direction: null };
      syncAutoplay();
    });
    track.addEventListener('pointermove', event => {
      if (!swipe || event.pointerId !== swipe.id) return;
      swipe.lastX = event.clientX;
      swipe.lastY = event.clientY;
      const deltaX = swipe.lastX - swipe.startX;
      const deltaY = swipe.lastY - swipe.startY;
      if (!swipe.direction && Math.max(Math.abs(deltaX), Math.abs(deltaY)) >= 10) {
        swipe.direction = Math.abs(deltaX) > Math.abs(deltaY) * 1.2 ? 'horizontal' : 'vertical';
      }
      if (swipe.direction === 'horizontal') event.preventDefault();
    }, { passive: false });

    /** @param {PointerEvent} event @param {boolean} [cancelled] */
    const finishSwipe = (event, cancelled = false) => {
      if (!swipe || event.pointerId !== swipe.id) return;
      const deltaX = (event.clientX || swipe.lastX) - swipe.startX;
      const threshold = Math.max(42, track.clientWidth * 0.14);
      const horizontal = swipe.direction === 'horizontal';
      swipe = null;
      if (!cancelled && horizontal && Math.abs(deltaX) >= threshold) setSlide(index + (deltaX < 0 ? 1 : -1), 'user');
      else syncAutoplay();
    };
    track.addEventListener('pointerup', event => finishSwipe(event));
    track.addEventListener('pointercancel', event => finishSwipe(event, true));
  }

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      visible = entry.isIntersecting;
      syncAutoplay();
    }), { threshold: 0.35 });
    observer.observe(carousel);
  }
  document.addEventListener('visibilitychange', syncAutoplay);
  window.addEventListener('pagehide', stop);
  window.addEventListener('pageshow', syncAutoplay);
  reducedMotionQuery.addEventListener('change', syncAutoplay);

  setSlide(0, 'init');
  return { stop, sync: syncAutoplay };
}
