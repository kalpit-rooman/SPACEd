// ============================================
// SPACEd — One-Button 2D Action Game
// Tap = Strike | Hold = Parry | Double-tap = Jump
// ============================================
import { canvas, ctx } from './core.js';
import { game } from './state.js';
import { loadAssets, images } from './assets.js';
import { updateShake, applyShake } from './vfx.js';
import { player } from './player.js';
import { updateEnemies, drawEnemies, updateSpawner } from './enemies.js';
import { updateParticles, drawParticles } from './particles.js';
import { updateUI } from './ui.js';
import { initInput } from './input.js';
import { GROUND_LINE_OFFSET, MAX_DT } from './config.js';

function drawBackground() {
    if (images.background) {
        ctx.drawImage(images.background, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = '#0a0914';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Glowing ground line.
    ctx.save();
    ctx.strokeStyle = '#ff007f';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#ff007f';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - GROUND_LINE_OFFSET);
    ctx.lineTo(canvas.width, canvas.height - GROUND_LINE_OFFSET);
    ctx.stroke();
    ctx.restore();
}

function gameLoop(timestamp) {
    const dt = Math.min(timestamp - game.lastTime, MAX_DT);
    game.lastTime = timestamp;

    updateShake(dt);

    ctx.save();
    applyShake();

    drawBackground();

    if (game.state === 'playing') {
        game.time += dt;
        updateSpawner(dt);
        player.update(dt);
        updateEnemies(dt);
        updateParticles(dt);
        updateUI();
    }

    drawParticles();
    if (game.state !== 'start') {
        drawEnemies();
        player.draw();
    }

    ctx.restore();
    requestAnimationFrame(gameLoop);
}

// --- Boot ---
initInput();
loadAssets(() => {
    game.lastTime = performance.now();
    requestAnimationFrame(gameLoop);
});
