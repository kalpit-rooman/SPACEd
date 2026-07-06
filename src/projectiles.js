// ============================================
// projectiles.js — Enemy/boss projectiles
// ============================================
import { canvas, ctx } from './core.js';
import { player } from './player.js';
import { createParticles } from './particles.js';
import { spawnDamageNumber } from './vfx.js';
import { sfx } from './audio.js';
import { game } from './state.js';
import { COMBAT } from './config.js';

export let projectiles = [];

export function resetProjectiles() { projectiles = []; }

export function spawnProjectile(x, y, vx, damage, color = '#ff5533') {
    projectiles.push({ x, y, vx, vy: 0, r: 8, damage, color, life: 1 });
}

export function updateProjectiles(dt) {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.x += p.vx;
        p.y += p.vy;

        const dx = Math.abs(p.x - player.x);
        const dy = Math.abs(p.y - (player.y - 25));

        // Player deflects with a strike or parry (destroy; parry rewards).
        if ((player.state === 'striking' || player.state === 'parrying') && dx < 42 && dy < 40) {
            createParticles(p.x, p.y, '#ffffff', 6);
            if (player.state === 'parrying') {
                game.combo++;
                game.comboTimer = COMBAT.comboTimer;
                game.score += COMBAT.parryScoreBase * game.combo;
                spawnDamageNumber(p.x, p.y - 10, 'DEFLECT', '#ff66b2');
                sfx.parry();
            } else {
                sfx.hit();
            }
            projectiles.splice(i, 1);
            continue;
        }

        // Hits the player (jumping lifts you above the projectile's chest height).
        if (dx < 18 && dy < 22) {
            if (!player.invincible) player.takeDamage(p.damage, null);
            projectiles.splice(i, 1);
            continue;
        }

        if (p.x < -20 || p.x > canvas.width + 20) projectiles.splice(i, 1);
    }
}

export function drawProjectiles() {
    ctx.save();
    for (const p of projectiles) {
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        // little tail
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.arc(p.x - Math.sign(p.vx) * 8, p.y, p.r * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
    ctx.restore();
}
