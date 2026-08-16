const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const $ = id => document.getElementById(id);

const livesReadout = $('livesReadout');
const scoreReadout = $('scoreReadout');
const bestReadout = $('bestReadout');
const statusReadout = $('statusReadout');
const speedReadout = $('speedReadout');
const modeReadout = $('modeReadout');
const statusBox = $('statusBox');
const startButton = $('startButton');
const pauseButton = $('pauseButton');
const resetButton = $('resetButton');
const standardMode = $('standardMode');
const hardcoreMode = $('hardcoreMode');
const noHopeMode = $('noHopeMode');
const modeDescription = $('modeDescription');
const missionInput = $('missionInput');
const missionState = $('missionState');
const consumptionOverlay = $('consumptionOverlay');
const consumptionScore = $('consumptionScore');
const retryButton = $('retryButton');

const profiles = {
  standard: {
    name: 'STANDARD', initialLives: 3, maxLives: 5,
    baseSpawn: 0.73, minSpawn: 0.29, spawnRamp: 0.0065,
    baseSpeed: [150, 225], lateral: 26, speedRamp: 42, speedBonus: 1.35,
    repairChance: 0.62, repairDelay: [8, 14], rockSize: [15, 42], sideChance: 0
  },
  hardcore: {
    name: 'HARDCORE', initialLives: 1, maxLives: 3,
    baseSpawn: 0.54, minSpawn: 0.20, spawnRamp: 0.0085,
    baseSpeed: [190, 285], lateral: 48, speedRamp: 30, speedBonus: 1.75,
    repairChance: 0.38, repairDelay: [11, 18], rockSize: [17, 50], sideChance: 0.06
  },
  nohope: {
    name: 'NO HOPE', initialLives: 1, maxLives: 1,
    baseSpawn: 0.42, minSpawn: 0.14, spawnRamp: 0.009,
    baseSpeed: [240, 360], lateral: 92, speedRamp: 18, speedBonus: 2.30,
    repairChance: 0, repairDelay: [999, 999], rockSize: [18, 58], sideChance: 0.24,
    collapseTime: 68
  }
};

const state = {
  mode: 'standard', running: false, paused: false, gameOver: false, collapsing: false,
  lives: 3, maxLives: 5, score: 0, best: 0, elapsed: 0, lastTime: 0,
  spawnTimer: 0, repairTimer: 0, invulnerable: 0, pointerActive: false,
  missionCode: '', noclip: false,
  stars: [], asteroids: [], repairs: [], particles: [],
  ship: { x: 450, y: 490, targetX: 450, targetY: 490, r: 18 }
};

function cfg() { return profiles[state.mode]; }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function rand(a, b) { return a + Math.random() * (b - a); }
function setStatus(text) { statusBox.textContent = text; }
function bestKey() { return `spaceShipBest_${state.mode}`; }
function loadBest() { state.best = Number(localStorage.getItem(bestKey()) || 0); }
function noHopeProgress() { return state.mode === 'nohope' ? clamp(state.elapsed / cfg().collapseTime, 0, 1) : 0; }

function resetStars() {
  state.stars = Array.from({ length: 105 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    s: rand(0.7, 2.2),
    v: rand(18, 65),
    a: rand(0.25, 0.85)
  }));
}

function updateMissionUI() {
  const assigned = !!state.missionCode;
  missionState.textContent = state.noclip ? 'OBSERVER / NOCLIP' : assigned ? `LOCKED // ${state.missionCode}` : 'UNASSIGNED';
  missionState.classList.toggle('active', assigned);
  missionState.classList.toggle('noclip', state.noclip);
}

function clearMission() {
  state.missionCode = '';
  state.noclip = false;
  missionInput.value = '';
  missionInput.disabled = false;
  updateMissionUI();
}

function armMission() {
  state.missionCode = missionInput.value.trim().toUpperCase().slice(0, 4);
  state.noclip = state.missionCode === '2604';
  missionInput.value = state.missionCode;
  missionInput.disabled = true;
  updateMissionUI();
}

