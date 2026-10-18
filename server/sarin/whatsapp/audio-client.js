// @ts-check
const MAX_BYTES = 2 * 1024 * 1024;
const MAX_SECONDS = 120;
const MODEL = '@cf/openai/whisper-large-v3-turbo';
/** @typedef {{id:string,link:string,sha256:string,mimeType:string}} AudioDescriptor */
/** @typedef {'invalid_config'|'invalid_descriptor'|'unsupported_format'|'cancelled'|'timeout'|'download_failed'|'invalid_audio'|'audio_too_large'|'audio_too_long'|'integrity_mismatch'|'permission_denied'|'inference_uncertain'|'invalid_transcription'} AudioFailure */
/** @typedef {{ok:true,text:string,durationSeconds:number}|{ok:false,reason:AudioFailure}} AudioResult */
class AudioError extends Error {
  /** @param {AudioFailure} reason */
  constructor(reason) { super(reason); this.reason = reason; }
}
/** @param {AudioFailure} reason @returns {never} */
function fail(reason) { throw new AudioError(reason); }
/** @param {unknown} value @returns {value is Record<string,any>} */
const record = value => !!value && typeof value === 'object' && !Array.isArray(value);
/** @param {unknown} value */
function mime(value) {
  if (typeof value !== 'string' || value.length > 64) return null;
  if (/^audio\/ogg(?:\s*;\s*codecs\s*=\s*(?:opus|"opus"))?$/i.test(value)) return 'audio/ogg; codecs=opus';
  return /^audio\/(?:aac|mp4|mpeg|amr)$/i.test(value) ? value.toLowerCase() : null;
}
/** Copia cerrada para persistencia. No confiere permiso para descargar o inferir.
 * @param {unknown} input @returns {AudioDescriptor|null} */
export function validateWhatsAppAudioDescriptor(input) {
  try {
    if (!record(input) || Object.keys(input).length !== 4
      || !Object.keys(input).every(key => ['id','link','sha256','mimeType'].includes(key))
      || typeof input.id !== 'string' || !/^[1-9]\d{0,31}$/.test(input.id)
      || typeof input.link !== 'string' || input.link.length > 4096 || /[^\x21-\x7e]/.test(input.link)
      || typeof input.sha256 !== 'string' || !/^[A-Za-z0-9+/]{43}=$/.test(input.sha256)
      || btoa(atob(input.sha256)) !== input.sha256 || atob(input.sha256).length !== 32) return null;
    const mimeType = mime(input.mimeType);
    const prefix = 'https://api.ycloud.com/v2/whatsapp/media/download/' + input.id;
    if (!mimeType || !(input.link === prefix || input.link.startsWith(prefix + '?'))) return null;
    const url = new URL(input.link);
    if (url.origin !== 'https://api.ycloud.com' || url.username || url.password || url.port || url.hash
      || url.pathname !== '/v2/whatsapp/media/download/' + input.id) return null;
    for (const [key,value] of url.searchParams) {
      if (!['sig','payload'].includes(key) || !value || value.length > 2048 || url.searchParams.getAll(key).length !== 1) return null;
    }
    const descriptor = { id: input.id, link: input.link, sha256: input.sha256, mimeType };
    return JSON.stringify(descriptor).length <= 4096 ? descriptor : null;
  } catch { return null; }
}

// CRC Ogg (RFC 3533); una tabla pequeña evita trabajo por bit sobre cada archivo.
const CRC_TABLE = Uint32Array.from({length:256}, (_,index) => {
  let crc = index << 24;
  for (let bit=0;bit<8;bit++) crc = (crc << 1) ^ ((crc & 0x80000000) ? 0x04c11db7 : 0);
  return crc >>> 0;
});
/** @param {Uint8Array} bytes @param {number} start @param {number} end */
function checksum(bytes,start,end) {
  let crc = 0;
  for (let i=start;i<end;i++) {
    const octet = i >= start+22 && i < start+26 ? 0 : bytes[i];
    crc = (crc << 8) ^ CRC_TABLE[((crc >>> 24) ^ octet) & 255];
  }
  return crc >>> 0;
}
/** @param {Uint8Array} bytes @param {string} text */
const begins = (bytes,text) => bytes.length >= text.length && Array.from(text).every((char,i) => bytes[i] === char.charCodeAt(0));
/** Duración de paquetes Opus según TOC (RFC 6716 §3). No decodifica voz.
 * @param {Uint8Array} packet */
