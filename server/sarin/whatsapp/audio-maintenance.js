// @ts-check
/** El contenido de audio se purga con su entrada mediante FK y trigger de 0007.
 * Sólo elimina contadores de meses cerrados; nunca devuelve cupos vigentes.
 * @param {{db:import('./ingress-store.js').Database,now?:()=>number,limit?:number}} options */
export async function purgeWhatsAppAudioQuota({db,now=Date.now,limit=100}){
 const at=now();
 if(!Number.isSafeInteger(at)||at<0||at>8640000000000000-35*86400000
   ||!Number.isSafeInteger(limit)||limit<1||limit>500)throw new Error('wa_audio_maintenance_invalid');
 const month=new Date(at).toISOString().slice(0,7);
 const result=await db.batch([
  db.prepare(`DELETE FROM sarin_wa_audio_quota WHERE day_key IN(SELECT day_key FROM sarin_wa_audio_quota
    WHERE month_key<? ORDER BY day_key LIMIT ?) RETURNING day_key`).bind(month,limit),
  db.prepare('SELECT EXISTS(SELECT 1 FROM sarin_wa_audio_quota WHERE month_key<?) AS remaining').bind(month),
 ]);
 if(result.length!==2||result.some(row=>row.success!==true||!Array.isArray(row.results))
   ||![0,1].includes(result[1].results[0]?.remaining))throw new Error('wa_audio_maintenance_failed');
 return {deleted:result[0].results.length,remaining:result[1].results[0].remaining===1};
}
