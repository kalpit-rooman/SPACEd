// ============================================
// flow.js — Game state transitions
// ============================================
import { game, resetRun } from './state.js';
import { player } from './player.js';
import { resetEnemies } from './enemies.js';
import { resetParticles } from './particles.js';
import { hideScreens, showGameOver } from './ui.js';

export function startGame() {
    game.state = 'playing';
    resetRun();
    resetEnemies();
    resetParticles();
    player.reset();
    hideScreens();
}

export function gameOver() {
    game.state = 'gameover';
    showGameOver();
}
