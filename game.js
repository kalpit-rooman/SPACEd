// ============================================
// SPACEd — One-Button 2D Action Game
// Tap = Strike | Hold = Parry | Double-tap = Dodge
// ============================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- Canvas Setup ---
function resizeCanvas() {
    canvas.width = Math.min(window.innerWidth - 40, 900);
    canvas.height = Math.min(window.innerHeight - 40, 600);
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// --- Asset Loader ---
const images = {};
const assetSources = {
    background: 'space_background.png',
    player: 'player_sprite.png',
    swarmer: 'swarmer_sprite.png',
    charger: 'charger_sprite.png',
    shielder: 'shielder_sprite.png'
};

let assetsLoaded = 0;
const totalAssets = Object.keys(assetSources).length;
let assetsReady = false;

function loadAssets(callback) {
    for (let key in assetSources) {
        const img = new Image();
        img.src = assetSources[key];
        img.onload = () => {
            assetsLoaded++;
            if (assetsLoaded === totalAssets) {
                assetsReady = true;
                callback();
            }
        };
        img.onerror = () => {
            console.error('Failed to load asset:', assetSources[key]);
            assetsLoaded++;
            if (assetsLoaded === totalAssets) {
                assetsReady = true;
                callback();
            }
        };
        images[key] = img;
    }
}

// --- Screen Shake ---
let shakeTime = 0;
let shakeIntensity = 0;

function triggerShake(intensity, duration) {
    shakeIntensity = intensity;
    shakeTime = duration;
}

function updateShake(dt) {
    if (shakeTime > 0) {
        shakeTime -= dt;
    }
}

// --- Game State ---
let gameState = 'start'; // start, playing, gameover
let score = 0;
let combo = 0;
let comboTimer = 0;
let gameTime = 0;
let lastTime = 0;

// --- Input System ---
const HOLD_THRESHOLD = 200; // ms to distinguish hold from tap
const DOUBLE_TAP_WINDOW = 250; // ms for double-tap detection
let spaceDown = false;
let spaceDownTime = 0;
let lastSpaceUpTime = 0;
let holdTimeout = null;
let isStrikeActive = false;

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        if (gameState === 'start') { startGame(); return; }
        if (gameState === 'gameover') { startGame(); return; }
        if (e.repeat) return; // ignore auto-repeat keydowns
        if (!spaceDown) {
            spaceDown = true;
            const now = performance.now();
            spaceDownTime = now;

            // Double tap space (strike)
            if (now - lastSpaceUpTime < DOUBLE_TAP_WINDOW) {
                player.startStrike();
                lastSpaceUpTime = 0;
                isStrikeActive = true;
            } else {
                isStrikeActive = false;
                // Schedule hold parry
                holdTimeout = setTimeout(() => {
                    if (spaceDown && !isStrikeActive && gameState === 'playing') {
                        player.startParry();
                    }
                }, HOLD_THRESHOLD);
            }
        }
    }
});

document.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        if (spaceDown) {
            spaceDown = false;
            clearTimeout(holdTimeout);
            const now = performance.now();

            if (player.state === 'parrying') {
                player.stopParry();
            } else if (!isStrikeActive && gameState === 'playing') {
                player.jump();
                lastSpaceUpTime = now;
            }
            isStrikeActive = false;
        }
    }
});

