import assert from 'node:assert/strict';
import {after,before,test} from 'node:test';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from '../capturas/node_modules/playwright/index.mjs';

const root=path.resolve(import.meta.dirname,'../..');
const expectedKeys=['laparada','tecnifullgas','bpt-jersey','sarinbotsaas','multiogar','siliconesolutions','dialon','mundocelular','hachi-greciaspa','pintumaster','coctelsops','ledgerharbour','field-hours','jobsitejedi','mercadointeligente','donacionesvenezuela','thecococlub','vigia','hampton-estates','semancontrol'];
let server,browser,origin;
before(async()=>{
  server=createServer(async(req,res)=>{
    const pathname=new URL(req.url,'http://local').pathname;
    const file=path.resolve(root,`.${pathname==='/'?'/index.html':pathname}`);
    if(!file.startsWith(root+path.sep)||pathname.startsWith('/api/')){res.writeHead(404).end();return;}
    try{
      const bytes=await readFile(file);
      res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'})[path.extname(file)]||'application/octet-stream');
      res.end(bytes);
    }catch{res.writeHead(404).end();}
  }).listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));origin=`http://127.0.0.1:${server.address().port}`;
  browser=await chromium.launch({headless:true});
});
after(async()=>{await browser?.close();await new Promise(resolve=>server?.close(resolve));});

async function pageFor(t,options={}){
  const context=await browser.newContext({viewport:{width:1200,height:900},reducedMotion:'no-preference',...options});t.after(()=>context.close());
  const page=await context.newPage();page.setDefaultTimeout(4000);
  const errors=[];let apiAttempts=0,externalAttempts=0;
  page.on('pageerror',error=>errors.push(error.name));
  await context.route('**/*',route=>{
    const request=route.request(),url=new URL(request.url());
    if(url.pathname.startsWith('/api/')){apiAttempts++;return route.abort();}
    if(url.origin!==origin||request.method()!=='GET'){externalAttempts++;return route.abort();}
    return route.continue();
  });
  await page.goto(origin,{waitUntil:'domcontentloaded'});
  await page.locator('[data-analytics-choice="denied"]').click();
  await page.locator('.pagination-number').first().waitFor();
  await page.evaluate(()=>document.fonts.ready);
  t.after(()=>{assert.deepEqual(errors,[]);assert.equal(apiAttempts,0);assert.equal(externalAttempts,0);});
  return {context,page};
}

async function settle(element){
  await element.evaluate(async el=>{
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    await Promise.all(el.getAnimations().filter(animation=>animation.playState==='running'&&animation.effect?.getTiming().iterations!==Infinity).map(animation=>animation.finished.catch(()=>{})));
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  });
}

async function pose(element){
  return element.evaluate(el=>{
    const matrix=new DOMMatrixReadOnly(getComputedStyle(el).transform);
    return {rotation:Math.max(...[matrix.m13,matrix.m23,matrix.m31,matrix.m32].map(Math.abs)),rx:el.style.getPropertyValue('--rx'),ry:el.style.getPropertyValue('--ry'),transform:getComputedStyle(el).transform};
  });
}

async function hoverCorner(page,element){
  await element.scrollIntoViewIfNeeded();await settle(element);
  const box=await element.boundingBox();
  await element.hover({position:{x:box.width*.75,y:box.height*.25}});
  await settle(element);
}

async function observeNavigation(page){
  // Sólo se emula el límite externo: el enlace recibe el gesto real y observamos
  // si el producto lo canceló antes de impedir nosotros salir del servidor local.
  await page.evaluate(()=>{
    window.depthNavigations=[];
    document.addEventListener('click',event=>{
      const card=event.target instanceof Element?event.target.closest('a.project-card'):null;
      if(!card)return;
      window.depthNavigations.push({href:card.getAttribute('href'),prevented:event.defaultPrevented});
      event.preventDefault();
    });
  });
}

