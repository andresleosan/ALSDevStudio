// @ts-check
(() => {
  const KEY = 'als:analytics-consent:v1';
  const MAX_AGE = 180 * 24 * 60 * 60 * 1000;
  const paths = new Set(['/', '/index.html', '/privacidad.html', '/terminos.html', '/cookies.html']);
  const production = ['www.alsdevstudio.com', 'alsdevstudio.com'].includes(location.hostname);
  const controls = document.querySelectorAll('[data-analytics-preferences]');
  if (!controls.length || typeof HTMLDialogElement === 'undefined' || !HTMLDialogElement.prototype.showModal) return;

  const readChoice = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
      const age = Date.now() - saved?.updatedAt;
      return saved && Object.keys(saved).length === 2 && ['accepted', 'denied'].includes(saved.choice) && Number.isFinite(saved.updatedAt) && age >= 0 && age < MAX_AGE
        ? saved : null;
    } catch { return null; }
  };
  let choice = readChoice();
  let scriptRequested = false;
  let scriptLoaded = false;
  let viewSent = false;
  let storageAvailable = true;
  let withdrawalNotSaved = false;
  let returnFocus = null;
  let loadFailed = false;

  // Releer antes de cada envío evita depender del orden del evento storage.
  // Si no podemos conservar la elección, la medición permanece desactivada.
  const allowed = () => storageAvailable && choice?.choice === 'accepted' && readChoice()?.choice === 'accepted';
  const safeReferrer = () => {
    if (!document.referrer) return true;
    try {
      const referrer = new URL(document.referrer);
      return !referrer.search && !referrer.hash &&
        (referrer.pathname === '/' || (referrer.origin === location.origin && paths.has(referrer.pathname)));
    } catch { return false; }
  };

  const dialog = document.createElement('dialog');
  dialog.id = 'analytics-preferences';
  dialog.className = 'analytics-dialog';
  dialog.setAttribute('aria-labelledby', 'analytics-title');
  // Contenido fijo: no incorpora URLs, parámetros ni datos aportados por visitantes.
  dialog.innerHTML = `
    <button type="button" class="analytics-dismiss" data-analytics-close aria-label="Cerrar sin activar analítica">×</button>
    <p class="eyebrow">Tu elección · Analítica opcional</p>
    <h2 id="analytics-title" tabindex="-1" autofocus>Estadísticas de visitas</h2>
    <p>Si aceptas, Andrés Leonardo Santiago González —ALS DevStudio— usará Vercel Web Analytics para conocer las visitas y páginas consultadas y mejorar este sitio.</p>
    <p>Se enviarán datos técnicos como página, referente, fecha, dispositivo y ubicación aproximada. Puedes rechazar y seguir navegando, o retirar tu elección desde «Preferencias de analítica».</p>
    <div class="analytics-details"><a href="cookies.html#analitica">Datos y plazos</a><a href="privacidad.html">Privacidad y derechos</a></div>
    <p class="analytics-contact">Contacto: <a href="mailto:alsdevstudio@alsdevstudio.com">alsdevstudio@alsdevstudio.com</a></p>
    <p class="analytics-state" data-analytics-status role="status"></p>
    <div class="analytics-actions">
      <button type="button" data-analytics-choice="denied">Rechazar analítica</button>
      <button type="button" data-analytics-choice="accepted">Aceptar analítica</button>
    </div>`;
  document.body.append(dialog);
  const status = dialog.querySelector('[data-analytics-status]');
  const closeButton = dialog.querySelector('[data-analytics-close]');
  const updateStatus = () => {
    status.textContent = allowed() ? 'Tu elección: analítica aceptada.' : 'Tu elección: analítica desactivada.';
    if (loadFailed && allowed()) status.textContent += ' No se pudo cargar la medición; puedes seguir navegando.';
    if (!storageAvailable) status.textContent += ' No se pudo guardar la elección. La analítica está desactivada en esta página.';
    if (withdrawalNotSaved) status.textContent += ' No pudimos comprobar que se haya eliminado una aceptación anterior: borra los datos de este sitio en tu navegador antes de recargar o navegar a otra página para evitar que vuelva a activarse.';
    closeButton.setAttribute('aria-label', allowed() ? 'Cerrar preferencias' : 'Cerrar sin activar analítica');
  };

  // API pública de Vercel; la cola nunca contiene eventos previos a la autorización.
  const va = (...args) => window.va?.(...args);
  const beforeSend = (event) => {
    if (!allowed() || !safeReferrer() || event.type !== 'pageview') return null;
    try {
      const url = new URL(event.url);
      if (url.origin !== location.origin || !paths.has(url.pathname)) return null;
      return { ...event, url: url.origin + url.pathname };
    } catch { return null; }
  };
  const sendView = () => {
    if (!scriptLoaded || viewSent || !allowed() || !safeReferrer()) return;
    viewSent = true;
    va('pageview', { path: location.pathname });
  };
  const start = () => {
    if (!allowed() || !production || !paths.has(location.pathname) || !safeReferrer()) return;
    if (scriptRequested) { sendView(); return; }
    scriptRequested = true;
    window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
    va('beforeSend', beforeSend);
    const script = document.createElement('script');
    script.src = '/_vercel/insights/script.js';
    script.defer = true;
    script.dataset.disableAutoTrack = '1';
    script.referrerPolicy = 'no-referrer';
    script.addEventListener('load', () => { scriptLoaded = true; sendView(); });
    script.addEventListener('error', () => { loadFailed = true; updateStatus(); });
    document.head.append(script);
  };
  const close = () => {
    dialog.close();
    const target = returnFocus || document.querySelector('#contenido');
    target?.focus({ preventScroll: true });
  };
  const choose = (value) => {
    choice = { choice: value, updatedAt: Date.now() };
    withdrawalNotSaved = false;
    try { localStorage.setItem(KEY, JSON.stringify(choice)); storageAvailable = true; }
    catch {
      storageAvailable = false;
      if (value === 'denied') {
        try { localStorage.removeItem(KEY); }
        catch { withdrawalNotSaved = true; }
      }
    }
    updateStatus();
    // El error permanece visible; cerrar nunca cuenta como aceptación.
    if (storageAvailable) close();
    if (value === 'accepted') start();
  };
  const dismiss = () => {
    if (!choice) choose('denied');
    else close();
  };
  dialog.querySelectorAll('[data-analytics-choice]').forEach(button => {
    button.addEventListener('click', () => choose(button.getAttribute('data-analytics-choice')));
  });
  closeButton.addEventListener('click', dismiss);
  dialog.addEventListener('cancel', event => { event.preventDefault(); dismiss(); });
  controls.forEach(control => {
    control.hidden = false;
    control.addEventListener('click', () => {
      returnFocus = control;
      updateStatus();
      if (!dialog.open) dialog.showModal();
    });
  });
  // Una retirada en otra pestaña o durante el historial bloquea los siguientes envíos.
  const sync = () => {
    if (storageAvailable) choice = readChoice();
    updateStatus();
    start();
  };
  window.addEventListener('storage', event => { if (event.key === KEY || event.key === null) sync(); });
  window.addEventListener('pageshow', event => { if (event.persisted) sync(); });
  updateStatus();
  if (choice) start();
  else if (!document.body.classList.contains('legal-page')) dialog.showModal();
})();
