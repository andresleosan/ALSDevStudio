// Generacion local: ejecutar migraciones acumuladas antes de tomar la referencia.
import {DatabaseSync} from 'node:sqlite';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {schemaTokens} from '../../server/sarin/whatsapp/schema-tokens.js';
const db=new DatabaseSync(':memory:'),versions={};
try {
 for(const name of ['0001_usage.sql','0002_history.sql','0003_leads.sql','0004_whatsapp_ingress.sql','0005_whatsapp_replies.sql']){
  db.exec(await readFile(new URL('../../migrations/sarin/'+name,import.meta.url),'utf8'));
  if(!/^000[45]/.test(name))continue;
  const rows=db.prepare("SELECT type,name,tbl_name,sql FROM sqlite_master WHERE name GLOB 'sarin_wa_*' AND sql IS NOT NULL ORDER BY name").all();
  const names=new Set(rows.map(r=>r.name)),identifiers=new Set([...names,'new','old']);
  for(const row of rows.filter(r=>['table','view'].includes(r.type)))for(const c of db.prepare('SELECT name FROM pragma_table_info(?)').all(row.name))identifiers.add(c.name.toLowerCase());
  versions[name.slice(0,4)]={identifiers:[...identifiers].sort(),objects:rows.map(r=>({name:r.name,type:r.type,table:r.tbl_name,hash:createHash('sha256').update(schemaTokens(r.sql,identifiers,names)).digest('hex')}))};
 }
 await writeFile(new URL('../../server/sarin/whatsapp/schema-manifest.js',import.meta.url),'// Generado por .github/cloudflare/generate-wa-schema.mjs; no editar manualmente.\nexport const schemas = '+JSON.stringify(versions,null,2)+';\n');
}finally{db.close();}
