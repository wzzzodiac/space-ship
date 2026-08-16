# Space Ship

A browser asteroid-dodging game about piloting a ship through an increasingly unreasonable field without weapons, brakes or particularly good insurance.

## Gameplay

- Move the ship with the **mouse** on desktop.
- On mobile, **press and drag** inside the game area.
- Dodge asteroids of different sizes and trajectories.
- Every asteroid that safely leaves the field counts as **one dodge**.
- Repair cells restore **+1 life** in profiles that allow repairs.
- Best scores are stored locally in the browser and separated by flight profile.

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

### No Hope

- 1 life
- No repairs
- Faster debris with side-entry trajectories
- Continuous difficulty increase
- Approaching black hole / event-horizon sequence
- Progressive gravity pull and visual darkening
- Cinematic interface-consumption ending if the run survives long enough

## Mission field

A four-character mission code can be entered before a run. The value is locked for that run and cleared on reset / reconstruction. The mission system is primarily a small presentation / easter-egg layer and does not require a backend.

## Controls

- **STANDARD / HARDCORE / NO HOPE** — choose the flight profile before starting.
- **MISSION** — optional four-character run code.
- **START FLIGHT** — begin a run.
- **PAUSE / RESUME** — pause or continue.
- **RESET** — reset the current profile and request a new mission code.
- **RECONSTRUCT + RETRY** — rebuild the interface after the No Hope cinematic ending.

## Tech

Plain HTML, CSS and JavaScript using a responsive `<canvas>` game area, CSS animation and `localStorage`. No framework and no backend.

## Visual direction

Dark engineering-console / flight-lab style with profile-specific visual themes. No Hope switches to a near-black violet interface and progressively lets the black hole consume the simulation.
