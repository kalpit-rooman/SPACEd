// ============================================
// SPACEd — One-Button 2D Action Game
// Tap = Strike | Hold = Parry | Double-tap = Jump
// ============================================
import { ctx } from './core.js';
import { game } from './state.js';
import { loadAssets } from './assets.js';
import {
    updateShake, applyShake, updateHitStop,
    updateVfx, drawWorldVfx, drawScreenVfx,
} from './vfx.js';
import { updateBackground, drawBackground } from './background.js';
import { player } from './player.js';
import { updateEnemies, drawEnemies, updateSpawner } from './enemies.js';
import { updateParticles, drawParticles } from './particles.js';
import { updateUI, initLoading, setLoadingProgress, finishLoading } from './ui.js';
import { initInput } from './input.js';
import { music } from './audio.js';
import { MAX_DT } from './config.js';

function gameLoop(timestamp) {
    const dt = Math.min(timestamp - game.lastTime, MAX_DT);
    game.lastTime = timestamp;

    // Timers that always advance (juice + ambient motion).
    updateShake(dt);
    updateVfx(dt);
    updateBackground(dt);
    const frozen = updateHitStop(dt);

    ctx.save();
    applyShake();

    drawBackground();

    if (game.state === 'playing' && !frozen) {
        game.time += dt;
        updateSpawner(dt);
        player.update(dt);
        updateEnemies(dt);
        updateParticles(dt);
        updateUI();
        // Music intensity ramps with survival time and combo.
        music.setIntensity(Math.min(1, game.time / 90000 + game.combo * 0.05));
    }

    drawParticles();
    if (game.state !== 'start') {
        drawEnemies();
        player.draw();
    }
    drawWorldVfx();

    ctx.restore();
    drawScreenVfx(); // screen-space flash, unaffected by shake

    requestAnimationFrame(gameLoop);
}

// --- Boot ---
initInput();
initLoading();
loadAssets(
    () => {
        finishLoading();
        game.lastTime = performance.now();
        requestAnimationFrame(gameLoop);
    },
    setLoadingProgress,
);
