// No Hope visual override — v1.4.1
// Keeps gameplay untouched; only replaces black-hole/background/glare rendering.

blackHoleGeometry = function () {
  const p = noHopeProgress();
  return {
    x: canvas.width * 0.5,
    y: -110 + p * 175,
    radius: 42 + p * 160,
    disk: 170 + p * 230,
    thickness: 24 + p * 42,
    p
  };
};

drawBlackHole = function () {
  if (state.mode !== 'nohope') return;

  const bh = blackHoleGeometry();
  const t = performance.now() * 0.001;
  const hot = 0.28 + bh.p * 0.72;
  const pulse = 0.94 + Math.sin(t * 1.35) * 0.06;

  ctx.save();
  ctx.translate(bh.x, bh.y);
  ctx.rotate(-0.055);

  // Broad white/warm halo. This is deliberately soft so the core still reads as black.
  ctx.globalCompositeOperation = 'screen';
  const halo = ctx.createRadialGradient(0, 0, bh.radius * 0.72, 0, 0, bh.disk * 1.08);
  halo.addColorStop(0, 'rgba(255,255,255,0)');
  halo.addColorStop(0.16, `rgba(255,248,232,${0.10 + hot * 0.14})`);
  halo.addColorStop(0.31, `rgba(255,236,204,${0.08 + hot * 0.13})`);
  halo.addColorStop(0.60, `rgba(221,229,255,${0.03 + hot * 0.08})`);
  halo.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, bh.disk * 1.08, 0, Math.PI * 2);
  ctx.fill();

  // Lensed light above and below the event horizon.
  ctx.shadowColor = `rgba(255,247,225,${0.45 + bh.p * 0.42})`;
  ctx.shadowBlur = 12 + bh.p * 30;
  for (let i = 0; i < 8; i++) {
    const spread = i * 0.038;
    const rx = bh.radius * (1.06 + spread);
    const ry = bh.radius * (1.03 + spread * 0.72);
    const a = (0.18 + bh.p * 0.22) * (1 - i * 0.085);
    ctx.strokeStyle = `rgba(255,250,238,${a})`;
    ctx.lineWidth = 1.4 + bh.p * 2.7 + (7 - i) * 0.18;

    ctx.beginPath();
    ctx.ellipse(0, -bh.radius * 0.015, rx, ry, 0, Math.PI * 1.04, Math.PI * 1.96);
    ctx.stroke();

    if (i < 5) {
      ctx.strokeStyle = `rgba(255,221,177,${a * 0.58})`;
      ctx.beginPath();
      ctx.ellipse(0, bh.radius * 0.035, rx * 1.02, ry * 0.99, 0, Math.PI * 0.04, Math.PI * 0.96);
      ctx.stroke();
    }
  }

  // Back half of the accretion disk: many moving streaks instead of one Saturn-like ring.
  ctx.shadowBlur = 16 + bh.p * 34;
  const backGradient = ctx.createLinearGradient(-bh.disk, 0, bh.disk, 0);
  backGradient.addColorStop(0, 'rgba(255,183,115,0)');
  backGradient.addColorStop(0.13, `rgba(255,177,105,${0.18 + hot * 0.22})`);
  backGradient.addColorStop(0.38, `rgba(255,235,198,${0.52 + hot * 0.34})`);
  backGradient.addColorStop(0.50, `rgba(255,255,249,${0.72 + hot * 0.24})`);
  backGradient.addColorStop(0.62, `rgba(255,232,191,${0.48 + hot * 0.31})`);
  backGradient.addColorStop(0.88, `rgba(255,166,96,${0.15 + hot * 0.18})`);
  backGradient.addColorStop(1, 'rgba(255,172,101,0)');

  for (let i = 0; i < 34; i++) {
    const n = i / 33;
    const y = (n - 0.5) * bh.thickness * 1.15;
    const wave = Math.sin(t * (1.8 + n * 0.9) + i * 1.17) * (2 + bh.p * 3.5);
    const tilt = (n - 0.5) * 10;
    ctx.strokeStyle = backGradient;
    ctx.globalAlpha = (0.30 + Math.sin(i * 2.31 + t * 2.4) * 0.08) * pulse;
    ctx.lineWidth = 1.1 + (1 - Math.abs(n - 0.5) * 2) * (2.2 + bh.p * 2.0);
    ctx.beginPath();
    ctx.moveTo(-bh.disk, y + wave);
    ctx.bezierCurveTo(-bh.radius * 2.0, y - 10 - tilt, bh.radius * 2.0, y + 10 + tilt, bh.disk, y - wave * 0.55);
    ctx.stroke();
  }

  // Side lensing: the disk appears to climb around the hole instead of staying a flat ellipse.
  ctx.globalAlpha = 1;
  ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      const offset = i * 6;
      const a = (0.18 + bh.p * 0.28) * (1 - i * 0.13);
      ctx.strokeStyle = i < 2 ? `rgba(255,253,244,${a})` : `rgba(255,210,160,${a * 0.72})`;
      ctx.lineWidth = 2 + bh.p * 3 - i * 0.18;
      ctx.beginPath();
      ctx.moveTo(side * bh.disk * 0.64, -bh.thickness * 0.18 + offset * 0.12);
      ctx.bezierCurveTo(
        side * bh.radius * 1.56, -bh.radius * (0.52 + i * 0.03),
        side * bh.radius * 1.05, -bh.radius * (1.03 + i * 0.025),
        side * bh.radius * 0.18, -bh.radius * (1.12 + i * 0.018)
      );
      ctx.stroke();
    }
  }

  // Event horizon: pure black, drawn after the rear disk so it actually occludes it.
  ctx.globalCompositeOperation = 'source-over';
  ctx.shadowBlur = 0;
  const core = ctx.createRadialGradient(-bh.radius * 0.18, -bh.radius * 0.12, 0, 0, 0, bh.radius);
  core.addColorStop(0, '#000');
  core.addColorStop(0.86, '#000');
  core.addColorStop(1, '#010101');
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(0, 0, bh.radius, 0, Math.PI * 2);
  ctx.fill();

  // Photon ring: thin and painfully bright, not a giant planetary outline.
  ctx.globalCompositeOperation = 'screen';
  ctx.shadowColor = `rgba(255,255,250,${0.78 + bh.p * 0.20})`;
  ctx.shadowBlur = 8 + bh.p * 18;
  ctx.strokeStyle = `rgba(255,255,248,${0.72 + bh.p * 0.24})`;
  ctx.lineWidth = 1.6 + bh.p * 2.2;
  ctx.beginPath();
  ctx.arc(0, 0, bh.radius * 1.018, 0, Math.PI * 2);
  ctx.stroke();

  // Front half of the accretion disk crosses the black core, like the familiar lensing silhouette.
  ctx.shadowBlur = 14 + bh.p * 28;
  for (let i = 0; i < 18; i++) {
    const n = i / 17;
    const y = bh.thickness * (0.02 + n * 0.52);
    const wave = Math.sin(t * 2.1 + i * 1.63) * (1.5 + bh.p * 2.4);
    ctx.strokeStyle = backGradient;
    ctx.globalAlpha = (0.34 + (1 - n) * 0.32) * pulse;
    ctx.lineWidth = 1.5 + (1 - n) * (2.4 + bh.p * 2.4);
    ctx.beginPath();
    ctx.moveTo(-bh.disk, y + wave);
    ctx.bezierCurveTo(-bh.radius * 1.7, y - 5, bh.radius * 1.7, y + 5, bh.disk, y - wave * 0.4);
    ctx.stroke();
  }

  // A few fast bright filaments make the disk feel alive instead of like a static logo.
  for (let i = 0; i < 9; i++) {
    const phase = (t * (0.16 + i * 0.014) + i * 0.113) % 1;
    const x = -bh.disk + phase * bh.disk * 2;
    const width = bh.disk * (0.07 + (i % 3) * 0.018);
    const filament = ctx.createLinearGradient(x - width, 0, x + width, 0);
    filament.addColorStop(0, 'rgba(255,255,255,0)');
    filament.addColorStop(0.5, `rgba(255,255,248,${0.23 + bh.p * 0.28})`);
    filament.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.strokeStyle = filament;
    ctx.globalAlpha = 0.78;
    ctx.lineWidth = 1.2 + bh.p * 1.8;
    ctx.beginPath();
    ctx.moveTo(x - width, bh.thickness * 0.18 + Math.sin(i + t) * 4);
    ctx.lineTo(x + width, bh.thickness * 0.18 + Math.cos(i * 1.7 + t) * 4);
    ctx.stroke();
  }

  ctx.restore();
};

