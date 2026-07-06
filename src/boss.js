// ============================================
// boss.js — Multi-phase telegraphed boss
// ============================================
import { canvas, ctx } from './core.js';
import { images, silhouettes } from './assets.js';
import { game } from './state.js';
import { player } from './player.js';
import { createParticles } from './particles.js';
import {
    triggerShake, hitStop, screenFlash, spawnDamageNumber, spawnShockwave,
} from './vfx.js';
import { sfx } from './audio.js';
import { spawnProjectile } from './projectiles.js';
import { maybeDropPowerup } from './powerups.js';
import { BOSS, PLAYER, GROUND_OFFSET, PROJECTILE, COMBAT } from './config.js';

export let boss = null;

export function resetBoss() { boss = null; }
export function isBossAlive() { return boss && boss.state !== 'dead'; }

export function spawnBoss() {
    const groundY = canvas.height - GROUND_OFFSET;
    boss = {
        x: canvas.width + 80,
        y: groundY,
        width: BOSS.width,
        height: BOSS.height,
        health: BOSS.health,
        maxHealth: BOSS.health,
        state: 'enter',
        timer: 0,
        phase: 1,
        attackTier: 'high',
        damage: BOSS.contactDamage,
        hitFlash: 0,
        facing: -1,
        standX: canvas.width * 0.72,
        volleyLeft: 0,
        volleyTimer: 0,
        stateTimer: 0, // used by parrySuccess when it staggers the boss
    };
    sfx.bossRoar();
}

function meleeRange() { return 90; }

function phaseSpeedMult() { return boss.phase === 3 ? 1.6 : boss.phase === 2 ? 1.3 : 1; }

function updatePhase() {
    const r = boss.health / boss.maxHealth;
    const np = r < 0.34 ? 3 : r < 0.67 ? 2 : 1;
    if (np !== boss.phase) {
        boss.phase = np;
        screenFlash('#ff007f', 160, 0.25);
        sfx.bossRoar();
        spawnDamageNumber(boss.x, boss.y - boss.height - 10, `PHASE ${np}`, '#ff5599', true);
    }
}

function strikeHitsBoss() {
    const strikeX = player.x + player.facing * PLAYER.strikeReach;
    return Math.abs(boss.x - strikeX) < boss.width / 2 + 20
        && player.y < boss.y - 4; // must be roughly at boss body height
}

function damageBoss(dmg) {
    boss.health -= dmg;
    boss.hitFlash = 120;
    createParticles(boss.x, boss.y - boss.height / 2, '#ffffff', 4);
    spawnDamageNumber(boss.x + (Math.random() - 0.5) * 30, boss.y - boss.height, dmg, '#ffffff');
    sfx.hit();
    if (boss.health <= 0) killBoss();
    else updatePhase();
}

function killBoss() {
    boss.state = 'dead';
    game.score += BOSS.scoreReward;
    for (let k = 0; k < 5; k++) {
        createParticles(boss.x + (Math.random() - 0.5) * boss.width, boss.y - Math.random() * boss.height, '#00f0ff', 10);
    }
    spawnShockwave(boss.x, boss.y - boss.height / 2, 160, '#00f0ff');
    spawnDamageNumber(boss.x, boss.y - boss.height, `+${BOSS.scoreReward}`, '#00f0ff', true);
    screenFlash('#ffffff', 260, 0.4);
    triggerShake(16, 500);
    hitStop(140);
    sfx.gameOver(); // descending flourish reused as a defeat sting
    maybeDropPowerup(boss.x - 30, boss.y);
    maybeDropPowerup(boss.x + 30, boss.y);
}

function fire(dir) {
    spawnProjectile(boss.x + dir * 30, boss.y - PROJECTILE.height,
        dir * (PROJECTILE.speed + boss.phase * 0.6), PROJECTILE.damage, '#ff44aa');
    sfx.strike();
}

