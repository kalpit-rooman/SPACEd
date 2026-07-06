// ============================================
// SPACEd — One-Button 2D Action Game
// Tap = Strike | Hold = Parry | Double-tap = Jump
// ============================================
import { ctx } from './core.js';
import { game, updateEffects } from './state.js';
import { loadAssets } from './assets.js';
import {
    updateShake, applyShake, updateHitStop,
    updateVfx, drawWorldVfx, drawScreenVfx,
} from './vfx.js';
import { updateBackground, drawBackground } from './background.js';
import { player } from './player.js';
import { updateEnemies, drawEnemies } from './enemies.js';
import { updateBoss, drawBoss } from './boss.js';
import { updateWaves } from './waves.js';
import { updateProjectiles, drawProjectiles } from './projectiles.js';
import { updatePowerups, drawPowerups } from './powerups.js';
import { updateParticles, drawParticles } from './particles.js';
import { updateUI, initLoading, setLoadingProgress, finishLoading, initStartScreen } from './ui.js';
import { initInput } from './input.js';
import { music } from './audio.js';
import { loadSettings, applyVolumes } from './settings.js';
import { loadBest } from './highscore.js';
import { MAX_DT } from './config.js';

function gameLoop(timestamp) {
    const dt = Math.min(timestamp - game.lastTime, MAX_DT);
    game.lastTime = timestamp;

    // Presentation timers always advance on real time.
    updateShake(dt);
    updateVfx(dt);
    updateBackground(dt);
    const frozen = updateHitStop(dt);

    ctx.save();
    applyShake();

    drawBackground();

    if (game.state === 'playing' && !frozen) {
        updateEffects(dt);                 // buff timers on real time
        const gdt = dt * game.timeScale;   // gameplay time (slow-mo aware)
        game.time += gdt;
        updateWaves(gdt);
        player.update(gdt);
        updateEnemies(gdt);
        updateBoss(gdt);
        updateProjectiles(gdt);
        updatePowerups(gdt);
        updateParticles(gdt);
        updateUI();
        music.setIntensity(Math.min(1, game.time / 90000 + game.combo * 0.05));
    }

    drawParticles();
    if (game.state !== 'start') {
        drawPowerups();
        drawEnemies();
        drawBoss();
        player.draw();
        drawProjectiles();
    }
    drawWorldVfx();

    ctx.restore();
    drawScreenVfx();

    requestAnimationFrame(gameLoop);
}

// --- Boot ---
loadSettings();
applyVolumes();
loadBest();
initInput();
initLoading();
initStartScreen();
loadAssets(
    () => {
        finishLoading();
        game.lastTime = performance.now();
        requestAnimationFrame(gameLoop);
    },
    setLoadingProgress,
);
