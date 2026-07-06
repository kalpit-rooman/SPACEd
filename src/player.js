// ============================================
// player.js — Player entity + state machine
// ============================================
import { canvas, ctx } from './core.js';
import { images } from './assets.js';
import { game } from './state.js';
import { PLAYER, COMBAT, GROUND_OFFSET, SHAKE } from './config.js';
import { createParticles } from './particles.js';
import { triggerShake } from './vfx.js';
import { gameOver } from './flow.js';

export const player = {
    x: 0,
    y: 0,
    width: PLAYER.width,
    height: PLAYER.height,
    health: PLAYER.maxHealth,
    maxHealth: PLAYER.maxHealth,
    vx: 0,
    vy: 0,
    grounded: true,
    state: 'idle', // idle, striking, parrying, dodging, hurt
    stateTimer: 0,
    invincible: false,
    facing: 1,

    reset() {
        this.x = canvas.width * 0.25;
        this.y = canvas.height - GROUND_OFFSET;
        this.health = this.maxHealth;
        this.state = 'idle';
        this.stateTimer = 0;
        this.invincible = false;
        this.vx = 0;
        this.vy = 0;
        this.grounded = true;
    },

    startStrike() {
        if (this.state === 'idle' || this.state === 'striking' || this.state === 'parrying') {
            this.state = 'striking';
            this.stateTimer = PLAYER.strikeDuration;
            this.facing = 1;
        }
    },

    startParry() {
        if (this.state === 'idle' || this.state === 'striking') {
            this.state = 'parrying';
            this.stateTimer = 0; // sustain until keyup
        }
    },

    stopParry() {
        if (this.state === 'parrying') {
            this.state = 'idle';
            this.stateTimer = 0;
        }
    },

    jump() {
        if (this.grounded) {
            this.vy = PLAYER.jumpVelocity;
            this.grounded = false;
            if (this.state === 'striking' || this.state === 'parrying') {
                this.state = 'idle';
                this.stateTimer = 0;
            }
        }
    },

    startDodge() {
        if (this.state === 'idle' || this.state === 'striking') {
            this.state = 'dodging';
            this.stateTimer = PLAYER.dodgeDuration;
            this.invincible = true;
            this.vx = this.facing * PLAYER.dodgeSpeed;
        }
    },

    takeDamage(amount, sourceEnemy) {
        if (this.invincible) return;
        if (this.state === 'parrying') {
            createParticles(this.x, this.y, '#ffffff', 8);
            game.combo++;
            game.comboTimer = COMBAT.comboTimer;
            game.score += COMBAT.parryScoreBase * game.combo;
            if (sourceEnemy) {
                sourceEnemy.state = 'staggered';
                sourceEnemy.stateTimer = COMBAT.staggerDuration;
                createParticles(sourceEnemy.x, sourceEnemy.y - 20, '#5599ff', 6);
            }
            triggerShake(...SHAKE.parry);
            return;
        }
        this.health -= amount;
        this.state = 'hurt';
        this.stateTimer = PLAYER.hurtDuration;
        this.invincible = true;
        game.combo = 0;
        createParticles(this.x, this.y, '#ff4444', 6);
        triggerShake(...SHAKE.playerHurt);
        if (this.health <= 0) {
            gameOver();
        }
    },

    update(dt) {
        if (this.stateTimer > 0) {
            this.stateTimer -= dt;
            if (this.stateTimer <= 0) {
                this.state = 'idle';
                this.invincible = false;
                this.vx = 0;
            }
        }

        if (this.state === 'dodging') {
            this.x += this.vx;
            this.vx *= 0.9;
        }

        if (!this.grounded) {
            this.vy += PLAYER.gravity;
            this.y += this.vy;
            if (this.y >= canvas.height - GROUND_OFFSET) {
                this.y = canvas.height - GROUND_OFFSET;
                this.vy = 0;
                this.grounded = true;
            }
        }

        this.x = Math.max(20, Math.min(canvas.width - 20, this.x));

        if (game.comboTimer > 0) {
            game.comboTimer -= dt;
            if (game.comboTimer <= 0) game.combo = 0;
        }
    },

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);

        if (this.invincible && Math.floor(Date.now() / PLAYER.invincibleFlashRate) % 2) {
            ctx.globalAlpha = 0.4;
        }

        if (images.player) {
            ctx.save();
            ctx.scale(this.facing, 1);
            ctx.drawImage(images.player, -25, -55, 50, 55);
            ctx.restore();
        } else {
            ctx.fillStyle = '#00f0ff';
            ctx.fillRect(-this.width / 2, -this.height, this.width, this.height);
        }

        if (this.state === 'striking') {
            ctx.save();
            ctx.strokeStyle = '#00f0ff';
            ctx.lineWidth = 4;
            ctx.shadowColor = '#00f0ff';
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.arc(this.facing * 20, -25, 30, -Math.PI / 4, Math.PI / 4);
            ctx.stroke();
            ctx.restore();
        }

        if (this.state === 'parrying') {
            ctx.save();
            ctx.strokeStyle = '#ff007f';
            ctx.lineWidth = 3.5;
            ctx.shadowColor = '#ff007f';
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.arc(20, -25, 32, -Math.PI / 3, Math.PI / 3);
            ctx.stroke();
            ctx.restore();
        }

        if (!this.grounded) {
            ctx.save();
            ctx.globalAlpha = 0.15;
            if (images.player) {
                ctx.scale(this.facing, 1);
                ctx.drawImage(images.player, -25, -55 - this.vy * 0.8, 50, 55);
            }
            ctx.restore();
        }

        ctx.restore();
    },
};
