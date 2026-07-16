// Chunky pixel-square burst particles. The game bursts three fixed colors, so
// each gets its own fixed-tint emitter rather than retinting a shared one.
const TEXTURE_KEY = 'particleSquare';

export const PARTICLE_COLORS = Object.freeze({
    white: 0xffffff,
    blue: 0x3d6dff,
    red: 0xff3355
});

const COLORS = Object.values(PARTICLE_COLORS);

function baseConfig(tint) {
    return {
        speedX: { min: -90, max: 90 },
        speedY: { min: -150, max: 30 },
        gravityY: 180,
        lifespan: 500,
        scale: { min: 1, max: 3 },
        alpha: { start: 1, end: 0 },
        tint,
        blendMode: 'NORMAL',
        emitting: false
    };
}

export function createParticleSystem(scene) {
    if (!scene.textures.exists(TEXTURE_KEY)) {
        const g = scene.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0xffffff, 1);
        g.fillRect(0, 0, 2, 2);
        g.generateTexture(TEXTURE_KEY, 2, 2);
        g.destroy();
    }

    const emitters = new Map();
    for (const color of COLORS) {
        emitters.set(color, scene.add.particles(0, 0, TEXTURE_KEY, baseConfig(color)));
    }
    const fallback = emitters.get(COLORS[0]);

    return {
        spawn(x, y, color, count) {
            const emitter = emitters.get(color) || fallback;
            emitter.explode(count, x, y);
        },
        pauseAll() {
            for (const emitter of emitters.values()) emitter.pause();
        },
        resumeAll() {
            for (const emitter of emitters.values()) emitter.resume();
        },
        clear() {
            for (const emitter of emitters.values()) {
                emitter.resume();
                emitter.killAll();
            }
        }
    };
}
