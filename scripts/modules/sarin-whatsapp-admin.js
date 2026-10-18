// @ts-check
/** Staff WhatsApp: transporte autenticado inyectado; ninguna credencial o contenido persiste en el navegador. */
/** @param {unknown} value @returns {Record<string,any>} */
const record=value=>value && typeof value==='object' && !Array.isArray(value)?value:{};
/** @param {unknown} value */
const text=value=>typeof value==='string'?value:'';
/** @param {unknown} value */
const opaque=value=>typeof value==='string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);
/** @param {unknown} value */
const revision=value=>Number.isSafeInteger(value) && Number(value)>=0;
const formatter=new Intl.DateTimeFormat('es-CO',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Bogota'});
/** @param {unknown} value */
const date=value=>Number.isSafeInteger(value) && Number(value)>0 && Number(value)<=8640000000000000?formatter.format(Number(value)):'Sin registro';
/** @type {Record<string,string>} */
const labels={queued:'En espera',claimed:'Preparando respuesta',inference_started:'Generando respuesta',ready:'Respuesta lista; aún no enviada',sending:'Envío iniciado',accepted:'Aceptado por el proveedor; entrega pendiente',sent:'Enviado; entrega sin confirmar',delivered:'Entregado',read:'Leído',cancelled:'Cancelado',expired:'Vencido',rejected:'Rechazado',failed:'Fallido',inference_uncertain:'No pudimos confirmar la generación. Requiere atención humana; no se repetirá automáticamente.',send_uncertain:'No pudimos confirmar el envío. Puede haberse enviado; revisa antes de continuar.'};
/** @type {Record<string,string>} */
const lookupLabels={idle:'Sin consulta solicitada',pending:'Consulta pendiente',claimed:'Consulta en curso',complete:'Consulta finalizada',exhausted:'Consultas agotadas. Requiere atención humana.',conflict:'Identidad en conflicto. Requiere atención humana.'};
/** @template {keyof HTMLElementTagNameMap} T @param {T} tag @param {string} [content] @param {string} [className] */
function element(tag,content='',className=''){const node=document.createElement(tag);node.textContent=content;if(className)node.className=className;return node;}
/** @param {unknown} value */
function consent(value){
  const item=record(value);
  if(item.status==='accepted' && item.expiresAt>Date.now())return `Aceptación vigente hasta ${date(item.expiresAt)}`;
  if(item.status==='accepted' || item.status==='expired')return 'Aceptación vencida. Se requiere un nuevo aviso.';
  if(item.status==='revoked')return 'Aceptación revocada.';
  if(item.status==='pending_delivery')return 'ACEPTO recibido. Esperando confirmar la entrega del aviso.';
  return 'Aceptación pendiente. Esperando ACEPTO después del aviso entregado.';
}
/** @param {Record<string,any>} value */
function validPeer(value){return opaque(value.peerKey) && revision(value.revision) && typeof value.paused==='boolean' && typeof value.maskedPhone==='string' && value.maskedPhone.length<=40 && !/\d{5}/.test(value.maskedPhone) && /[•*…]/u.test(value.maskedPhone);}

/** @typedef {{body?:Record<string,unknown>,signal?:AbortSignal}} RequestOptions */
/** @param {{request:(path:string,options?:RequestOptions)=>Promise<Record<string,any>>,fail:(error:unknown)=>void}} options */
export function createWhatsAppAdmin({request,fail}){
  /** @param {string} selector @returns {HTMLElement} */
  const find=selector=>{const node=document.querySelector(selector);if(!(node instanceof HTMLElement))throw Error('Falta un control de WhatsApp.');return node;};
  const panel=find('#wa-panel'),list=find('#wa-list'),detail=find('#wa-detail'),status=find('#wa-status'),pilotNode=find('#wa-pilot'),more=find('#wa-load-more');
  let ready=false,active=false,inViewport=true,generation=0,selected='',detailKey='',pending=false,fresh=false,loading=false,pageCount=1,itemCount=0;
  /** @type {string|null} */let nextCursor=null;
  /** @type {Record<string,any>|null} */let pilot=null;
  /** @type {Record<string,any>|null} */let snapshot=null;
  let timer=0,expiryTimer=0;
  /** @type {AbortController|null} */let controller=null;
  const visible=()=>ready && active && inViewport && document.visibilityState==='visible';
  /** @param {string} message */
  const announce=message=>{status.textContent=message;};
  const disable=()=>{panel.querySelectorAll('button[data-wa-action]').forEach(button=>{if(button instanceof HTMLButtonElement)button.disabled=pending || !fresh || button.hasAttribute('data-wa-unavailable');});if(more instanceof HTMLButtonElement)more.disabled=pending || loading || !fresh;more.hidden=!nextCursor || itemCount>=1000 || pageCount>=10;};
  const scrollRegion=()=>{const thread=detail.querySelector('#wa-thread');if(thread instanceof HTMLElement){if(thread.scrollHeight>thread.clientHeight+1)thread.tabIndex=0;else thread.removeAttribute('tabindex');}};
  window.addEventListener('resize',scrollRegion);
  if(typeof ResizeObserver==='function')new ResizeObserver(scrollRegion).observe(detail);
  const expire=()=>{
    clearTimeout(expiryTimer);let next=Infinity;
    detail.querySelectorAll('[data-expires-at]').forEach(node=>{const at=Number(node.getAttribute('data-expires-at'));if(at<=Date.now())node.remove();else next=Math.min(next,at);});
    panel.querySelectorAll('[data-wa-consent-expiry]').forEach(node=>{const at=Number(node.getAttribute('data-wa-consent-expiry'));if(at<=Date.now()){node.textContent='Aceptación vencida. Se requiere un nuevo aviso.';node.removeAttribute('data-wa-consent-expiry');}else next=Math.min(next,at);});
    if(Number.isFinite(next))expiryTimer=setTimeout(expire,Math.max(1,next-Date.now()));scrollRegion();
  };
  const stop=()=>{generation++;clearTimeout(timer);controller?.abort();controller=null;pending=false;fresh=false;loading=false;disable();};
  const clear=()=>{stop();clearTimeout(expiryTimer);selected='';pilot=null;snapshot=null;detailKey='';pageCount=1;itemCount=0;nextCursor=null;more.hidden=true;list.replaceChildren();detail.replaceChildren();pilotNode.replaceChildren();status.textContent='';};
  /** @param {string} label @param {()=>unknown} action */
  function button(label,action){const node=element('button',label);node.type='button';node.dataset.waAction='';node.addEventListener('click',action);return node;}
  /** @param {Record<string,any>} value */
  function renderPilot(value){
    if(!revision(value.revision) || typeof value.enabled!=='boolean')throw Error('El estado del servicio no es válido.');
    const key=JSON.stringify(value);if(pilot && JSON.stringify(pilot)===key)return;pilot=value;
    const state=element('div','','wa-pilot-summary');state.append(element('p',value.enabled?'Respuestas automáticas activas':'Respuestas apagadas','wa-pilot-state'));
    if(!value.enabled)state.append(element('p','Sarin no responderá automáticamente.','admin-note'));
    pilotNode.replaceChildren(state);pilotNode.dataset.enabled=String(value.enabled);
    if(value.recoveryBlockedUntil>Date.now())pilotNode.append(element('p',`Envíos bloqueados tras restaurar datos, hasta ${date(value.recoveryBlockedUntil)} (Colombia). Activar las respuestas no abre este bloqueo.`,'admin-note'));
    if(!value.enabled && value.repliesEnabled!==true)pilotNode.append(element('p','Respuestas deshabilitadas en este entorno. No se puede activar el servicio.','admin-note'));
    const control=button(value.enabled?'Apagar respuestas':'Activar respuestas',()=>mutate('pilot',{enabled:!value.enabled,revision:value.revision},value.enabled?'Respuestas apagadas. Sarin no responderá automáticamente.':'Respuestas activadas. La aceptación y un mensaje nuevo siguen siendo necesarios; no se procesarán mensajes anteriores.'));
    control.className=value.enabled?'admin-danger':'admin-primary';control.toggleAttribute('data-wa-unavailable',!value.enabled && value.repliesEnabled!==true);pilotNode.append(control);
  }
  /** @param {Record<string,any>[]} items */
  function renderList(items){
    const keys=new Set();
    for(const item of items){
      keys.add(item.peerKey);let node=[...list.querySelectorAll('button')].find(node=>node.getAttribute('data-wa-peer')===item.peerKey);
      if(!node){node=element('button','','admin-conversation');node.type='button';node.dataset.waPeer=item.peerKey;node.addEventListener('click',()=>{selected=item.peerKey;detailKey='';snapshot=null;fresh=false;stop();detail.replaceChildren(element('p','Cargando contacto…','admin-note'));void refresh(true);});list.append(node);}
      const content=`${item.maskedPhone}\n${item.paused?'Sarin pausado. Atención humana requerida.':'Sarin activo'}\n${consent(item.consent)}\n${date(item.updatedAt)}`;
      if(node.dataset.waSummary!==content){
        const accepted=element('span',consent(item.consent));if(record(item.consent).status==='accepted' && record(item.consent).expiresAt>Date.now())accepted.dataset.waConsentExpiry=record(item.consent).expiresAt;
        const state=element('span',item.paused?'Sarin pausado · Tu turno':'Sarin activo','wa-contact-state');state.dataset.paused=String(item.paused);
        node.replaceChildren(element('strong',item.maskedPhone),state,accepted,element('span',date(item.updatedAt),'wa-contact-time'));node.dataset.waSummary=content;
      }node.setAttribute('aria-pressed',String(item.peerKey===selected));
    }
    for(const node of [...list.children])if(!keys.has(node.getAttribute('data-wa-peer')))node.remove();
    if(!items.length)list.append(element('p','Aún no hay contactos de WhatsApp.','admin-note'));
  }
  /** @param {Record<string,any>} value @param {boolean} focus */
  function renderDetail(value,focus){
    if(!validPeer(value) || value.peerKey!==selected || !Array.isArray(value.events) || value.events.length>100 || !Array.isArray(value.outputs) || value.outputs.length>100)throw Error('El detalle de WhatsApp no es válido.');
    snapshot=value;const key=JSON.stringify(value);if(key===detailKey){expire();return;}detailKey=key;
    const focused=document.activeElement?.getAttribute('data-wa-focus'),threadFocused=document.activeElement?.id==='wa-thread';
    const oldThread=detail.querySelector('#wa-thread'),scrollTop=oldThread?.scrollTop || 0;
    const expanded=[...detail.querySelectorAll('details[open]')].map(node=>node.className);detail.replaceChildren();
    const toolbar=element('header','','wa-contact-toolbar'),identity=element('div','','wa-contact-identity');
    const title=element('h3',value.maskedPhone);title.id='wa-detail-title';title.tabIndex=-1;
    const state=element('p',value.paused?'Sarin pausado. Atención humana requerida.':'Sarin activo','wa-contact-state');state.dataset.paused=String(value.paused);
    identity.append(title,state);toolbar.append(identity);detail.append(toolbar);
    const meta=element('dl','','admin-detail-meta');
    for(const [label,content] of [['Aceptación',consent(value.consent)],['Última actividad',`${date(value.updatedAt)} (Colombia)`]]){const wrap=element('div'),description=element('dd',content);if(label==='Aceptación' && record(value.consent).status==='accepted' && record(value.consent).expiresAt>Date.now())description.dataset.waConsentExpiry=record(value.consent).expiresAt;wrap.append(element('dt',label),description);meta.append(wrap);}
    const action=button(value.paused?'Reactivar Sarin':'Pausar Sarin',()=>{if(snapshot)void mutate(`peers/${encodeURIComponent(selected)}/action`,{action:snapshot.paused?'resume':'pause',revision:snapshot.revision},snapshot.paused?'Sarin reactivado. El participante debe escribir un mensaje nuevo. No se procesarán mensajes anteriores.':'Sarin pausado. Atención humana requerida.');});action.dataset.waFocus='peer';action.className=value.paused?'admin-primary':'wa-pause';toolbar.append(action);
    const thread=element('div','','wa-thread');thread.id='wa-thread';thread.setAttribute('role','region');thread.setAttribute('aria-label','Mensajes y eventos');detail.append(thread);
    const info=element('details','','wa-contact-info'),infoSummary=element('summary','Detalles del contacto y reactivación');infoSummary.dataset.waFocus='contact-info';info.append(infoSummary,meta,element('p','Al reactivar se inicia un contexto nuevo. El participante debe escribir un mensaje nuevo; no se procesarán mensajes anteriores. Si la aceptación venció o fue revocada, se requiere un nuevo aviso.','admin-note'));thread.append(info);
    thread.append(element('h3','Mensajes y eventos','admin-timeline-title'));const timeline=element('ol','','admin-timeline');
    for(const entry of value.events){
      if(!Number.isSafeInteger(entry.expiresAt) || entry.expiresAt<=Date.now())continue;
      const node=element('li','',entry.kind==='echo'?'admin-event wa-human-event':`admin-message${entry.role==='assistant'?' admin-message--assistant':''}`);node.dataset.expiresAt=entry.expiresAt;
      node.append(element('p',`${entry.kind==='echo'?'Respuesta desde el celular':entry.role==='assistant'?'Sarin':'Participante'} · ${date(entry.at)}`,'admin-message-header'));
      if(entry.kind!=='echo' && entry.kind==='message')node.append(element('p',text(entry.content).slice(0,4000),'admin-message-content'));
      timeline.append(node);
    }
    if(!timeline.children.length)timeline.append(element('li','No hay mensajes vigentes. El contenido se conserva hasta 24 horas.','admin-note'));
    thread.append(timeline);const delivery=element('details','','wa-delivery'),outputs=element('ol','','admin-timeline');
    const needsAttention=value.outputs.some((/** @type {Record<string,any>} */output)=>!['delivered','read','cancelled','expired'].includes(output.status));
    const deliverySummary=element('summary',`Estado de entrega · ${value.outputs.length}${needsAttention?' · Por revisar':''}`);deliverySummary.dataset.waFocus='delivery-info';delivery.append(deliverySummary);delivery.dataset.attention=String(needsAttention);
    for(const output of value.outputs){
      if(!opaque(output.id))continue;const lookup=record(output.reconciliation),node=element('li','','admin-event');
      node.append(element('p',labels[output.status] || 'Estado no disponible'),element('p',`${date(output.updatedAt)} · ${lookupLabels[lookup.status] || 'Sin consulta disponible'} · ${Math.min(3,Math.max(0,Number(lookup.attempts)||0))}/3 consultas`));
      if(lookup.nextAt)node.append(element('p',`Próxima consulta a partir de ${date(lookup.nextAt)}`));
      if(output.canReconcile===true && lookup.status==='idle' && Number(lookup.attempts)<3){const control=button('Consultar estado',()=>mutate(`outbox/${encodeURIComponent(output.id)}/reconcile`,{},'Consulta pendiente. Se comprobará en un próximo ciclo; no envía otro mensaje.'));control.dataset.waFocus=output.id;node.append(control);}
      outputs.append(node);
    }
    delivery.append(outputs);thread.append(delivery);for(const node of [info,delivery]){node.open=expanded.includes(node.className);node.addEventListener('toggle',scrollRegion);}
    expire();thread.scrollTop=focus?0:scrollTop;
    if(focus){title.focus({preventScroll:true});if(matchMedia('(max-width:680px)').matches)detail.scrollIntoView({block:'start',behavior:'instant'});}
    else if(threadFocused){thread.focus({preventScroll:true});}
    else if(focused){const target=[...detail.querySelectorAll('[data-wa-focus]')].find(node=>node.getAttribute('data-wa-focus')===focused);if(target instanceof HTMLElement)target.focus({preventScroll:true});}
  }
  async function refresh(focus=false,loadMore=false){
    if(!visible() || pending || loading)return;clearTimeout(timer);controller?.abort();controller=new AbortController();const signal=controller.signal,current=++generation;loading=true;disable();panel.setAttribute('aria-busy','true');
    try{
      const depth=Math.min(10,pageCount+(loadMore?1:0)),items=new Map(),seen=new Set(),before=new Set([...list.querySelectorAll('[data-wa-peer]')].map(node=>node.getAttribute('data-wa-peer')));
      /** @type {string|null} */let cursor=null;
      /** @type {Record<string,any>|null} */let service=null;
      let pages=0;
      do{
        const value=await request('peers'+(cursor?'?cursor='+encodeURIComponent(cursor):''),{signal});if(current!==generation || !visible())return;
        if(!Array.isArray(value.items) || value.items.length>100 || value.items.some((/** @type {unknown} */item)=>!validPeer(record(item)))
          || new Set(value.items.map((/** @type {Record<string,any>} */item)=>item.peerKey)).size!==value.items.length
          || (value.nextCursor!=null && (typeof value.nextCursor!=='string' || !/^wa1_[A-Za-z0-9_-]{86}$/.test(value.nextCursor) || seen.has(value.nextCursor))))throw Error('El listado de WhatsApp no es válido.');
        if(!service)service=record(value.pilot);for(const item of value.items)items.set(item.peerKey,item);
        cursor=value.nextCursor??null;if(cursor)seen.add(cursor);pages++;
      }while(cursor && pages<depth);
      if(items.size>1000)throw Error('El listado de WhatsApp excede el límite disponible.');
      if(selected){
        try{
          const value=await request(`peers/${encodeURIComponent(selected)}`,{signal});if(current!==generation || !visible())return;
          renderDetail(record(value.peer),focus);if(!items.has(selected))items.set(selected,record(value.peer));
        }catch(error){if(current!==generation || !visible())return;if(record(error).status!==404)throw error;selected='';snapshot=null;detailKey='';detail.replaceChildren(element('p','El contacto ya no está disponible.','admin-note'));}
      }
      else if(!detail.children.length){const empty=element('div','','wa-empty');empty.append(element('span','S','wa-empty-icon'),element('h3','Tu bandeja de WhatsApp'),element('p','Elige un contacto para leer la conversación y controlar cuándo responde Sarin.'));detail.append(empty);}
      renderPilot(service??{});renderList([...items.values()]);pageCount=pages;itemCount=items.size;nextCursor=cursor;fresh=true;
      if(loadMore){announce(`Mostrando ${itemCount} contactos.${nextCursor && itemCount<1000 && pageCount<10?' Puedes cargar más.':''}`);if((!nextCursor || itemCount>=1000 || pageCount>=10) && document.activeElement===more){const added=[...list.querySelectorAll('[data-wa-peer]')].find(node=>!before.has(node.getAttribute('data-wa-peer')));if(added instanceof HTMLElement)added.focus();}}
    }catch(error){if(current===generation && record(error).name!=='AbortError'){fresh=false;announce(record(error).message || 'No pudimos actualizar WhatsApp.');if([401,403].includes(record(error).status))fail(error);}}
    finally{if(current===generation){loading=false;panel.setAttribute('aria-busy','false');disable();expire();if(visible())timer=setTimeout(()=>void refresh(),5000);}}
  }
  /** @param {string} path @param {Record<string,unknown>} body @param {string} message */
  async function mutate(path,body,message){
    if(!visible() || pending || !fresh)return;const focused=document.activeElement?.getAttribute('data-wa-focus');stop();pending=true;disable();controller=new AbortController();const current=generation;
    announce('Aplicando acción…');
    try{
      const result=await request(path,{body,signal:controller.signal});if(current!==generation || !visible())return;
      if(path.endsWith('/reconcile') && !['pending','claimed','complete','exhausted','conflict'].includes(result.status))throw Error('La consulta no pudo confirmarse.');
      if(!path.endsWith('/reconcile') && result.ok!==true)throw Error('La acción no pudo confirmarse.');
      pending=false;await refresh();if(visible())announce(path.endsWith('/reconcile')?`${lookupLabels[result.status]}. Se comprobará en un próximo ciclo cuando corresponda; no envía otro mensaje.`:message);
    }catch(error){
      if(current!==generation)return;pending=false;
      if([401,403].includes(record(error).status)){fail(error);return;}
      await refresh();if(visible())announce(record(error).status===409?fresh?'El estado cambió en otra operación. Actualizamos la información; revisa antes de actuar.':'El estado cambió en otra operación. No pudimos cargar el estado actual; espera la actualización antes de actuar.':'No pudimos confirmar la acción. Consulta el estado antes de volver a actuar.');
    }finally{if(current===generation){pending=false;disable();}if(visible() && focused && (document.activeElement===document.body || document.activeElement?.getAttribute('data-wa-focus')===focused)){const target=[...detail.querySelectorAll('[data-wa-focus]')].find(node=>node.getAttribute('data-wa-focus')===focused);if(target instanceof HTMLElement)target.focus({preventScroll:true});}}
  }
  const resume=()=>{stop();if(visible())void refresh();};
  more.addEventListener('click',()=>{if(fresh && nextCursor && itemCount<1000 && pageCount<10)void refresh(false,true);});
  document.addEventListener('visibilitychange',()=>{if(!visible() && pending)announce('No pudimos confirmar la acción. Consulta el estado antes de volver a actuar.');resume();expire();});
  window.addEventListener('pagehide',stop);window.addEventListener('pageshow',resume);
  if(typeof IntersectionObserver==='function')new IntersectionObserver(()=>{const bounds=panel.getBoundingClientRect(),next=!panel.hidden && bounds.width>0 && bounds.top<innerHeight && bounds.bottom>0;if(inViewport!==next){inViewport=next;resume();}},{threshold:0}).observe(panel);
  return {
    /** @param {boolean} value */
    setReady(value){ready=value;if(!value)clear();},
    /** @param {boolean} value */
    setActive(value){active=value;if(!value)clear();else{inViewport=true;resume();}},
    clear(){ready=false;active=false;clear();}
  };
}
