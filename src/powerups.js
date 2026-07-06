// ============================================
// powerups.js — Drops & temporary buffs
// ============================================
import { canvas, ctx } from './core.js';
import { player } from './player.js';
import { game } from './state.js';
import { createParticles } from './particles.js';
import { spawnDamageNumber } from './vfx.js';
import { sfx } from './audio.js';
import { POWERUP, GROUND_OFFSET } from './config.js';

const KINDS = [
    { key: 'heal', color: '#33ff99', glyph: '+', label: 'HEAL' },
    { key: 'damage', color: '#ffcc33', glyph: '×2', label: 'POWER' },
    { key: 'slow', color: '#66ccff', glyph: '≋', label: 'SLOW' },
];

export let powerups = [];

export function resetPowerups() { powerups = []; }

export function maybeDropPowerup(x, groundY) {
    if (Math.random() > POWERUP.dropChance) return;
    const kind = KINDS[Math.floor(Math.random() * KINDS.length)];
    powerups.push({
        kind, x,
        y: groundY - 120,
        groundY: groundY - 20,
        life: POWERUP.lifetime,
        landed: false,
        bob: Math.random() * Math.PI * 2,
    });
}

function collect(p) {
    const k = p.kind.key;
    if (k === 'heal') {
        player.heal(POWERUP.heal);
        spawnDamageNumber(player.x, player.y - 60, `+${POWERUP.heal} HP`, p.kind.color, true);
    } else if (k === 'damage') {
        game.strikeMult = POWERUP.damageMult;
        game.strikeMultTimer = POWERUP.damageDuration;
        spawnDamageNumber(player.x, player.y - 60, 'POWER UP', p.kind.color, true);
    } else if (k === 'slow') {
        game.timeScale = POWERUP.slowScale;
        game.slowTimer = POWERUP.slowDuration;
        spawnDamageNumber(player.x, player.y - 60, 'SLOW-MO', p.kind.color, true);
    }
    createParticles(p.x, p.y, p.kind.color, 12);
    sfx.powerup();
}

export function updatePowerups(dt) {
    for (let i = powerups.length - 1; i >= 0; i--) {
        const p = powerups[i];
        if (!p.landed) {
            p.y += POWERUP.fallSpeed;
            if (p.y >= p.groundY) { p.y = p.groundY; p.landed = true; }
        } else {
            p.life -= dt;
            p.bob += dt / 300;
        }

        // Auto-collect when the player is near.
        if (Math.abs(p.x - player.x) < POWERUP.collectRange
            && Math.abs(p.y - (player.y - 25)) < 60) {
            collect(p);
            powerups.splice(i, 1);
            continue;
        }

        if (p.life <= 0) powerups.splice(i, 1);
    }
}

export function drawPowerups() {
    for (const p of powerups) {
        const y = p.y + (p.landed ? Math.sin(p.bob) * 4 : 0);
        const blink = p.life < 2500 && Math.floor(p.life / 150) % 2 === 0;
        ctx.save();
        ctx.globalAlpha = blink ? 0.35 : 1;
        ctx.translate(p.x, y);
        // capsule
        ctx.fillStyle = 'rgba(10,10,20,0.7)';
        ctx.strokeStyle = p.kind.color;
        ctx.lineWidth = 2;
        ctx.shadowColor = p.kind.color;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(0, 0, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = p.kind.color;
        ctx.font = 'bold 13px Orbitron, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.kind.glyph, 0, 1);
        ctx.restore();
    }
}
