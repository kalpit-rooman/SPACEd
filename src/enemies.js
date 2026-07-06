// ============================================
// enemies.js — Enemy types, AI, attack tiers, rendering
// ============================================
import { canvas, ctx } from './core.js';
import { images, silhouettes } from './assets.js';
import { game } from './state.js';
import { player } from './player.js';
import { createParticles } from './particles.js';
import {
    triggerShake, hitStop, spawnDamageNumber, spawnShockwave,
} from './vfx.js';
import { sfx } from './audio.js';
import { spawnProjectile } from './projectiles.js';
import { maybeDropPowerup } from './powerups.js';
import {
    ENEMY_TYPES, ENEMY_ATTACK, COMBAT, GROUND_OFFSET, PLAYER, SHAKE, PROJECTILE,
} from './config.js';

export let enemies = [];

export function resetEnemies() {
    enemies = [];
}

const TYPE_KEYS = Object.keys(ENEMY_TYPES);

// Weighted pick, optionally restricted to an allow-list of type keys.
export function pickType(allowed = TYPE_KEYS) {
    const keys = allowed.filter(k => ENEMY_TYPES[k]);
    const total = keys.reduce((s, k) => s + ENEMY_TYPES[k].weight, 0);
    let r = Math.random() * total;
    for (const k of keys) {
        r -= ENEMY_TYPES[k].weight;
        if (r <= 0) return k;
    }
    return keys[0];
}

export function spawnEnemy(type) {
    if (!type) type = pickType();
    const def = ENEMY_TYPES[type];
    const groundY = canvas.height - GROUND_OFFSET;
    const enemy = {
        type,
        def,
        x: canvas.width + 30,
        y: def.flying ? groundY - def.flyHeight : (type === 'charger' ? canvas.height - 110 : groundY),
        baseY: def.flying ? groundY - def.flyHeight : groundY,
        width: def.width,
        height: def.height,
        health: def.health,
        maxHealth: def.health,
        speed: def.speed,
        state: 'approaching',
        stateTimer: 0,
        attackCooldown: 0,
        windupTime: 0,
        attackTier: null,
        fireCooldown: def.fireInterval ? def.fireInterval * 0.6 : 0,
        hitFlash: 0,
        color: def.color,
        damage: def.damage,
    };
    enemies.push(enemy);
}

function killEnemy(e) {
    e.state = 'dead';
    game.score += COMBAT.killScore;
    game.combo++;
    game.comboTimer = COMBAT.comboTimer;
    createParticles(e.x, e.y - 20, '#00f0ff', 14);
    createParticles(e.x, e.y - 20, '#ffffff', 8);
    spawnShockwave(e.x, e.y - 20, 40, '#00f0ff');
    spawnDamageNumber(e.x, e.y - e.height - 6, `+${COMBAT.killScore}`, '#00f0ff', true);
    hitStop(55);
    triggerShake(...SHAKE.hit);
    sfx.death();
    sfx.combo(game.combo);
    maybeDropPowerup(e.x, e.baseY);
}

function damageEnemy(e, dmg) {
    const fresh = !e.hitFlash || e.hitFlash <= 0;
    e.health -= dmg;
    e.hitFlash = 120;
    createParticles(e.x, e.y - 20, '#ffffff', 4);
    if (e.health <= 0) {
        killEnemy(e);
    } else {
        if (fresh) {
            spawnDamageNumber(e.x, e.y - e.height - 4, dmg, '#ffffff');
            sfx.hit();
        }
        triggerShake(...SHAKE.hit);
    }
}

function strikeHits(e) {
    const strikeX = player.x + player.facing * PLAYER.strikeReach;
    return Math.abs(e.x - strikeX) < PLAYER.strikeRangeX
        && Math.abs(e.y - player.y + 25) < PLAYER.strikeRangeY;
}

