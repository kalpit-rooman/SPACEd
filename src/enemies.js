// ============================================
// enemies.js — Enemy types, spawning, AI, rendering
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
import {
    ENEMY_TYPES, ENEMY_ATTACK, COMBAT, SPAWN, GROUND_OFFSET, PLAYER, SHAKE,
} from './config.js';

export let enemies = [];
let enemySpawnTimer = 0;
let enemySpawnInterval = SPAWN.baseInterval;

export function resetEnemies() {
    enemies = [];
    enemySpawnTimer = 0;
    enemySpawnInterval = SPAWN.baseInterval;
}

const TYPE_KEYS = Object.keys(ENEMY_TYPES);

function pickType() {
    const rand = Math.random();
    let cumulative = 0;
    for (const key of TYPE_KEYS) {
        cumulative += ENEMY_TYPES[key].weight;
        if (rand < cumulative) return key;
    }
    return TYPE_KEYS[0];
}

export function spawnEnemy() {
    const type = pickType();
    const def = ENEMY_TYPES[type];
    const enemy = {
        type,
        x: canvas.width + 30,
        y: canvas.height - GROUND_OFFSET,
        width: def.width,
        height: def.height,
        health: def.health,
        speed: def.speed,
        state: 'approaching', // approaching, attacking, hurt, dead, staggered, idle
        stateTimer: 0,
        attackCooldown: 0,
        windupTime: 0,
        color: def.color,
        damage: def.damage,
    };

    if (type === 'charger') {
        enemy.y = canvas.height - 110;
    }

    enemies.push(enemy);
}

// Difficulty scaling + spawn cadence.
export function updateSpawner(dt) {
    enemySpawnInterval = Math.max(
        SPAWN.minInterval,
        SPAWN.baseInterval - game.time / 1000 * SPAWN.rampPerSecond,
    );
    enemySpawnTimer += dt;
    if (enemySpawnTimer >= enemySpawnInterval) {
        spawnEnemy();
        enemySpawnTimer = 0;
    }
}

function killEnemy(e) {
    e.state = 'dead';
    game.score += COMBAT.killScore;
    game.combo++;
    game.comboTimer = COMBAT.comboTimer;
    // Death juice.
    createParticles(e.x, e.y - 20, '#00f0ff', 14);
    createParticles(e.x, e.y - 20, '#ffffff', 8);
    spawnShockwave(e.x, e.y - 20, 40, '#00f0ff');
    spawnDamageNumber(e.x, e.y - e.height - 6, `+${COMBAT.killScore}`, '#00f0ff', true);
    hitStop(55);
    triggerShake(...SHAKE.hit);
    sfx.death();
    sfx.combo(game.combo);
}

// Apply strike damage with feedback (throttled so a sustained strike
// doesn't spam numbers). Kills via killEnemy when depleted.
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

// Does the player's active strike overlap this enemy?
function strikeHits(e) {
    const strikeX = player.x + player.facing * PLAYER.strikeReach;
    return Math.abs(e.x - strikeX) < PLAYER.strikeRangeX
        && Math.abs(e.y - player.y + 25) < PLAYER.strikeRangeY;
}