export function updateBoss(dt) {
    if (!boss || boss.state === 'dead') return;
    if (boss.hitFlash > 0) boss.hitFlash -= dt;

    const spd = BOSS.speed * phaseSpeedMult();
    const dir = player.x < boss.x ? -1 : 1;
    boss.facing = dir;
    const dist = Math.abs(player.x - boss.x);

    switch (boss.state) {
        case 'enter':
            boss.x -= 3;
            if (boss.x <= boss.standX) { boss.x = boss.standX; boss.state = 'approach'; }
            break;

        case 'approach':
            boss.x += dir * spd;
            if (dist < meleeRange()) {
                boss.state = 'telegraph';
                boss.timer = boss.phase === 3 ? 380 : 520;
                boss.attackTier = Math.random() < 0.5 ? 'high' : 'low';
            }
            break;

        case 'telegraph':
            boss.timer -= dt;
            if (boss.timer <= 0) {
                // Resolve the melee swing.
                if (dist < meleeRange() + 30) player.resolveMelee(boss);
                triggerShake(8, 160);
                boss.state = 'recover';
                boss.timer = 300;
            }
            break;

        case 'recover':
            boss.timer -= dt;
            if (boss.timer <= 0) boss.state = 'retreat';
            break;

        case 'retreat':
            boss.x += (boss.x < boss.standX ? 1 : -1) * spd * 1.4;
            if (Math.abs(boss.x - boss.standX) < 6) {
                boss.x = boss.standX;
                boss.state = 'volley';
                boss.volleyLeft = BOSS.projectileVolley + (boss.phase - 1);
                boss.volleyTimer = 400; // initial telegraph
            }
            break;

        case 'volley':
            boss.volleyTimer -= dt;
            if (boss.volleyTimer <= 0) {
                fire(dir);
                boss.volleyLeft--;
                boss.volleyTimer = 260;
                if (boss.volleyLeft <= 0) boss.state = 'approach';
            }
            break;

        case 'staggered': // set by a successful parry
            boss.stateTimer -= dt;
            if (boss.stateTimer <= 0) boss.state = 'retreat';
            break;
    }

    // Player strike vs boss (must reach body height — jump for the head).
    if (player.state === 'striking' && strikeHitsBoss()) {
        damageBoss(PLAYER.strikeDamage * game.strikeMult);
    }
}

export function drawBoss() {
    if (!boss || boss.state === 'dead') return;
    ctx.save();
    ctx.translate(boss.x, boss.y);

    // Telegraph.
    if (boss.state === 'telegraph') {
        const low = boss.attackTier === 'low';
        const color = low ? '#00f0ff' : '#ff007f';
        ctx.save();
        ctx.globalAlpha = 0.55 + Math.sin(Date.now() / 40) * 0.35;
        ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 14;
        ctx.font = 'bold 16px Orbitron, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(low ? 'JUMP' : 'PARRY', 0, low ? 4 : -boss.height - 16);
        ctx.restore();
    }

    // Body (scaled charger sprite with a menacing glow).
    ctx.save();
    ctx.scale(-1, 1);
    ctx.shadowColor = '#ff007f';
    ctx.shadowBlur = 24;
    const dw = boss.width + 30, dh = boss.height + 20;
    if (images.charger && images.charger.width) {
        ctx.drawImage(images.charger, -dw / 2, -dh, dw, dh);
        if (boss.hitFlash > 0 && silhouettes.charger) {
            ctx.save();
            ctx.globalAlpha = Math.min(1, boss.hitFlash / 120);
            ctx.drawImage(silhouettes.charger, -dw / 2, -dh, dw, dh);
            ctx.restore();
        }
    } else {
        ctx.fillStyle = '#aa1144';
        ctx.fillRect(-boss.width / 2, -boss.height, boss.width, boss.height);
    }
    ctx.restore();

    ctx.restore();

    drawBossBar();
}

function drawBossBar() {
    const w = canvas.width * 0.6;
    const x = (canvas.width - w) / 2;
    const y = 58;
    ctx.save();
    ctx.fillStyle = 'rgba(20,10,25,0.7)';
    ctx.fillRect(x, y, w, 12);
    const pct = Math.max(0, boss.health / boss.maxHealth);
    ctx.fillStyle = '#ff007f';
    ctx.shadowColor = '#ff007f';
    ctx.shadowBlur = 10;
    ctx.fillRect(x, y, w * pct, 12);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ff66b2';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, 12);
    ctx.fillStyle = '#ff99cc';
    ctx.font = 'bold 12px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('◆ SECTOR BOSS ◆', canvas.width / 2, y - 6);
    ctx.restore();
}