// No basta comprobar --rx/--ry: una animación de entrada puede conservar su
// transform final y anular visualmente la inclinación que calcula initDepth.
test('las veinte tarjetas rotan visualmente con el ratón después de entrar en las cinco páginas',async t=>{
  for(const width of [1200,1440]){
    const {page}=await pageFor(t,{viewport:{width,height:900}});const visited=[];
    assert.deepEqual(await page.locator('a.project-card').evaluateAll(cards=>cards.map(card=>card.dataset.projectKey)),expectedKeys);
    assert.equal(await page.locator('.pagination-number').count(),5);
    for(let number=0;number<5;number++){
      await page.locator('.pagination-number').nth(number).click();
      for(const card of await page.locator('a.project-card:not(.is-hidden)').all()){
        const key=await card.getAttribute('data-project-key');await hoverCorner(page,card);
        const active=await pose(card);
        assert.ok(active.rotation>.01,`${width}px ${key}: se espera inclinación visible, no sólo variables ${JSON.stringify(active)}`);
        await page.mouse.move(0,0);await settle(card);
        assert.ok((await pose(card)).rotation<.001,`${key}: vuelve a una pose sin giro al salir`);
        visited.push(key);
      }
    }
    assert.deepEqual(visited,expectedKeys);
  }
});

test('filtrar y volver a todos conserva la inclinación de las tarjetas visibles',async t=>{
  const {page}=await pageFor(t);
  for(const category of ['web','systems','product','all']){
    await page.locator(`[data-filter="${category}"]`).click();
    const cards=page.locator('a.project-card:not(.is-hidden)');
    assert.ok(await cards.count()>0);
    for(const card of await cards.all()){
      if(category!=='all')assert.equal(await card.getAttribute('data-category'),category);
      await hoverCorner(page,card);
      assert.ok((await pose(card)).rotation>.01,`${category}: el filtro no deja una transformación de entrada retenida`);
      await page.mouse.move(0,0);await settle(card);
    }
  }
});

test('la entrada escalonada mantiene ocultas las tarjetas retrasadas hasta su turno',async t=>{
  const {page}=await pageFor(t);
  const entry=await page.evaluate(()=>{
    document.querySelector('[data-filter="web"]').click();
    const cards=[...document.querySelectorAll('a.project-card:not(.is-hidden)')];
    const samples=cards.map(card=>{
      const animation=card.getAnimations().find(animation=>animation instanceof CSSAnimation&&animation.animationName==='projectFadeIn');
      if(!animation)return null;
      const timing=animation.effect.getTiming();
      // Controlar el reloj de la animación real evita depender de la carga de la
      // máquina para observar un retraso que sólo dura unas décimas de segundo.
      animation.pause();animation.currentTime=Number(timing.delay)/2;
      const waiting=getComputedStyle(card).opacity;
      animation.currentTime=Number(timing.delay)+Number(timing.duration)+1;
      const finished=getComputedStyle(card).opacity;
      return {delay:Number(timing.delay),waiting,finished};
    });
    return samples;
  });
  assert.equal(entry.length,4);assert.ok(entry.every(Boolean));
  assert.ok(entry[3].delay>entry[0].delay);
  assert.equal(entry[3].waiting,'0','la cuarta tarjeta no se muestra durante su retraso');
  assert.equal(entry[3].finished,'1','la entrada termina completamente visible');
});

// Caracterización de la escena anterior: no exige cambiar la pose base del hero.
test('el hero conserva su respuesta al puntero y vuelve a su pose base',async t=>{
  const {page}=await pageFor(t);const hero=page.locator('.hero-visual');
  await page.mouse.move(0,0);await settle(hero);const initial=await pose(hero);
  await hoverCorner(page,hero);const hovered=await pose(hero);
  assert.notEqual(hovered.transform,initial.transform);
  assert.equal(await hero.evaluate(el=>Math.abs(parseFloat(el.style.getPropertyValue('--tilt-x')))>1&&Math.abs(parseFloat(el.style.getPropertyValue('--tilt-y')))>1),true);
  await page.mouse.move(0,0);await settle(hero);
  assert.equal((await pose(hero)).transform,initial.transform);
});

