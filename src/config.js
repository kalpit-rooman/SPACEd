// ============================================
// config.js — Central tuning constants
// ============================================

export const CANVAS = {
    maxWidth: 900,
    maxHeight: 600,
    margin: 40,
};

// Vertical offset from bottom where the "ground" plane sits.
export const GROUND_OFFSET = 100;   // player/enemy feet: canvas.height - 100
export const GROUND_LINE_OFFSET = 50; // glowing ground line: canvas.height - 50

// --- Input timing ---
export const INPUT = {
    holdThreshold: 200,   // ms to distinguish hold (parry) from tap (strike)
    doubleTapWindow: 250, // ms window for double-tap (jump) detection
};

// --- Player ---
export const PLAYER = {
    width: 30,
    height: 50,
    maxHealth: 100,
    jumpVelocity: -11,
    gravity: 0.5,
    strikeDuration: 200,   // ms
    hurtDuration: 300,     // ms
    strikeReach: 35,       // horizontal offset of strike hitbox from player
    strikeRangeX: 40,      // hit tolerance in x
    strikeRangeY: 40,      // hit tolerance in y
    strikeDamage: 15,
    invincibleFlashRate: 80,
};

// --- Combat / scoring ---
export const COMBAT = {
    comboTimer: 2000,       // ms a combo stays alive
    killScore: 100,
    parryScoreBase: 50,     // multiplied by combo
    staggerDuration: 1000,  // ms an enemy stays staggered after a parry
};

// --- Enemy type definitions ---
// attack: 'high' → parry it | 'low' → jump it | 'ranged' → fires projectiles
// flying: hovers at head height (must jump-strike to hit / kill)
export const ENEMY_TYPES = {
    charger: { weight: 0.30, health: 20, speed: 1.2, damage: 25, width: 35, height: 55, color: '#888888', attack: 'high', sprite: 'charger' },
    swarmer: { weight: 0.30, health: 10, speed: 2.5, damage: 10, width: 25, height: 45, color: '#666666', attack: 'low', sprite: 'swarmer' },
    shielder: { weight: 0.18, health: 30, speed: 1.5, damage: 15, width: 25, height: 45, color: '#555555', attack: 'high', sprite: 'shielder' },
    flyer: { weight: 0.12, health: 12, speed: 2.0, damage: 12, width: 28, height: 30, color: '#7755aa', attack: 'high', sprite: 'swarmer', flying: true, flyHeight: 95 },
    shooter: { weight: 0.10, health: 14, speed: 1.0, damage: 12, width: 26, height: 46, color: '#557799', attack: 'ranged', sprite: 'shielder', keepDistance: 240, fireInterval: 1800 },
};

// Enemy types allowed to spawn before the first few waves (eased introduction).
export const EARLY_TYPES = ['charger', 'swarmer', 'shielder'];

// --- Projectiles ---
export const PROJECTILE = {
    speed: 4.5,
    radius: 8,
    height: 34,   // fired at chest height (offset above ground) — jump to avoid
    damage: 12,
};

// --- Waves & progression ---
export const WAVES = {
    baseCount: 4,        // enemies in wave 1
    countPerWave: 1.5,   // added per wave
    maxCount: 20,
    spawnGap: 900,       // ms between spawns within a wave
    breather: 2600,      // ms between waves
    bossEvery: 5,        // every Nth wave is a boss
};

// --- Boss ---
export const BOSS = {
    health: 600,
    width: 90,
    height: 120,
    speed: 0.7,
    contactDamage: 20,
    scoreReward: 2000,
    projectileVolley: 3,
};

// --- Power-ups ---
export const POWERUP = {
    dropChance: 0.18,      // per kill
    fallSpeed: 2,
    lifetime: 9000,        // ms before it expires on the ground
    collectRange: 34,
    heal: 30,
    damageMult: 2,
    damageDuration: 8000,  // ms
    slowScale: 0.5,
    slowDuration: 5000,    // ms
};

// Enemy attack behaviour
export const ENEMY_ATTACK = {
    range: 60,        // distance at which an enemy commits to an attack
    windup: 300,      // ms telegraph before damage lands
    duration: 500,    // ms total attack state
    cooldown: 1500,   // ms before it can attack again
    hitRangeX: 70,
    hitRangeY: 60,
};

// --- Screen shake presets (intensity, durationMs) ---
export const SHAKE = {
    hit: [5, 100],
    playerHurt: [12, 300],
    parry: [8, 150],
    block: [2, 50],
};

// Maximum delta-time per frame (ms). Prevents physics blowups after tab-out/lag.
export const MAX_DT = 50;
