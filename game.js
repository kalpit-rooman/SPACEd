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

// --- Game State ---
let gameState = 'start'; // start, playing, gameover
let score = 0;
let combo = 0;
let comboTimer = 0;
let gameTime = 0;
let lastTime = 0;

// --- Input System ---
const HOLD_THRESHOLD = 250; // ms to distinguish hold from tap
const DOUBLE_TAP_WINDOW = 300; // ms for double-tap detection
let spaceDown = false;
let spaceDownTime = 0;
let lastSpaceUpTime = 0;
let inputAction = null; // 'strike', 'parry', 'dodge'

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        if (gameState === 'start') { startGame(); return; }
        if (gameState === 'gameover') { startGame(); return; }
        if (!spaceDown) {
            spaceDown = true;
            spaceDownTime = performance.now();
        }
    }
});

document.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        if (spaceDown) {
            spaceDown = false;
            const holdDuration = performance.now() - spaceDownTime;
            const now = performance.now();

            if (holdDuration >= HOLD_THRESHOLD) {
                // Hold = Parry
                inputAction = 'parry';
                player.startParry();
            } else {
                // Tap — check for double-tap
                if (now - lastSpaceUpTime < DOUBLE_TAP_WINDOW) {
                    // Double-tap = Dodge
                    inputAction = 'dodge';
                    player.startDodge();
                    lastSpaceUpTime = 0;
                } else {
                    // Potential single tap — wait to see if it's a double
                    lastSpaceUpTime = now;
                    inputAction = 'strike';
                    // We'll commit the strike after the double-tap window expires
                    setTimeout(() => {
                        if (lastSpaceUpTime !== 0 && gameState === 'playing') {
                            player.startStrike();
                        }
                    }, DOUBLE_TAP_WINDOW);
                }
            }
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
        if (this.state === 'idle' || this.state === 'striking') {
            this.state = 'striking';
            this.stateTimer = 200;
            this.facing = 1;
        }
    },

    startParry() {
        if (this.state === 'idle') {
            this.state = 'parrying';
            this.stateTimer = 400;
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

    takeDamage(amount) {
        if (this.invincible) return;
        if (this.state === 'parrying') {
            // Parry successful — deflect
            createParticles(this.x, this.y, '#ffffff', 8);
            combo++;
            comboTimer = 2000;
            score += 50 * combo;
            return;
        }
        this.health -= amount;
        this.state = 'hurt';
        this.stateTimer = 300;
        this.invincible = true;
        combo = 0;
        createParticles(this.x, this.y, '#ff4444', 6);
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

        // Body
        ctx.fillStyle = '#ffffff';
        if (this.state === 'parrying') {
            ctx.fillStyle = '#aaaaaa';
            // Shield effect
            ctx.fillRect(-20, -40, 4, 60);
        }

        // Main body
        ctx.fillRect(-this.width / 2, -this.height, this.width, this.height);

        // Strike effect
        if (this.state === 'striking') {
            ctx.fillStyle = '#ffffff';
            const strikeX = this.facing * 25;
            ctx.fillRect(strikeX - 5, -30, 40, 10);
            ctx.fillRect(strikeX + 25, -40, 10, 20);
        }

        // Dodge trail
        if (this.state === 'dodging') {
            ctx.globalAlpha = 0.3;
            ctx.fillRect(-this.width / 2 - this.vx * 2, -this.height, this.width, this.height);
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

        e.state = 'approaching';

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
                    player.takeDamage(e.damage);
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
    }
}

function drawEnemies() {
    for (const e of enemies) {
        ctx.save();
        ctx.translate(e.x, e.y);

        // Windup indicator
        if (e.state === 'attacking' && e.windupTime > 0) {
            ctx.fillStyle = '#ff4444';
            ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 50) * 0.3;
            ctx.fillRect(-5, -e.height - 15, 10, 5);
            ctx.globalAlpha = 1;
        }

        ctx.fillStyle = e.color;

        // Body
        ctx.fillRect(-e.width / 2, -e.height, e.width, e.height);

        // Shield for shielder
        if (e.type === 'shielder') {
            ctx.fillStyle = '#333333';
            ctx.fillRect(12, -35, 6, 40);
        }

        // Eyes
        ctx.fillStyle = '#000000';
        ctx.fillRect(-6, -e.height + 10, 4, 4);
        ctx.fillRect(4, -e.height + 10, 4, 4);

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
    for (const p of particles) {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
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

    // Clear
    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Ground line
    ctx.strokeStyle = '#333333';
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - 50);
    ctx.lineTo(canvas.width, canvas.height - 50);
    ctx.stroke();

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

    // Draw
    drawParticles();
    if (gameState !== 'start') {
        drawEnemies();
        player.draw();
    }

    requestAnimationFrame(gameLoop);
}

// --- Start ---
lastTime = performance.now();
requestAnimationFrame(gameLoop);
