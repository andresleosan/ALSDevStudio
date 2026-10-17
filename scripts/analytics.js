// @ts-check
(() => {
  // Identificador público del sitio, no una credencial de API.
  const TOKEN = 'c2385e2589ca41c1887705cd00d06d8f';
  const KEY = 'als:analytics-consent:cloudflare:v1';
  const MAX_AGE = 180 * 24 * 60 * 60 * 1000;
  const paths = new Set(['/', '/index.html', '/privacidad', '/privacidad.html', '/terminos', '/terminos.html', '/cookies', '/cookies.html']);
  const production = location.hostname === 'www.alsdevstudio.com';
  // La prueba del propietario no forma parte de las visitas públicas medibles.
  const privateTest = new URLSearchParams(location.search).getAll('sarin').includes('prueba');
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
  let connectionsBlocked = false;
  let revoking = false;
  let storageAvailable = true;
  let withdrawalNotSaved = false;
  let returnFocus = null;
  let loadFailed = false;

  const allowed = () => storageAvailable && !connectionsBlocked && !revoking && choice?.choice === 'accepted' && readChoice()?.choice === 'accepted';
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
    <h2 id="analytics-title" tabindex="-1" autofocus>Visitas y rendimiento</h2>
    <p>Si aceptas, ALS DevStudio usará Cloudflare Web Analytics para conocer las visitas, páginas consultadas y rendimiento real de este sitio.</p>
    <p>Se enviarán datos de página, procedencia, navegador y rendimiento, como carga, respuesta y estabilidad visual. Puedes rechazar y seguir navegando. Retirar desactiva la medición y actualiza la página; no elimina estadísticas previas.</p>
    <div class="analytics-details"><a href="cookies.html#analitica">Datos y plazos</a><a href="privacidad.html">Privacidad y derechos</a></div>
    <p class="analytics-contact">Responsable: Andrés Leonardo Santiago González, quien opera como ALS DevStudio.<br>Contacto: <a href="mailto:alsdevstudio@alsdevstudio.com">alsdevstudio@alsdevstudio.com</a></p>
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
    if (privateTest && status) status.textContent += ' En esta prueba privada de Sarin no se carga la analítica.';
    if (loadFailed && allowed()) status.textContent += ' No se pudo cargar la medición; puedes seguir navegando.';
    if (!storageAvailable) status.textContent += ' No se pudo guardar la elección. La analítica está desactivada en esta página.';
    if (withdrawalNotSaved) status.textContent += ' No pudimos comprobar que se haya eliminado una aceptación anterior: borra los datos de este sitio en tu navegador antes de recargar o navegar a otra página para evitar que vuelva a activarse.';
    closeButton.setAttribute('aria-label', allowed() ? 'Cerrar preferencias' : 'Cerrar sin activar analítica');
  };

  // La política se aplica al insertar un meta NUEVO; modificar uno existente
  // no cambia su CSP. Bloquea también el envío final del SDK al recargar.
  // No cancela conexiones iniciadas previamente ni desmonta el código del SDK.
  const blockConnections = () => {
    if (connectionsBlocked) return;
    const meta = document.createElement('meta');
    meta.httpEquiv = 'Content-Security-Policy';
    meta.content = "connect-src 'none'";
    document.head.append(meta);
    connectionsBlocked = true;
  };
  const start = () => {
    if (!allowed() || !production || privateTest || !paths.has(location.pathname) || !safeReferrer()) return;
    if (scriptRequested) return;
    scriptRequested = true;
    const script = document.createElement('script');
    script.src = 'https://static.cloudflareinsights.com/beacon.min.js';
    script.type = 'module';
    script.dataset.cfBeacon = JSON.stringify({ token: TOKEN, spa: false });
    script.referrerPolicy = 'no-referrer';
    // El runtime oficial mide automáticamente; no se crean eventos ni callbacks
    // que transformen su payload. Los recursos LCP del sitio son locales sin query.
    script.addEventListener('error', () => { loadFailed = true; updateStatus(); });
    document.head.append(script);
  };
  const close = () => {
    dialog.close();
    const target = returnFocus || document.querySelector('#contenido');
    target?.focus({ preventScroll: true });
  };
  // Devuelve si el documento siguiente leerá la elección nueva o ninguna elección.
  // Ante fallo de escritura y eliminación, una aceptación antigua puede persistir:
  // conservar el documento bloqueado y explicar el problema, sin recargarlo.
  const persist = (value) => {
    choice = { choice: value, updatedAt: Date.now() };
    withdrawalNotSaved = false;
    try {
      const serialized = JSON.stringify(choice);
      localStorage.setItem(KEY, serialized);
      if (localStorage.getItem(KEY) !== serialized) throw new Error('Elección no conservada');
      storageAvailable = true;
      return true;
    }
    catch {
      storageAvailable = false;
      if (value === 'denied') {
        try {
          localStorage.removeItem(KEY);
          if (localStorage.getItem(KEY) !== null) throw new Error('Elección anterior conservada');
          return true;
        }
        catch { withdrawalNotSaved = true; }
      }
    }
    return false;
  };
  const withdraw = () => {
    if (revoking) return;
    revoking = true;
    // Sin SDK instalado no hay colectores que detener: conservar los fetch
    // propios del sitio, por ejemplo la carga del mapa al entrar en su sección.
    if (scriptRequested) blockConnections();
    const safeToReload = persist('denied');
    updateStatus();
    if (scriptRequested && safeToReload) { location.reload(); return; }
    revoking = false;
    if (storageAvailable) close();
    else if (!dialog.open) dialog.showModal();
  };
  const choose = (value) => {
    if (value === 'denied') { withdraw(); return; }
    if (value !== 'accepted') return;
    const persisted = persist('accepted');
    if (!persisted && scriptRequested) blockConnections();
    updateStatus();
    // Una CSP aplicada no se puede relajar en este documento.
    if (persisted && connectionsBlocked) { location.reload(); return; }
    if (persisted) { close(); start(); }
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
  // Registrar antes del SDK: si la aceptación vence o cambia, se aplica la CSP
  // antes de su listener de ocultación. storage y pageshow cubren otras pestañas
  // y documentos restaurados desde el historial, sin parchear APIs del navegador.
  const sync = () => {
    const current = readChoice();
    if (scriptRequested && (!storageAvailable || current?.choice !== 'accepted')) { withdraw(); return; }
    if (storageAvailable) choice = current;
    updateStatus();
    if (connectionsBlocked && storageAvailable && current?.choice === 'accepted') { location.reload(); return; }
    start();
  };
  window.addEventListener('storage', event => { if (event.key === KEY || event.key === null) sync(); });
  window.addEventListener('pageshow', event => { if (event.persisted) sync(); });
  document.addEventListener('visibilitychange', sync, { capture: true });
  updateStatus();
  if (choice) start();
  else if (!document.body.classList.contains('legal-page')) dialog.showModal();
})();
