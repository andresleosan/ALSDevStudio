// @ts-check
/**
 * Contratos internos. Ningún campo de destinatario procede de Queue o HTTP.
 * @typedef {'invalid_request'|'work_config_invalid'|'work_unavailable'|'work_denied'|'work_conflict'|'work_capacity'|'work_quota'} WorkErrorCode
 * @typedef {{jobId:string,eventId:string,epoch:string,contextId:string,peerKey:string,peerRevision:number,
 * pilotRevision:number,input:string,source?:'text'|'audio',decision:'notice'|'accept_pending'|'confirm'|'generate'|'ignore',
 * history:Array<{role:'user'|'assistant',content:string}>,recipient:{wabaId:string,from:string,to:string},
 * expiresAt:number,leaseUntil:number}} Work
 * @typedef {{outboxId:string,externalId:string,text:string,purpose:'notice'|'accepted'|'reply',version:string|null,wabaId:string,from:string,to:string,expiresAt:number}} SendPermit
 * @typedef {{eventId:string,status:'accepted'|'sent'|'delivered'|'read'|'failed',at:number,providerId?:string,
 * externalId?:string,wabaId?:string,from?:string,to?:string,wamid?:string}} DeliveryObservation
 */
/**
 * @typedef {{closed:boolean,closures:Array<{scope:'day'|'month',period_key:string,period_end_at:number}>}} SendClosure
 * @typedef {{wabaId:string,from:string,to:string}} Recipient
 * @typedef {{status:'idle'|'pending'|'claimed'|'complete'|'exhausted'|'conflict',attempts:number,nextAt:number|null}} ReconciliationState
 * @typedef {Recipient & {outboxId:string,providerId:string,externalId:string,contextId:string,epoch:string,attempt:number,leaseUntil:number}} ReconciliationPermit
 * @typedef {{kind:'observation',observation:Omit<DeliveryObservation,'eventId'>}|{kind:'pending'}|{kind:'unavailable',code:string}|{kind:'identity_conflict'}} ReconciliationResult
 */
export {};