function updateModeUI() {
  const hardcore = state.mode === 'hardcore';
  const nohope = state.mode === 'nohope';
  document.body.classList.toggle('hardcore', hardcore);
  document.body.classList.toggle('nohope', nohope);
  standardMode.classList.toggle('active', state.mode === 'standard');
  hardcoreMode.classList.toggle('active', hardcore);
  noHopeMode.classList.toggle('active', nohope);
  modeReadout.textContent = cfg().name;
  modeDescription.textContent = nohope
    ? 'NO HOPE // 1 life, no repairs, diagonal debris, extreme speed and an approaching black hole. Survival is temporary.'
    : hardcore
      ? 'HARDCORE // 1 initial life, denser/faster rocks, rarer repairs, separate best score.'
      : 'STANDARD // 3 initial lives, normal asteroid density, repair cells available.';
}

function resetGame(customStatus = null, clearCode = true) {
  const c = cfg();
  state.running = false;
  state.paused = false;
  state.gameOver = false;
  state.collapsing = false;
  state.lives = c.initialLives;
  state.maxLives = c.maxLives;
  state.score = 0;
  state.elapsed = 0;
  state.lastTime = 0;
  state.spawnTimer = 0;
  state.repairTimer = state.mode === 'standard' ? 3.5 : state.mode === 'hardcore' ? 7 : 999;
  state.invulnerable = 0;
  state.asteroids = [];
  state.repairs = [];
  state.particles = [];
  state.ship.x = canvas.width * 0.5;
  state.ship.y = canvas.height * 0.79;
  state.ship.targetX = state.ship.x;
  state.ship.targetY = state.ship.y;
  loadBest();
  startButton.textContent = 'START FLIGHT';
  pauseButton.textContent = 'PAUSE';
  pauseButton.disabled = true;
  standardMode.disabled = false;
  hardcoreMode.disabled = false;
  noHopeMode.disabled = false;
  if (clearCode) clearMission();
  else updateMissionUI();
  updateModeUI();
  document.body.classList.remove('consuming');
  consumptionOverlay.classList.remove('finished');
  consumptionOverlay.setAttribute('aria-hidden', 'true');

  let defaultStatus = 'Flight computer ready. The asteroid field has agreed to be unreasonable.';
  if (state.mode === 'hardcore') defaultStatus = 'HARDCORE armed. One life. Denser field. Excellent decision-making.';
  if (state.mode === 'nohope') defaultStatus = 'NO HOPE armed. One life. No repairs. Something massive is approaching.';
  setStatus(customStatus || defaultStatus);
  updateHud('STANDBY');
  draw();
}

function setMode(mode) {
  if (!profiles[mode] || mode === state.mode) { updateModeUI(); return; }
  const interruptedRun = state.running || state.paused;
  state.running = false;
  state.paused = false;
  state.mode = mode;
  resetGame(interruptedRun
    ? `${cfg().name} profile loaded. Previous flight aborted because reality has been reconfigured XD.`
    : `${cfg().name} profile loaded. Flight computer reconfigured.`, true);
}

function speedScale() {
  const c = cfg();
  return 1 + Math.min(c.speedBonus, state.elapsed / c.speedRamp);
}

function updateHud(status) {
  livesReadout.textContent = Array.from({ length: state.lives }, () => '♥').join(' ') || '—';
  scoreReadout.textContent = String(state.score);
  bestReadout.textContent = String(state.best);
  statusReadout.textContent = state.noclip && state.running ? 'OBSERVER' : status;
  modeReadout.textContent = cfg().name;
  speedReadout.textContent = state.mode === 'nohope'
    ? `FIELD: ${speedScale().toFixed(2)}× // EVENT HORIZON: ${Math.round(noHopeProgress() * 100)}%`
    : `FIELD VELOCITY: ${speedScale().toFixed(2)}×`;
}

function startGame() {
  if (state.gameOver) resetGame(null, true);
  if (state.running || state.collapsing) return;
  armMission();
  state.running = true;
  state.paused = false;
  state.gameOver = false;
  state.lastTime = performance.now();
  startButton.textContent = 'FLIGHT ACTIVE';
  pauseButton.disabled = false;
  standardMode.disabled = true;
  hardcoreMode.disabled = true;
  noHopeMode.disabled = true;
  if (state.noclip) setStatus('MISSION 2604 // OBSERVER MODE. Collision model bypassed. Event horizon remains very much employed.');
  else if (state.mode === 'nohope') setStatus('NO HOPE // event horizon detected. Estimated long-term survival probability: administratively zero.');
  else if (state.mode === 'hardcore') setStatus('HARDCORE FLIGHT // the asteroid field has stopped pretending to be fair.');
  else setStatus('Flight started. Try not to convert the ship into a geology sample.');
  updateHud('ACTIVE');
  requestAnimationFrame(loop);
}

