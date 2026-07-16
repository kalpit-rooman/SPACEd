// Code-generated pixel background textures: two tiling starfield layers, a
// dithered planet, a city skyline silhouette and the ground strip.
import { PALETTE } from './pixelArt.js';

function makeCanvas(w, h) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    return canvas;
}

function px(ctx, x, y, colorKey, w = 1, h = 1) {
    ctx.fillStyle = PALETTE[colorKey];
    ctx.fillRect(x, y, w, h);
}

function starsTexture(scene, key, count, bright) {
    const canvas = makeCanvas(128, 128);
    const ctx = canvas.getContext('2d');
    for (let i = 0; i < count; i++) {
        const x = Math.floor(Math.random() * 128);
        const y = Math.floor(Math.random() * 128);
        const r = Math.random();
        if (bright && r > 0.85) {
            px(ctx, x, y, r > 0.93 ? 'M' : 'C', 2, 2);
        } else if (r > 0.6) {
            px(ctx, x, y, 'g');
        } else if (r > 0.3) {
            px(ctx, x, y, 'c');
        } else {
            px(ctx, x, y, 'D');
        }
    }
    scene.textures.addCanvas(key, canvas);
}

function planetTexture(scene) {
    const S = 56;
    const canvas = makeCanvas(S, S);
    const ctx = canvas.getContext('2d');
    const cx = S / 2 - 0.5;
    const cy = S / 2 - 0.5;
    const R = 24;
    for (let y = 0; y < S; y++) {
        for (let x = 0; x < S; x++) {
            const dx = x - cx;
            const dy = y - cy;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d > R) continue;
            if (d > R - 1.5) {
                px(ctx, x, y, 'L'); // rim highlight
            } else if (dx + dy > 14) {
                // terminator shadow with checkerboard dither
                px(ctx, x, y, (x + y) % 2 === 0 ? 'D' : 'P');
            } else {
                px(ctx, x, y, 'P');
            }
        }
    }
    // faint ring
    for (let x = 2; x < S - 2; x++) {
        const y = Math.round(cy + (x - cx) * 0.22);
        const dx = x - cx;
        if (Math.abs(dx) > R + 1 || dx < -6) px(ctx, x, y, 'm');
    }
    scene.textures.addCanvas('bg-planet', canvas);
}

function cityTexture(scene) {
    const W = 112;
    const H = 48;
    const canvas = makeCanvas(W, H);
    const ctx = canvas.getContext('2d');
    let x = 0;
    while (x < W) {
        const bw = 6 + Math.floor(Math.random() * 10);
        const bh = 12 + Math.floor(Math.random() * 30);
        const top = H - bh;
        px(ctx, x, top, 'K', Math.min(bw, W - x), bh);
        // lit face on the left edge
        px(ctx, x, top, 'D', 1, bh);
        // sparse windows
        for (let wy = top + 2; wy < H - 2; wy += 3) {
            for (let wx = x + 1; wx < Math.min(x + bw, W) - 1; wx += 3) {
                const r = Math.random();
                if (r > 0.82) px(ctx, wx, wy, r > 0.94 ? 'M' : (r > 0.88 ? 'Y' : 'C'));
            }
        }
        // antenna
        if (bh > 30 && Math.random() > 0.5) {
            px(ctx, x + Math.floor(bw / 2), top - 4, 'K', 1, 4);
            px(ctx, x + Math.floor(bw / 2), top - 5, 'R');
        }
        x += bw;
    }
    scene.textures.addCanvas('bg-city', canvas);
}

function groundTexture(scene) {
    const canvas = makeCanvas(16, 8);
    const ctx = canvas.getContext('2d');
    px(ctx, 0, 0, 'M', 16, 1);
    px(ctx, 0, 1, 'm', 16, 1);
    for (let y = 2; y < 8; y++) {
        for (let x = 0; x < 16; x++) {
            px(ctx, x, y, (x + y) % 3 === 0 ? 'D' : 'K');
        }
    }
    scene.textures.addCanvas('bg-ground', canvas);
}

export function createBackgroundTextures(scene) {
    starsTexture(scene, 'bg-stars-far', 40, false);
    starsTexture(scene, 'bg-stars-near', 22, true);
    planetTexture(scene);
    cityTexture(scene);
    groundTexture(scene);
}
