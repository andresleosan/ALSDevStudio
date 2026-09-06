// @ts-check
/**
 * Pestañas de capacidades: patrón tabs accesible (teclado, aria) y panel con flip 3D.
 */
import { query, queryAll } from './dom.js';

/** @typedef {{ index: string, title: string, copy: string, tags: string[] }} Capability */

/** @type {Record<string, Capability>} */
const CAPABILITIES = {
  web: {
    index: '01',
    title: 'Interfaces que convierten complejidad en claridad.',
    copy: 'Creamos sitios, dashboards y aplicaciones web con una experiencia pensada para que cada persona sepa qué hacer después.',
    tags: ['UX / UI', 'React', 'TypeScript', 'Cloudflare'],
  },
  systems: {
    index: '02',
    title: 'Operaciones conectadas, decisiones más rápidas.',
    copy: 'Diseñamos herramientas internas y plataformas que ordenan datos, reducen fricción y hacen visible el trabajo importante.',
    tags: ['Dashboards', 'APIs', 'Automatización', 'Datos'],
  },
  commerce: {
    index: '03',
    title: 'Experiencias digitales listas para vender.',
    copy: 'Convertimos catálogos, servicios y conversaciones en recorridos simples que acercan a las personas a una decisión.',
    tags: ['E-commerce', 'WhatsApp', 'SEO local', 'Conversión'],
  },
  collab: {
    index: '04',
    title: 'Capacidad técnica que se integra a tu equipo.',
    copy: 'Nos sumamos a otros equipos para construir features, integrar servicios y sacar adelante productos con criterio.',
    tags: ['Frontend', 'Backend', 'Integraciones', 'Soporte'],
  },
};

const NAVIGATION_KEYS = ['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft', 'Home', 'End'];

export function initCapabilities() {
  const tabs = queryAll('.capability-tab', HTMLButtonElement);
  const panel = query('.capability-panel', HTMLElement);
  const panelIndex = query('#capability-index', HTMLElement);
  const panelTitle = query('#capability-title', HTMLElement);
  const panelCopy = query('#capability-copy', HTMLElement);
  const panelTags = query('#capability-tags', HTMLElement);
  if (!tabs.length || !panel) return;

  /** @param {HTMLButtonElement} tab */
  const tabId = tab => `capability-tab-${tab.dataset.capability}`;

  /** @param {HTMLButtonElement} tab */
  const select = tab => {
    const item = CAPABILITIES[tab.dataset.capability ?? ''];
    if (!item) return;
    tabs.forEach(button => {
      const selected = button === tab;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-selected', String(selected));
      button.setAttribute('tabindex', selected ? '0' : '-1');
    });
    if (panelIndex) panelIndex.textContent = item.index;
    if (panelTitle) panelTitle.textContent = item.title;
    if (panelCopy) panelCopy.textContent = item.copy;
    if (panelTags) {
      panelTags.replaceChildren(...item.tags.map(tag => {
        const chip = document.createElement('span');
        chip.className = 'tag';
        chip.textContent = tag;
        return chip;
      }));
      panelTags.setAttribute('aria-labelledby', tabId(tab));
    }
    panelTitle?.setAttribute('aria-labelledby', tabId(tab));
    panel.setAttribute('aria-labelledby', tabId(tab));

    // Reinicia la animación de flip del contenido.
    panel.classList.remove('is-switching');
    void panel.offsetWidth;
    panel.classList.add('is-switching');
  };

  tabs.forEach((tab, position) => {
    tab.id = tabId(tab);
    tab.setAttribute('aria-controls', 'capability-panel');
    tab.setAttribute('tabindex', tab.classList.contains('is-selected') ? '0' : '-1');
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', event => {
      if (!NAVIGATION_KEYS.includes(event.key)) return;
      event.preventDefault();
      const backwards = event.key === 'ArrowUp' || event.key === 'ArrowLeft';
      const next = event.key === 'Home' ? 0
        : event.key === 'End' ? tabs.length - 1
        : (position + (backwards ? -1 : 1) + tabs.length) % tabs.length;
      tabs[next].focus();
      tabs[next].click();
    });
  });

  panel.removeAttribute('aria-live');
  panel.setAttribute('aria-labelledby', 'capability-tab-web');
  panel.addEventListener('animationend', () => panel.classList.remove('is-switching'));
}
