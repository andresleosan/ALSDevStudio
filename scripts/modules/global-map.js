// @ts-check
/**
 * Alcance global: selección de ubicaciones sincronizada entre lista, mapa SVG y panel de datos,
 * sin rotación automática: cada ubicación se mantiene hasta que la persona elige otra.
 */
import { query, queryAll } from './dom.js';

/** @typedef {{ label: string, detail: string, coords: [string, string] }} Location */

/** @type {Record<string, Location>} */
const LOCATIONS = {
  usa: { label: 'Estados Unidos', detail: 'una idea que cruza el mapa.', coords: ['38° 00′ N', '97° 00′ W'] },
  mexico: { label: 'México', detail: 'diseñamos cerca, aunque estés lejos.', coords: ['23° 38′ N', '102° 33′ W'] },
  colombia: { label: 'Colombia', detail: 'el punto desde donde conectamos.', coords: ['04° 43′ N', '74° 03′ W'] },
  venezuela: { label: 'Venezuela', detail: 'producto con contexto local.', coords: ['06° 25′ N', '66° 35′ W'] },
  brasil: { label: 'Brasil', detail: 'más alcance para tu próximo paso.', coords: ['10° 20′ S', '53° 12′ W'] },
  espana: { label: 'España', detail: 'la conversación también llega lejos.', coords: ['40° 28′ N', '03° 45′ W'] },
  jersey: { label: 'Jersey', detail: 'un punto más en nuestra órbita.', coords: ['49° 13′ N', '02° 08′ W'] },
};
const LOCATION_KEYS = Object.keys(LOCATIONS);

export function initGlobalMap() {
  const buttons = queryAll('.global-location', HTMLButtonElement);
  const statusText = query('#global-status strong', HTMLElement);
  const selection = query('#global-map-selection', HTMLElement);
  const latitude = query('#global-latitude', HTMLElement);
  const longitude = query('#global-longitude', HTMLElement);
  const mapHost = query('.global-map-host', HTMLElement);

  /** Elementos del SVG; se rellenan cuando el mapa termina de cargar. */
  /** @type {SVGElement[]} */
  let markers = [];
  /** @type {SVGElement[]} */
  let highlights = [];
  let current = 0;

  /** @param {string} key */
  const select = key => {
    const item = LOCATIONS[key];
    if (!item) return;
    buttons.forEach(button => {
      const active = button.dataset.location === key;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    markers.forEach(marker => marker.classList.toggle('is-active', marker.dataset.location === key));
    highlights.forEach(area => area.classList.toggle('is-active', area.dataset.location === key));
    if (selection) selection.textContent = item.label;
    if (latitude) latitude.textContent = item.coords[0];
    if (longitude) longitude.textContent = item.coords[1];
    if (statusText) statusText.textContent = `${item.label} · ${item.detail}`;
    current = Math.max(0, LOCATION_KEYS.indexOf(key));
  };

  buttons.forEach(button => button.addEventListener('click', () => {
    select(button.dataset.location ?? '');
  }));

  /**
   * Conecta el SVG recién insertado. El mapa es decorativo para tecnologías de asistencia:
   * la lista de botones es el control accesible.
   * @param {SVGSVGElement} svg
   */
  const bindMap = svg => {
    markers = queryAll('.map-marker', SVGElement, svg);
    highlights = queryAll('.map-country-highlight [data-location]', SVGElement, svg);
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.removeAttribute('role');
    svg.removeAttribute('aria-labelledby');
    markers.forEach(marker => {
      ['role', 'tabindex', 'aria-label', 'aria-pressed'].forEach(name => marker.removeAttribute(name));
      marker.addEventListener('click', () => {
        select(marker.dataset.location ?? '');
      });
    });
    select(LOCATION_KEYS[current]);
  };

  /** Carga el SVG del mapa desde su asset y lo monta en el host. */
  const loadMap = async () => {
    const src = mapHost?.dataset.mapSrc;
    if (!mapHost || !src) return;
    try {
      const response = await fetch(src);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const parsed = new DOMParser().parseFromString(await response.text(), 'image/svg+xml').documentElement;
      if (!(parsed instanceof SVGSVGElement)) throw new Error('SVG inválido');
      mapHost.replaceChildren(document.importNode(parsed, true));
      const svg = query('svg', SVGSVGElement, mapHost);
      if (svg) bindMap(svg);
    } catch {
      // No se oculta el host: su aspect-ratio ya reservó el hueco y ocultarlo ahora provocaría
      // un salto de layout tardío (CLS) justo en el peor caso, el de red inestable.
      // La lista de botones .global-location sigue siendo el control accesible del mapa.
      mapHost.dataset.mapFailed = 'true';
    }
  };

  query('.global-map-selection', HTMLElement)?.removeAttribute('aria-live');

  select('usa');
  loadMap();

  // main.js conserva esta API para coordinar preferencias. El mapa manual no inicia ciclos.
  const start = () => {};
  const stop = () => {};

  return { start, stop };
}
