# No Hope / cinematic V1 integration review

Branch: `codex/nohope-cinematic-integration`. Original game and adapter remain recoverable at `844ff52`. No merge, main update or deployment is part of this review.

## Run locally

From this repository:

```sh
python -m http.server 8001 --bind 127.0.0.1
```

Open `http://127.0.0.1:8001/`, choose **NO HOPE**, then **START FLIGHT**. The existing optional mission code `2604` enables observer/no-collision mode for watching the complete approach; ordinary runs retain one life and collision damage. The horizon still consumes observer runs after 68 seconds. [Screenshots](captures/) include early, middle and late real-time gameplay, mobile emulation and consumption.

## Integration boundary

`black-hole-renderer.js` is a byte-identical copy of the source file in `wzzzodiac/black-hole`, revision `v1-cinematic-1`, using the existing identical Three.js r185 vendor files. `nohope-blackhole-v141.js` is now a thin adapter. Updating the Black Hole repository does not automatically update this copy; copy the whole module explicitly and verify SHA-256 equality during future integrations.

The shared module has no DOM selectors or loop. `createBlackHoleRenderer({canvas?, onStatus?})` returns `canvas`, `resize(widthCSS, heightCSS, {quality, pixelRatio})`, `render(parameters)`, `info` and idempotent `dispose()`. The adapter supplies:

| Parameter | No Hope value |
| --- | --- |
| `time` | `state.elapsed` in seconds |
| `approach` | existing `noHopeProgress()`, 0–1 |
| `brightness` | 0.375 linear emission |
| `inclination` | 76 degrees |
| `dive` | 3 additional late zoom units |
| `exposure` | 0.76 output multiplier for gameplay contrast |

`brightness` accepts 0–2, inclination 55–86, dive 0–6 and exposure 0–1.5. Invalid numeric inputs fall back to defaults and finite extremes are clamped. Low/balanced/high quality caps both DPR and total pixels (650k/1.4M/3M). The adapter starts balanced and downshifts after sustained slow frames. There is no external CDN, build infrastructure or cross-origin runtime dependency. Existing CSP is unchanged.

The adapter renders only with game draw calls. Paused and standby frames are cached; Standard/Hardcore submit no black-hole GPU frames. Hiding the document pauses an active flight; returning requires an explicit resume. Context loss switches to the original Canvas 2D black hole and restores WebGL when available. Initialization failure shows a fallback explanation. Resize, persisted page restore and disposal have explicit paths.

The only `script.js` changes support this lifecycle: one cancellable animation-frame handle, an immediate paused redraw, and a cancellable consumption timer. Reset/retry cancels a previous collapse callback. Spawn rates, asteroid generation, movement, scoring, damage, missions, HUD, progression and collapse duration are unchanged. No game-wide visual redesign was done.

## Verified

[verification.json](verification.json) contains the cross-project checks. No unexpected console/page errors, missing files or CSP violations occurred. Standard/Hardcore selection, No Hope spawning, mouse and touch drag/release, pause/resume with zero new GPU frames, scoring, no repairs, progress HUD, fatal ordinary collision, consumption, retry and reset during collapse all passed. A deterministic progression test drove the existing `update()` function; separately a real-time observer run reached 68.0077 seconds and completed consumption with 380 dodges. That score is incidental and not a gameplay benchmark.

The deliverable [smoke test](../tests/nohope-smoke.cjs) covers those lifecycle regressions and simulated hidden/visible events. Run it with an existing Playwright module and browser via `PLAYWRIGHT_MODULE`, `BROWSER_PATH` and `BASE_URL` (default `http://127.0.0.1:8001`). No dependency install is required by the application.

Measured on Windows, Edge 154.0.4258.62 headless, NVIDIA RTX 4070 SUPER / ANGLE D3D11: about 120 FPS, P95 frame interval 8.5 ms, over 3.2-second samples, at 994×684 drawing buffer on desktop and 445×306 in 390×844/DPR3 mobile emulation. This measures browser frame cadence, not GPU execution time. Mobile emulation uses the same desktop GPU; it is not evidence of physical-phone performance. Safari, Firefox, low-end hardware, thermals and screen readers were not tested. Existing mobile page composition remains intentionally unchanged.

Black Hole's paired screenshots and browser-generated motion sample live in its `docs/review.html`. This renderer remains a cinematic approximation, not an exact relativistic simulation.
