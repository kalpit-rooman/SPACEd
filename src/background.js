// ============================================
// background.js — Static backdrop + procedural parallax starfield
// ============================================
import { canvas, ctx } from './core.js';
import { images } from './assets.js';
import { GROUND_LINE_OFFSET } from './config.js';

// Three depth layers: far (dim, slow, small) → near (bright, fast, big).
const LAYERS = [
    { count: 60, speed: 0.08, size: [0.5, 1.2], alpha: 0.35, twinkle: false },
    { count: 40, speed: 0.20, size: [1.0, 1.8], alpha: 0.6, twinkle: true },
    { count: 20, speed: 0.45, size: [1.4, 2.6], alpha: 0.9, twinkle: true },
];

let layers = [];
let builtFor = { w: 0, h: 0 };

function rand(min, max) { return min + Math.random() * (max - min); }

function build() {
    layers = LAYERS.map(def => ({
        def,
        stars: Array.from({ length: def.count }, () => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: rand(def.size[0], def.size[1]),
            phase: Math.random() * Math.PI * 2,
            hue: Math.random() < 0.15 ? '#9fd8ff' : (Math.random() < 0.1 ? '#ffd6f0' : '#ffffff'),
        })),
    }));
    builtFor = { w: canvas.width, h: canvas.height };
}

export function updateBackground(dt) {
    if (builtFor.w !== canvas.width || builtFor.h !== canvas.height) build();
    for (const layer of layers) {
        const dx = layer.def.speed * dt * 0.06;
        for (const s of layer.stars) {
            s.x -= dx;
            if (s.x < -3) { s.x = canvas.width + 3; s.y = Math.random() * canvas.height; }
        }
    }
}

export function drawBackground() {
    // Static space image (falls back to flat fill).
    if (images.background) {
        ctx.drawImage(images.background, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = '#0a0914';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Parallax stars over the backdrop.
    ctx.save();
    const t = Date.now() / 600;
    for (const layer of layers) {
        for (const s of layer.stars) {
            let a = layer.def.alpha;
            if (layer.def.twinkle) a *= 0.55 + 0.45 * Math.sin(t + s.phase);
            ctx.globalAlpha = a;
            ctx.fillStyle = s.hue;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.restore();

    // Glowing ground line.
    ctx.save();
    ctx.strokeStyle = '#ff007f';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#ff007f';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - GROUND_LINE_OFFSET);
    ctx.lineTo(canvas.width, canvas.height - GROUND_LINE_OFFSET);
    ctx.stroke();
    ctx.restore();
}