function packetSamples(packet) {
  if (!packet.length) fail('invalid_audio');
  const config = packet[0] >>> 3, code = packet[0] & 3;
  const frames = code === 0 ? 1 : code < 3 ? 2 : packet.length > 1 ? packet[1] & 63 : 0;
  const frame = config >= 16 ? 120 << (config & 3) : config >= 12 ? 480 << (config & 1) : (config & 3) === 3 ? 2880 : 480 << (config & 3);
  if (!frames || frames * frame > 5760) fail('invalid_audio');
  return frames * frame;
}
/** Sólo Ogg Opus completo, una pista mono/estéreo y sin cadenas. Verifica CRC,
 * secuencia, paquetes y granules: declarar poca duración no elude el límite.
 * @param {Uint8Array} bytes @param {()=>void} check @returns {number} */
function oggDuration(bytes,check) {
  const view = new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  let offset=0, sequence=0, serial=-1, packetCount=0, packetLength=0, preSkip=0;
  let decoded=0, lastSamples=0, previousGranule=0, granuleOffset=-1, ended=false, lastAudioPageComplete=false;
  /** @type {Uint8Array[]} */ let parts=[];
  while (offset < bytes.length) {
    check();
    if (ended || offset+27>bytes.length || !begins(bytes.subarray(offset),'OggS') || bytes[offset+4]!==0) fail('invalid_audio');
    const flags=bytes[offset+5], count=bytes[offset+26], body=offset+27+count;
    if (flags>7 || body>bytes.length || !!(flags&1)!==(packetLength>0)
      || (sequence===0 ? flags!==2 : !!(flags&2)) || view.getUint32(offset+18,true)!==sequence) fail('invalid_audio');
    const pageSerial=view.getUint32(offset+14,true);
    if (sequence===0) serial=pageSerial;
    if (pageSerial!==serial) fail('invalid_audio');
    let end=body;
    for(let i=0;i<count;i++)end+=bytes[offset+27+i];
    if(end>bytes.length || checksum(bytes,offset,end)!==view.getUint32(offset+22,true))fail('invalid_audio');
    const rawGranule=view.getBigUint64(offset+6,true), unset=rawGranule===0xffffffffffffffffn;
    if(!unset && rawGranule>BigInt(Number.MAX_SAFE_INTEGER))fail('invalid_audio');
    const granule=unset?-1:Number(rawGranule), priorPackets=packetCount;
    // RFC 3533 permite EOS sin contenido. WhatsApp usa granule -1: la
    // duración sigue siendo la de los paquetes anteriores ya verificados.
    if(count===0) {
      if(flags!==4 || !unset || packetLength || packetCount<3 || granuleOffset<0
        || previousGranule-granuleOffset<=preSkip || end!==bytes.length)fail('invalid_audio');
      ended=true;offset=end;sequence++;continue;
    }
    let at=body;
    for(let i=0;i<count;i++) {
      const size=bytes[offset+27+i];parts.push(bytes.subarray(at,at+size));packetLength+=size;at+=size;
      if(packetLength>65536)fail('invalid_audio');
      if(size===255)continue;
      const packet=new Uint8Array(packetLength);let cursor=0;
      for(const part of parts){packet.set(part,cursor);cursor+=part.length;}
      const data=new DataView(packet.buffer);
      if(packetCount===0) {
        if(sequence!==0 || count!==1 || packet.length!==19 || !begins(packet,'OpusHead')
          || packet[8]!==1 || ![1,2].includes(packet[9]) || packet[18]!==0)fail('invalid_audio');
        preSkip=data.getUint16(10,true);
      } else if(packetCount===1) {
        if(!begins(packet,'OpusTags') || packet.length<16 || i!==count-1)fail('invalid_audio');
        let tag=12+data.getUint32(8,true);
        if(tag+4>packet.length)fail('invalid_audio');
        const comments=data.getUint32(tag,true);tag+=4;
        if(comments>16384)fail('invalid_audio');
        for(let n=0;n<comments;n++){if(tag+4>packet.length)fail('invalid_audio');const length=data.getUint32(tag,true);tag+=4+length;if(tag>packet.length)fail('invalid_audio');}
      } else {
        lastSamples=packetSamples(packet);decoded+=lastSamples;
        // Incluye como máximo el último paquete que puede recortarse en EOS.
        if(decoded-preSkip>MAX_SECONDS*48000+5760)fail('audio_too_long');
      }
      packetCount++;packetLength=0;parts=[];
    }
    const completed=packetCount>priorPackets;
    if(packetCount<=2) {if(granule!==(completed?0:-1))fail('invalid_audio');}
    else if(!completed) {if(granule!==-1)fail('invalid_audio');}
    else {
      // RFC 7845 §4.5 admite posición inicial positiva. Sólo se acepta el
      // offset pre-skip observado en WhatsApp, constante en todas las páginas.
      if(granuleOffset<0) {
        const initialOffset=granule-decoded;
        if(initialOffset===0 || initialOffset===preSkip)granuleOffset=initialOffset;
        else if((flags&4) && initialOffset<0)granuleOffset=0;
        else fail('invalid_audio');
      }
      const position=granule-granuleOffset;
      if(granule<previousGranule || position>decoded || (!(flags&4)&&position!==decoded)
        || ((flags&4)&&position<=decoded-lastSamples))fail('invalid_audio');
      previousGranule=granule;
    }
    lastAudioPageComplete=completed && packetCount>=3 && packetLength===0 && flags===0;
    if(flags&4) {
      if(packetCount<3 || packetLength || granule-granuleOffset<=preSkip || end!==bytes.length)fail('invalid_audio');
      ended=true;
    }
    offset=end;sequence++;
  }
  // RFC 7845 §3 contempla EOF sin EOS. Se limita a la variante observada:
  // offset pre-skip positivo y última página íntegra, sin paquetes pendientes.
  const completeWithoutEos=preSkip>0 && granuleOffset===preSkip && lastAudioPageComplete
    && previousGranule-granuleOffset===decoded;
  if((!ended && !completeWithoutEos) || packetLength)fail('invalid_audio');
  const duration=(previousGranule-granuleOffset-preSkip)/48000;
  if(duration<=0)fail('invalid_audio');
  if(duration>MAX_SECONDS)fail('audio_too_long');
  return duration;
}

