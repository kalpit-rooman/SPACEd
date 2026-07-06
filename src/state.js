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
};

export function resetRun() {
    game.score = 0;
    game.combo = 0;
    game.comboTimer = 0;
    game.time = 0;
}
