// ============================================
// ui.js — HUD + screen overlays
// ============================================
import { game } from './state.js';
import { player } from './player.js';

const el = {
    score: document.getElementById('score'),
    healthFill: document.getElementById('health-fill'),
    combo: document.getElementById('combo'),
    startScreen: document.getElementById('start-screen'),
    gameOverScreen: document.getElementById('game-over-screen'),
    finalScore: document.getElementById('final-score'),
};

export function updateUI() {
    el.score.textContent = game.score;
    el.healthFill.style.width = (player.health / player.maxHealth * 100) + '%';
    if (game.combo > 1) {
        el.combo.textContent = `x${game.combo}`;
        el.combo.classList.add('visible');
    } else {
        el.combo.classList.remove('visible');
    }
}

export function hideScreens() {
    el.startScreen.classList.add('hidden');
    el.gameOverScreen.classList.add('hidden');
}

export function showGameOver() {
    el.finalScore.textContent = `Score: ${game.score}`;
    el.gameOverScreen.classList.remove('hidden');
}