/** @param {ReadableStream<Uint8Array>|null|undefined} body */
function discard(body) { try { void body?.cancel().catch(()=>{}); } catch { /* Sin detalles del transporte. */ } }
/** @param {Response} response @param {AbortSignal} signal @param {()=>void} check */
async function readAudio(response,signal,check) {
  if(response.status!==200 || response.redirected || !response.body || response.headers.has('Content-Encoding')
    || response.headers.has('Content-Range') || mime(response.headers.get('Content-Type'))!=='audio/ogg; codecs=opus') {
    discard(response.body);fail('download_failed');
  }
  const length=response.headers.get('Content-Length');
  if(length!==null && (!/^\d+$/.test(length) || Number(length)>MAX_BYTES)){discard(response.body);fail('audio_too_large');}
  const reader=response.body.getReader(),chunks=[];
  const cancel=()=>{try{void reader.cancel().catch(()=>{});}catch{/* Cancelación sin espera. */}};
  signal.addEventListener('abort',cancel,{once:true});
  let total=0;
  try {
    while(true) {
      check();const {done,value}=await reader.read();check();if(done)break;
      if(!(value instanceof Uint8Array))fail('invalid_audio');
      total+=value.byteLength;if(total>MAX_BYTES)fail('audio_too_large');chunks.push(value);
    }
    if(!total)fail('invalid_audio');
    const bytes=new Uint8Array(total);let offset=0;
    for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
    return bytes;
  } catch(error) {cancel();throw error;}
  finally {signal.removeEventListener('abort',cancel);reader.releaseLock();}
}
/** @param {Uint8Array} bytes */
function base64(bytes) {
  let binary='';
  for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
  return btoa(binary);
}
/** Cliente sin persistencia, logs, reintentos ni selección de destinos/modelos.
 * El llamante valida consentimiento antes de invocarlo. beforeInference vuelve
 * a verificar permiso y marca el intento durable; debe resolver true explícito.
 * Tras inference_uncertain no repetir AI: un timeout no cancela el proveedor.
 * @param {{descriptor:unknown,apiKey:string,ai:{run:(model:string,input:Record<string,unknown>)=>Promise<unknown>},
 * fetchImpl?:typeof fetch,signal?:AbortSignal,beforeInference:()=>Promise<boolean>,timeoutMs?:number}} options
 * @returns {Promise<AudioResult>} */
