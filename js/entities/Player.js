import Phaser from 'phaser';
import { PLAYER, ENEMY, SCORE } from '../config.js';
import { PARTICLE_COLORS } from '../systems/particles.js';

export default class Player extends Phaser.GameObjects.Container {
    constructor(scene) {
        super(scene, 0, 0);
        scene.add.existing(this);

        this.width = PLAYER.WIDTH;
        this.height = PLAYER.HEIGHT;
        this.maxHealth = PLAYER.MAX_HEALTH;
        this.health = this.maxHealth;
        this.vy = 0;
        this.grounded = true;
        this.state = 'idle'; // idle, striking, parrying, hurt
        this.stateTimer = 0;
        this.invincible = false;
        this.facing = 1; // 1 = right, -1 = left
        this.afterimageTimer = 0;

        this.sprite = scene.add.sprite(0, -PLAYER.HEIGHT / 2, 'player');
        this.add(this.sprite);

        this.slashFx = scene.add.sprite(PLAYER.STRIKE_OFFSET - 6, -13, 'fx-slash');
        this.slashFx.setVisible(false);
        this.add(this.slashFx);

        this.parryFx = scene.add.sprite(11, -13, 'fx-parry');
        this.parryFx.setVisible(false);
        this.add(this.parryFx);

        this.flickerTween = null;

        this.reset();
    }

    reset() {
        this.x = this.scene.scale.width * 0.25;
        this.y = this.scene.scale.height - PLAYER.GROUND_OFFSET;
        this.health = this.maxHealth;
        this.state = 'idle';
        this.stateTimer = 0;
        this.invincible = false;
        this.vy = 0;
        this.grounded = true;
        this.afterimageTimer = 0;
        this.setAlpha(1);
        this.slashFx.setVisible(false);
        this.parryFx.setVisible(false);
        if (this.flickerTween) {
            this.flickerTween.stop();
            this.flickerTween = null;
        }
    }

    startStrike() {
        if (this.state === 'idle' || this.state === 'striking' || this.state === 'parrying') {
            this.state = 'striking';
            this.stateTimer = PLAYER.STRIKE_DURATION;
            this.facing = 1;
            this.sprite.play('player-strike', true);
            this.slashFx.setX(this.facing * (PLAYER.STRIKE_OFFSET - 6));
            this.slashFx.setFlipX(this.facing === -1);
            this.slashFx.setVisible(true);
            this.slashFx.play('fx-slash-anim');
            this.scene.audio.sfx.strike();
        }
    }

    startParry() {
        if (this.state === 'idle' || this.state === 'striking') {
            this.state = 'parrying';
            this.stateTimer = 0; // sustained until release
        }
    }

    stopParry() {
        if (this.state === 'parrying') {
            this.state = 'idle';
            this.stateTimer = 0;
        }
    }

    jump() {
        if (this.grounded) {
            this.vy = PLAYER.JUMP_VELOCITY;
            this.grounded = false;
            if (this.state === 'striking' || this.state === 'parrying') {
                this.state = 'idle';
                this.stateTimer = 0;
            }
            this.scene.audio.sfx.jump();
        }
    }

    startInvincibleFlicker() {
        if (this.flickerTween) this.flickerTween.stop();
        this.flickerTween = this.scene.tweens.add({
            targets: this,
            alpha: { from: 1, to: 0.4 },
            duration: 80,
            yoyo: true,
            repeat: -1
        });
    }

    stopInvincibleFlicker() {
        if (this.flickerTween) {
            this.flickerTween.stop();
            this.flickerTween = null;
        }
        this.setAlpha(1);
    }

    takeDamage(amount, sourceEnemy) {
        const scene = this.scene;
        if (this.invincible) return;
        if (this.state === 'parrying') {
            // Parry successful — deflect and stagger the attacker
            scene.spawnParticles(this.x, this.y, PARTICLE_COLORS.white, 8);
            scene.combo++;
            scene.comboTimer = SCORE.COMBO_TIMEOUT;
            scene.score += Math.round(SCORE.PARRY_BASE * scene.combo * scene.scoreMult);
            if (sourceEnemy) {
                const stats = ENEMY.TYPE_STATS[sourceEnemy.type];
                sourceEnemy.state = 'staggered';
                sourceEnemy.stateTimer = (stats && stats.staggerDuration) || ENEMY.STAGGER_DURATION;
                scene.spawnParticles(sourceEnemy.x, sourceEnemy.y - 10, PARTICLE_COLORS.blue, 6);
            }
            scene.triggerShake(8, 150);
            scene.audio.sfx.parryDeflect();
            scene.audio.sfx.comboUp(scene.combo);
            return;
        }
        this.health -= amount;
        this.state = 'hurt';
        this.stateTimer = PLAYER.HURT_DURATION;
        this.invincible = true;
        this.startInvincibleFlicker();
        scene.combo = 0;
        scene.spawnParticles(this.x, this.y, PARTICLE_COLORS.red, 6);
        scene.triggerShake(12, 300);
        scene.audio.sfx.playerHurt();
        if (this.health <= 0) {
            scene.gameOver();
        }
    }

    spawnAfterimage() {
        const ghost = this.scene.add.sprite(this.x, this.y - PLAYER.HEIGHT / 2, 'player', this.sprite.frame.name);
        ghost.setFlipX(this.sprite.flipX);
        ghost.setAlpha(0.3);
        this.scene.tweens.add({
            targets: ghost,
            alpha: 0,
            duration: 180,
            onComplete: () => ghost.destroy()
        });
    }

    update(dt) {
        const scene = this.scene;

        // State timer
        if (this.stateTimer > 0) {
            this.stateTimer -= dt;
            if (this.stateTimer <= 0) {
                this.state = 'idle';
                if (this.invincible) {
                    this.invincible = false;
                    this.stopInvincibleFlicker();
                }
            }
        }

        // Gravity
        if (!this.grounded) {
            this.vy += PLAYER.GRAVITY;
            this.y += this.vy;
            const groundY = scene.scale.height - PLAYER.GROUND_OFFSET;
            if (this.y >= groundY) {
                this.y = groundY;
                this.vy = 0;
                this.grounded = true;
            }
            // Pixel afterimage trail while airborne
            this.afterimageTimer -= dt;
            if (this.afterimageTimer <= 0) {
                this.spawnAfterimage();
                this.afterimageTimer = 60;
            }
        }

        // Bounds
        this.x = Math.max(PLAYER.MIN_X, Math.min(scene.scale.width - PLAYER.MIN_X, this.x));

        // Combo timer
        if (scene.comboTimer > 0) {
            scene.comboTimer -= dt;
            if (scene.comboTimer <= 0) scene.combo = 0;
        }

        this.render();
    }

    render() {
        this.sprite.setFlipX(this.facing === -1);

        if (!this.grounded) {
            this.sprite.anims.stop();
            this.sprite.setFrame(6); // jump pose
        } else if (this.state === 'striking') {
            this.sprite.play('player-strike', true);
        } else if (this.state === 'parrying') {
            this.sprite.anims.stop();
            this.sprite.setFrame(4); // guard pose (strike windup frame)
        } else if (this.state === 'hurt') {
            this.sprite.anims.stop();
            this.sprite.setFrame(7);
        } else {
            this.sprite.play('player-idle', true);
        }

        this.parryFx.setVisible(this.state === 'parrying');
        if (this.state === 'parrying') {
            this.parryFx.play('fx-parry-anim', true);
        }
    }
}
