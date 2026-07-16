import Phaser from 'phaser';
import { ENEMY, PLAYER, SCORE, WAVES } from '../config.js';
import { PARTICLE_COLORS } from '../systems/particles.js';

export function spawnEnemy(scene, wave = 1, forcedType = null) {
    let type = forcedType;
    if (!type) {
        // Pick the weight row with the highest minWave <= current wave
        let row = WAVES.WEIGHTS[0];
        for (const candidate of WAVES.WEIGHTS) {
            if (candidate.minWave <= wave) row = candidate;
        }
        const entries = Object.entries(row.w);
        const rand = Math.random();
        let cumulative = 0;
        type = entries[0][0];
        for (const [name, weight] of entries) {
            cumulative += weight;
            if (rand < cumulative) { type = name; break; }
        }
    }
    const mults = {
        hp: 1 + WAVES.HP_MULT_STEP * (wave - 1),
        // The brute stays slow and readable; everything else creeps up
        speed: type === 'brute'
            ? 1
            : Math.min(WAVES.SPEED_MULT_CAP, 1 + WAVES.SPEED_MULT_STEP * (wave - 1))
    };
    return new Enemy(scene, type, mults);
}

export default class Enemy extends Phaser.GameObjects.Container {
    constructor(scene, type, mults = { hp: 1, speed: 1 }) {
        const stats = ENEMY.TYPE_STATS[type];
        const groundY = scene.scale.height - PLAYER.GROUND_OFFSET;
        const spawnY = type === 'flyer' ? groundY - stats.hoverHeight : groundY;
        super(scene, scene.scale.width + ENEMY.SPAWN_X_OFFSET, spawnY);
        scene.add.existing(this);

        this.type = type;
        this.width = stats.width;
        this.height = stats.height;
        this.maxHealth = Math.round(stats.health * mults.hp);
        this.health = this.maxHealth;
        this.speed = stats.speed * mults.speed;
        this.damage = stats.damage;
        this.state = 'approaching'; // approaching, attacking, staggered, diving-windup, diving, recovering, dead
        this.stateTimer = 0;
        this.attackCooldown = 0;
        this.windupTime = 0;

        // Per-type combat overrides with global fallbacks
        this.windup = stats.windup || ENEMY.WINDUP;
        this.cooldownDuration = stats.cooldown || ENEMY.COOLDOWN;
        this.attackRange = stats.attackRange || ENEMY.ATTACK_RANGE;

        // Flyer state
        this.hoverBaseY = spawnY;
        this.bobPhase = Math.random() * Math.PI * 2;
        this.diveVX = 0;
        this.diveVY = 0;
        this.hitThisDive = false;

        this.sprite = scene.add.sprite(0, -this.height / 2, type);
        this.sprite.setFlipX(true); // enemies face left toward the player
        if (type === 'brute') this.sprite.setScale(1.5);
        this.add(this.sprite);

        if (type === 'shielder') {
            this.shieldFx = scene.add.sprite(-10, -this.height / 2, 'fx-shield');
            this.shieldFx.play('fx-shield-anim');
            this.add(this.shieldFx);
        }

        if (type === 'brute') {
            this.healthBar = scene.add.graphics();
            this.add(this.healthBar);
        }

        this.warning = scene.add.sprite(0, -this.height - (type === 'brute' ? 16 : 8), 'fx-warning');
        this.warning.setVisible(false);
        this.add(this.warning);

        this.render();
    }

    flashHit() {
        this.sprite.setTintFill(0xffffff);
        this.scene.time.delayedCall(60, () => {
            if (this.sprite && this.sprite.active) this.sprite.clearTint();
        });
    }

    die(scene) {
        this.state = 'dead';
        scene.combo++;
        scene.comboTimer = SCORE.COMBO_TIMEOUT;
        const base = this.type === 'brute' ? SCORE.BOSS_KILL : SCORE.KILL;
        scene.score += Math.round(base * scene.scoreMult);
        scene.audio.sfx.kill();
        if (this.type === 'brute') {
            scene.spawnParticles(this.x, this.y - 15, PARTICLE_COLORS.white, 20);
            scene.triggerShake(15, 400);
        }
    }

