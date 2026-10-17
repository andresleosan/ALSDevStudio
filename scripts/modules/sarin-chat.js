// @ts-check
import {validateSarinLead} from './sarin-lead.js';
/** Vista en memoria; el historial autorizado se conserva en el servidor durante 30 días. */
export async function initSarinChat() {
  const dialog = document.querySelector('#sarin-chat');
  const launcher = document.querySelector('#sarin-launcher');
  if (!(dialog instanceof HTMLDialogElement) || !(launcher instanceof HTMLButtonElement) || typeof dialog.showModal !== 'function') return;
  const privateTest=new URLSearchParams(location.search).get('sarin')==='prueba';
  if(launcher.dataset.sarinEnabled!=='true' && !privateTest)return;
  if(privateTest){
    try{const api=await import('./sarin-api.js');await api.checkSarinPrivateTest();}
    catch{
      const notice=document.createElement('p');notice.id='sarin-private-access';notice.className='wrap';notice.setAttribute('role','status');
      notice.append('La prueba privada requiere tu acceso de administración. ');
      const login=document.createElement('a');login.href='/control-sarin/';login.textContent='Abrir administración de Sarin';notice.append(login);
      document.querySelector('main')?.prepend(notice);return;
    }
    const notice=document.createElement('p');notice.className='sarin-notice';notice.textContent='Prueba privada · usa datos ficticios. Estas conversaciones aparecerán en el panel y se conservarán durante 30 días.';
    dialog.querySelector('#sarin-content')?.prepend(notice);
  }
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
  const consentPanel=/** @type {HTMLFormElement} */(find('#sarin-consent'));
  const leadFields=/** @type {HTMLFieldSetElement} */(find('.sarin-lead-fields'));
  const firstName=/** @type {HTMLInputElement} */(find('#sarin-first-name'));
  const lastName=/** @type {HTMLInputElement} */(find('#sarin-last-name'));
  const email=/** @type {HTMLInputElement} */(find('#sarin-email'));
  const contactFields={firstName,lastName,email};
  const consent=/** @type {HTMLInputElement} */(find('#sarin-consent-checkbox'));
  const authorize=/** @type {HTMLButtonElement} */(find('[data-sarin-authorize]'));
  const reference=find('#sarin-reference');
  const offerPrivateAccess=()=>{
    if(!privateTest)return;
    const link=document.createElement('a');link.href='/control-sarin/';link.textContent='Revisar acceso en la administración de Sarin';status.append(' ',link);
  };
  /** @typedef {typeof import('./sarin-api.js') & typeof import('./sarin-summary.js')} ChatModules */
  /** @type {ChatModules|undefined} */
  let modules;
  /** @type {Promise<ChatModules>|undefined} */
  let loading;
  /** @type {import('./sarin-api.js').ChatMessage[]} */
  let messages = [];
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
  let authorized=false;
  let onboarding=true;
  let expired=false;
  let creatingSession=false;
  let conversationId='';
  const load = () => loading ||= Promise.all([import('./sarin-api.js'),import('./sarin-summary.js')]).then(([api,summary]) => (modules = { ...api,...summary }));
  const analytics = () => document.querySelector('#analytics-preferences[open]');
  /** @param {boolean} busy */
  const setBusy = busy => {
    pending = busy;
    const canChat=authorized && !onboarding;
    const submit = form.querySelector('button');
    if (submit) submit.disabled = busy || !canChat || expired || turns >= 15;
    input.readOnly = busy || !canChat || expired || turns >= 15;
    form.hidden=onboarding || !summaryPanel.hidden;
    find('#sarin-notice').hidden=onboarding;
    find('#sarin-retention').hidden=onboarding;
    authorize.disabled=busy || !consent.checked;
    leadFields.disabled=creatingSession;consent.disabled=creatingSession;
    dialog.querySelectorAll('[data-sarin-service]').forEach(button=>{ if(button instanceof HTMLButtonElement) button.disabled=busy || !canChat || expired || turns>=15; });
    /** @type {HTMLButtonElement} */(find('[data-sarin-reset]')).disabled=creatingSession;
    form.setAttribute('aria-busy',String(busy));
  };
  consent.addEventListener('change',()=>{authorize.disabled=pending || !consent.checked;});
  const clearLeadErrors=()=>{
    for(const field of Object.values(contactFields)){field.removeAttribute('aria-invalid');const error=find(`#${field.id}-error`);error.hidden=true;error.textContent='';}
  };
  for(const field of Object.values(contactFields))field.addEventListener('input',()=>{
    field.removeAttribute('aria-invalid');const error=find(`#${field.id}-error`);error.hidden=true;error.textContent='';
  });
  consentPanel.reset();
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
  /** La vista anterior se limpia solo después de crear la sesión solicitada. */
  const startSession=async()=>{
    if(creatingSession)return;
    clearLeadErrors();
    const result=validateSarinLead({firstName:firstName.value,lastName:lastName.value,email:email.value});
    if(!result.ok){
      const field=result.field==='lead'?firstName:contactFields[result.field];
      const error=find(`#${field.id}-error`);error.textContent=result.message;error.hidden=false;field.setAttribute('aria-invalid','true');
      status.textContent=result.message;field.focus();field.scrollIntoView({block:'center',behavior:'instant'});return;
    }
    if(!consent.checked){status.textContent='Marca la autorización para iniciar o elige contacto directo.';consent.focus();return;}
    const current=++generation;controller?.abort();controller=new AbortController();
    creatingSession=true;setBusy(true);status.textContent='Iniciando conversación…';
    try{
      const api=await load();const session=await api.createSarinSession({lead:result.lead,signal:controller.signal,privateTest});
      if(current!==generation)return;
      authorized=true;onboarding=false;expired=false;conversationId=session.conversationId;
      consentPanel.reset();clearLeadErrors();
      messages=[];brief={};service=undefined;turns=0;
      log.replaceChildren();empty.hidden=false;input.value='';
      reference.textContent=`Referencia: ${conversationId}`;reference.hidden=false;
      status.textContent='Conversación iniciada. La anterior, si existe, conserva su plazo de 30 días.';
      summaryText.value='';summaryDirty=false;summaryPrepared=false;
      summaryPanel.hidden=true;consentPanel.hidden=true;conversation.hidden=false;form.hidden=false;
    }catch(error){
      status.textContent=error instanceof Error && error.name!=='AbortError'?error.message:'No pudimos iniciar la conversación. Puedes contactar con Andrés.';
      offerPrivateAccess();
    }finally{
      if(current===generation){creatingSession=false;controller=null;setBusy(false);if(authorized && !expired)input.focus();}
    }
  };
  consentPanel.addEventListener('submit',event=>{event.preventDefault();void startSession();});
  find('[data-sarin-reset]').addEventListener('click',()=>{
    if(creatingSession)return;
    generation++;controller?.abort();controller=null;
    onboarding=true;consentPanel.reset();clearLeadErrors();
    summaryPanel.hidden=true;consentPanel.hidden=false;conversation.hidden=false;setBusy(false);
    status.textContent='Completa tus datos y autoriza para iniciar una nueva conversación. La anterior conserva su plazo de 30 días.';
    firstName.focus();firstName.scrollIntoView({block:'center',behavior:'instant'});
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (pending || !authorized || onboarding || expired || turns >= 15) return;
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
      const requestId=crypto.randomUUID();
      const result = await api.requestSarin(message,requestId,{signal,privateTest});
      if (current !== generation) return;
      if((result.conversationId && result.conversationId!==conversationId) || (result.requestId && result.requestId!==requestId)) throw new Error('La respuesta no corresponde a esta conversación. Puedes contactar con Andrés.');
      if(result.turn)turns=result.turn;
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
      if(error instanceof Error && 'status' in error && [401,403,410].includes(Number(error.status)))expired=true;
      offerPrivateAccess();
    } finally {
      if (current === generation) {setBusy(false); controller = null;}
    }
  });
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && event.keyCode !== 229) {event.preventDefault(); form.requestSubmit();}
  });
  dialog.querySelectorAll('[data-sarin-service]').forEach(button => button.addEventListener('click', () => {
    if(!authorized || onboarding || pending || expired)return;
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
      if (!summaryPrepared && !summaryDirty) {summaryText.value = api.createSummary({messages,brief,service})+(conversationId?`\n\nReferencia de conversación: ${conversationId}`:''); summaryPrepared = true;}
      updateSummary(); conversation.hidden = true; consentPanel.hidden=true; summaryPanel.hidden = false; form.hidden = true; summaryText.focus();
    } catch {status.textContent = 'No pudimos preparar el resumen. Puedes hablar directamente con Andrés.';}
  });
  find('[data-sarin-back]').addEventListener('click', () => {summaryPanel.hidden = true; conversation.hidden = false; consentPanel.hidden=!onboarding;setBusy(pending);(onboarding?firstName:input).focus();});
  setBusy(false);
  if(privateTest && !analytics())launcher.click();
}
