// @ts-check
/**
 * Utilidades de DOM con tipos estrictos para `@ts-check`.
 */

/**
 * Busca un elemento y garantiza su tipo.
 * @template {Element} T
 * @param {string} selector
 * @param {new () => T} type
 * @param {ParentNode} [root]
 * @returns {T | null}
 */
export function query(selector, type, root = document) {
  const element = root.querySelector(selector);
  return element instanceof type ? element : null;
}

/**
 * Busca todos los elementos de un tipo.
 * @template {Element} T
 * @param {string} selector
 * @param {new () => T} type
 * @param {ParentNode} [root]
 * @returns {T[]}
 */
export function queryAll(selector, type, root = document) {
  return [...root.querySelectorAll(selector)].filter(
    /** @returns {element is T} */ element => element instanceof type,
  );
}

/**
 * Posición normalizada del puntero dentro de un elemento, centrada en 0 (rango -0.5 a 0.5).
 * @param {Element} element
 * @param {{ clientX: number, clientY: number }} event
 */
export function relativePointer(element, event) {
  const box = element.getBoundingClientRect();
  return {
    x: (event.clientX - box.left) / box.width - 0.5,
    y: (event.clientY - box.top) / box.height - 0.5,
    box,
  };
}
