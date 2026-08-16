# Space Ship

A small browser game about piloting a ship through an asteroid field without weapons, brakes or particularly good insurance.

## Gameplay

- Move the ship with the **mouse** on desktop.
- On mobile, **press and drag** inside the game area.
- Dodge asteroids of different sizes.
- Every asteroid that leaves the screen safely counts as **one dodge**.
- Repair cells restore **+1 life**.
- Best scores are stored locally in the browser.

## Flight profiles

### Standard

- 3 initial lives
- Maximum 5 lives
- Normal asteroid density and speed ramp
- More frequent repair cells

### Hardcore

- 1 initial life
- Maximum 3 lives
- Faster and denser asteroid field
- Larger possible rocks and stronger lateral drift
- Faster difficulty ramp
- Rarer repair cells
- Separate best score from Standard mode

## Controls

- **STANDARD / HARDCORE** — choose the flight profile before starting.
- **START FLIGHT** — begin a run.
- **PAUSE / RESUME** — pause or continue.
- **RESET** — reset the current profile.

## Tech

Plain HTML, CSS and JavaScript using a responsive `<canvas>` game area. No framework and no backend.

## Visual direction

Dark engineering-console / flight-lab style to match the other projects in the hub.