function togglePause() {
  if (!state.running || state.gameOver || state.collapsing) return;
  state.paused = !state.paused;
  pauseButton.textContent = state.paused ? 'RESUME' : 'PAUSE';
  updateHud(state.paused ? 'PAUSED' : 'ACTIVE');
  setStatus(state.paused ? 'Simulation paused. Even the black hole must respect browser tabs.' : 'Flight resumed. Bad decisions continue.');
  if (!state.paused) { state.lastTime = performance.now(); requestAnimationFrame(loop); }
}

function saveBest() {
  if (state.score > state.best) {
    state.best = state.score;
    localStorage.setItem(bestKey(), String(state.best));
  }
}

function endGame(reason = 'impact') {
  if (state.gameOver || state.collapsing) return;
  state.running = false;
  state.gameOver = true;
  pauseButton.disabled = true;
  startButton.textContent = 'RESTART FLIGHT';
  saveBest();
  updateHud(reason === 'blackhole' ? 'CONSUMED' : 'HULL LOST');
  if (state.mode === 'nohope') setStatus(`NO HOPE FAILED // ${state.score} dodges. The universe did not require the black hole's assistance.`);
  else if (state.mode === 'hardcore') setStatus(`HARDCORE FAILED // ${state.score} dodges. You enabled this yourself XD.`);
  else setStatus(`MISSION FAILED // ${state.score} asteroids dodged before geology won.`);
  burst(state.ship.x, state.ship.y, state.mode === 'nohope' ? '#a27eff' : '#ff6f7d', 34);
  draw();
}

function beginConsumption() {
  if (state.collapsing || state.gameOver) return;
  state.running = false;
  state.collapsing = true;
  pauseButton.disabled = true;
  saveBest();
  updateHud('CONSUMED');
  setStatus(`EVENT HORIZON CONTACT // ${state.score} dodges logged. Interface integrity: regrettable.`);
  consumptionScore.textContent = `FINAL DODGES: ${state.score}`;
  document.body.classList.add('consuming');
  consumptionOverlay.setAttribute('aria-hidden', 'false');
  setTimeout(() => {
    consumptionOverlay.classList.add('finished');
    state.gameOver = true;
    state.collapsing = false;
  }, 4250);
}

function makeAsteroid(x, y, r, vx, vy) {
  return { x, y, r, vx, vy, rot: rand(0, Math.PI * 2), vr: rand(-1.6, 1.6), vertices: Array.from({ length: 9 }, (_, i) => ({ a: i / 9 * Math.PI * 2, m: rand(0.76, 1.12) })) };
}

function spawnAsteroid() {
  const c = cfg();
  const r = rand(...c.rockSize);
  const scale = speedScale();
  if (state.mode === 'nohope' && Math.random() < c.sideChance) {
    const fromLeft = Math.random() < 0.5;
    const y = rand(55, canvas.height * 0.72);
    const vx = rand(180, 300) * scale * (fromLeft ? 1 : -1);
    const vy = rand(90, 190) * scale;
    state.asteroids.push(makeAsteroid(fromLeft ? -r - 10 : canvas.width + r + 10, y, r, vx, vy));
    return;
  }
  state.asteroids.push(makeAsteroid(rand(r + 6, canvas.width - r - 6), -r - 20, r, rand(-c.lateral, c.lateral), rand(...c.baseSpeed) * scale));
}

function spawnRepair() {
  if (state.mode === 'nohope') return;
  state.repairs.push({ x: rand(35, canvas.width - 35), y: -30, r: 14, vy: rand(120, 155) * (state.mode === 'hardcore' ? 1.15 : 1), pulse: Math.random() * Math.PI * 2 });
}

function circleHit(a, b, shrink = 0) { return Math.hypot(a.x - b.x, a.y - b.y) < a.r + b.r - shrink; }

function burst(x, y, color, count = 14) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = rand(45, 180);
    state.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: rand(0.3, 0.8), color });
  }
}

function damageShip(asteroid) {
  if (state.noclip || state.invulnerable > 0) return;
  state.lives--;
  state.invulnerable = state.mode === 'nohope' ? 0 : 1.1;
  burst(state.ship.x, state.ship.y, '#ff6f7d', 18);
  asteroid.dead = true;
  if (state.lives <= 0) endGame('impact');
  else {
    updateHud('HIT / RECOVERING');
    setStatus(`HULL IMPACT // ${state.lives} ${state.lives === 1 ? 'life' : 'lives'} remaining.`);
  }
}

