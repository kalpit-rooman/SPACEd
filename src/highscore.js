// ============================================
// highscore.js — Best score/wave persistence
// ============================================
const LS_KEY = 'spaced_best_v1';

export const best = { score: 0, wave: 0 };

export function loadBest() {
    try {
        const raw = localStorage.getItem(LS_KEY);
        if (raw) Object.assign(best, JSON.parse(raw));
    } catch (e) { /* ignore */ }
}

// Records the run if it beats the stored best. Returns true if a new record.
export function recordScore(score, wave) {
    if (score > best.score) {
        best.score = score;
        best.wave = wave;
        try { localStorage.setItem(LS_KEY, JSON.stringify(best)); } catch (e) { /* ignore */ }
        return true;
    }
    return false;
}
