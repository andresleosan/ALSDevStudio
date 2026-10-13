// @ts-check
// Las vistas externas se retiraron: eliminar su antigua preferencia no concede permisos.
try { localStorage.removeItem('als:live-preview:v1'); } catch { /* almacenamiento no disponible */ }
document.querySelector('[data-reset-preferences]')?.addEventListener('click', () => {
  let cleared = true;
  try { localStorage.removeItem('als:live-preview:v1'); } catch { cleared = false; }
  try { sessionStorage.removeItem('als:hero-autoplay-paused:v1'); } catch { cleared = false; }
  const status = document.querySelector('[data-privacy-status]');
  if (status) status.textContent = cleared
    ? 'Preferencias restablecidas para esta pestaña. Se aplicarán al volver al portafolio. No modifica la pausa guardada por otras pestañas ni elimina datos de otros sitios.'
    : 'El navegador no permitió acceder al almacenamiento. Puedes borrar los datos de este sitio desde su configuración.';
});
