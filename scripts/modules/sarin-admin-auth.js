// @ts-check
/** Firebase se carga únicamente en el panel; el servidor decide quién puede acceder. */
const appSdkUrl=/** @type {string} */('https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js');
const authSdkUrl=/** @type {string} */('https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js');
/** @typedef {{status:'busy'|'signed-in'|'signed-out'|'error',message?:string}} AuthState */
/** @typedef {{getIdToken:(forceRefresh?:boolean)=>Promise<string>}} FirebaseUser */
/** @param {{onState:(state:AuthState)=>void}} options */
export function createSarinAdminAuth({onState}){
  /** @type {any} */let sdk;
  /** @type {any} */let auth;
  /** @type {Promise<void>|null} */let loading=null;
  /** @type {Promise<void>|null} */let exchange=null;
  /** @type {Promise<void>|null} */let loginTask=null;
  /** @type {Promise<void>|null} */let logoutTask=null;
  let generation=0,syncedToken='',requiresLogin=false,popupPending=false,authenticated=false;
  /** @type {Set<AbortController>} */const controllers=new Set();
  /** @param {number} [status] */
  const denied=(status=401)=>Object.assign(new Error('Vuelve a acceder con Google para continuar.'),{status});
  /** @param {string} path @param {Record<string,string>} [body] */
  async function endpoint(path,body){
    const controller=new AbortController();controllers.add(controller);
    const timer=setTimeout(()=>controller.abort(),15000);
    try{
      const response=await fetch(`/api/control-sarin/auth/${path}`,{method:body?'POST':'GET',headers:{Accept:'application/json',...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,credentials:'same-origin',cache:'no-store',redirect:'error',signal:controller.signal});
      if(!response.ok)throw denied(response.status);
      if(!response.headers.get('content-type')?.includes('application/json'))throw denied(503);
      const raw=await response.text();if(new TextEncoder().encode(raw).byteLength>16384)throw denied(503);
      const value=JSON.parse(raw);
      if(!value || typeof value!=='object' || Array.isArray(value))throw denied(503);
      return value;
    }catch(error){
      if(error && typeof error==='object' && 'status' in error)throw error;
      throw denied(503);
    }finally{clearTimeout(timer);controllers.delete(controller);}
  }
  /** Invalida también las respuestas tardías de una sesión anterior. */
  function invalidate(){
    generation++;syncedToken='';authenticated=false;requiresLogin=true;exchange=null;
    for(const controller of controllers)controller.abort();
  }
  /** @param {string} [message] */
  function forget(message='Vuelve a acceder con Google para continuar.'){
    invalidate();onState({status:'error',message});
  }
  async function load(){
    if(auth)return;
    if(loading)return loading;
    loading=(async()=>{
      const value=await endpoint('config'),config=value.firebase;
      if(!config || typeof config.apiKey!=='string' || config.apiKey.length<10 || config.apiKey.length>200 || typeof config.authDomain!=='string' || !/^[a-z0-9-]+\.firebaseapp\.com$/i.test(config.authDomain) || typeof config.projectId!=='string' || !/^[a-z0-9-]{3,64}$/.test(config.projectId))throw denied(503);
      const [appSdk,authSdk]=await Promise.all([import(appSdkUrl),import(authSdkUrl)]);
      sdk=authSdk;
      const app=appSdk.initializeApp({apiKey:config.apiKey,authDomain:config.authDomain,projectId:config.projectId},'sarin-admin');
      auth=sdk.initializeAuth(app,{persistence:[sdk.browserSessionPersistence,sdk.inMemoryPersistence],popupRedirectResolver:sdk.browserPopupRedirectResolver});
      auth.languageCode='es';
      sdk.onIdTokenChanged(auth,/** @param {FirebaseUser|null} user */user=>{
        if(popupPending || requiresLogin)return;
        if(!user){if(authenticated){invalidate();onState({status:'signed-out'});}return;}
        const current=generation;
        void ensureSession().catch(()=>{if(current===generation)forget();});
      });
      await auth.authStateReady();
    })();
    try{await loading;}finally{loading=null;}
  }
  /** Actualiza la cookie únicamente cuando Firebase entrega un token nuevo. */
  async function ensureSession(){
    if(requiresLogin)throw denied();
    await load();
    if(exchange){await exchange;return ensureSession();}
    const current=generation;
    const pending=(async()=>{
      const user=/** @type {FirebaseUser|null} */(auth.currentUser);
      if(!user)throw denied();
      const idToken=await user.getIdToken(false);
      if(current!==generation || requiresLogin)throw denied();
      if(typeof idToken!=='string' || idToken.length<20 || idToken.length>16384)throw denied();
      if(idToken===syncedToken)return;
      const value=await endpoint('session',{idToken});
      if(current!==generation || requiresLogin)throw denied();
      if(value.ok!==true)throw denied();
      syncedToken=idToken;authenticated=true;onState({status:'signed-in'});
    })();
    exchange=pending;
    try{await pending;}finally{if(exchange===pending)exchange=null;}
  }
  async function restore(){
    onState({status:'busy',message:'Verificando tu sesión de Google…'});
    try{
      await load();
      if(!auth.currentUser){requiresLogin=true;onState({status:'signed-out',message:'Accede con Google para abrir tu panel.'});return false;}
      await ensureSession();return true;
    }catch(error){forget();throw error;}
  }
  async function login(){
    if(loginTask)return loginTask;
    if(logoutTask)await logoutTask;
    loginTask=performLogin();
    try{await loginTask;}finally{loginTask=null;}
  }
  async function performLogin(){
    invalidate();requiresLogin=false;popupPending=true;
    const current=generation;
    onState({status:'busy',message:'Abriendo el acceso con Google…'});
    try{
      await load();if(current!==generation)throw denied();
      const provider=new sdk.GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});
      await sdk.signInWithPopup(auth,provider);
      if(current!==generation)throw denied();
      await ensureSession();
    }catch{
      invalidate();
      try{if(auth)await sdk.signOut(auth);}catch{/* La vista permanece cerrada. */}
      try{await endpoint('logout',{});}catch{/* El servidor seguirá verificando cada petición. */}
      onState({status:'error',message:'No pudimos completar el acceso con Google. Comprueba la cuenta y permite la ventana de acceso para reintentar.'});
      throw denied();
    }finally{popupPending=false;}
  }
  async function logout(){
    if(logoutTask)return logoutTask;
    logoutTask=performLogout();
    try{await logoutTask;}finally{logoutTask=null;}
  }
  async function performLogout(){
    invalidate();onState({status:'signed-out'});
    onState({status:'busy',message:'Cerrando sesión…'});
    let complete=true;
    try{if(auth)await sdk.signOut(auth);}catch{complete=false;}
    try{const value=await endpoint('logout',{});if(value.ok!==true)complete=false;}catch{complete=false;}
    if(!complete){onState({status:'error',message:'La vista está cerrada, pero no pudimos confirmar el cierre de sesión. Vuelve a intentarlo.'});throw denied(503);}
    onState({status:'signed-out'});
  }
  return {login,restore,ensureSession,logout,forget};
}
