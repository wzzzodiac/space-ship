// Serve the pre-redesign commit separately and supply BASELINE_URL and BASE_URL.
// The test reseeds after UI initialization; rendering never runs during simulation.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
if(!process.env.BASELINE_URL)throw new Error('BASELINE_URL must serve the pre-redesign version');
(async()=>{const b=await chromium.launch({executablePath:process.env.BROWSER_PATH,headless:true});
try{
 const pages=[];for(const url of [process.env.BASELINE_URL,process.env.BASE_URL]){const p=await b.newPage();await p.goto(url);await p.waitForFunction(()=>noHopeWebGLReady);pages.push(p)}
 const results=[];
 for(const mode of ['standard','hardcore','nohope']){
  const snapshots=[];
  for(const p of pages)snapshots.push(await p.evaluate(mode=>{
   setMode(mode);resetGame();missionInput.value='2604';startGame();cancelAnimationFrame(animationFrame);
   let seed=2604;Math.random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);resetStars();
   for(let i=0;i<1500;i++)update(.02);
   const {elapsed,score,lives,ship,asteroids,repairs,particles,stars,spawnTimer,repairTimer}=state;
   return {elapsed,score,lives,ship,asteroids,repairs,particles,stars,spawnTimer,repairTimer,profiles};
  },mode));
  assert.deepEqual(snapshots[1],snapshots[0],`${mode}: simulation must match baseline exactly`);
  const s=snapshots[0];results.push({mode,seconds:s.elapsed,score:s.score,asteroids:s.asteroids.length,repairs:s.repairs.length,exactStateMatch:true});console.log('PASS exact gameplay state',mode);
 }
 fs.writeFileSync(path.join(__dirname,'../docs/flight-deck/gameplay-parity.json'),JSON.stringify({baselineCommit:'e6cdc68cafc6e2dde2cc3ee1fc20bbe51f20e4a6',seed:2604,step:.02,steps:1500,results},null,2));
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
