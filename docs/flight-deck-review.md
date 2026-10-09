# Space Ship / flight deck visual review

2026-10-09 — branch `codex/space-ship-flight-deck`, based on the published `e6cdc68`. This is a separate visual evolution after the Black Hole integration was approved and published. No main, deployment, Hub or Black Hole changes are included here.

## Preview

Serve this checkout with `python -m http.server 8001 --bind 127.0.0.1`. Open `http://127.0.0.1:8001/` to play or `/docs/flight-deck/` for before/after images and a 9-second video. No package installation, build or external asset service is needed.

## Design

The game and its controls now precede configuration. Desktop has a compact HUD and a side console; portrait stacks the configuration below the playfield. At the tested 1440×1000 and 390×844 viewports, Start/Pause/Reset are visible without scrolling. The fixed 900×620 logical playfield and its aspect ratio are preserved. The desktop width also responds to available height so the controls remain reachable. Short landscape viewports can still require vertical scrolling.

`flight-visuals.js` contains presentation-only Canvas functions: cached planetary background plates for Standard/Hardcore, layered moving stars, a shaded metallic ship with time-based exhaust, textured asteroid sprites and repair cells. Asteroid vertices and gameplay collision circles are unchanged. New visuals use a private deterministic hash rather than consuming the gameplay random-number stream. Sprite caches are weakly keyed by asteroid objects and can be collected after those objects leave the game; there is no new animation loop.

The approved `black-hole-renderer.js`, its `nohope-blackhole-v141.js` adapter and vendor files have no diff. No Hope only receives the new foreground, HUD and layout. Its shader, exposure, progress mapping, quality handling and lifetime remain unchanged.

The controls retain their IDs and behavior. Elapsed time and horizon progress are derived displays, not new mechanics. Profile selection exposes `aria-pressed`. During consumption the background becomes inert, the retry button receives focus when ready, and retry returns focus to Start. Reduced motion removes the page-collapse animation and decorative CSS transitions while retaining playable movement and the result. The initial hidden result can no longer receive keyboard focus.

## Evidence and checks

- [Comparison gallery](flight-deck/index.html): before/after captures of all three modes, desktop and mobile, taken at equivalent browser viewports and six simulated seconds. The new layout intentionally changes the displayed scene size. The legacy exhaust consumed global RNG while drawing, so these screenshots are visual comparisons rather than identical asteroid layouts.
- `motion.mp4`: 216 actual Canvas/WebGL composite frames, 900×620, 24 FPS, 9 seconds. Fixed simulation steps and automatic demonstration steering; not a real-time performance recording.
- [verification.json](flight-deck/verification.json): **51 passing browser checks**, no unexpected console/page errors or failed resources.
- [gameplay-parity.json](flight-deck/gameplay-parity.json): exact state equality against published commit `e6cdc68` after **30 simulated seconds in each mode** using seed 2604 and 1,500 steps of 0.02 s. The generator is reset after UI initialization, and rendering is excluded during this comparison. It compares profiles, score, lives, ship, asteroids, repairs, particles, stars and spawn/repair timers; it does not claim identical randomly generated live runs.
- Existing `tests/nohope-smoke.cjs` passes, covering pause/visibility, progression, consumption, reset during collapse and fatal collision.

The new `tests/flight-deck-smoke.cjs` checks all profiles, mission locking, asteroids, reset, pause with zero new WebGL submissions, touch mapping, viewport resizes (360×800, 768×1024, 844×390, 1920×1080), collision damage, repair limits, telemetry, keyboard retry, reduced-motion consumption and WebGL failure fallback. `tests/gameplay-parity.cjs` performs the baseline comparison. Both use an existing Playwright installation selected via `PLAYWRIGHT_MODULE` and a browser via `BROWSER_PATH`; set `BASE_URL` and, for parity, `BASELINE_URL` to separately served checkouts.

## Performance and limits

Edge 154.0.4258.62 headless on the same Windows / NVIDIA RTX 4070 SUPER environment used for the preceding Black Hole review. Approximately 2.2-second frame-interval samples per mode:

| Mode | Desktop FPS | Mobile-emulation FPS | P95 interval |
| --- | ---: | ---: | ---: |
| Standard | 119.5 | 120.0 | 8.5 ms |
| Hardcore | 120.0 | 120.0 | 8.4–8.5 ms |
| No Hope | 120.0 | 120.0 | 8.5 ms |

These samples are browser frame cadence near a 120 Hz ceiling, not GPU timer-query timings or proof of physical-phone performance. Mobile was 390×844 with DPR3 and injected touch input on the desktop GPU. No Safari, Firefox, physical phone, low-end GPU, screen-reader or thermal/battery testing was performed. Gameplay Canvas retains its 900×620 backing store, so very large/high-DPI displays may show softer foreground edges. Background plate and sprite generation are cached; no new dependencies or paid services were used. Blender and image generation were not needed or executed for this pass.
