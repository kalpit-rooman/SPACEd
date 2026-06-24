# SPACEd

A single-button 2D action game where one key (SpaceBar) handles every strike, parry, and dodge.

**Play it:** Open `index.html` in any modern browser.

---

## Controls

| Input | Action |
|-------|--------|
| **Tap** Space | Strike — quick melee attack |
| **Hold** Space | Parry — block and deflect incoming attacks |
| **Double-tap** Space | Dodge — quick dash with invincibility frames |

---

## Gameplay

Enemies approach from the right. Read their attack patterns and respond with the correct input:

- **Chargers** (large, slow) — wind up heavy attacks. Parry or dodge.
- **Swarmers** (small, fast) — rush quickly. Strike them down or dodge.
- **Shielders** — block your strikes. Time your parries or dodge around.

Build combos by avoiding damage and deflecting attacks. Score multiplies with combo streak.

---

## Tech

- Pure HTML5 Canvas + vanilla JavaScript
- Zero dependencies
- Responsive canvas sizing
- Minimal black & white aesthetic

---

## Run Locally

```bash
# Just open in browser
open index.html
# or
python -m http.server 8000
```

Then visit `http://localhost:8000`

---

## Project Structure

```
SPACEd/
├── index.html    # Game shell + UI overlay
├── style.css     # Minimal dark theme
├── game.js       # Core game logic, input, rendering
└── README.md     # This file
```

---

## License

MIT
