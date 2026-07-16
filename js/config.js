// Central balance & tuning. All spatial values are in the 450x300 internal
// pixel-art resolution (displayed at up to 2x via Scale.FIT).

export const GAME = Object.freeze({
    WIDTH: 450,
    HEIGHT: 300,
    GROUND_Y_OFFSET: 25 // ground strip top, from bottom of screen
});

export const INPUT = Object.freeze({
    HOLD_THRESHOLD: 200,      // ms held before parry starts
    DOUBLE_TAP_WINDOW: 180,   // ms after release in which a second press = jump
    TOUCH_MOUSE_GUARD: 400    // ms to ignore mouse events after a touch event
});

export const PLAYER = Object.freeze({
    MAX_HEALTH: 100,
    GROUND_OFFSET: 27,        // player.y = height - GROUND_OFFSET (feet on the ground strip)
    GRAVITY: 0.25,
    JUMP_VELOCITY: -5.5,
    WIDTH: 16,
    HEIGHT: 24,
    STRIKE_DURATION: 200,
    STRIKE_DAMAGE: 15,
    STRIKE_OFFSET: 18,        // strike hitbox center = player.x + facing * offset
    STRIKE_HIT_RANGE: 20,
    STRIKE_HIT_Y: 12,
    HURT_DURATION: 300,
    MIN_X: 10
});

export const ENEMY = Object.freeze({
    TYPE_STATS: {
        swarmer:  { health: 10,  speed: 1.25, damage: 10, width: 13, height: 22 },
        charger:  { health: 20,  speed: 0.6,  damage: 25, width: 18, height: 28 },
        shielder: { health: 30,  speed: 0.75, damage: 15, width: 13, height: 22 },
        flyer:    { health: 15,  speed: 0.9,  damage: 15, width: 16, height: 14,
                    hoverHeight: 80, diveRange: 70, diveSpeed: 3.5, diveWindup: 400,
                    recoverTime: 600, cooldown: 2000 },
        brute:    { health: 150, speed: 0.45, damage: 30, width: 28, height: 40,
                    windup: 500, cooldown: 2200, attackRange: 40, staggerDuration: 2000 }
    },
    ATTACK_RANGE: 30,
    ATTACK_HIT_X: 35,
    ATTACK_HIT_Y: 30,
    WINDUP: 300,
    ATTACK_ACTIVE: 500,
    COOLDOWN: 1500,
    STAGGER_DURATION: 1000,
    DESPAWN_X: -25,
    SLIDE_IN_MARGIN: 25,
    SLIDE_SPEED: 1,
    SPAWN_X_OFFSET: 16
});

export const SCORE = Object.freeze({
    KILL: 100,
    PARRY_BASE: 50,
    BOSS_KILL: 500,
    COMBO_TIMEOUT: 2000,
    WAVE_MULT_STEP: 0.25 // score multiplier = 1 + step * (wave - 1)
});

export const WAVES = Object.freeze({
    DURATION: 30000,
    BOSS_EVERY: 3,
    BASE_SPAWN_INTERVAL: 2000,
    SPAWN_INTERVAL_STEP: 120,
    SPAWN_INTERVAL_FLOOR: 700,
    HP_MULT_STEP: 0.10,
    SPEED_MULT_STEP: 0.05,
    SPEED_MULT_CAP: 1.5,
    BURST_BASE: 2,
    BURST_MAX: 6,
    BURST_STAGGER: 300,
    // Picked by the highest minWave <= current wave
    WEIGHTS: [
        { minWave: 1, w: { swarmer: 0.55, charger: 0.35, shielder: 0.10, flyer: 0.00 } },
        { minWave: 3, w: { swarmer: 0.40, charger: 0.30, shielder: 0.15, flyer: 0.15 } },
        { minWave: 5, w: { swarmer: 0.30, charger: 0.30, shielder: 0.20, flyer: 0.20 } },
        { minWave: 8, w: { swarmer: 0.25, charger: 0.30, shielder: 0.20, flyer: 0.25 } }
    ]
});

export const STORAGE_KEYS = Object.freeze({
    HIGH_SCORE: 'spaced.highscore',
    MUTED: 'spaced.muted'
});
