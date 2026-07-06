# SPACEd

A single-button 2D action game where one key (the spacebar) handles every strike, parry, and jump. Read each enemy's telegraph and answer with the right input.

**Play it:** serve the folder and open it in a modern browser (ES modules require HTTP — `file://` won't work).

```bash
python -m http.server 8000
# then visit http://localhost:8000
```

---

## Controls

| Input | Action |
|-------|--------|
| **Tap** Space | **Strike** — quick melee attack (also destroys projectiles) |
| **Hold** Space | **Parry** — deflect **high** attacks & shots, stagger the enemy, build combo |
| **Double-tap** Space | **Jump** — leap over **low** attacks (and jump-strike flyers) |
| **Esc / P** | Pause |

The one-button depth comes from *reading the telegraph*:

- **Magenta "PARRY" tell** (overhead) → **hold** to parry.
- **Cyan "JUMP" tell** (at the feet) → **double-tap** to jump.
- **Orange shot tell** → **tap** to strike the projectile, or jump it.

---

## Enemies

- **Charger** — big, slow, heavy **high** smash. Parry it.
- **Swarmer** — small, fast, **low** sweep. Jump it.
- **Shielder** — blocks frontal strikes; parry its **high** attack or wait for a stagger.
- **Flyer** — hovers at head height; **jump-strike** to reach and kill it.
- **Shooter** — keeps distance and fires projectiles; strike/jump the shots.
- **Sector Boss** — a multi-phase boss every 5th wave with telegraphed high/low swings and projectile volleys. Clear it to advance a sector.

## Progression & scoring

- Enemies arrive in **waves**; every 5th wave is a **boss**.
- Score: **+100** per kill, **+50 × combo** per parry/deflect, **+2000** per boss.
- Combos build on kills and parries, reset when you take a hit.
- **Power-ups** drop from kills: **Heal**, **×2 Power** (temporary), **Slow-mo** (temporary).
- **Difficulty** (Easy / Normal / Hard) and **best score** persist between sessions.

---

## Tech

- Pure HTML5 Canvas + vanilla JavaScript **ES modules** — zero dependencies, no build step.
- Procedural **Web Audio** SFX + adaptive music (no audio files).
- Procedural parallax starfield, hit-stop, screen shake, damage numbers, particle VFX.
- Neon cyan/magenta space aesthetic (Orbitron / Share Tech Mono).

## Project structure

```
SPACEd/
├── index.html          # Shell + UI overlay
├── style.css           # Neon theme, HUD, screens
├── src/
│   ├── main.js         # Boot + game loop
│   ├── config.js       # All tuning constants
│   ├── core.js         # Canvas + context
│   ├── state.js        # Shared game state + effect timers
│   ├── assets.js       # Loader + background chroma-key + silhouettes
│   ├── input.js        # One-button state machine + pause
│   ├── flow.js         # Start / game-over / pause transitions
│   ├── player.js       # Player entity, tier-aware damage resolution
│   ├── enemies.js      # Enemy types, AI, attack tiers, rendering
│   ├── boss.js         # Multi-phase boss
│   ├── waves.js        # Wave/level + boss scheduling
│   ├── projectiles.js  # Enemy/boss projectiles
│   ├── powerups.js     # Drops & buffs
│   ├── particles.js    # Particle system
│   ├── vfx.js          # Shake, hit-stop, flash, damage numbers, shockwaves
│   ├── background.js   # Static backdrop + parallax starfield
│   ├── audio.js        # Procedural SFX + music
│   ├── ui.js           # HUD, banners, screens
│   ├── settings.js     # Difficulty + volume (localStorage)
│   ├── highscore.js    # Best score (localStorage)
│   └── tutorial.js     # First-run coaching
└── *.png               # Sprite/background art
```

---

## License

MIT
