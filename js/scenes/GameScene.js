import Phaser from 'phaser';
import Player from '../entities/Player.js';
import { spawnEnemy } from '../entities/Enemy.js';
import { createParticleSystem } from '../systems/particles.js';
import { createAudio } from '../systems/audio.js';
import { setupOneButtonInput } from '../input/oneButtonInput.js';
import { GAME, ENEMY, SCORE, WAVES, STORAGE_KEYS } from '../config.js';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('Game');
    }

    create() {
        this.gameState = 'start'; // start, playing, paused, gameover
        this.score = 0;
        this.combo = 0;
        this.comboTimer = 0;
        this.gameTime = 0;
        this.enemies = [];
        this.enemySpawnTimer = 0;
        this.enemySpawnInterval = WAVES.BASE_SPAWN_INTERVAL;
        this.wave = 1;
        this.waveTimer = 0;
        this.pendingBurst = 0;
        this.burstTimer = 0;
        this.scoreMult = 1;
        this.highScore = this.loadHighScore();

        // Parallax pixel background stack (sizes are constant under Scale.FIT)
        const W = this.scale.width;
        const H = this.scale.height;
        this.bgFar = this.add.tileSprite(0, 0, W, H, 'bg-stars-far').setOrigin(0);
        this.bgNear = this.add.tileSprite(0, 0, W, H, 'bg-stars-near').setOrigin(0);
        this.planet = this.add.image(W - 80, 64, 'bg-planet');
        this.city = this.add.tileSprite(0, H - GAME.GROUND_Y_OFFSET - 48, W, 48, 'bg-city').setOrigin(0);
        this.ground = this.add.tileSprite(0, H - GAME.GROUND_Y_OFFSET, W, 8, 'bg-ground').setOrigin(0);

        this.particles = createParticleSystem(this);
        this.audio = createAudio();

        this.player = new Player(this);
        this.player.setVisible(false);

        this.inputHandle = setupOneButtonInput(this, {
            onStrike: () => this.player.startStrike(),
            onParryStart: () => this.player.startParry(),
            onParryStop: () => this.player.stopParry(),
            onJump: () => this.player.jump(),
            onStartOrRestart: () => this.startGame(),
            onAnyInput: () => this.audio.unlock(),
            isParrying: () => this.player.state === 'parrying',
            getGameState: () => this.gameState
        });

        this.input.keyboard.on('keydown-P', () => this.togglePause());
        this.input.keyboard.on('keydown-ESC', () => this.togglePause());
        this.input.keyboard.on('keydown-M', () => this.updateMuteButton(this.audio.toggleMute()));

        const muteBtn = document.getElementById('mute-btn');
        muteBtn.addEventListener('click', () => this.updateMuteButton(this.audio.toggleMute()));
        this.updateMuteButton(this.audio.isMuted());

        document.getElementById('pause-btn').addEventListener('click', () => this.togglePause());

        document.getElementById('best-score').textContent = `BEST ${this.highScore}`;
    }

    loadHighScore() {
        try {
            return parseInt(localStorage.getItem(STORAGE_KEYS.HIGH_SCORE), 10) || 0;
        } catch {
            return 0;
        }
    }

    saveHighScore() {
        try {
            localStorage.setItem(STORAGE_KEYS.HIGH_SCORE, String(this.highScore));
        } catch { /* private mode */ }
    }

    updateMuteButton(muted) {
        document.getElementById('mute-btn').textContent = muted ? 'SND OFF' : 'SND ON';
    }

    spawnParticles(x, y, color, count) {
        this.particles.spawn(x, y, color, count);
    }

    triggerShake(intensity, duration) {
        this.cameras.main.shake(duration, intensity * 0.001);
    }

    updateUI() {
        document.getElementById('score').textContent = this.score;
        const healthPct = Math.max(0, this.player.health / this.player.maxHealth * 100);
        // Stepped drain reads more pixel-y than a smooth bar
        document.getElementById('health-fill').style.width = (Math.round(healthPct / 5) * 5) + '%';
        const comboEl = document.getElementById('combo');
        if (this.combo > 1) {
            comboEl.textContent = `x${this.combo}`;
            comboEl.classList.add('visible');
        } else {
            comboEl.classList.remove('visible');
        }
        const waveEl = document.getElementById('wave-indicator');
        waveEl.textContent = `WAVE ${this.wave}`;
    }

    showWaveBanner(n) {
        const banner = document.getElementById('wave-banner');
        banner.textContent = n % WAVES.BOSS_EVERY === 0 ? `WAVE ${n} — BRUTE INCOMING` : `WAVE ${n}`;
        banner.classList.remove('show');
        // restart the CSS animation
        void banner.offsetWidth;
        banner.classList.add('show');
    }

    startWave(n) {
        this.wave = n;
        this.waveTimer = 0;
        this.scoreMult = 1 + SCORE.WAVE_MULT_STEP * (n - 1);
        this.enemySpawnInterval = Math.max(
            WAVES.SPAWN_INTERVAL_FLOOR,
            WAVES.BASE_SPAWN_INTERVAL - WAVES.SPAWN_INTERVAL_STEP * (n - 1)
        );
        this.showWaveBanner(n);
        this.pendingBurst = Math.min(WAVES.BURST_BASE + n, WAVES.BURST_MAX);
        this.burstTimer = 0;
        this.audio.setMusicTempo(Math.min(160, 132 + 4 * (n - 1)));
        if (n % WAVES.BOSS_EVERY === 0 && !this.enemies.some((e) => e.type === 'brute')) {
            this.enemies.push(spawnEnemy(this, n, 'brute'));
            this.pendingBurst = Math.max(0, this.pendingBurst - 2);
        }
    }

    startGame() {
        this.gameState = 'playing';
        this.score = 0;
        this.combo = 0;
        this.comboTimer = 0;
        this.gameTime = 0;
        this.enemySpawnTimer = 0;
        for (const enemy of this.enemies) enemy.destroy();
        this.enemies = [];
        this.particles.clear();
        this.tweens.resumeAll();
        this.player.reset();
        this.player.setVisible(true);
        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('game-over-screen').classList.add('hidden');
        document.getElementById('pause-screen').classList.add('hidden');
        this.inputHandle.reset();
        this.audio.startMusic();
        this.startWave(1);
    }

    togglePause() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            this.inputHandle.reset();
            this.tweens.pauseAll();
            this.particles.pauseAll();
            this.audio.suspend();
            document.getElementById('pause-screen').classList.remove('hidden');
        } else if (this.gameState === 'paused') {
            this.gameState = 'playing';
            this.tweens.resumeAll();
            this.particles.resumeAll();
            this.audio.resume();
            document.getElementById('pause-screen').classList.add('hidden');
        }
    }

    gameOver() {
        this.gameState = 'gameover';
        this.particles.pauseAll();
        this.audio.stopMusic();
        this.audio.sfx.gameOver();
        this.inputHandle.reset();
        document.getElementById('final-score').textContent = `Score: ${this.score}`;
        const newBest = document.getElementById('new-best');
        if (this.score > this.highScore) {
            this.highScore = this.score;
            this.saveHighScore();
            document.getElementById('best-score').textContent = `BEST ${this.highScore}`;
            newBest.classList.remove('hidden');
        } else {
            newBest.classList.add('hidden');
        }
        document.getElementById('game-over-screen').classList.remove('hidden');
    }

    update(time, delta) {
        // Ambient parallax drift (floored: roundPixels doesn't cover tilePosition)
        this.bgFar.tilePositionX = Math.floor(time * 0.001);
        this.bgNear.tilePositionX = Math.floor(time * 0.003);
        this.city.tilePositionX = Math.floor(time * 0.006);

        if (this.gameState !== 'playing') return;

        this.gameTime += delta;

        // Wave progression
        this.waveTimer += delta;
        if (this.waveTimer >= WAVES.DURATION) {
            this.startWave(this.wave + 1);
        }

        // Steady spawn
        this.enemySpawnTimer += delta;
        if (this.enemySpawnTimer >= this.enemySpawnInterval) {
            this.enemies.push(spawnEnemy(this, this.wave));
            this.enemySpawnTimer = 0;
        }

        // Wave-start burst, dt-driven so it freezes under pause
        if (this.pendingBurst > 0) {
            this.burstTimer -= delta;
            if (this.burstTimer <= 0) {
                this.enemies.push(spawnEnemy(this, this.wave));
                this.pendingBurst--;
                this.burstTimer = WAVES.BURST_STAGGER;
            }
        }

        this.player.update(delta);
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            if (enemy.state === 'dead') {
                enemy.destroy();
                this.enemies.splice(i, 1);
                continue;
            }
            enemy.update(delta, this.player, this);
            if (enemy.x < ENEMY.DESPAWN_X) {
                enemy.destroy();
                this.enemies.splice(i, 1);
            }
        }
        this.updateUI();
    }
}
