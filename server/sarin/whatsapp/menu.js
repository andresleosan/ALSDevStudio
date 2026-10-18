// @ts-check
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
/** @typedef {{outboxId:string,action:'accept'|'human'|'stop'}} WhatsAppMenuChoice */
/** @param {string} outboxId */
export function createWhatsAppMenuButtons(outboxId) {
 if(typeof outboxId!=='string'||!UUID.test(outboxId))throw new TypeError('invalid_menu_reference');
 return [
  {id:`sarin.menu.v1:accept:${outboxId}`,title:'Aceptar'},
  {id:`sarin.menu.v1:human:${outboxId}`,title:'Hablar con Andrés'},
  {id:`sarin.menu.v1:stop:${outboxId}`,title:'Salir'},
 ];
}
/** @param {unknown} id @returns {WhatsAppMenuChoice|null} */
export function parseWhatsAppMenuReply(id) {
 if(typeof id!=='string')return null;
 const match=/^sarin\.menu\.v1:(accept|human|stop):([a-f0-9-]{36})$/.exec(id);
 if(!match||!UUID.test(match[2]))return null;
 return {outboxId:match[2],action:/** @type {WhatsAppMenuChoice['action']} */(match[1])};
}
