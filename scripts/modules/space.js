// @ts-check
/**
 * Fondo espacial: constelación de nodos y órbitas en un canvas fijo.
 * Se apaga en móvil, con puntero grueso, ahorro de datos o reduced-motion.
 */
import { finePointer, lowPowerMotion, onMediaChange, reducedMotionQuery, mobileQuery, coarsePointerQuery, saveDataQuery } from './env.js';

/** @typedef {{ x: number, y: number, vx: number, vy: number, radius: number, phase: number, twinkle: number }} SpaceNode */

export function initSpace() {
  const canvas = document.querySelector('#space-canvas');
  if (!(canvas instanceof HTMLCanvasElement)) return null;
  const context = canvas.getContext('2d');
  if (!context) return null;

  /** @type {number | undefined} */
  let frame;
  let width = window.innerWidth;
  let height = window.innerHeight;
  /** @type {SpaceNode[]} */
  let nodes = [];
  const pointer = { x: width * 0.72, y: height * 0.35, active: false };

  const makeNodes = () => {
    const count = Math.min(44, Math.max(24, Math.round(width / 34)));
    nodes = Array.from({ length: count }, (_, index) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.12,
      radius: Math.random() * 1.8 + 0.7,
      phase: index * 0.71,
      twinkle: Math.random() * 0.9 + 0.4,
    }));
  };

  /** @param {number} time */
  const draw = time => {
    context.clearRect(0, 0, width, height);

    const orbitX = width * 0.76;
    const orbitY = Math.min(height * 0.42, 470);
    const orbitSize = Math.min(width, height) * 0.34;
    for (let ring = 0; ring < 3; ring++) {
      context.beginPath();
      context.ellipse(orbitX, orbitY, orbitSize * (1 + ring * 0.2), orbitSize * (0.42 + ring * 0.08), -0.24, 0, Math.PI * 2);
      context.strokeStyle = ring === 0 ? 'rgba(77,155,255,.18)' : `rgba(101,212,157,${0.08 - ring * 0.015})`;
      context.lineWidth = ring === 0 ? 1 : 0.7;
      context.stroke();
    }

    const glowX = pointer.active ? pointer.x : orbitX;
    const glowY = pointer.active ? pointer.y : orbitY;
    const glow = context.createRadialGradient(glowX, glowY, 0, glowX, glowY, Math.min(width, height) * 0.32);
    glow.addColorStop(0, 'rgba(101,212,157,.12)');
    glow.addColorStop(0.35, 'rgba(77,155,255,.045)');
    glow.addColorStop(1, 'rgba(7,26,47,0)');
    context.fillStyle = glow;
    context.fillRect(0, 0, width, height);

    nodes.forEach((node, index) => {
      node.x += node.vx;
      node.y += node.vy;
      if (node.x < -20 || node.x > width + 20) node.vx *= -1;
      if (node.y < -20 || node.y > height + 20) node.vy *= -1;

      const pulse = 0.52 + Math.sin(time * 0.001 * node.twinkle + node.phase) * 0.28;
      context.beginPath();
      context.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      context.fillStyle = index % 5 === 0 ? `rgba(101,212,157,${pulse})` : `rgba(77,155,255,${pulse * 0.72})`;
      context.fill();

      for (let next = index + 1; next < nodes.length; next++) {
        const other = nodes[next];
        const distance = Math.hypot(node.x - other.x, node.y - other.y);
        if (distance >= 145) continue;
        context.beginPath();
        context.moveTo(node.x, node.y);
        context.lineTo(other.x, other.y);
        context.strokeStyle = `rgba(138,190,228,${(1 - distance / 145) * 0.14})`;
        context.lineWidth = 0.6;
        context.stroke();
      }
    });

    frame = lowPowerMotion() ? undefined : requestAnimationFrame(draw);
  };

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    makeNodes();
  };

  const stop = () => {
    if (frame !== undefined) cancelAnimationFrame(frame);
    frame = undefined;
  };

  /** Arranca o detiene el dibujo según el modo de rendimiento actual. */
  const sync = () => {
    if (lowPowerMotion()) {
      stop();
      canvas.style.display = 'none';
      return;
    }
    canvas.style.display = '';
    if (frame === undefined) frame = requestAnimationFrame(draw);
  };

  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('resize', sync, { passive: true });
  onMediaChange([reducedMotionQuery, mobileQuery, coarsePointerQuery, saveDataQuery], sync);

  if (finePointer && !lowPowerMotion()) {
    document.addEventListener('pointermove', event => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.active = true;
    }, { passive: true });
    document.addEventListener('mouseleave', () => { pointer.active = false; });
    window.addEventListener('blur', () => { pointer.active = false; });
  }

  resize();
  sync();
  return { sync, stop };
}
