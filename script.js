const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const livesReadout = document.getElementById('livesReadout');
const scoreReadout = document.getElementById('scoreReadout');
const bestReadout = document.getElementById('bestReadout');
const statusReadout = document.getElementById('statusReadout');
const speedReadout = document.getElementById('speedReadout');
const statusBox = document.getElementById('statusBox');
const startButton = document.getElementById('startButton');
const pauseButton = document.getElementById('pauseButton');
const resetButton = document.getElementById('resetButton');

const state = {
  running: false,
  paused: false,
  gameOver: false,
  lives: 3,
  maxLives: 5,
  score: 0,
  best: Number(localStorage.getItem('spaceShipBest') || 0),
  elapsed: 0,
  lastTime: 0,
  spawnTimer: 0,
  repairTimer: 0,
  invulnerable: 0,
  pointerActive: false,
  stars: [],
  asteroids: [],
  repairs: [],
  particles: [],
  ship: {
    x: canvas.width * 0.5,
    y: canvas.height * 0.79,
    targetX: canvas.width * 0.5,
    targetY: canvas.height * 0.79,
    r: 18
  }
};

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function rand(min, max) { return min + Math.random() * (max - min); }
function setStatus(text) { statusBox.textContent = text; }

function resetStars() {
  state.stars = Array.from({ length: 95 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    s: rand(0.7, 2.2),
    v: rand(18, 65),
    a: rand(0.25, 0.85)
  }));
}

function resetGame() {
  state.running = false;
  state.paused = false;
  state.gameOver = false;
  state.lives = 3;
  state.score = 0;
  state.elapsed = 0;
  state.lastTime = 0;
  state.spawnTimer = 0;
  state.repairTimer = 3.5;
  state.invulnerable = 0;
  state.asteroids = [];
  state.repairs = [];
  state.particles = [];
  state.ship.x = canvas.width * 0.5;
  state.ship.y = canvas.height * 0.79;
  state.ship.targetX = state.ship.x;
  state.ship.targetY = state.ship.y;
  startButton.textContent = 'START FLIGHT';
  pauseButton.textContent = 'PAUSE';
  pauseButton.disabled = true;
  setStatus('Flight computer ready. The asteroid field has agreed to be unreasonable.');
  updateHud('STANDBY');
  draw();
}

function updateHud(status) {
  livesReadout.textContent = Array.from({ length: state.lives }, () => '♥').join(' ') || '—';
  scoreReadout.textContent = String(state.score);
  bestReadout.textContent = String(state.best);
  statusReadout.textContent = status;
  const speed = 1 + Math.min(1.35, state.elapsed / 42);
  speedReadout.textContent = `FIELD VELOCITY: ${speed.toFixed(2)}×`;
}

function startGame() {
  if (state.gameOver) resetGame();
  if (state.running && !state.paused) return;
  state.running = true;
  state.paused = false;
  state.gameOver = false;
  state.lastTime = performance.now();
  startButton.textContent = 'FLIGHT ACTIVE';
  pauseButton.disabled = false;
  pauseButton.textContent = 'PAUSE';
  setStatus('Flight started. Try not to convert the ship into a geology sample.');
  updateHud('ACTIVE');
  requestAnimationFrame(loop);
}

function togglePause() {
  if (!state.running || state.gameOver) return;
  state.paused = !state.paused;
  pauseButton.textContent = state.paused ? 'RESUME' : 'PAUSE';
  updateHud(state.paused ? 'PAUSED' : 'ACTIVE');
  setStatus(state.paused ? 'Simulation paused. Asteroids reluctantly respect labor law.' : 'Flight resumed. Bad decisions continue.');
  if (!state.paused) {
    state.lastTime = performance.now();
    requestAnimationFrame(loop);
  }
}

function endGame() {
  state.running = false;
  state.gameOver = true;
  pauseButton.disabled = true;
  startButton.textContent = 'RESTART FLIGHT';
  if (state.score > state.best) {
    state.best = state.score;
    localStorage.setItem('spaceShipBest', String(state.best));
  }
  updateHud('HULL LOST');
  setStatus(`MISSION FAILED // ${state.score} asteroids dodged before geology won.`);
  burst(state.ship.x, state.ship.y, '#ff6f7d', 30);
  draw();
}