function collectRepair(repair) {
  repair.dead = true;
  burst(repair.x, repair.y, '#86ff9b', 18);
  if (state.lives < state.maxLives) {
    state.lives++;
    setStatus(`REPAIR CELL ACQUIRED // hull restored to ${state.lives}/${state.maxLives}.`);
  } else setStatus('REPAIR CELL ACQUIRED // hull already at maximum. Wastefully healthy.');
}

function update(dt) {
  const c = cfg();
  state.elapsed += dt;
  state.invulnerable = Math.max(0, state.invulnerable - dt);
  if (state.mode === 'nohope' && state.elapsed >= c.collapseTime) { beginConsumption(); return; }

  const follow = 1 - Math.pow(0.00045, dt);
  state.ship.x += (state.ship.targetX - state.ship.x) * follow;
  state.ship.y += (state.ship.targetY - state.ship.y) * follow;
  if (state.mode === 'nohope') {
    const p = noHopeProgress();
    state.ship.x += (canvas.width * 0.5 - state.ship.x) * dt * (0.08 + p * 0.22);
    state.ship.y += (canvas.height * 0.18 - state.ship.y) * dt * p * 0.16;
  }
  state.ship.x = clamp(state.ship.x, 26, canvas.width - 26);
  state.ship.y = clamp(state.ship.y, 35, canvas.height - 30);

  for (const star of state.stars) {
    star.y += star.v * dt * (1 + Math.min(1.6, state.elapsed / 38));
    if (star.y > canvas.height + 3) { star.y = -3; star.x = Math.random() * canvas.width; }
  }

  const spawnEvery = Math.max(c.minSpawn, c.baseSpawn - state.elapsed * c.spawnRamp);
  state.spawnTimer += dt;
  while (state.spawnTimer >= spawnEvery) { state.spawnTimer -= spawnEvery; spawnAsteroid(); }

  if (c.repairChance > 0) {
    state.repairTimer -= dt;
    if (state.repairTimer <= 0) {
      if (Math.random() < c.repairChance) spawnRepair();
      state.repairTimer = rand(...c.repairDelay);
    }
  }

  for (const asteroid of state.asteroids) {
    asteroid.x += asteroid.vx * dt;
    asteroid.y += asteroid.vy * dt;
    asteroid.rot += asteroid.vr * dt;
    if (!asteroid.dead && circleHit(state.ship, asteroid, 5)) damageShip(asteroid);
    const goneBottom = asteroid.y - asteroid.r > canvas.height;
    const goneSide = asteroid.x < -asteroid.r * 2 || asteroid.x > canvas.width + asteroid.r * 2;
    if (!asteroid.dead && (goneBottom || goneSide)) {
      asteroid.dead = true;
      state.score++;
      if (state.score > state.best) state.best = state.score;
    }
  }
  state.asteroids = state.asteroids.filter(a => !a.dead);

  for (const repair of state.repairs) {
    repair.y += repair.vy * dt;
    repair.pulse += dt * 4;
    if (!repair.dead && circleHit(state.ship, repair, 3)) collectRepair(repair);
    if (repair.y - repair.r > canvas.height) repair.dead = true;
  }
  state.repairs = state.repairs.filter(r => !r.dead);

  for (const particle of state.particles) {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= Math.pow(0.08, dt);
    particle.vy *= Math.pow(0.08, dt);
    particle.life -= dt;
  }
  state.particles = state.particles.filter(p => p.life > 0);
  updateHud(state.invulnerable > 0 ? 'HIT / RECOVERING' : 'ACTIVE');
}

function blackHoleGeometry() {
  const p = noHopeProgress();
  return { x: canvas.width * 0.5, y: -170 + p * 255, radius: 55 + p * 390, disk: 105 + p * 470, p };
}

