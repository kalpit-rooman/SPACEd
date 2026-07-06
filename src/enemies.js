// ============================================
// enemies.js — Enemy types, spawning, AI, rendering
// ============================================
import { canvas, ctx } from './core.js';
import { images } from './assets.js';
import { game } from './state.js';
import { player } from './player.js';
import { createParticles } from './particles.js';
import { triggerShake } from './vfx.js';
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
                e.health -= PLAYER.strikeDamage;
                createParticles(e.x, e.y - 20, '#ffffff', 4);
                if (e.health <= 0) killEnemy(e);
            }

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
                }
            } else {
                e.health -= PLAYER.strikeDamage;
                createParticles(e.x, e.y - 20, '#ffffff', 4);
                triggerShake(...SHAKE.hit);
                if (e.health <= 0) killEnemy(e);
            }
        }

        if (e.x < -50) enemies.splice(i, 1);
    }
}

export function drawEnemies() {
    for (const e of enemies) {
        ctx.save();
        ctx.translate(e.x, e.y);

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
        if (e.type === 'swarmer' && images.swarmer) {
            ctx.drawImage(images.swarmer, -e.width / 2 - 10, -e.height - 5, e.width + 20, e.height + 10);
        } else if (e.type === 'charger' && images.charger) {
            ctx.drawImage(images.charger, -e.width / 2 - 15, -e.height - 10, e.width + 30, e.height + 15);
        } else if (e.type === 'shielder' && images.shielder) {
            ctx.drawImage(images.shielder, -e.width / 2 - 10, -e.height - 5, e.width + 20, e.height + 10);
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
