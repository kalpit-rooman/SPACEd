# SPACEd

A single-button 2D pixel-art action game where one input (SpaceBar or touch) handles every strike, parry, and jump.

---

## Controls

| Input | Action |
|-------|--------|
| **Tap** Space / screen | Strike — quick melee attack |
| **Hold** Space / screen | Parry — deflect attacks and stagger the attacker |
| **Double-tap** Space / screen | Jump |
| **P / ESC** | Pause |
| **M** | Mute |

---

## Gameplay

Enemies approach from the right in 30-second waves that get faster and tougher. Read the `!` telegraph and respond with the correct input:

- **Swarmers** (small, fast) — rush quickly. Strike them down.
- **Chargers** (large, slow) — wind up heavy attacks. Parry them.
- **Shielders** — block frontal strikes. Parry to stagger, then punish.
- **Flyers** (from wave 3) — hover above strike range and dive-bomb. Jump-strike them, or parry the dive to knock them to the ground.
- **Brute** (every 3rd wave) — a mini-boss that only takes damage while staggered. Parry its attack, then unload.

Kills and deflections build a combo; the score multiplier rises every wave. Your best score is saved locally.

---

## Tech

- [Phaser 3](https://phaser.io/) + [Vite](https://vitejs.dev/)
- **All art is code-generated pixel art** — sprites, animations, and parallax backgrounds are drawn to canvas at boot from string-grid frames (no image assets)
- **All audio is code-generated chiptune** — Web Audio oscillators for SFX plus a step-sequenced music loop (no audio files)
- 450×300 internal resolution, integer-friendly `Scale.FIT` upscaling, nearest-neighbor rendering

---

## Run Locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

---

## Project Structure

```
SPACEd/
├── index.html                    # Shell + DOM UI overlay (HUD, screens)
├── css/style.css                 # Pixel/CRT theme
└── js/
    ├── main.js                   # Phaser bootstrap
    ├── config.js                 # All balance & tuning constants
    ├── scenes/
    │   ├── BootScene.js          # Generates all textures/anims at boot
    │   └── GameScene.js          # Game loop, waves, pause, score
    ├── entities/
    │   ├── Player.js             # Strike / parry / jump state machine
    │   └── Enemy.js              # All enemy types incl. flyer & brute
    ├── input/
    │   └── oneButtonInput.js     # Tap/hold/double-tap recognizer (key + touch)
    └── systems/
        ├── pixelArt.js           # Code-generated sprite sheets & animations
        ├── pixelBackground.js    # Starfields, planet, city, ground
        ├── audio.js              # Web Audio chiptune SFX + music
        └── particles.js          # Pixel-square burst particles
```

---

## License

MIT