// --- Player ---
const player = {
    x: 0,
    y: 0,
    width: 30,
    height: 50,
    health: 100,
    maxHealth: 100,
    speed: 0,
    vx: 0,
    vy: 0,
    grounded: true,
    state: 'idle', // idle, striking, parrying, dodging, hurt
    stateTimer: 0,
    invincible: false,
    facing: 1, // 1 = right, -1 = left

    reset() {
        this.x = canvas.width * 0.25;
        this.y = canvas.height - 100;
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
            this.stateTimer = 200;
            this.facing = 1;
        }
    },

    startParry() {
        if (this.state === 'idle' || this.state === 'striking') {
            this.state = 'parrying';
            this.stateTimer = 0; // sustain parry until keyup
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
            this.vy = -11;
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
            this.stateTimer = 300;
            this.invincible = true;
            this.vx = this.facing * 8;
        }
    },

    takeDamage(amount, sourceEnemy) {
        if (this.invincible) return;
        if (this.state === 'parrying') {
            // Parry successful — deflect
            createParticles(this.x, this.y, '#ffffff', 8);
            combo++;
            comboTimer = 2000;
            score += 50 * combo;
            if (sourceEnemy) {
                sourceEnemy.state = 'staggered';
                sourceEnemy.stateTimer = 1000; // stagger duration
                createParticles(sourceEnemy.x, sourceEnemy.y - 20, '#5599ff', 6); // blue sparks on stagger
            }
            triggerShake(8, 150);
            return;
        }
        this.health -= amount;
        this.state = 'hurt';
        this.stateTimer = 300;
        this.invincible = true;
        combo = 0;
        createParticles(this.x, this.y, '#ff4444', 6);
        triggerShake(12, 300);
        if (this.health <= 0) {
            gameOver();
        }
    },

    update(dt) {
        // State timer
        if (this.stateTimer > 0) {
            this.stateTimer -= dt;
            if (this.stateTimer <= 0) {
                this.state = 'idle';
                this.invincible = false;
                this.vx = 0;
            }
        }

        // Dodge velocity
        if (this.state === 'dodging') {
            this.x += this.vx;
            this.vx *= 0.9;
        }

        // Gravity
        if (!this.grounded) {
            this.vy += 0.5;
            this.y += this.vy;
            if (this.y >= canvas.height - 100) {
                this.y = canvas.height - 100;
                this.vy = 0;
                this.grounded = true;
            }
        }

        // Bounds
        this.x = Math.max(20, Math.min(canvas.width - 20, this.x));

        // Combo timer
        if (comboTimer > 0) {
            comboTimer -= dt;
            if (comboTimer <= 0) combo = 0;
        }
    },

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);

        // Flash when invincible
        if (this.invincible && Math.floor(Date.now() / 80) % 2) {
            ctx.globalAlpha = 0.4;
        }

        // Render player sprite using image
        if (images.player) {
            ctx.save();
            ctx.scale(this.facing, 1);
            // Draw player sprite centered horizontally and bottom-aligned
            ctx.drawImage(images.player, -25, -55, 50, 55);
            ctx.restore();
        } else {
            // Fallback drawing
            ctx.fillStyle = '#00f0ff';
            ctx.fillRect(-this.width / 2, -this.height, this.width, this.height);
        }

        // Neon Strike Slash wave
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

        // Neon Parry energy barrier
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

        // Movement trail when in air / moving fast
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
    }
};

// --- Enemies ---
let enemies = [];
let enemySpawnTimer = 0;
let enemySpawnInterval = 2000;

function spawnEnemy() {
    const types = ['charger', 'swarmer', 'shielder'];
    const weights = [0.4, 0.4, 0.2];
    const rand = Math.random();
    let type = types[0];
    let cumulative = 0;
    for (let i = 0; i < types.length; i++) {
        cumulative += weights[i];
        if (rand < cumulative) { type = types[i]; break; }
    }

    const enemy = {
        type,
        x: canvas.width + 30,
        y: canvas.height - 100,
        width: 25,
        height: 45,
        health: type === 'shielder' ? 30 : type === 'charger' ? 20 : 10,
        speed: type === 'swarmer' ? 2.5 : type === 'charger' ? 1.2 : 1.5,
        state: 'approaching', // approaching, attacking, hurt, dead
        stateTimer: 0,
        attackCooldown: 0,
        windupTime: 0,
        color: type === 'charger' ? '#888888' : type === 'swarmer' ? '#666666' : '#555555',
        damage: type === 'charger' ? 25 : type === 'swarmer' ? 10 : 15,
    };

    if (type === 'charger') {
        enemy.y = canvas.height - 110;
        enemy.height = 55;
        enemy.width = 35;
    }

    enemies.push(enemy);
}

