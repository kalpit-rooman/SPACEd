// ============================================
// vfx.js — Screen shake (extended with more juice in Phase B)
// ============================================
import { ctx } from './core.js';

let shakeTime = 0;
let shakeIntensity = 0;

export function triggerShake(intensity, duration) {
    // Don't let a weaker shake overwrite a stronger active one.
    if (duration > shakeTime || intensity > shakeIntensity) {
        shakeIntensity = intensity;
        shakeTime = duration;
    }
}

export function updateShake(dt) {
    if (shakeTime > 0) shakeTime -= dt;
}

// Apply the current shake as a canvas translation. Caller is responsible
// for ctx.save()/ctx.restore() around the frame.
export function applyShake() {
    if (shakeTime > 0) {
        const dx = (Math.random() - 0.5) * shakeIntensity;
        const dy = (Math.random() - 0.5) * shakeIntensity;
        ctx.translate(dx, dy);
    }
}