export function updateEnemies(dt) {
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];

        if (e.state === 'dead') {
            enemies.splice(i, 1);
            continue;
        }

        // Slide in from the right edge before engaging.
        if (e.x > canvas.width - 50) {
            e.x -= 2;
            continue;
        }

        // Staggered: vulnerable, can't block, can't attack.
        if (e.state === 'staggered') {
            e.stateTimer -= dt;
            if (e.stateTimer <= 0) e.state = 'approaching';
            if (e.attackCooldown > 0) e.attackCooldown -= dt;

            if (player.state === 'striking' && strikeHits(e)) {
                damageEnemy(e, PLAYER.strikeDamage);
            }

            if (e.hitFlash > 0) e.hitFlash -= dt;
            if (e.x < -50) enemies.splice(i, 1);
            continue;
        }

        if (e.state !== 'attacking' && e.state !== 'hurt') {
            e.state = 'approaching';
        }

        const dx = player.x - e.x;
        const dist = Math.abs(dx);

        if (dist < ENEMY_ATTACK.range && e.attackCooldown <= 0) {
            e.state = 'attacking';
            e.stateTimer = ENEMY_ATTACK.duration;
            e.windupTime = ENEMY_ATTACK.windup;
            e.attackCooldown = ENEMY_ATTACK.cooldown;
        }

        if (e.state === 'approaching') {
            e.x += (dx > 0 ? 1 : -1) * e.speed;
        }

        if (e.state === 'attacking') {
            e.stateTimer -= dt;
            e.windupTime -= dt;
            if (e.windupTime <= 0 && e.stateTimer > 0) {
                if (Math.abs(player.x - e.x) < ENEMY_ATTACK.hitRangeX
                    && Math.abs(player.y - e.y) < ENEMY_ATTACK.hitRangeY) {
                    player.takeDamage(e.damage, e);
                }
                e.state = 'idle';
            }
            if (e.stateTimer <= 0) e.state = 'approaching';
        }

        if (e.attackCooldown > 0) e.attackCooldown -= dt;

        // Hit by the player's strike?
        if (player.state === 'striking' && strikeHits(e)) {
            // Shielders block frontal strikes (player is to their left) unless staggered.
            if (e.type === 'shielder' && player.x < e.x) {
                if (Math.floor(Date.now() / 80) % 2 === 0) {
                    createParticles(e.x - 12, e.y - 20, '#5599ff', 3);
                    triggerShake(...SHAKE.block);
                    sfx.block();
                }
            } else {
                damageEnemy(e, PLAYER.strikeDamage);
            }
        }

        if (e.hitFlash > 0) e.hitFlash -= dt;
        if (e.x < -50) enemies.splice(i, 1);
    }
}

export function drawEnemies() {
    for (const e of enemies) {
        ctx.save();

        // --- Procedural animation ---
        let animX = 0, bob = 0;
        if (e.state === 'approaching') {
            bob = Math.abs(Math.sin(Date.now() / 160 + e.x * 0.05)) * -2; // walk hop
        } else if (e.state === 'attacking') {
            if (e.windupTime > 0) {
                animX = 6; // wind back (away from player, to the right)
            } else {
                animX = -10; // lunge toward player (left)
            }
        } else if (e.state === 'staggered') {
            animX = 4; bob = 1;
        }
        ctx.translate(e.x + animX, e.y + bob);

        // Attack telegraph.
        if (e.state === 'attacking' && e.windupTime > 0) {
            ctx.fillStyle = '#ff0055';
            ctx.globalAlpha = 0.6 + Math.sin(Date.now() / 30) * 0.3;
            ctx.shadowColor = '#ff0055';
            ctx.shadowBlur = 10;
            ctx.font = 'bold 20px Orbitron';
            ctx.textAlign = 'center';
            ctx.fillText('!', 0, -e.height - 12);
            ctx.globalAlpha = 1;
            ctx.shadowBlur = 0;
        }

        // Sprite (flipped to face left toward the player).
        ctx.save();
        ctx.scale(-1, 1);
        // Per-type draw rect (padding around the logical hitbox).
        const pad = e.type === 'charger'
            ? { x: 15, y: 10, w: 30, h: 15 }
            : { x: 10, y: 5, w: 20, h: 10 };
        const dx = -e.width / 2 - pad.x;
        const dy = -e.height - pad.y;
        const dw = e.width + pad.w;
        const dh = e.height + pad.h;
        if (images[e.type] && images[e.type].width) {
            ctx.drawImage(images[e.type], dx, dy, dw, dh);
            // Clean white silhouette flash on recent hit.
            if (e.hitFlash > 0 && silhouettes[e.type]) {
                ctx.save();
                ctx.globalAlpha = Math.min(1, e.hitFlash / 120);
                ctx.drawImage(silhouettes[e.type], dx, dy, dw, dh);
                ctx.restore();
            }
        } else {
            ctx.fillStyle = e.color;
            ctx.fillRect(-e.width / 2, -e.height, e.width, e.height);
        }
        ctx.restore();

        // Shielder energy shield overlay.
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
        }

        ctx.restore();
    }
}