function spawnAsteroid() {
  const r = rand(15, 42);
  const speedScale = 1 + Math.min(1.35, state.elapsed / 42);
  state.asteroids.push({
    x: rand(r + 6, canvas.width - r - 6),
    y: -r - 20,
    r,
    vy: rand(150, 225) * speedScale,
    vx: rand(-26, 26),
    rot: rand(0, Math.PI * 2),
    vr: rand(-1.1, 1.1),
    vertices: Array.from({ length: 9 }, (_, i) => ({
      a: (i / 9) * Math.PI * 2,
      m: rand(0.76, 1.12)
    }))
  });
}

function spawnRepair() {
  state.repairs.push({
    x: rand(35, canvas.width - 35),
    y: -30,
    r: 14,
    vy: rand(120, 150),
    pulse: Math.random() * Math.PI * 2
  });
}

function circleHit(a, b, shrink = 0) {
  return Math.hypot(a.x - b.x, a.y - b.y) < a.r + b.r - shrink;
}

function burst(x, y, color, count = 14) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = rand(45, 180);
    state.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.3, 0.8), color });
  }
}

function damageShip(asteroid) {
  if (state.invulnerable > 0) return;
  state.lives -= 1;
  state.invulnerable = 1.25;
  burst(state.ship.x, state.ship.y, '#ff6f7d', 18);
  asteroid.dead = true;
  if (state.lives <= 0) {
    endGame();
  } else {
    updateHud('HIT / RECOVERING');
    setStatus(`HULL IMPACT // ${state.lives} ${state.lives === 1 ? 'life' : 'lives'} remaining. Evasive competence requested.`);
  }
}

function collectRepair(repair) {
  repair.dead = true;
  burst(repair.x, repair.y, '#86ff9b', 18);
  if (state.lives < state.maxLives) {
    state.lives += 1;
    setStatus(`REPAIR CELL ACQUIRED // hull restored to ${state.lives}/${state.maxLives}.`);
  } else {
    setStatus('REPAIR CELL ACQUIRED // hull already at maximum. Wastefully healthy.');
  }
}

function update(dt) {
  state.elapsed += dt;
  state.invulnerable = Math.max(0, state.invulnerable - dt);

  const follow = 1 - Math.pow(0.00045, dt);
  state.ship.x += (state.ship.targetX - state.ship.x) * follow;
  state.ship.y += (state.ship.targetY - state.ship.y) * follow;
  state.ship.x = clamp(state.ship.x, 26, canvas.width - 26);
  state.ship.y = clamp(state.ship.y, 35, canvas.height - 30);

  for (const star of state.stars) {
    star.y += star.v * dt * (1 + Math.min(1, state.elapsed / 50));
    if (star.y > canvas.height + 3) {
      star.y = -3;
      star.x = Math.random() * canvas.width;
    }
  }

  const spawnEvery = Math.max(0.29, 0.73 - state.elapsed * 0.0065);
  state.spawnTimer += dt;
  while (state.spawnTimer >= spawnEvery) {
    state.spawnTimer -= spawnEvery;
    spawnAsteroid();
  }

  state.repairTimer -= dt;
  if (state.repairTimer <= 0) {
    if (Math.random() < 0.62) spawnRepair();
    state.repairTimer = rand(8, 14);
  }

  for (const a of state.asteroids) {
    a.x += a.vx * dt;
    a.y += a.vy * dt;
    a.rot += a.vr * dt;
    if (!a.dead && circleHit(state.ship, a, 5)) damageShip(a);
    if (!a.dead && a.y - a.r > canvas.height) {
      a.dead = true;
      state.score += 1;
      if (state.score > state.best) state.best = state.score;
    }
  }
  state.asteroids = state.asteroids.filter(a => !a.dead);

  for (const r of state.repairs) {
    r.y += r.vy * dt;
    r.pulse += dt * 4;
    if (!r.dead && circleHit(state.ship, r, 3)) collectRepair(r);
    if (r.y - r.r > canvas.height) r.dead = true;
  }
  state.repairs = state.repairs.filter(r => !r.dead);

  for (const p of state.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= Math.pow(0.08, dt);
    p.vy *= Math.pow(0.08, dt);
    p.life -= dt;
  }
  state.particles = state.particles.filter(p => p.life > 0);

  updateHud(state.invulnerable > 0 ? 'HIT / RECOVERING' : 'ACTIVE');
}

function drawBackground() {
  ctx.fillStyle = '#030708';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.strokeStyle = 'rgba(105,240,193,.035)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= canvas.width; x += 45) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
  }
  for (let y = 0; y <= canvas.height; y += 45) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
  }
  ctx.restore();

  for (const star of state.stars) {
    ctx.globalAlpha = star.a;
    ctx.fillStyle = '#dceae5';
    ctx.fillRect(star.x, star.y, star.s, star.s);
  }
  ctx.globalAlpha = 1;
}

