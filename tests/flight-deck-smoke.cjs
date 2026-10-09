// Use existing tooling: PLAYWRIGHT_MODULE, BROWSER_PATH and BASE_URL.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const base=process.env.BASE_URL||'http://127.0.0.1:8001';
const report={checks:[],errors:[],failedResources:[],performance:[]};
function ok(label,value){assert.ok(value,label);report.checks.push(label);console.log('PASS',label)}
function watch(p){p.on('pageerror',e=>report.errors.push(e.message));p.on('console',m=>{if(m.type()==='error')report.errors.push(m.text())});p.on('response',r=>{if(r.status()>=400)report.failedResources.push(r.url())})}
async function measure(p,mode,viewport){const m=await p.evaluate(()=>new Promise(resolve=>{const intervals=[];let last=performance.now(),start=last;function sample(now){intervals.push(now-last);last=now;if(now-start<2200)requestAnimationFrame(sample);else{intervals.shift();intervals.sort((a,b)=>a-b);resolve({fps:1000/(intervals.reduce((a,b)=>a+b,0)/intervals.length),p95:intervals[Math.floor(intervals.length*.95)]})}}requestAnimationFrame(sample)}));report.performance.push({mode,viewport,...m})}
(async()=>{const b=await chromium.launch({executablePath:process.env.BROWSER_PATH,headless:true});report.browser=await b.version();
try{
for(const [name,width,height]of [['desktop',1440,1000],['mobile',390,844]]){
 const p=await b.newPage({viewport:{width,height},deviceScaleFactor:name==='mobile'?3:1,hasTouch:name==='mobile',isMobile:name==='mobile'});watch(p);
 await p.goto(base);await p.waitForFunction(()=>noHopeWebGLReady);
 ok(`${name}: controls and canvas visible without scrolling`,await p.locator('.control-bar').evaluate(e=>e.getBoundingClientRect().bottom<innerHeight));
 ok(`${name}: no horizontal overflow`,await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 ok(`${name}: hidden consumption cannot receive focus`,!(await p.locator('#retryButton').isVisible()));
 for(const mode of ['standard','hardcore','nohope']){
  await p.click(mode==='standard'?'#standardMode':mode==='hardcore'?'#hardcoreMode':'#noHopeMode');
  ok(`${name}/${mode}: selected profile is announced`,await p.locator(mode==='standard'?'#standardMode':mode==='hardcore'?'#hardcoreMode':'#noHopeMode').getAttribute('aria-pressed')==='true');
  await p.fill('#missionInput','2604');await p.click('#startButton');await p.waitForTimeout(750);
  ok(`${name}/${mode}: asteroids spawn and mode buttons lock`,await p.evaluate(()=>state.asteroids.length>0&&standardMode.disabled&&missionInput.disabled));
  await measure(p,mode,name);
  await p.click('#pauseButton');
  const before=await p.evaluate(()=>[state.elapsed,noHopeRenderer.info.frames]);await p.waitForTimeout(100);
  ok(`${name}/${mode}: pause freezes simulation and WebGL`,JSON.stringify(before)===JSON.stringify(await p.evaluate(()=>[state.elapsed,noHopeRenderer.info.frames])));
  await p.click('#resetButton');
  ok(`${name}/${mode}: reset clears run and mission`,await p.evaluate(()=>state.elapsed===0&&state.asteroids.length===0&&state.missionCode===''&&!state.running));
 }
 if(name==='mobile'){
  await p.click('#standardMode');await p.fill('#missionInput','2604');await p.click('#startButton');
  await p.locator('#gameCanvas').scrollIntoViewIfNeeded();const bb=await p.locator('#gameCanvas').boundingBox();const cdp=await p.context().newCDPSession(p);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:bb.x+bb.width*.25,y:bb.y+bb.height*.6}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:bb.x+bb.width*.75,y:bb.y+bb.height*.6}]});await p.waitForTimeout(100);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  ok('touch drag/release still controls ship',await p.evaluate(()=>state.ship.targetX>canvas.width*.7&&!state.pointerActive));
  await p.click('#resetButton');
 }
 for(const [w,h]of [[360,800],[768,1024],[844,390],[1920,1080]]){await p.setViewportSize({width:w,height:h});await p.waitForTimeout(75);ok(`${name}: resize ${w}×${h}`,await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&Math.abs(document.querySelector('.nohope-stage').getBoundingClientRect().width/document.querySelector('.nohope-stage').getBoundingClientRect().height-900/620)<.01))}
 await p.close();
}
const p=await b.newPage();watch(p);await p.goto(base);await p.waitForFunction(()=>noHopeWebGLReady);
for(const mode of ['standard','hardcore','nohope']){
 const result=await p.evaluate(mode=>{setMode(mode);resetGame();startGame();cancelAnimationFrame(animationFrame);const lives=state.lives;const asteroid=makeAsteroid(state.ship.x,state.ship.y,30,0,0);state.asteroids.push(asteroid);update(.01);draw();return {initial:lives,after:state.lives,dead:state.gameOver};},mode);
 ok(`${mode}: ordinary collision damage preserved`,result.after===result.initial-1&&result.dead===(mode!=='standard'));
}
ok('repair restores hull and respects maximum',await p.evaluate(()=>{setMode('standard');resetGame();state.lives=2;collectRepair({dead:false,x:10,y:10});const recovered=state.lives===3;state.lives=5;collectRepair({dead:false,x:10,y:10});return recovered&&state.lives===5}));
ok('new elapsed and horizon readouts match simulation',await p.evaluate(()=>{setMode('nohope');state.elapsed=34;updateHud('ACTIVE');draw();return document.getElementById('elapsedReadout').textContent==='00:34'&&document.getElementById('horizonProgress').value===50&&!document.getElementById('horizonTelemetry').hidden}));
await p.evaluate(()=>beginConsumption());
ok('consumption disables background interaction',await p.locator('#pageShell').evaluate(e=>e.inert));
await p.waitForFunction(()=>consumptionOverlay.classList.contains('finished'),null,{timeout:6000});
ok('consumption puts keyboard focus on retry',await p.locator('#retryButton').evaluate(e=>e===document.activeElement));
await p.keyboard.press('Enter');
ok('keyboard retry restores interface and focus',await p.evaluate(()=>!document.getElementById('pageShell').inert&&document.activeElement===startButton&&state.elapsed===0));
await p.close();
const reduced=await b.newPage({reducedMotion:'reduce'});watch(reduced);await reduced.goto(base);await reduced.waitForFunction(()=>noHopeWebGLReady);await reduced.evaluate(()=>{setMode('nohope');beginConsumption()});await reduced.waitForTimeout(4400);
ok('reduced-motion consumption remains visible',await reduced.locator('.consumption-message').evaluate(e=>getComputedStyle(e).opacity==='1'&&getComputedStyle(e).animationName==='none'));await reduced.close();
// A WebGL failure must keep the original 2D No Hope fallback available.
const fallback=await b.newPage();await fallback.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/.test(type)?null:get.call(this,type,...args)}});await fallback.goto(base);await fallback.waitForFunction(()=>noHopeFailure);await fallback.click('#noHopeMode');ok('2D fallback remains playable',await fallback.evaluate(()=>noHopeFailure&&statusBox.textContent.includes('fallback')));await fallback.close();
ok('no unexpected browser errors',report.errors.length===0);ok('all resources load',report.failedResources.length===0);
}finally{fs.writeFileSync(path.join(__dirname,'../docs/flight-deck/verification.json'),JSON.stringify(report,null,2));await b.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
