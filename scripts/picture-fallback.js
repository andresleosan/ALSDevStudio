(() => {
  const responsivePictureSelector = '.hero-picture,.project-picture';

  document.addEventListener('error', event => {
    const image = event.target;
    if (!(image instanceof HTMLImageElement)) return;

    const picture = image.closest(responsivePictureSelector);
    const failedSource = image.currentSrc;
    if (!picture || !failedSource || image.dataset.lastFailedSrc === failedSource) return;

    image.dataset.lastFailedSrc = failedSource;
    const extension = (() => {
      try {
        return new URL(failedSource, document.baseURI).pathname.split('.').pop().toLowerCase();
      } catch {
        return '';
      }
    })();
    const failedType = extension === 'avif' ? 'image/avif' : extension === 'webp' ? 'image/webp' : '';

    if (!failedType) {
      image.dataset.fallbackExhausted = 'true';
      return;
    }

    picture.querySelectorAll(`source[type='${failedType}']`).forEach(source => {
      source.removeAttribute('srcset');
      source.removeAttribute('data-srcset');
    });

    const fallback = image.dataset.src || image.getAttribute('src');
    if (fallback && !fallback.startsWith('data:')) image.src = fallback;
  }, true);
})();