    blockSparks(scene) {
        if (Math.floor(Date.now() / 80) % 2 === 0) {
            scene.spawnParticles(this.x - 6, this.y - 10, PARTICLE_COLORS.blue, 3);
            scene.triggerShake(2, 50);
        }
    }

    applyStrikeHit(scene) {
        // The brute only takes damage while staggered — parry it first
        if (this.type === 'brute' && this.state !== 'staggered') {
            this.blockSparks(scene);
            return;
        }
        this.health -= PLAYER.STRIKE_DAMAGE;
        this.flashHit();
        scene.spawnParticles(this.x, this.y - 10, PARTICLE_COLORS.white, 4);
        scene.triggerShake(5, 100);
        scene.audio.sfx.strikeHit();
        if (this.health <= 0) this.die(scene);
    }

    checkPlayerStrike(player, scene, canBlock) {
        if (player.state !== 'striking') return;
        const strikeX = player.x + player.facing * PLAYER.STRIKE_OFFSET;
        if (Math.abs(this.x - strikeX) < PLAYER.STRIKE_HIT_RANGE &&
            Math.abs(this.y - player.y + PLAYER.STRIKE_HIT_Y) < PLAYER.STRIKE_HIT_RANGE) {
            // Shielders block frontal strikes when not staggered
            if (canBlock && this.type === 'shielder' && player.x < this.x) {
                this.blockSparks(scene);
            } else {
                this.applyStrikeHit(scene);
            }
        }
    }

    update(dt, player, scene) {
        // Spawn slide-in from the right edge
        if (this.x > scene.scale.width - ENEMY.SLIDE_IN_MARGIN) {
            this.x -= ENEMY.SLIDE_SPEED;
            this.render();
            return;
        }

        // Staggered: vulnerable, can't block, can't act
        if (this.state === 'staggered') {
            this.stateTimer -= dt;
            if (this.type === 'flyer') {
                // A parried flyer drops to the ground — the skill payoff
                const groundY = scene.scale.height - PLAYER.GROUND_OFFSET;
                this.y = Math.min(groundY, this.y + 2 * (dt / 16.67));
            }
            if (this.stateTimer <= 0) {
                this.state = this.type === 'flyer' ? 'recovering' : 'approaching';
                if (this.type === 'flyer') this.stateTimer = ENEMY.TYPE_STATS.flyer.recoverTime;
            }
            if (this.attackCooldown > 0) this.attackCooldown -= dt;
            this.checkPlayerStrike(player, scene, false);
            this.render();
            return;
        }

        if (this.type === 'flyer') {
            this.updateFlyer(dt, player, scene);
            return;
        }

        if (this.state !== 'attacking') {
            this.state = 'approaching';
        }

        const dx = player.x - this.x;
        const dist = Math.abs(dx);

        if (dist < this.attackRange && this.attackCooldown <= 0) {
            this.state = 'attacking';
            this.stateTimer = ENEMY.ATTACK_ACTIVE;
            this.windupTime = this.windup;
            this.attackCooldown = this.cooldownDuration;
            scene.audio.sfx.enemyWarning();
        }

        if (this.state === 'approaching') {
            this.x += (dx > 0 ? 1 : -1) * this.speed;
        }

        if (this.state === 'attacking') {
            this.stateTimer -= dt;
            this.windupTime -= dt;
            if (this.windupTime <= 0 && this.stateTimer > 0) {
                if (Math.abs(player.x - this.x) < ENEMY.ATTACK_HIT_X &&
                    Math.abs(player.y - this.y) < ENEMY.ATTACK_HIT_Y) {
                    player.takeDamage(this.damage, this);
                }
                if (this.state === 'attacking') this.state = 'idle'; // attack resolved once
            }
            if (this.state !== 'staggered' && this.stateTimer <= 0) {
                this.state = 'approaching';
            }
        } else if (this.state === 'idle') {
            this.stateTimer -= dt;
            if (this.stateTimer <= 0) this.state = 'approaching';
        }

        if (this.attackCooldown > 0) this.attackCooldown -= dt;

        this.checkPlayerStrike(player, scene, true);
        this.render();
    }

