// @ts-check
import { schemas } from './schema-manifest.js';
import { schemaTokens } from './schema-tokens.js';
/** Valida definiciones completas, no solo nombres de tablas.
 * @param {{db:import('./ingress-store.js').Database,repliesEnabled?:boolean}} options
 * @returns {Promise<0|4|5>} */
export async function detectWhatsAppSchema({db,repliesEnabled=false}) {
 const results=await db.batch([db.prepare("SELECT type,name,tbl_name,sql FROM sqlite_master WHERE lower(name) GLOB 'sarin_wa_*' AND sql IS NOT NULL")]);
 if(results.length!==1||results[0]?.success!==true||!Array.isArray(results[0].results))throw new Error('wa_schema_invalid');
 const rows=results[0].results;
 if(!rows.length){if(repliesEnabled)throw new Error('wa_schema_invalid');return 0;}
 const baseNames=new Set(schemas['0004'].objects.map(o=>o.name));
 const workNames=new Set(schemas['0005'].objects.filter(o=>!baseNames.has(o.name)).map(o=>o.name));
 const version=rows.some(r=>workNames.has(r.name.toLowerCase()))?5:4;
 if(version===4&&repliesEnabled)throw new Error('wa_schema_invalid');
 const expected=schemas[version===5?'0005':'0004'];
 const names=new Set(expected.objects.map(o=>o.name)),ids=new Set(expected.identifiers);
 for(const object of expected.objects){
  const row=rows.find(r=>r.name.toLowerCase()===object.name);
  if(!row||row.type!==object.type||row.tbl_name.toLowerCase()!==object.table||typeof row.sql!=='string')throw new Error('wa_schema_invalid');
  const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(schemaTokens(row.sql,ids,names)));
  if(Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('')!==object.hash)throw new Error('wa_schema_invalid');
 }
 return version;
}