function updateEnemies(dt) {
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];

        if (e.state === 'dead') {
            enemies.splice(i, 1);
            continue;
        }

        // Spawn from right
        if (e.x > canvas.width - 50) {
            e.x -= 2;
            continue;
        }

        // Staggered state handling
        if (e.state === 'staggered') {
            e.stateTimer -= dt;
            if (e.stateTimer <= 0) {
                e.state = 'approaching';
            }
            if (e.attackCooldown > 0) e.attackCooldown -= dt;

            // Staggered enemies can still be hit and cannot block
            if (player.state === 'striking') {
                const strikeX = player.x + player.facing * 35;
                if (Math.abs(e.x - strikeX) < 40 && Math.abs(e.y - player.y + 25) < 40) {
                    e.health -= 15;
                    createParticles(e.x, e.y - 20, '#ffffff', 4);
                    if (e.health <= 0) {
                        e.state = 'dead';
                        score += 100;
                        combo++;
                        comboTimer = 2000;
                    }
                }
            }

            // Remove if off screen left
            if (e.x < -50) {
                enemies.splice(i, 1);
            }
            continue;
        }

        if (e.state !== 'attacking' && e.state !== 'hurt') {
            e.state = 'approaching';
        }

        // Move toward player
        const dx = player.x - e.x;
        const dist = Math.abs(dx);

        // Attack range
        if (dist < 60 && e.attackCooldown <= 0) {
            e.state = 'attacking';
            e.stateTimer = 500;
            e.windupTime = 300;
            e.attackCooldown = 1500;
        }

        if (e.state === 'approaching') {
            e.x += (dx > 0 ? 1 : -1) * e.speed;
        }

        if (e.state === 'attacking') {
            e.stateTimer -= dt;
            e.windupTime -= dt;
            if (e.windupTime <= 0 && e.stateTimer > 0) {
                // Deal damage
                if (Math.abs(player.x - e.x) < 70 && Math.abs(player.y - e.y) < 60) {
                    player.takeDamage(e.damage, e);
                }
                e.state = 'idle';
            }
            if (e.stateTimer <= 0) {
                e.state = 'approaching';
            }
        }

        if (e.attackCooldown > 0) e.attackCooldown -= dt;

        // Check if hit by player strike
        if (player.state === 'striking') {
            const strikeX = player.x + player.facing * 35;
            if (Math.abs(e.x - strikeX) < 40 && Math.abs(e.y - player.y + 25) < 40) {
                // Shielders block frontal strikes when not staggered (player is to the left of the enemy)
                if (e.type === 'shielder' && player.x < e.x) {
                    if (Math.floor(Date.now() / 80) % 2 === 0) {
                        createParticles(e.x - 12, e.y - 20, '#5599ff', 3); // blue block sparks
                        triggerShake(2, 50); // subtle block shake
                    }
                } else {
                    e.health -= 15;
                    createParticles(e.x, e.y - 20, '#ffffff', 4);
                    triggerShake(5, 100); // hit shake
                    if (e.health <= 0) {
                        e.state = 'dead';
                        score += 100;
                        combo++;
                        comboTimer = 2000;
                    }
                }
            }
        }

        // Remove if off screen left
        if (e.x < -50) {
            enemies.splice(i, 1);
        }
    }
}