test('movimiento reducido inicial no inclina las tarjetas ni interfiere con sus enlaces por teclado',async t=>{
  const {page}=await pageFor(t,{reducedMotion:'reduce'});await observeNavigation(page);
  const card=page.locator('[data-project-key="laparada"].project-card');
  await hoverCorner(page,card);const resting=await pose(card);
  assert.ok(resting.rotation<.001);assert.equal(resting.rx,'');assert.equal(resting.ry,'');
  await card.focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');
  assert.equal(await card.evaluate(el=>el===document.activeElement),true);
  assert.notEqual(await card.evaluate(el=>getComputedStyle(el).outlineStyle),'none');
  await page.keyboard.press('Enter');
  assert.deepEqual(await page.evaluate(()=>window.depthNavigations),[{href:'https://laparada.pages.dev',prevented:false}]);
  assert.equal(await card.evaluate(el=>el===document.activeElement),true);
  assert.ok((await pose(card)).rotation<.001);
});

test('cambiar a movimiento reducido limpia un giro activo y permite reactivarlo sin congelarlo',async t=>{
  const {page}=await pageFor(t);const card=page.locator('[data-project-key="laparada"].project-card');
  await hoverCorner(page,card);assert.ok((await pose(card)).rotation>.01);
  await page.emulateMedia({reducedMotion:'reduce'});await settle(card);
  const reduced=await pose(card);assert.ok(reduced.rotation<.001);assert.equal(reduced.rx,'');assert.equal(reduced.ry,'');
  assert.equal(await card.evaluate(el=>['--card-x','--card-y'].every(name=>el.style.getPropertyValue(name)==='')),true);
  await page.mouse.move(0,0);await page.emulateMedia({reducedMotion:'no-preference'});
  await hoverCorner(page,card);assert.ok((await pose(card)).rotation>.01);
  await page.mouse.move(0,0);await settle(card);assert.ok((await pose(card)).rotation<.001);
});

test('el ratón no roba el foco de teclado y los enlaces siguen activándose con Enter',async t=>{
  const {page}=await pageFor(t);await observeNavigation(page);
  const cards=page.locator('a.project-card:not(.is-hidden)'),first=cards.nth(0),second=cards.nth(1);
  await first.focus();await hoverCorner(page,first);
  assert.ok((await pose(first)).rotation>.01);assert.equal(await first.evaluate(el=>el===document.activeElement),true);
  await page.keyboard.press('Tab');assert.equal(await second.evaluate(el=>el===document.activeElement),true);
  assert.notEqual(await second.evaluate(el=>getComputedStyle(el).outlineStyle),'none');
  await first.focus();await page.keyboard.press('Enter');
  assert.deepEqual(await page.evaluate(()=>window.depthNavigations),[{href:'https://laparada.pages.dev',prevented:false}]);
  assert.equal(await first.evaluate(el=>el===document.activeElement),true);
});

test('puntero grueso y móvil conservan scroll táctil nativo y navegación sin inclinación de galería',async t=>{
  for(const width of [390,1024]){
    const {page,context}=await pageFor(t,{viewport:{width,height:900},hasTouch:true,isMobile:true});await observeNavigation(page);
    assert.equal(await page.evaluate(()=>matchMedia('(pointer: coarse)').matches),true);
    const card=page.locator('[data-project-key="laparada"].project-card');await card.scrollIntoViewIfNeeded();await settle(card);
    const before=await page.evaluate(()=>scrollY),box=await card.boundingBox();
    const x=box.x+box.width/2,y=Math.min(750,Math.max(350,box.y+box.height*.6));
    const client=await context.newCDPSession(page);
    await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
    for(let step=1;step<=5;step++){
      await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-step*45}]});
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    }
    await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await page.waitForFunction(start=>scrollY>start+100,before);
    assert.deepEqual(await page.evaluate(()=>window.depthNavigations),[],'el deslizamiento no activa el enlace');
    await card.scrollIntoViewIfNeeded();await settle(card);
    const resting=await pose(card);assert.ok(resting.rotation<.001);assert.equal(resting.rx,'');assert.equal(resting.ry,'');
    await card.tap();
    assert.deepEqual(await page.evaluate(()=>window.depthNavigations),[{href:'https://laparada.pages.dev',prevented:false}]);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  }
});
