// @ts-check
import { schemas } from './schema-manifest.js';
import { schemaTokens } from './schema-tokens.js';
/** Valida definiciones completas, no solo nombres de tablas.
 * @param {{db:import('./ingress-store.js').Database,repliesEnabled?:boolean}} options
 * @returns {Promise<0|4|5|6|7|8>} */
export async function detectWhatsAppSchema({db,repliesEnabled=false}) {
 const results=await db.batch([db.prepare("SELECT type,name,tbl_name,sql FROM sqlite_master WHERE lower(name) GLOB 'sarin_wa_*' AND sql IS NOT NULL")]);
 if(results.length!==1||results[0]?.success!==true||!Array.isArray(results[0].results))throw new Error('wa_schema_invalid');
 const rows=results[0].results;
 if(!rows.length){if(repliesEnabled)throw new Error('wa_schema_invalid');return 0;}
 /** @type {4|5|6|7|8} */let version=4;
 for(const candidate of /** @type {const} */([5,6,7,8])){
   const before=new Set(schemas[/** @type {'0004'|'0005'|'0006'|'0007'} */('000'+(candidate-1))].objects.map(o=>o.name));
   const added=new Set(schemas[/** @type {'0005'|'0006'|'0007'|'0008'} */('000'+candidate)].objects.filter(o=>!before.has(o.name)).map(o=>o.name));
   if(rows.some(r=>added.has(r.name.toLowerCase())))version=candidate;
 }
 if(version===4&&repliesEnabled)throw new Error('wa_schema_invalid');
 const expected=schemas[/** @type {'0004'|'0005'|'0006'|'0007'|'0008'} */('000'+version)];
 const names=new Set(expected.objects.map(o=>o.name)),ids=new Set(expected.identifiers);
 if(rows.some(row=>!names.has(row.name.toLowerCase())))throw new Error('wa_schema_invalid');
 for(const object of expected.objects){
  const row=rows.find(r=>r.name.toLowerCase()===object.name);
  if(!row||row.type!==object.type||row.tbl_name.toLowerCase()!==object.table||typeof row.sql!=='string')throw new Error('wa_schema_invalid');
  const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(schemaTokens(row.sql,ids,names)));
  if(Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('')!==object.hash)throw new Error('wa_schema_invalid');
 }
 return version;
}
