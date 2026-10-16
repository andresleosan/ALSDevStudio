// @ts-check
/** Conversación efímera: ningún texto se escribe en almacenamiento o analítica. */
export function initSarinChat() {
  const dialog = document.querySelector('#sarin-chat');
  const launcher = document.querySelector('#sarin-launcher');
  if (!(dialog instanceof HTMLDialogElement) || !(launcher instanceof HTMLButtonElement) || typeof dialog.showModal !== 'function') return;
  /** @param {string} selector @returns {HTMLElement} */
  const find = selector => {
    const element = dialog.querySelector(selector);
    if (!(element instanceof HTMLElement)) throw new Error('Falta un control de Sarin.');
    return element;
  };
  const input = /** @type {HTMLTextAreaElement} */ (find('#sarin-message'));
  const form = /** @type {HTMLFormElement} */ (find('#sarin-form'));
  const log = find('#sarin-log');
  const status = find('#sarin-status');
  const empty = find('#sarin-empty');
  const summaryPanel = find('#sarin-summary');
  const summaryText = /** @type {HTMLTextAreaElement} */ (find('#sarin-summary-text'));
  const whatsapp = /** @type {HTMLAnchorElement} */ (find('#sarin-whatsapp'));
  const conversation = find('#sarin-conversation');
  const title = /** @type {HTMLElement} */ (find('#sarin-title'));
  /** @typedef {typeof import('./sarin-api.js') & typeof import('./sarin-summary.js')} ChatModules */
  /** @type {ChatModules|undefined} */
  let modules;
  /** @type {Promise<ChatModules>|undefined} */
  let loading;
  /** @type {import('./sarin-api.js').ChatMessage[]} */
  let messages = [];
  /** @type {import('./sarin-api.js').ChatMessage[]} */
  let history = [];
  /** @type {import('./sarin-api.js').Brief} */
  let brief = {};
  /** @type {import('./sarin-api.js').Service|undefined} */
  let service;
  let turns = 0;
  let pending = false;
  let generation = 0;
  /** @type {AbortController|null|undefined} */
  let controller;
  let summaryDirty = false;
  let summaryPrepared = false;
  let suspended = false;
  const load = () => loading ||= Promise.all([import('./sarin-api.js'),import('./sarin-summary.js')]).then(([api,summary]) => (modules = { ...api,...summary }));
  const analytics = () => document.querySelector('#analytics-preferences[open]');
  /** @param {boolean} busy */
  const setBusy = busy => {
    pending = busy;
    const submit = form.querySelector('button');
    if (submit) submit.disabled = busy || turns >= 15;
    input.readOnly = busy || turns >= 15;
    form.setAttribute('aria-busy',String(busy));
  };
  /** @param {'user'|'assistant'} role @param {string} content @param {import('./sarin-api.js').Example[]} [examples] */
  const append = (role,content,examples = []) => {
    const article = document.createElement('article');
    article.className = `sarin-message sarin-message--${role}`;
    const speaker = document.createElement('p');
    speaker.className = 'sarin-speaker';
    speaker.textContent = role === 'user' ? 'Tú' : 'Sarin';
    const text = document.createElement('p');
    text.textContent = content;
    article.append(speaker,text);
    for (const example of examples) {
      const link = document.createElement('a');
      link.href = example.url; link.target = '_blank'; link.rel = 'noopener noreferrer';
      link.className = 'sarin-example';
      const name = document.createElement('strong'); name.textContent = `${example.title} ↗`;
      const description = document.createElement('span'); description.textContent = example.description;
      link.append(name,description); article.append(link);
    }
    log.append(article);
    empty.hidden = true;
    const scroller = find('#sarin-content');
    scroller.scrollTop = scroller.scrollHeight;
  };
  const close = () => { suspended = false; dialog.close(); };
  launcher.hidden = false;
  launcher.addEventListener('click', () => {
    if (analytics() || dialog.open) return;
    dialog.showModal(); title.focus();
    load().catch(() => { status.textContent = 'Sarin no está disponible. Puedes hablar con Andrés.'; });
  });
  find('[data-sarin-close]').addEventListener('click',close);
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  dialog.addEventListener('close', () => { if (!suspended && !analytics()) launcher.focus({preventScroll:true}); });
  // El aviso existente puede abrirse al restaurar la página o desde sus preferencias.
  // Observar su estado evita modificar su consentimiento independiente.
  const watchAnalytics = () => {
    const notice = document.querySelector('#analytics-preferences');
    if (!notice) return;
    new MutationObserver(() => {
      if (analytics() && dialog.open) { suspended = true; dialog.close(); }
      else if (!analytics() && suspended) { suspended = false; dialog.showModal(); title.focus(); }
    }).observe(notice,{attributes:true,attributeFilter:['open']});
  };
  if (document.querySelector('#analytics-preferences')) watchAnalytics();
  else {
    const observer = new MutationObserver(() => {if (document.querySelector('#analytics-preferences')) {observer.disconnect(); watchAnalytics();}});
    observer.observe(document.body,{childList:true});
  }
  find('[data-sarin-reset]').addEventListener('click', () => {
    generation++; controller?.abort(); controller = null;
    messages = []; history = []; brief = {}; service = undefined; turns = 0;
    log.replaceChildren(); empty.hidden = false; input.value = ''; status.textContent = 'Nueva conversación.';
    summaryText.value = ''; summaryDirty = false; summaryPrepared = false;
    summaryPanel.hidden = true; conversation.hidden = false; form.hidden = false;
    setBusy(false); input.focus();
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (pending || turns >= 15) return;
    const message = input.value.trim();
    if (!message || message.length > 1200) { status.textContent = 'Escribe un mensaje de 1 a 1200 caracteres.'; input.focus(); return; }
    const current = ++generation;
    controller = new AbortController();
    const signal = controller.signal;
    turns++; setBusy(true);
    messages.push({role:'user',content:message}); append('user',message);
    input.value = ''; status.textContent = 'Sarin está preparando una respuesta…';
    try {
      const api = await load();
      if (current !== generation) return;
      const result = await api.requestSarin(message,history.slice(-8),{signal});
      if (current !== generation) return;
      history.push({role:'user',content:message},{role:'assistant',content:result.reply});
      history = history.slice(-8);
      messages.push({role:'assistant',content:result.reply});
      brief = {...brief,...result.brief}; service = result.service || service;
      append('assistant',result.reply,result.examples);
      status.textContent = turns >= 15 ? 'Llegamos a 15 consultas. Prepara el resumen para continuar con Andrés o inicia una conversación nueva.' : '';
      if (!summaryDirty) summaryPrepared = false;
    } catch (error) {
      if (current !== generation) return;
      status.textContent = error instanceof Error && error.name !== 'AbortError' ? error.message : 'La consulta se canceló. Puedes contactar con Andrés.';
      // Mensaje fijo para errores de red: no revelar detalles internos del navegador.
      if (error instanceof TypeError) status.textContent = 'No pudimos conectar con Sarin. Puedes contactar con Andrés.';
    } finally {
      if (current === generation) {setBusy(false); controller = null;}
    }
  });
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && event.keyCode !== 229) {event.preventDefault(); form.requestSubmit();}
  });
  dialog.querySelectorAll('[data-sarin-service]').forEach(button => button.addEventListener('click', () => {
    input.value = `Me interesa ${(button.getAttribute('data-sarin-service') || '').toLowerCase()} para mi negocio.`;
    input.focus();
  }));
  const updateSummary = () => {
    const length = summaryText.value.length;
    find('#sarin-summary-count').textContent = `${length} / 1800 caracteres`;
    const invalid = length > 1800;
    summaryText.setAttribute('aria-invalid',String(invalid));
    find('#sarin-summary-error').textContent = invalid ? 'El resumen supera 1800 caracteres. Acórtalo antes de continuar; no se ha recortado.' : '';
    whatsapp.setAttribute('aria-disabled',String(invalid));
    if (invalid) whatsapp.removeAttribute('href');
    else if (modules) whatsapp.href = modules.whatsappUrl(summaryText.value);
  };
  whatsapp.addEventListener('click', event => { if (!whatsapp.hasAttribute('href')) {event.preventDefault(); summaryText.focus();} });
  summaryText.addEventListener('input', () => {summaryDirty = true; updateSummary();});
  find('[data-sarin-summary]').addEventListener('click', async () => {
    try {
      const api = await load();
      if (!summaryPrepared && !summaryDirty) {summaryText.value = api.createSummary({messages,brief,service}); summaryPrepared = true;}
      updateSummary(); conversation.hidden = true; summaryPanel.hidden = false; form.hidden = true; summaryText.focus();
    } catch {status.textContent = 'No pudimos preparar el resumen. Puedes hablar directamente con Andrés.';}
  });
  find('[data-sarin-back]').addEventListener('click', () => {summaryPanel.hidden = true; conversation.hidden = false; form.hidden = false; input.focus();});
}
