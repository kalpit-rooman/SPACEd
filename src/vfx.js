// ============================================
// vfx.js — Screen shake, hit-stop, flash, damage numbers, shockwaves
// ============================================
import { canvas, ctx } from './core.js';

// --- Screen shake ---
let shakeTime = 0;
let shakeIntensity = 0;

export function triggerShake(intensity, duration) {
    if (duration > shakeTime || intensity > shakeIntensity) {
        shakeIntensity = intensity;
        shakeTime = duration;
    }
}

export function updateShake(dt) {
    if (shakeTime > 0) shakeTime -= dt;
}

export function applyShake() {
    if (shakeTime > 0) {
        const dx = (Math.random() - 0.5) * shakeIntensity;
        const dy = (Math.random() - 0.5) * shakeIntensity;
        ctx.translate(dx, dy);
    }
}

// --- Hit-stop (brief global freeze on impactful moments) ---
let freezeTime = 0;

export function hitStop(ms) {
    if (ms > freezeTime) freezeTime = ms;
}

// Returns true while gameplay should be frozen. Consumes dt.
export function updateHitStop(dt) {
    if (freezeTime > 0) {
        freezeTime -= dt;
        return true;
    }
    return false;
}

// --- Full-screen flash ---
let flash = { time: 0, dur: 0, color: '#ffffff', max: 0.35 };

export function screenFlash(color, ms, max = 0.3) {
    flash = { time: ms, dur: ms, color, max };
}

// --- Floating damage numbers ---
let damageNumbers = [];

export function spawnDamageNumber(x, y, text, color = '#ffffff', big = false) {
    damageNumbers.push({ x, y, text: String(text), color, life: 1, vy: -0.6, size: big ? 22 : 15 });
}

// --- Expanding shockwave rings ---
let shockwaves = [];

export function spawnShockwave(x, y, maxR, color) {
    shockwaves.push({ x, y, r: 4, maxR, color, life: 1 });
}

export function resetVfx() {
    damageNumbers = [];
    shockwaves = [];
    flash.time = 0;
    freezeTime = 0;
    shakeTime = 0;
}

// VFX animate on their own timeline (unaffected by hit-stop).
export function updateVfx(dt) {
    if (flash.time > 0) flash.time -= dt;

    for (let i = damageNumbers.length - 1; i >= 0; i--) {
        const d = damageNumbers[i];
        d.y += d.vy;
        d.vy *= 0.94;
        d.life -= dt / 700;
        if (d.life <= 0) damageNumbers.splice(i, 1);
    }

    for (let i = shockwaves.length - 1; i >= 0; i--) {
        const w = shockwaves[i];
        w.life -= dt / 350;
        w.r = w.maxR * (1 - w.life);
        if (w.life <= 0) shockwaves.splice(i, 1);
    }
}

// Drawn in world space (inside the shake transform).
export function drawWorldVfx() {
    ctx.save();
    for (const w of shockwaves) {
        ctx.globalAlpha = Math.max(0, w.life) * 0.8;
        ctx.strokeStyle = w.color;
        ctx.lineWidth = 3 * w.life + 0.5;
        ctx.shadowColor = w.color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2);
        ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.textAlign = 'center';
    for (const d of damageNumbers) {
        ctx.globalAlpha = Math.max(0, d.life);
        ctx.fillStyle = d.color;
        ctx.shadowColor = d.color;
        ctx.shadowBlur = 8;
        ctx.font = `bold ${d.size}px Orbitron, sans-serif`;
        ctx.fillText(d.text, d.x, d.y);
    }
    ctx.restore();
}

// Drawn in screen space (outside the shake transform), on top of everything.
export function drawScreenVfx() {
    if (flash.time > 0) {
        ctx.save();
        ctx.globalAlpha = (flash.time / flash.dur) * flash.max;
        ctx.fillStyle = flash.color;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    }
}
