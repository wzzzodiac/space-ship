// V1 cinematic adapter. The shared renderer is a byte-for-byte, same-origin copy
// from wzzzodiac/black-hole; see docs/renderer-integration.md for the sync contract.
// Gameplay owns the only requestAnimationFrame loop and supplies simulation time.
const noHopeStage = document.createElement('div');
noHopeStage.className = 'nohope-stage';
canvas.parentNode.insertBefore(noHopeStage, canvas);
noHopeStage.appendChild(canvas);

let noHopeRenderer = null;
let noHopeWebGLReady = false;
let noHopeFailure = false;
let noHopeResizeObserver = null;
let noHopeLastFrame = '';
let noHopeQuality = 'balanced';
let noHopeFrameTime = 0, noHopeSlowFrames = 0;
const originalDrawBackground = drawBackground;
const originalDrawNoHopeGlare = drawNoHopeGlare;
const originalDraw = draw;

drawBackground = function () {
  if (state.mode === 'nohope' && noHopeWebGLReady) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  } else originalDrawBackground();
};
drawNoHopeGlare = function () {
  if (!noHopeWebGLReady) originalDrawNoHopeGlare();
};

function resizeNoHopeRenderer() {
  if (!noHopeRenderer) return;
  noHopeRenderer.resize(noHopeStage.clientWidth, noHopeStage.clientHeight, {
    quality: noHopeQuality, pixelRatio: window.devicePixelRatio || 1
  });
  noHopeLastFrame = '';
  renderNoHope();
}

function renderNoHope() {
  if (!noHopeRenderer) return;
  noHopeRenderer.canvas.style.visibility = state.mode === 'nohope' && noHopeWebGLReady ? 'visible' : 'hidden';
  if (state.mode !== 'nohope' || !noHopeWebGLReady || document.hidden) return;
  // Stable standby/paused frames, including resize. No hidden or independent GPU loop.
  const key = `${state.elapsed}/${noHopeRenderer.info.width}/${noHopeRenderer.info.height}`;
  if (key === noHopeLastFrame) return;
  noHopeLastFrame = key;
  noHopeRenderer.render({ time: state.elapsed, approach: noHopeProgress(),
    brightness: 0.375, inclination: 76, dive: 3.0, exposure: 0.76 });
  const now = performance.now();
  if (state.running && !state.paused && noHopeFrameTime) {
    noHopeSlowFrames = now - noHopeFrameTime > 34 ? noHopeSlowFrames + 1 : Math.max(0, noHopeSlowFrames - 1);
    if (noHopeSlowFrames > 75 && noHopeQuality !== 'low') {
      noHopeQuality = 'low'; resizeNoHopeRenderer();
    }
  }
  noHopeFrameTime = now;
}

draw = function () {
  renderNoHope();
  originalDraw();
  if (noHopeFailure && state.mode === 'nohope') {
    setStatus('WebGL unavailable. No Hope is using the original 2D visual fallback; gameplay remains active.');
  }
};

(async () => {
  const { createBlackHoleRenderer } = await import('./black-hole-renderer.js');
  noHopeRenderer = createBlackHoleRenderer({ onStatus(status) {
    noHopeWebGLReady = status === 'restored';
    noHopeFailure = !noHopeWebGLReady;
    noHopeLastFrame = '';
    draw();
  } });
  noHopeRenderer.canvas.className = 'nohope-webgl-canvas';
  noHopeStage.insertBefore(noHopeRenderer.canvas, canvas);
  noHopeWebGLReady = true;
  noHopeResizeObserver = new ResizeObserver(resizeNoHopeRenderer);
  noHopeResizeObserver.observe(noHopeStage);
  resizeNoHopeRenderer(); draw();
})().catch(() => { noHopeFailure = true; draw(); });

document.addEventListener('visibilitychange', () => {
  noHopeFrameTime = 0;
  if (document.hidden && state.running && !state.paused) { togglePause(); draw(); }
  // Resume stays explicit so returning to the tab cannot restart a dangerous run.
});
window.addEventListener('resize', resizeNoHopeRenderer);
window.addEventListener('pagehide', event => {
  if (state.running && !state.paused) togglePause();
  if (!event.persisted) { noHopeResizeObserver?.disconnect(); noHopeRenderer?.dispose(); }
});
window.addEventListener('pageshow', event => { if (event.persisted) { noHopeLastFrame = ''; resizeNoHopeRenderer(); draw(); } });