export async function transcribeWhatsAppAudio(options) {
  try {
    if(!record(options) || typeof options.apiKey!=='string' || !/^[\x21-\x7e]{1,4096}$/.test(options.apiKey)
      || !options.ai || typeof options.ai.run!=='function' || typeof options.beforeInference!=='function'
      || (options.fetchImpl!==undefined && typeof options.fetchImpl!=='function')
      || (options.signal!==undefined && !(options.signal instanceof AbortSignal)))return {ok:false,reason:'invalid_config'};
    const timeout=options.timeoutMs??30000;
    if(!Number.isInteger(timeout)||timeout<1||timeout>45000)return {ok:false,reason:'invalid_config'};
    const descriptor=validateWhatsAppAudioDescriptor(options.descriptor);
    if(!descriptor)return {ok:false,reason:'invalid_descriptor'};
    if(descriptor.mimeType!=='audio/ogg; codecs=opus')return {ok:false,reason:'unsupported_format'};
    if(options.signal?.aborted)return {ok:false,reason:'cancelled'};
    const controller=new AbortController(),started=Date.now();let inferenceStarted=false;
    /** @type {AudioFailure|null} */let stoppedReason=null;
    /** @type {(reason:AudioError)=>void} */let rejectStopped=()=>{};
    /** @type {Promise<never>} */const stopped=new Promise((_,reject)=>{rejectStopped=reject;});
    /** @param {'cancelled'|'timeout'} reason */
    const stop=reason=>{if(stoppedReason)return;stoppedReason=inferenceStarted?'inference_uncertain':reason;rejectStopped(new AudioError(stoppedReason));controller.abort();};
    const abort=()=>stop('cancelled');
    options.signal?.addEventListener('abort',abort,{once:true});
    const timer=setTimeout(()=>stop('timeout'),timeout);
    const check=()=>{if(!stoppedReason && Date.now()-started>=timeout)stop('timeout');if(stoppedReason)fail(stoppedReason);};
    async function execute() {
      check();let response;
      // workerd admite manual; el lector rechaza cualquier respuesta distinta de 200.
      try {response=await (options.fetchImpl??globalThis.fetch)(descriptor.link,{method:'GET',redirect:'manual',headers:{'X-API-Key':options.apiKey},signal:controller.signal});}
      catch {check();fail('download_failed');}
      if(controller.signal.aborted){discard(response.body);check();}
      if(response.url && response.url!==descriptor.link){discard(response.body);fail('download_failed');}
      const bytes=await readAudio(response,controller.signal,check);check();
      const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));check();
      if(base64(digest)!==descriptor.sha256)fail('integrity_mismatch');
      const durationSeconds=oggDuration(bytes,check);check();
      const audio=base64(bytes);check();
      let permitted=false;
      try {permitted=await options.beforeInference()===true;}catch{check();fail('permission_denied');}
      check();if(!permitted)fail('permission_denied');
      inferenceStarted=true;let result;
      try {result=await options.ai.run(MODEL,{audio,task:'transcribe',language:'es',vad_filter:true,condition_on_previous_text:false});}
      catch {fail('inference_uncertain');}
      check();
      if(!record(result)||typeof result.text!=='string'||!result.text.trim()||result.text.length>1200
        || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/u.test(result.text)
        || (result.transcription_info!==undefined && (!record(result.transcription_info)
          || (result.transcription_info.duration!==undefined && (typeof result.transcription_info.duration!=='number'
            || !Number.isFinite(result.transcription_info.duration) || result.transcription_info.duration<=0 || result.transcription_info.duration>MAX_SECONDS)))))fail('invalid_transcription');
      return /** @type {AudioResult} */({ok:true,text:result.text.trim(),durationSeconds});
    }
    try {return await Promise.race([execute(),stopped]);}
    catch(error){return {ok:false,reason:error instanceof AudioError?error.reason:inferenceStarted?'inference_uncertain':'download_failed'};}
    finally {clearTimeout(timer);options.signal?.removeEventListener('abort',abort);}
  } catch {return {ok:false,reason:'invalid_config'};}
}