function drawShip() {
  const s = state.ship;
  const blink = state.invulnerable > 0 && Math.floor(state.invulnerable * 12) % 2 === 0;
  if (blink) return;

  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.strokeStyle = '#5fd1ff';
  ctx.fillStyle = '#0b2328';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -24);
  ctx.lineTo(18, 18);
  ctx.lineTo(7, 13);
  ctx.lineTo(0, 21);
  ctx.lineTo(-7, 13);
  ctx.lineTo(-18, 18);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = '#69f0c1';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -15);
  ctx.lineTo(0, 10);
  ctx.stroke();

  const flame = 11 + Math.random() * 8;
  ctx.strokeStyle = '#e7d65e';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-6, 20); ctx.lineTo(-6, 20 + flame); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(6, 20); ctx.lineTo(6, 20 + flame); ctx.stroke();
  ctx.restore();
}

function drawAsteroid(a) {
  ctx.save();
  ctx.translate(a.x, a.y);
  ctx.rotate(a.rot);
  ctx.fillStyle = '#5f6764';
  ctx.strokeStyle = '#aab5b0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  a.vertices.forEach((v, i) => {
    const x = Math.cos(v.a) * a.r * v.m;
    const y = Math.sin(v.a) * a.r * v.m;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = 'rgba(15,20,19,.35)';
  ctx.beginPath(); ctx.arc(-a.r * .23, -a.r * .08, a.r * .2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(a.r * .27, a.r * .2, a.r * .13, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawRepair(r) {
  const pulse = 1 + Math.sin(r.pulse) * .12;
  ctx.save();
  ctx.translate(r.x, r.y);
  ctx.scale(pulse, pulse);
  ctx.fillStyle = 'rgba(134,255,155,.10)';
  ctx.strokeStyle = '#86ff9b';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, r.r + 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#86ff9b';
  ctx.fillRect(-3, -10, 6, 20);
  ctx.fillRect(-10, -3, 20, 6);
  ctx.restore();
}

function drawParticles() {
  for (const p of state.particles) {
    ctx.globalAlpha = clamp(p.life * 2, 0, 1);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, 3, 3);
  }
  ctx.globalAlpha = 1;
}

function drawOverlay() {
  if (state.running && !state.paused) return;
  ctx.save();
  ctx.fillStyle = 'rgba(3,7,8,.62)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#dceae5';
  ctx.font = '700 28px Courier New';
  ctx.fillText(state.gameOver ? 'HULL LOST' : state.paused ? 'SIMULATION PAUSED' : 'ASTEROID FIELD STANDBY', canvas.width / 2, canvas.height / 2 - 12);
  ctx.fillStyle = '#69f0c1';
  ctx.font = '15px Courier New';
  ctx.fillText(state.gameOver ? `FINAL DODGES: ${state.score}` : state.paused ? 'press RESUME to continue' : 'press START FLIGHT', canvas.width / 2, canvas.height / 2 + 24);
  ctx.restore();
}

function draw() {
  drawBackground();
  for (const a of state.asteroids) drawAsteroid(a);
  for (const r of state.repairs) drawRepair(r);
  drawParticles();
  drawShip();
  drawOverlay();
}

function loop(now) {
  if (!state.running || state.paused || state.gameOver) return;
  const dt = Math.min(0.035, (now - state.lastTime) / 1000 || 0);
  state.lastTime = now;
  update(dt);
  draw();
  if (state.running && !state.paused && !state.gameOver) requestAnimationFrame(loop);
}

function pointerToCanvas(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * canvas.width / rect.width,
    y: (e.clientY - rect.top) * canvas.height / rect.height
  };
}

canvas.addEventListener('pointerdown', e => {
  e.preventDefault();
  state.pointerActive = true;
  canvas.setPointerCapture?.(e.pointerId);
  const p = pointerToCanvas(e);
  state.ship.targetX = p.x;
  state.ship.targetY = p.y;
});
canvas.addEventListener('pointermove', e => {
  if (e.pointerType !== 'mouse' && !state.pointerActive) return;
  const p = pointerToCanvas(e);
  state.ship.targetX = p.x;
  state.ship.targetY = p.y;
});
canvas.addEventListener('pointerup', e => {
  state.pointerActive = false;
  canvas.releasePointerCapture?.(e.pointerId);
});
canvas.addEventListener('pointercancel', () => { state.pointerActive = false; });

startButton.addEventListener('click', startGame);
pauseButton.addEventListener('click', togglePause);
resetButton.addEventListener('click', resetGame);

resetStars();
resetGame();