function fireAtPlayer(e) {
    const dir = player.x < e.x ? -1 : 1;
    spawnProjectile(e.x + dir * 15, canvas.height - GROUND_OFFSET - PROJECTILE.height,
        dir * PROJECTILE.speed, PROJECTILE.damage, '#ff7733');
    sfx.strike();
}

export function updateEnemies(dt) {
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        if (e.hitFlash > 0) e.hitFlash -= dt;

        if (e.state === 'dead') { enemies.splice(i, 1); continue; }

        // Hover motion for flyers.
        if (e.def.flying) e.y = e.baseY + Math.sin(Date.now() / 300 + e.x * 0.03) * 8;

        // Slide in from the right edge before engaging.
        if (e.x > canvas.width - 50) { e.x -= 2; continue; }

        // Staggered: vulnerable, can't block/attack.
        if (e.state === 'staggered') {
            e.stateTimer -= dt;
            if (e.stateTimer <= 0) e.state = 'approaching';
            if (e.attackCooldown > 0) e.attackCooldown -= dt;
            if (player.state === 'striking' && strikeHits(e)) damageEnemy(e, PLAYER.strikeDamage * game.strikeMult);
            if (e.x < -60) enemies.splice(i, 1);
            continue;
        }

        const dx = player.x - e.x;
        const dist = Math.abs(dx);

        // --- Ranged fire (shooter): loose off shots at mid distance ---
        if (e.def.attack === 'ranged' && e.state === 'approaching') {
            if (e.fireCooldown > 0) e.fireCooldown -= dt;
            if (dist < 440 && dist > 130 && e.fireCooldown <= 0) {
                e.state = 'firing';
                e.stateTimer = 500;
                e.windupTime = 320;
                e.fireCooldown = e.def.fireInterval;
            }
        }

        if (e.state === 'firing') {
            e.stateTimer -= dt;
            e.windupTime -= dt;
            if (e.windupTime <= 0 && !e.fired) { fireAtPlayer(e); e.fired = true; }
            if (e.stateTimer <= 0) { e.state = 'approaching'; e.fired = false; }
        }

        // --- Melee attack commit ---
        if ((e.state === 'approaching') && dist < ENEMY_ATTACK.range && e.attackCooldown <= 0) {
            e.state = 'attacking';
            e.stateTimer = ENEMY_ATTACK.duration;
            e.windupTime = ENEMY_ATTACK.windup;
            e.attackCooldown = ENEMY_ATTACK.cooldown;
            e.attackTier = e.def.attack === 'ranged' ? 'high' : e.def.attack;
        }

        if (e.state === 'approaching') {
            e.x += (dx > 0 ? 1 : -1) * e.speed;
        }

        if (e.state === 'attacking') {
            e.stateTimer -= dt;
            e.windupTime -= dt;
            if (e.windupTime <= 0 && !e.attackResolved) {
                if (Math.abs(player.x - e.x) < ENEMY_ATTACK.hitRangeX
                    && Math.abs(player.y - e.y) < ENEMY_ATTACK.hitRangeY + (e.def.flying ? 40 : 0)) {
                    player.resolveMelee(e);
                }
                e.attackResolved = true;
            }
            if (e.stateTimer <= 0) { e.state = 'approaching'; e.attackResolved = false; }
        }

        if (e.attackCooldown > 0) e.attackCooldown -= dt;

        // --- Player strike vs enemy ---
        if (player.state === 'striking' && strikeHits(e)) {
            // Shielders block frontal strikes unless staggered.
            if (e.type === 'shielder' && player.x < e.x && e.state !== 'staggered') {
                if (Math.floor(Date.now() / 80) % 2 === 0) {
                    createParticles(e.x - 12, e.y - 20, '#5599ff', 3);
                    triggerShake(...SHAKE.block);
                    sfx.block();
                }
            } else {
                damageEnemy(e, PLAYER.strikeDamage * game.strikeMult);
            }
        }

        if (e.x < -60) enemies.splice(i, 1);
    }
}

