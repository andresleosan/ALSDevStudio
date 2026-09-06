// @ts-check
/**
 * Cursor personalizado con el logo ALS. Solo con puntero fino y sin reduced-motion.
 */
import { finePointer, lowPowerMotion } from './env.js';

export function initCursor() {
  const cursor = document.querySelector('.logo-cursor');
  if (!(cursor instanceof HTMLElement) || !finePointer || lowPowerMotion()) return;

  const show = /** @param {PointerEvent} event */ event => {
    document.body.classList.add('has-custom-pointer');
    cursor.style.opacity = '1';
    cursor.style.transform = `translate3d(${event.clientX - 18}px,${event.clientY - 18}px,0)`;
  };
  const hide = () => {
    cursor.style.opacity = '0';
    document.body.classList.remove('has-custom-pointer');
  };

  document.addEventListener('pointermove', show, { passive: true });
  document.addEventListener('mouseleave', hide);
  window.addEventListener('blur', hide);
  cursor.addEventListener('pointerdown', () => cursor.classList.add('is-pressed'));
  document.addEventListener('pointerup', () => cursor.classList.remove('is-pressed'));
}