function drawEnemies() {
    for (const e of enemies) {
        ctx.save();
        ctx.translate(e.x, e.y);

        // Neon warning indicator for attacks
        if (e.state === 'attacking' && e.windupTime > 0) {
            ctx.fillStyle = '#ff0055';
            ctx.globalAlpha = 0.6 + Math.sin(Date.now() / 30) * 0.3;
            ctx.shadowColor = '#ff0055';
            ctx.shadowBlur = 10;
            ctx.font = 'bold 20px Orbitron';
            ctx.textAlign = 'center';
            ctx.fillText('!', 0, -e.height - 12);
            ctx.globalAlpha = 1;
            ctx.shadowBlur = 0; // reset
        }

        // Draw enemy sprites with horizontal flip
        ctx.save();
        ctx.scale(-1, 1); // Flip horizontally so they face left toward the player
        if (e.type === 'swarmer' && images.swarmer) {
            ctx.drawImage(images.swarmer, -e.width/2 - 10, -e.height - 5, e.width + 20, e.height + 10);
        } else if (e.type === 'charger' && images.charger) {
            ctx.drawImage(images.charger, -e.width/2 - 15, -e.height - 10, e.width + 30, e.height + 15);
        } else if (e.type === 'shielder' && images.shielder) {
            ctx.drawImage(images.shielder, -e.width/2 - 10, -e.height - 5, e.width + 20, e.height + 10);
        } else {
            // Fallback drawing
            ctx.fillStyle = e.color;
            ctx.fillRect(-e.width / 2, -e.height, e.width, e.height);
        }
        ctx.restore();

        // Glowing shield overlay for shielder
        if (e.type === 'shielder') {
            ctx.save();
            ctx.strokeStyle = '#00f0ff';
            ctx.lineWidth = 3.5;
            ctx.shadowColor = '#00f0ff';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            if (e.state === 'staggered') {
                // Lowered/Staggered shield
                ctx.translate(-15, -15);
                ctx.rotate(-Math.PI / 4);
                ctx.arc(0, -e.height / 2, 24, Math.PI / 2, 3 * Math.PI / 2);
            } else {
                // Active shield blocking the front (left)
                ctx.arc(-15, -e.height / 2, 24, Math.PI / 2, 3 * Math.PI / 2);
            }
            ctx.stroke();
            ctx.restore();
        }

        ctx.restore();
    }
}

// --- Particles ---
let particles = [];

function createParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x, y,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6 - 2,
            life: 1,
            color,
            size: Math.random() * 4 + 2,
        });
    }
}

function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1;
        p.life -= dt / 500;
        if (p.life <= 0) particles.splice(i, 1);
    }
}

function drawParticles() {
    ctx.save();
    for (const p of particles) {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.restore();
}

// --- UI ---
function updateUI() {
    document.getElementById('score').textContent = score;
    document.getElementById('health-fill').style.width = (player.health / player.maxHealth * 100) + '%';
    const comboEl = document.getElementById('combo');
    if (combo > 1) {
        comboEl.textContent = `x${combo}`;
        comboEl.classList.add('visible');
    } else {
        comboEl.classList.remove('visible');
    }
}

// --- Game Loop ---
function startGame() {
    gameState = 'playing';
    score = 0;
    combo = 0;
    gameTime = 0;
    enemies = [];
    particles = [];
    enemySpawnTimer = 0;
    player.reset();
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');
}

function gameOver() {
    gameState = 'gameover';
    document.getElementById('final-score').textContent = `Score: ${score}`;
    document.getElementById('game-over-screen').classList.remove('hidden');
}

function gameLoop(timestamp) {
    const dt = timestamp - lastTime;
    lastTime = timestamp;

    updateShake(dt);

    ctx.save();
    // Apply screen shake
    if (shakeTime > 0) {
        const dx = (Math.random() - 0.5) * shakeIntensity;
        const dy = (Math.random() - 0.5) * shakeIntensity;
        ctx.translate(dx, dy);
    }

    // Draw space background image
    if (images.background) {
        ctx.drawImage(images.background, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = '#0a0914';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Glowing ground line
    ctx.save();
    ctx.strokeStyle = '#ff007f';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#ff007f';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - 50);
    ctx.lineTo(canvas.width, canvas.height - 50);
    ctx.stroke();
    ctx.restore();

    if (gameState === 'playing') {
        gameTime += dt;

        // Difficulty scaling
        enemySpawnInterval = Math.max(600, 2000 - gameTime / 1000 * 50);
        enemySpawnTimer += dt;
        if (enemySpawnTimer >= enemySpawnInterval) {
            spawnEnemy();
            enemySpawnTimer = 0;
        }

        player.update(dt);
        updateEnemies(dt);
        updateParticles(dt);
        updateUI();
    }

    // Draw game entities
    drawParticles();
    if (gameState !== 'start') {
        drawEnemies();
        player.draw();
    }

    ctx.restore(); // restore from shake translation

    requestAnimationFrame(gameLoop);
}

// --- Start ---
loadAssets(() => {
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
});