// Telegraph colour teaches the counter: magenta = parry, cyan = jump, orange = shot.
function drawTelegraph(e) {
    if (e.state === 'firing' && e.windupTime > 0) {
        ctx.fillStyle = '#ff7733';
        ctx.globalAlpha = 0.6 + Math.sin(Date.now() / 30) * 0.3;
        ctx.shadowColor = '#ff7733';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(0, -e.height / 2, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1; ctx.shadowBlur = 0;
        return;
    }
    if (e.state !== 'attacking' || e.windupTime <= 0) return;

    const low = e.attackTier === 'low';
    const color = low ? '#00f0ff' : '#ff007f';
    const label = low ? 'JUMP' : 'PARRY';
    ctx.save();
    ctx.globalAlpha = 0.55 + Math.sin(Date.now() / 40) * 0.35;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.font = 'bold 11px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    const y = low ? 6 : -e.height - 14;      // near feet (low) or overhead (high)
    ctx.fillText(label, 0, y);
    // chevron
    ctx.beginPath();
    if (low) { ctx.moveTo(-6, y - 16); ctx.lineTo(6, y - 16); ctx.lineTo(0, y - 26); }
    else { ctx.moveTo(-6, y + 8); ctx.lineTo(6, y + 8); ctx.lineTo(0, y + 18); }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

export function drawEnemies() {
    for (const e of enemies) {
        ctx.save();

        let animX = 0, bob = 0;
        if (e.state === 'approaching') {
            bob = e.def.flying ? 0 : Math.abs(Math.sin(Date.now() / 160 + e.x * 0.05)) * -2;
        } else if (e.state === 'attacking') {
            animX = e.windupTime > 0 ? 6 : -10;
        } else if (e.state === 'firing') {
            animX = 4;
        } else if (e.state === 'staggered') {
            animX = 4; bob = 1;
        }
        ctx.translate(e.x + animX, e.y + bob);

        drawTelegraph(e);

        // Sprite (flipped to face left toward the player).
        const spr = e.def.sprite;
        ctx.save();
        ctx.scale(-1, 1);
        const pad = e.type === 'charger'
            ? { x: 15, y: 10, w: 30, h: 15 }
            : { x: 10, y: 5, w: 20, h: 10 };
        const dx = -e.width / 2 - pad.x;
        const dy = -e.height - pad.y;
        const dw = e.width + pad.w;
        const dh = e.height + pad.h;
        if (images[spr] && images[spr].width) {
            ctx.drawImage(images[spr], dx, dy, dw, dh);
            if (e.hitFlash > 0 && silhouettes[spr]) {
                ctx.save();
                ctx.globalAlpha = Math.min(1, e.hitFlash / 120);
                ctx.drawImage(silhouettes[spr], dx, dy, dw, dh);
                ctx.restore();
            }
        } else {
            ctx.fillStyle = e.color;
            ctx.fillRect(-e.width / 2, -e.height, e.width, e.height);
        }
        ctx.restore();

        // Type-flavour overlays.
        if (e.type === 'shielder') {
            ctx.save();
            ctx.strokeStyle = '#00f0ff';
            ctx.lineWidth = 3.5;
            ctx.shadowColor = '#00f0ff';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            if (e.state === 'staggered') {
                ctx.translate(-15, -15);
                ctx.rotate(-Math.PI / 4);
                ctx.arc(0, -e.height / 2, 24, Math.PI / 2, 3 * Math.PI / 2);
            } else {
                ctx.arc(-15, -e.height / 2, 24, Math.PI / 2, 3 * Math.PI / 2);
            }
            ctx.stroke();
            ctx.restore();
        } else if (e.def.flying) {
            // Hover glow + thruster flicker.
            ctx.save();
            ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 90) * 0.3;
            ctx.fillStyle = '#aa77ff';
            ctx.shadowColor = '#aa77ff';
            ctx.shadowBlur = 14;
            ctx.beginPath();
            ctx.arc(0, 2, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        ctx.restore();
    }
}
