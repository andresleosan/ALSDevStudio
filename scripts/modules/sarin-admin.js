// @ts-check
import {createSarinAdminAuth} from './sarin-admin-auth.js';
/** Panel privado. Los mensajes permanecen en el DOM y nunca se interpretan como HTML. */
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const dateFormat=new Intl.DateTimeFormat('es-CO',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Bogota'});
/** @type {Record<string,string>} */
const services={website:'Página web',store:'Tienda virtual',application:'Aplicación a medida',chatbot:'Chatbot'};
/** @type {Record<string,string>} */
const states={empty:'Sin mensajes',active:'Activa',pending:'En curso',completed:'Respondida',out_of_scope:'Fuera de alcance',error:'Error',timeout:'Tiempo agotado',blocked:'Bloqueada',accepted:'Aceptado',reviewed:'Revisada',unreviewed:'Sin revisar',cancelled:'Cancelada',limit:'Límite alcanzado',validation:'Validación rechazada',review:'Revisión administrativa',block:'Sesión bloqueada',unblock:'Sesión desbloqueada'};
/** @param {unknown} value @returns {Record<string,any>} */
const record=value=>value && typeof value==='object' && !Array.isArray(value)?value:{};
/** @param {unknown} value */
const text=value=>typeof value==='string'?value:'';
/** @param {unknown} value */
const count=value=>Number.isFinite(value)?Math.max(0,Number(value)):0;
/** @param {unknown} value */
const date=value=>Number.isSafeInteger(value) && Number(value)>0 && Number(value)<=8640000000000000?dateFormat.format(new Date(Number(value))):'Sin registro';
/** @param {unknown} value */
const state=value=>Object.hasOwn(states,text(value))?states[text(value)]:'Estado no disponible';
/** @param {unknown} value @param {string} fallback */
const service=(value,fallback)=>Object.hasOwn(services,text(value))?services[text(value)]:fallback;
/** @param {unknown} value */
const money=value=>`USD ${(count(value)/1000000).toFixed(6)}`;
/** @param {string} tag @param {string} [content] @param {string} [className] */
function element(tag,content='',className=''){
  const node=document.createElement(tag);node.textContent=content;if(className)node.className=className;return node;
}

function initSarinAdmin(){
  /** @param {string} selector @returns {HTMLElement} */
  const find=selector=>{const node=document.querySelector(selector);if(!(node instanceof HTMLElement))throw new Error('Falta un control del panel.');return node;};
  const workspace=find('#admin-workspace'),status=find('#admin-status'),list=find('#admin-list'),detail=find('#admin-detail');
  const retry=/** @type {HTMLButtonElement} */(find('#admin-retry'));
  const login=find('#admin-login'),loginButton=/** @type {HTMLButtonElement} */(find('#admin-google-login')),logoutButton=/** @type {HTMLButtonElement} */(find('#admin-logout'));
  const filters=/** @type {HTMLFormElement} */(find('#admin-filters'));
  const more=/** @type {HTMLButtonElement} */(find('#admin-more'));
  const confirm=/** @type {HTMLDialogElement} */(find('#admin-delete-confirm'));
  let csrf='',selected='',cursor='',listGeneration=0,detailGeneration=0,bootstrapGeneration=0;
  let listPending=false,detailPending=false,mutationPending=false;
  let operationGeneration=0;
  /** @type {HTMLButtonElement|null} */let deleteTrigger=null;
  let deleteId='';
  /** @type {AbortController|null} */let listController=null;
  /** @type {AbortController|null} */let detailController=null;
  /** @type {AbortController|null} */let mutationController=null;
  /** @type {AbortController|null} */let bootstrapController=null;
  /** @param {string} message @param {boolean} [error] */
  const announce=(message,error=false)=>{status.textContent=message;status.toggleAttribute('data-error',error);};
  const clearDetail=()=>{detail.replaceChildren(element('p','Elige una conversación para ver sus mensajes.','admin-note'));selected='';};
  const clearWorkspace=()=>{
    csrf='';cursor='';operationGeneration++;bootstrapGeneration++;listGeneration++;detailGeneration++;
    listController?.abort();detailController?.abort();mutationController?.abort();bootstrapController?.abort();
    listPending=false;detailPending=false;mutationPending=false;deleteTrigger=null;deleteId='';
    list.replaceChildren();clearDetail();workspace.hidden=true;confirm.close();more.hidden=true;more.disabled=false;
    list.setAttribute('aria-busy','false');detail.setAttribute('aria-busy','false');
    find('#admin-count').textContent='';find('#admin-delete-reference').textContent='';
    find('#admin-purge').textContent='Comprobando la limpieza automática…';
    find('#admin-identity').textContent='Acceso privado';find('#admin-test-sarin').hidden=true;
  };
  const authentication=createSarinAdminAuth({onState:value=>{
    const busy=value.status==='busy';loginButton.disabled=busy;login.setAttribute('aria-busy',String(busy));
    if(value.status==='signed-in'){login.hidden=true;logoutButton.hidden=false;return;}
    if(value.status==='signed-out' || value.status==='error'){
      clearWorkspace();login.hidden=false;logoutButton.hidden=true;retry.hidden=true;
      announce(value.message || 'Sesión cerrada. Accede con Google para continuar.',value.status==='error');
      loginButton.focus({preventScroll:true});
      return;
    }
    if(value.message)announce(value.message);
  }});
  /** @param {unknown} error */
  const fail=error=>{
    const code=Number(record(error).status);
    if(code===401 || code===403){
      authentication.forget(code===401?'Tu acceso venció. Accede de nuevo con Google para continuar.':'Acceso no autorizado o autorización vencida. Accede con la cuenta de Google autorizada.');
    }else announce(error instanceof Error?error.message:'No pudimos completar la operación. Vuelve a intentarlo.',true);
  };
  /** @param {string} path @param {{action?:string,signal?:AbortSignal}} [options] */
  async function request(path,{action,signal}={}){
    const current=operationGeneration;
    const controller=new AbortController();
    const abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});
    if(signal?.aborted)controller.abort();
    let timedOut=false;const timer=setTimeout(()=>{timedOut=true;controller.abort();},15000);
    try{
      try{await authentication.ensureSession();}
      catch(error){if(current===operationGeneration)authentication.forget();throw error;}
      if(current!==operationGeneration)throw new DOMException('Solicitud cancelada','AbortError');
      if(controller.signal.aborted)throw new DOMException('Solicitud cancelada','AbortError');
      const response=await fetch(`/api/control-sarin/${path}`,{method:action?'POST':'GET',headers:action?{'Accept':'application/json','Content-Type':'application/json','X-Sarin-CSRF':csrf}:{'Accept':'application/json'},body:action?JSON.stringify({action}):undefined,credentials:'same-origin',cache:'no-store',redirect:'error',signal:controller.signal});
      if(!response.ok){
        const message=([401,403].includes(response.status))?'Tu acceso necesita verificarse de nuevo.':response.status===404 || response.status===410?'La conversación venció o fue eliminada. Actualiza el listado.':response.status===409?'La conversación está cambiando. Actualiza el listado antes de continuar.':'No pudimos completar la operación. Vuelve a intentarlo.';
        throw Object.assign(new Error(message),{status:response.status});
      }
      if(!response.headers.get('content-type')?.includes('application/json'))throw new Error('La respuesta del panel no es válida. Vuelve a comprobar tu acceso.');
      const body=await response.text();
      if(new TextEncoder().encode(body).byteLength>262144)throw new Error('La respuesta del panel es demasiado extensa.');
      return record(JSON.parse(body));
    }catch(error){
      if(timedOut)throw new Error('El panel tardó demasiado. Vuelve a intentarlo.');
      if(error instanceof TypeError || error instanceof SyntaxError)throw new Error('No pudimos conectar con el panel. Vuelve a intentarlo.');
      throw error;
    }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
  }
  /** @param {Record<string,any>} purge */
  function renderPurge(purge){
    const node=find('#admin-purge');
    const stale=!Number.isSafeInteger(purge.lastSuccessAt) || Date.now()-purge.lastSuccessAt>7200000;
    const warning=purge.status!=='ok' || stale || purge.remaining===true;
    node.toggleAttribute('data-warning',warning);
    node.textContent=purge.status==='never'?'Limpieza aún no ejecutada. Revisa su configuración.':purge.status==='error'?`La última limpieza falló. Último éxito: ${date(purge.lastSuccessAt)}.`:stale?`Limpieza atrasada. Último éxito: ${date(purge.lastSuccessAt)}.`:`Última limpieza: ${date(purge.lastSuccessAt)} (Colombia).`;
    if(purge.remaining===true)node.textContent+=' Quedan registros pendientes de limpieza.';
  }
  /** @param {string} label @param {string} value @param {HTMLElement} parent */
  function definition(label,value,parent){const wrap=element('div');wrap.append(element('dt',label),element('dd',value));parent.append(wrap);}
  /** @param {Record<string,any>} item */
  function listItem(item){
    const button=/** @type {HTMLButtonElement} */(element('button','','admin-conversation'));button.type='button';
    button.dataset.conversationId=item.id;button.setAttribute('aria-pressed',String(item.id===selected));
    button.append(element('strong',service(item.service,'Servicio por definir')),element('span',item.id,'admin-reference'),element('span',`${date(item.updatedAt)} · ${count(item.turns)} turnos`),element('span',`${state(item.status)} · ${item.reviewedAt?'Revisada':'Sin revisar'}`));
    if(count(item.outOfScopeCount) || count(item.errorCount))button.append(element('span',`${count(item.outOfScopeCount)} fuera de alcance · ${count(item.errorCount)} errores`,'admin-signal'));
    button.append(element('span',`${money(record(item.usage).verifiedMicros)} verificado`));
    button.addEventListener('click',()=>{void loadDetail(item.id);});return button;
  }
  /** @param {boolean} [append] */
  async function loadList(append=false){
    if(!csrf || (append && listPending))return;
    const params=new URLSearchParams({limit:'25'});
    for(const key of ['service','state']){const value=/** @type {HTMLSelectElement} */(find(`#admin-${key}`)).value;if(value)params.set(key,value);}
    const from=/** @type {HTMLInputElement} */(find('#admin-from')).value,to=/** @type {HTMLInputElement} */(find('#admin-to')).value;
    if(from && to && from>to){announce('La fecha inicial debe ser anterior o igual a la fecha final.',true);find('#admin-from').focus();return;}
    const current=++listGeneration;listController?.abort();listController=new AbortController();
    if(from)params.set('from',String(Date.parse(`${from}T00:00:00-05:00`)));
    if(to)params.set('to',String(Date.parse(`${to}T23:59:59.999-05:00`)));
    if(append && cursor)params.set('cursor',cursor);
    listPending=true;list.setAttribute('aria-busy','true');more.disabled=true;
    if(!append)list.replaceChildren(element('p','Cargando conversaciones…','admin-note'));
    try{
      const value=await request(`conversations?${params}`,{signal:listController.signal});
      if(current!==listGeneration || !csrf)return;
      if(!Array.isArray(value.items) || value.items.length>50 || value.items.some(item=>!uuid.test(text(record(item).id))) || (value.nextCursor!==null && value.nextCursor!==undefined && typeof value.nextCursor!=='string'))throw new Error('El listado no es válido. Vuelve a intentarlo.');
      if(!append)list.replaceChildren();
      for(const item of value.items)list.append(listItem(record(item)));
      if(!list.querySelector('[data-conversation-id]'))list.append(element('p','No hay conversaciones con estos filtros.','admin-note'));
      cursor=text(value.nextCursor);more.hidden=!cursor;
      find('#admin-count').textContent=`${list.querySelectorAll('[data-conversation-id]').length} cargadas`;
      announce('Listado actualizado. Fechas en hora de Colombia.');
    }catch(error){if(current===listGeneration && record(error).name!=='AbortError'){if(!append)list.replaceChildren(element('p','No pudimos cargar las conversaciones. Aplica los filtros para reintentar.','admin-note'));fail(error);}}
    finally{if(current===listGeneration){listPending=false;list.setAttribute('aria-busy','false');more.disabled=false;}}
  }
  /** @param {Record<string,any>} value */
  function renderDetail(value){
    const usage=record(value.usage),consent=record(value.consent);
    detail.replaceChildren();
    const title=element('h2',service(value.service,'Conversación con Sarin'));title.id='admin-detail-title';title.tabIndex=-1;
    detail.append(title,element('p',`Referencia: ${value.id}`,'admin-reference'));
    const meta=element('dl','','admin-detail-meta');
    for(const [label,valueText] of [['Estado',state(value.status)],['Turnos',String(count(value.turns))],['Inicio',date(value.createdAt)],['Última actividad',date(value.updatedAt)],['Vence',date(value.expiresAt)],['Revisión',value.reviewedAt?date(value.reviewedAt):'Sin revisar']])definition(label,valueText,meta);
    if(value.blockedUntil && value.blockedUntil>Date.now())definition('Bloqueada hasta',date(value.blockedUntil),meta);
    detail.append(meta);
    const actions=element('div','','admin-actions');
    const blocked=value.blockedUntil>Date.now();
    for(const [action,label] of [['review',value.reviewedAt?'Revisada':'Marcar revisión'],[blocked?'unblock':'block',blocked?'Desbloquear sesión':'Bloquear 24 horas'],['delete','Eliminar conversación']]){
      const button=/** @type {HTMLButtonElement} */(element('button',label,action==='delete'?'admin-danger':''));button.type='button';button.dataset.adminAction=action;button.disabled=mutationPending || (action==='review' && Boolean(value.reviewedAt));
      button.addEventListener('click',()=>{
        if(action==='delete'){deleteTrigger=button;deleteId=selected;find('#admin-delete-reference').textContent=deleteId;confirm.showModal();}
        else void mutate(selected,action);
      });actions.append(button);
    }detail.append(actions);
    const usageSection=element('section','','admin-usage'),usageTitle=element('h3','Consumo registrado'),usageList=element('dl');
    definition('Uso verificado',money(usage.verifiedMicros),usageList);definition('Reservas retenidas',money(usage.retainedMicros),usageList);definition('Total reservado',money(usage.reservedMicros),usageList);
    usageSection.append(usageTitle,usageList,element('p','Las reservas retenidas reflejan incertidumbre. Estos contadores no equivalen a una factura del proveedor.','admin-note'));detail.append(usageSection);
    const signals=element('div','','admin-signals');signals.append(element('p',`${count(value.outOfScopeCount)} consultas fuera de alcance · ${count(value.errorCount)} errores.`),element('p','Son señales para revisar el contexto; una consulta aislada no demuestra abuso.'));detail.append(signals);
    detail.append(element('h3','Mensajes y eventos','admin-timeline-title'));
    const timeline=element('ol','','admin-timeline');
    const messages=/** @type {unknown[]} */(value.messages),events=/** @type {unknown[]} */(value.events);
    /** @type {Array<Record<string,any>&{event:boolean,index:number}>} */
    const entries=[...messages.map((entry,index)=>({...record(entry),event:false,index})),...events.map((entry,index)=>({...record(entry),event:true,index:messages.length+index}))];
    entries.sort((a,b)=>count(a.at)-count(b.at) || a.index-b.index);
    for(const entry of entries){
      const item=element('li');
      if(entry.event){item.className='admin-event';item.textContent=`${date(entry.at)} · ${state(entry.kind)} · ${count(entry.count)} evento(s)`;}
      else{
        item.className=`admin-message${entry.role==='assistant'?' admin-message--assistant':''}`;
        item.append(element('p',`${entry.role==='assistant'?'Sarin':entry.role==='user'?'Visitante':'Rol no disponible'} · Turno ${count(entry.turn)} · ${date(entry.at)} · ${state(entry.status)}`,'admin-message-header'),element('p',text(entry.content),'admin-message-content'));
      }timeline.append(item);
    }
    if(!entries.length)timeline.append(element('li','Esta sesión todavía no tiene mensajes ni eventos.','admin-note'));
    detail.append(timeline,element('p','El historial se conserva 30 días desde el primer mensaje aceptado. Una respuesta emitida no acredita que el visitante la haya leído.','admin-note'));
    const consentSection=element('details','','admin-consent');consentSection.append(element('summary','Autorización registrada'));
    const consentList=element('dl');
    definition('Fecha de aceptación',date(consent.acceptedAt),consentList);
    definition('Aviso',text(consent.noticeVersion)||'Sin registro',consentList);definition('Privacidad',text(consent.privacyVersion)||'Sin registro',consentList);definition('Términos',text(consent.termsVersion)||'Sin registro',consentList);
    definition('Manifestación',consent.method==='checkbox_and_start'?'Casilla y acción de iniciar':'Sin registro',consentList);consentSection.append(consentList);detail.append(consentSection);
    title.focus({preventScroll:true});if(matchMedia('(max-width:680px)').matches)detail.scrollIntoView({block:'start',behavior:'instant'});
  }
  /** @param {string} id */
  async function loadDetail(id){
    if(!csrf || !uuid.test(id) || mutationPending)return;
    const current=++detailGeneration;detailController?.abort();detailController=new AbortController();
    selected=id;detailPending=true;detail.setAttribute('aria-busy','true');detail.replaceChildren(element('p','Cargando conversación…','admin-note'));
    list.querySelectorAll('[data-conversation-id]').forEach(button=>button.setAttribute('aria-pressed',String(/** @type {HTMLElement} */(button).dataset.conversationId===id)));
    try{
      const value=await request(`conversations/${encodeURIComponent(id)}`,{signal:detailController.signal});
      if(current!==detailGeneration || !csrf)return;
      if(value.id!==id || !Array.isArray(value.messages) || value.messages.length>32 || !Array.isArray(value.events) || value.events.length>32)throw new Error('El detalle no es válido. Actualiza el listado.');
      renderDetail(value);announce('Conversación cargada. Fechas en hora de Colombia.');
    }catch(error){if(current===detailGeneration && record(error).name!=='AbortError'){detail.replaceChildren(element('p','No pudimos cargar el detalle. Elige de nuevo una conversación.','admin-note'));fail(error);}}
    finally{if(current===detailGeneration){detailPending=false;detail.setAttribute('aria-busy','false');}}
  }
  /** @param {string} id @param {string} action */
  async function mutate(id,action){
    if(!csrf || mutationPending || detailPending || !uuid.test(id))return;
    const current=operationGeneration;mutationController?.abort();mutationController=new AbortController();
    mutationPending=true;detail.querySelectorAll('button').forEach(button=>{button.disabled=true;});announce('Aplicando acción…');
    try{
      const value=await request(`conversations/${encodeURIComponent(id)}`,{action,signal:mutationController.signal});
      if(current!==operationGeneration || !csrf)return;
      if(value.ok!==true)throw new Error('La acción no pudo confirmarse. Actualiza el listado.');
      if(action==='delete'){detailGeneration++;detailController?.abort();clearDetail();}
      mutationPending=false;
      await loadList();if(current!==operationGeneration || !csrf)return;
      if(action!=='delete')await loadDetail(id);
      if(current!==operationGeneration || !csrf)return;
      announce(action==='delete'?'Conversación eliminada.':action==='review'?'Conversación marcada como revisada.':action==='block'?'Sesión bloqueada durante 24 horas.':'Sesión desbloqueada.');
      if(action==='delete')find('#admin-list-title').setAttribute('tabindex','-1'),find('#admin-list-title').focus();
    }catch(error){if(current===operationGeneration && record(error).name!=='AbortError'){fail(error);detail.querySelectorAll('button').forEach(button=>{button.disabled=false;});}}
    finally{if(current===operationGeneration)mutationPending=false;}
  }
  filters.addEventListener('submit',event=>{event.preventDefault();void loadList();});more.addEventListener('click',()=>{void loadList(true);});
  find('[data-admin-cancel-delete]').addEventListener('click',()=>confirm.close());
  confirm.addEventListener('close',()=>{deleteTrigger?.focus({preventScroll:true});});
  find('[data-admin-confirm-delete]').addEventListener('click',()=>{const id=deleteId;confirm.close();void mutate(id,'delete');});
  async function bootstrap(){
    const current=++bootstrapGeneration;bootstrapController?.abort();bootstrapController=new AbortController();
    retry.hidden=true;workspace.hidden=true;find('#admin-test-sarin').hidden=true;csrf='';announce('Verificando acceso…');
    try{
      const value=await request('bootstrap',{signal:bootstrapController.signal});if(current!==bootstrapGeneration)return;
      if(typeof value.csrfToken!=='string' || value.csrfToken.length<16 || value.csrfToken.length>4096 || typeof value.adminEmail!=='string' || value.adminEmail.length>320)throw new Error('No pudimos verificar el acceso. Vuelve a intentarlo.');
      csrf=value.csrfToken;find('#admin-identity').textContent=value.adminEmail;renderPurge(record(value.purge));find('#admin-test-sarin').hidden=value.privateTestEnabled!==true;workspace.hidden=false;clearDetail();await loadList();
    }catch(error){if(current===bootstrapGeneration && record(error).name!=='AbortError'){fail(error);login.hidden=false;retry.hidden=([401,403].includes(Number(record(error).status)));}}
  }
  loginButton.addEventListener('click',()=>{clearWorkspace();retry.hidden=true;void authentication.login().then(()=>bootstrap()).catch(()=>{});});
  logoutButton.addEventListener('click',()=>{logoutButton.disabled=true;void authentication.logout().catch(()=>{logoutButton.hidden=false;}).finally(()=>{logoutButton.disabled=false;});});
  retry.addEventListener('click',()=>{void bootstrap();});
  void authentication.restore().then(restored=>{if(restored)return bootstrap();}).catch(()=>{});
}
try{initSarinAdmin();}catch{const status=document.querySelector('#admin-status');if(status)status.textContent='El panel no está disponible. Recarga la página para volver a comprobar tu acceso.';}
