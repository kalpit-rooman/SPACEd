// ============================================
// state.js — Shared mutable game state
// ============================================

// Single source of truth for cross-module game state.
// Modules import `game` and mutate its fields directly (ES module
// exports are read-only bindings, so shared state lives on an object).
export const game = {
    state: 'start',   // 'start' | 'playing' | 'gameover'
    score: 0,
    combo: 0,
    comboTimer: 0,
    time: 0,          // ms elapsed in current run
    lastTime: 0,      // timestamp of previous frame
    wave: 0,          // current wave number
    sector: 1,        // increments each boss defeated
    // Power-up effects
    strikeMult: 1,
    strikeMultTimer: 0,
    timeScale: 1,     // <1 during slow-mo power-up
    slowTimer: 0,
};

export function resetRun() {
    game.score = 0;
    game.combo = 0;
    game.comboTimer = 0;
    game.time = 0;
    game.wave = 0;
    game.sector = 1;
    game.strikeMult = 1;
    game.strikeMultTimer = 0;
    game.timeScale = 1;
    game.slowTimer = 0;
}

// Advance power-up effect timers (real dt, not slowed).
export function updateEffects(dt) {
    if (game.strikeMultTimer > 0) {
        game.strikeMultTimer -= dt;
        if (game.strikeMultTimer <= 0) game.strikeMult = 1;
    }
    if (game.slowTimer > 0) {
        game.slowTimer -= dt;
        if (game.slowTimer <= 0) game.timeScale = 1;
    }
}