    updateFlyer(dt, player, scene) {
        const stats = ENEMY.TYPE_STATS.flyer;
        const groundY = scene.scale.height - PLAYER.GROUND_OFFSET;
        const step = dt / 16.67;

        if (this.state === 'diving-windup') {
            this.stateTimer -= dt;
            if (this.stateTimer <= 0) {
                const dx = player.x - this.x;
                const dy = (groundY - 8) - this.y;
                const len = Math.sqrt(dx * dx + dy * dy) || 1;
                this.diveVX = (dx / len) * stats.diveSpeed;
                this.diveVY = (dy / len) * stats.diveSpeed;
                this.state = 'diving';
                this.hitThisDive = false;
            }
        } else if (this.state === 'diving') {
            this.x += this.diveVX * step;
            this.y += this.diveVY * step;
            if (!this.hitThisDive &&
                Math.abs(player.x - this.x) < 22 && Math.abs(player.y - this.y) < 22) {
                this.hitThisDive = true;
                player.takeDamage(this.damage, this);
                // A parried dive staggers us (set inside takeDamage) — don't override
                if (this.state === 'diving') {
                    this.state = 'recovering';
                    this.stateTimer = stats.recoverTime;
                }
            } else if (this.y >= groundY - 10) {
                this.state = 'recovering';
                this.stateTimer = stats.recoverTime;
            }
        } else if (this.state === 'recovering') {
            this.stateTimer -= dt;
            this.y += (this.hoverBaseY - this.y) * Math.min(1, 0.08 * step);
            if (this.stateTimer <= 0) {
                this.state = 'approaching';
                this.attackCooldown = stats.cooldown;
            }
        } else {
            // approaching: hover-bob toward the player
            this.bobPhase += dt / 300;
            this.y = this.hoverBaseY + Math.sin(this.bobPhase) * 4;
            const dx = player.x - this.x;
            this.x += (dx > 0 ? 1 : -1) * this.speed;
            if (Math.abs(dx) < stats.diveRange && this.attackCooldown <= 0) {
                this.state = 'diving-windup';
                this.stateTimer = stats.diveWindup;
                scene.audio.sfx.enemyWarning();
            }
        }

        if (this.attackCooldown > 0) this.attackCooldown -= dt;

        this.checkPlayerStrike(player, scene, false);
        this.render();
    }

    render() {
        // Warning marker during attack/dive windup
        const inWindup = (this.state === 'attacking' && this.windupTime > 0) ||
            this.state === 'diving-windup';
        this.warning.setVisible(inWindup);
        if (inWindup) {
            this.warning.setAlpha(0.6 + Math.sin(Date.now() / 30) * 0.3);
        }

        // Shield sprite lowers while staggered
        if (this.shieldFx) {
            if (this.state === 'staggered') {
                this.shieldFx.setPosition(-7, -7);
                this.shieldFx.setRotation(-Math.PI / 4);
            } else {
                this.shieldFx.setPosition(-10, -this.height / 2);
                this.shieldFx.setRotation(0);
            }
        }

        // Brute health bar
        if (this.healthBar) {
            this.healthBar.clear();
            const w = 30;
            const ratio = Math.max(0, this.health / this.maxHealth);
            this.healthBar.fillStyle(0x0d0a1a, 1);
            this.healthBar.fillRect(-w / 2 - 1, -this.height - 8, w + 2, 5);
            this.healthBar.fillStyle(0xff3355, 1);
            this.healthBar.fillRect(-w / 2, -this.height - 7, Math.round(w * ratio), 3);
        }

        // State -> animation
        if (this.state === 'diving-windup' || (this.state === 'attacking' && this.windupTime > 0)) {
            this.sprite.anims.stop();
            this.sprite.setFrame(4); // telegraph pose
        } else if (this.state === 'attacking' || this.state === 'diving') {
            this.sprite.play(`${this.type}-attack`, true);
        } else if (this.state === 'staggered') {
            this.sprite.play(`${this.type}-idle`, true);
            this.sprite.setAlpha(0.65);
            return;
        } else {
            this.sprite.play(`${this.type}-walk`, true);
        }
        this.sprite.setAlpha(1);
    }
}
