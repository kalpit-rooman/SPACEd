// ============================================
// flow.js — Game state transitions
// ============================================
import { game, resetRun } from './state.js';
import { player } from './player.js';
import { resetEnemies } from './enemies.js';
import { resetParticles } from './particles.js';
import { resetVfx } from './vfx.js';
import { hideScreens, showGameOver } from './ui.js';
import { ensureAudio, sfx, music } from './audio.js';

export function startGame() {
    game.state = 'playing';
    resetRun();
    resetEnemies();
    resetParticles();
    resetVfx();
    player.reset();
    hideScreens();
    ensureAudio();
    sfx.gameStart();
    music.setIntensity(0);
    music.start();
}

export function gameOver() {
    game.state = 'gameover';
    showGameOver();
    sfx.gameOver();
    music.stop();
}
