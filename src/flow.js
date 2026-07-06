// ============================================
// flow.js — Game state transitions
// ============================================
import { game, resetRun } from './state.js';
import { player } from './player.js';
import { resetEnemies } from './enemies.js';
import { resetParticles } from './particles.js';
import { resetVfx } from './vfx.js';
import { resetWaves } from './waves.js';
import { resetBoss } from './boss.js';
import { resetProjectiles } from './projectiles.js';
import { resetPowerups } from './powerups.js';
import { hideScreens, showGameOver, showPause, hidePause, updateUI } from './ui.js';
import { ensureAudio, sfx, music } from './audio.js';
import { recordScore } from './highscore.js';

export function startGame() {
    game.state = 'playing';
    resetRun();
    resetEnemies();
    resetParticles();
    resetVfx();
    resetWaves();
    resetBoss();
    resetProjectiles();
    resetPowerups();
    player.reset();
    hideScreens();
    ensureAudio();
    sfx.gameStart();
    music.setIntensity(0);
    music.start();
}

export function gameOver() {
    game.state = 'gameover';
    updateUI(); // flush the HUD (incl. depleted health bar) one final time
    const isRecord = recordScore(game.score, game.wave);
    showGameOver(isRecord);
    sfx.gameOver();
    music.stop();
}

export function togglePause() {
    if (game.state === 'playing') {
        game.state = 'paused';
        music.stop();
        showPause();
    } else if (game.state === 'paused') {
        game.state = 'playing';
        music.start();
        hidePause();
    }
}
