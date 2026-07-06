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
    dodgeDuration: 300,    // ms
    dodgeSpeed: 8,
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

// --- Enemy spawning ---
export const SPAWN = {
    baseInterval: 2000,     // ms between spawns at start
    minInterval: 600,       // fastest spawn interval
    rampPerSecond: 50,      // interval reduction per second of play
};

// --- Enemy type definitions ---
export const ENEMY_TYPES = {
    charger: { weight: 0.4, health: 20, speed: 1.2, damage: 25, width: 35, height: 55, color: '#888888' },
    swarmer: { weight: 0.4, health: 10, speed: 2.5, damage: 10, width: 25, height: 45, color: '#666666' },
    shielder: { weight: 0.2, health: 30, speed: 1.5, damage: 15, width: 25, height: 45, color: '#555555' },
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