drawBackground = function () {
  ctx.fillStyle = state.mode === 'nohope' ? '#010102' : state.mode === 'hardcore' ? '#100406' : '#030708';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Grid and stars belong behind the black hole, not painted on top of the event horizon.
  ctx.save();
  ctx.strokeStyle = state.mode === 'nohope' ? 'rgba(162,126,255,.025)' : state.mode === 'hardcore' ? 'rgba(255,72,91,.075)' : 'rgba(105,240,193,.035)';
  for (let x = 0; x <= canvas.width; x += 45) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
  for (let y = 0; y <= canvas.height; y += 45) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); }
  ctx.restore();

  for (const star of state.stars) {
    ctx.globalAlpha = state.mode === 'nohope' ? star.a * (1 - noHopeProgress() * 0.62) : star.a;
    ctx.fillStyle = state.mode === 'hardcore' ? '#ffd9dc' : state.mode === 'nohope' ? '#d8d4df' : '#dceae5';
    ctx.fillRect(star.x, star.y, star.s, star.s);
  }
  ctx.globalAlpha = 1;

  if (state.mode === 'nohope') drawBlackHole();

  if (state.mode === 'nohope') {
    const p = noHopeProgress();
    const vignette = ctx.createRadialGradient(canvas.width / 2, canvas.height * 0.46, 120, canvas.width / 2, canvas.height * 0.46, 700);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, `rgba(0,0,0,${0.18 + p * 0.28})`);
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
};

drawNoHopeGlare = function () {
  if (state.mode !== 'nohope') return;
  const bh = blackHoleGeometry();
  const late = Math.pow(bh.p, 3.0);
  if (late < 0.002) return;

  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  // White bloom centred on the source; this sits over the rocks on purpose.
  const bloom = ctx.createRadialGradient(
    bh.x, bh.y, Math.max(8, bh.radius * 0.72),
    bh.x, bh.y, Math.max(canvas.width, canvas.height) * 0.92
  );
  bloom.addColorStop(0, `rgba(255,252,244,${0.08 + late * 0.46})`);
  bloom.addColorStop(0.20, `rgba(255,246,226,${late * 0.34})`);
  bloom.addColorStop(0.48, `rgba(239,242,255,${late * 0.22})`);
  bloom.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = bloom;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Late-stage exposure wash. Gameplay values are unchanged; only visual contrast dies.
  if (bh.p > 0.72) {
    const wash = Math.pow((bh.p - 0.72) / 0.28, 1.65);
    ctx.fillStyle = `rgba(255,250,240,${wash * 0.24})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.restore();
};

// Repaint immediately so switching/reloading No Hope never flashes the old Saturn-with-a-hangover version.
draw();