function drawBlackHole() {
  if (state.mode !== 'nohope') return;
  const bh = blackHoleGeometry();
  ctx.save();
  const glow = ctx.createRadialGradient(bh.x, bh.y, bh.radius * 0.55, bh.x, bh.y, bh.disk);
  glow.addColorStop(0, 'rgba(0,0,0,1)');
  glow.addColorStop(0.30, 'rgba(16,8,26,.96)');
  glow.addColorStop(0.52, 'rgba(117,65,190,.24)');
  glow.addColorStop(0.70, 'rgba(162,126,255,.12)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(bh.x, bh.y, bh.disk, 0, Math.PI * 2); ctx.fill();
  ctx.translate(bh.x, bh.y); ctx.rotate(-0.18);
  ctx.strokeStyle = `rgba(190,145,255,${0.30 + bh.p * 0.30})`;
  ctx.lineWidth = 8 + bh.p * 13;
  ctx.beginPath(); ctx.ellipse(0, 0, bh.radius * 1.72, bh.radius * 0.36, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = `rgba(255,111,166,${0.16 + bh.p * 0.24})`;
  ctx.lineWidth = 3 + bh.p * 7;
  ctx.beginPath(); ctx.ellipse(0, 0, bh.radius * 2.05, bh.radius * 0.46, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.rotate(0.18);
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.arc(0, 0, bh.radius, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(198,177,255,.42)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, bh.radius * 1.04, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

function drawBackground() {
  ctx.fillStyle = state.mode === 'nohope' ? '#010102' : state.mode === 'hardcore' ? '#100406' : '#030708';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawBlackHole();
  ctx.save();
  ctx.strokeStyle = state.mode === 'nohope' ? 'rgba(162,126,255,.035)' : state.mode === 'hardcore' ? 'rgba(255,72,91,.075)' : 'rgba(105,240,193,.035)';
  for (let x = 0; x <= canvas.width; x += 45) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
  for (let y = 0; y <= canvas.height; y += 45) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); }
  ctx.restore();
  for (const star of state.stars) {
    ctx.globalAlpha = state.mode === 'nohope' ? star.a * (1 - noHopeProgress() * 0.55) : star.a;
    ctx.fillStyle = state.mode === 'hardcore' ? '#ffd9dc' : state.mode === 'nohope' ? '#c9c4d6' : '#dceae5';
    ctx.fillRect(star.x, star.y, star.s, star.s);
  }
  ctx.globalAlpha = 1;
  if (state.mode === 'nohope') {
    const p = noHopeProgress();
    const vignette = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 150, canvas.width / 2, canvas.height / 2, 620);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, `rgba(0,0,0,${0.32 + p * 0.42})`);
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

function drawShip() {
  const ship = state.ship;
  const blink = state.invulnerable > 0 && Math.floor(state.invulnerable * 12) % 2 === 0;
  if (blink) return;
  ctx.save(); ctx.translate(ship.x, ship.y);
  ctx.strokeStyle = state.mode === 'hardcore' ? '#ff485b' : state.mode === 'nohope' ? '#b99cff' : '#5fd1ff';
  ctx.fillStyle = state.mode === 'hardcore' ? '#321015' : state.mode === 'nohope' ? '#11101a' : '#0b2328';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0,-24); ctx.lineTo(18,18); ctx.lineTo(7,13); ctx.lineTo(0,21); ctx.lineTo(-7,13); ctx.lineTo(-18,18); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = state.mode === 'hardcore' ? '#ff9aa4' : state.mode === 'nohope' ? '#d7cbff' : '#69f0c1';
  ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0,-15); ctx.lineTo(0,10); ctx.stroke();
  const flame = 11 + Math.random() * 8;
  ctx.strokeStyle = state.mode === 'nohope' ? '#c486ff' : '#e7d65e'; ctx.lineWidth = 3;
  for (const x of [-6,6]) { ctx.beginPath(); ctx.moveTo(x,20); ctx.lineTo(x,20+flame); ctx.stroke(); }
  if (state.noclip) { ctx.strokeStyle = 'rgba(210,196,255,.55)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0,0,30,0,Math.PI*2); ctx.stroke(); }
  ctx.restore();
}

function drawAsteroid(a) {
  ctx.save(); ctx.translate(a.x,a.y); ctx.rotate(a.rot);
  ctx.fillStyle = state.mode === 'hardcore' ? '#6e4b4f' : state.mode === 'nohope' ? '#48454f' : '#5f6764';
  ctx.strokeStyle = state.mode === 'hardcore' ? '#e5a4aa' : state.mode === 'nohope' ? '#aaa2b7' : '#aab5b0';
  ctx.lineWidth = 2; ctx.beginPath();
  a.vertices.forEach((v,i)=>{ const x=Math.cos(v.a)*a.r*v.m,y=Math.sin(v.a)*a.r*v.m; i?ctx.lineTo(x,y):ctx.moveTo(x,y); });
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle='rgba(8,8,10,.40)'; ctx.beginPath(); ctx.arc(-a.r*.23,-a.r*.08,a.r*.2,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(a.r*.27,a.r*.2,a.r*.13,0,Math.PI*2); ctx.fill(); ctx.restore();
}

function drawRepair(r) {
  const pulse = 1 + Math.sin(r.pulse) * .12;
  ctx.save(); ctx.translate(r.x,r.y); ctx.scale(pulse,pulse); ctx.fillStyle='rgba(134,255,155,.10)'; ctx.strokeStyle='#86ff9b'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(0,0,r.r+5,0,Math.PI*2); ctx.fill(); ctx.stroke(); ctx.fillStyle='#86ff9b'; ctx.fillRect(-3,-10,6,20); ctx.fillRect(-10,-3,20,6); ctx.restore();
}

function drawParticles() {
  for (const p of state.particles) { ctx.globalAlpha = clamp(p.life * 2,0,1); ctx.fillStyle=p.color; ctx.fillRect(p.x,p.y,3,3); }
  ctx.globalAlpha=1;
}

function drawOverlay() {
  if (state.running && !state.paused) return;
  ctx.save();
  ctx.fillStyle = state.mode === 'nohope' ? 'rgba(1,1,3,.72)' : state.mode === 'hardcore' ? 'rgba(20,3,6,.70)' : 'rgba(3,7,8,.64)';
  ctx.fillRect(0,0,canvas.width,canvas.height); ctx.textAlign='center'; ctx.fillStyle='#dceae5'; ctx.font='700 28px Courier New';
  const title = state.gameOver ? 'HULL LOST' : state.paused ? 'SIMULATION PAUSED' : state.mode === 'nohope' ? 'NO HOPE // EVENT HORIZON DETECTED' : state.mode === 'hardcore' ? 'HARDCORE FIELD STANDBY' : 'ASTEROID FIELD STANDBY';
  ctx.fillText(title,canvas.width/2,canvas.height/2-12); ctx.fillStyle = state.mode === 'hardcore' ? '#ff485b' : state.mode === 'nohope' ? '#b99cff' : '#69f0c1'; ctx.font='15px Courier New';
  ctx.fillText(state.gameOver ? `FINAL DODGES: ${state.score}` : state.paused ? 'press RESUME to continue' : 'press START FLIGHT',canvas.width/2,canvas.height/2+24); ctx.restore();
}

function draw() {
  drawBackground();
  for (const a of state.asteroids) drawAsteroid(a);
  for (const r of state.repairs) drawRepair(r);
  drawParticles(); drawShip(); drawOverlay();
}

function loop(now) {
  if (!state.running || state.paused || state.gameOver || state.collapsing) return;
  const dt = Math.min(.035,(now-state.lastTime)/1000||0);
  state.lastTime = now; update(dt); draw();
  if (state.running && !state.paused && !state.gameOver && !state.collapsing) requestAnimationFrame(loop);
}

function pointerToCanvas(e) {
  const rect = canvas.getBoundingClientRect();
  return { x:(e.clientX-rect.left)*canvas.width/rect.width, y:(e.clientY-rect.top)*canvas.height/rect.height };
}

canvas.addEventListener('pointerdown',e=>{ e.preventDefault(); state.pointerActive=true; canvas.setPointerCapture?.(e.pointerId); const p=pointerToCanvas(e); state.ship.targetX=p.x; state.ship.targetY=p.y; });
canvas.addEventListener('pointermove',e=>{ if(e.pointerType!=='mouse'&&!state.pointerActive)return; const p=pointerToCanvas(e); state.ship.targetX=p.x; state.ship.targetY=p.y; });
canvas.addEventListener('pointerup',e=>{ state.pointerActive=false; canvas.releasePointerCapture?.(e.pointerId); });
canvas.addEventListener('pointercancel',()=>{state.pointerActive=false});
missionInput.addEventListener('input',()=>{ missionInput.value=missionInput.value.replace(/[^a-z0-9]/gi,'').toUpperCase().slice(0,4); });
startButton.addEventListener('click',startGame);
pauseButton.addEventListener('click',togglePause);
resetButton.addEventListener('click',()=>resetGame(null,true));
standardMode.addEventListener('click',()=>setMode('standard'));
hardcoreMode.addEventListener('click',()=>setMode('hardcore'));
noHopeMode.addEventListener('click',()=>setMode('nohope'));
retryButton.addEventListener('click',()=>resetGame('Simulation reconstructed. Mission code required again.',true));

resetStars();
updateModeUI();
resetGame();
