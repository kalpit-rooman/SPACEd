// Code-generated pixel-art sprite sheets. Every frame is authored as a string
// grid (1 char = 1 px) against a shared 16-color palette, drawn to an
// offscreen canvas at boot and registered as a Phaser sprite sheet.
// All characters are drawn facing RIGHT; runtime flipping uses setFlipX.

export const PALETTE = {
    '.': null,        // transparent
    'K': '#0d0a1a',   // outline / near-black
    'D': '#241a3d',   // dark purple
    'P': '#453070',   // purple
    'L': '#7a5fc0',   // light purple
    'C': '#00f0ff',   // neon cyan
    'c': '#0e7a8f',   // dark cyan
    'M': '#ff007f',   // neon magenta
    'm': '#8f1a55',   // dark magenta
    'W': '#ffffff',
    'G': '#c7cfdf',   // light grey
    'g': '#667090',   // grey
    'Y': '#ffd75e',   // yellow
    'O': '#ff8a3d',   // orange
    'R': '#ff3355',   // red
    'B': '#3d6dff'    // blue
};

// 'A'/'a' in grids are abstract accent slots, resolved per sprite type.
const ACCENTS = {
    player:   { A: 'C', a: 'c' },
    swarmer:  { A: 'M', a: 'm' },
    charger:  { A: 'O', a: 'R' },
    shielder: { A: 'B', a: 'c' },
    flyer:    { A: 'Y', a: 'O' },
    brute:    { A: 'R', a: 'm' }
};

function drawGrid(ctx, grid, ox, oy, frameW, accents) {
    for (let y = 0; y < grid.length; y++) {
        const row = grid[y];
        for (let x = 0; x < row.length && x < frameW; x++) {
            let ch = row[x];
            if (ch === 'A' || ch === 'a') ch = accents[ch];
            const color = PALETTE[ch];
            if (!color) continue;
            ctx.fillStyle = color;
            ctx.fillRect(ox + x, oy + y, 1, 1);
        }
    }
}

function padTop(rows, height) {
    const out = rows.slice();
    while (out.length < height) out.unshift('');
    return out;
}

// Subtle bob: drop the body 1px by removing one row and padding on top.
function squash(grid, removeIdx) {
    const out = grid.filter((_, i) => i !== removeIdx);
    out.unshift('');
    return out;
}

function shiftRight(rows) {
    return rows.map((r) => '.' + r.slice(0, -1));
}

function replaceChars(rows, from, to) {
    return rows.map((r) => r.split(from).join(to));
}

function buildSheet(scene, key, frames, frameW, frameH, accents) {
    const canvas = document.createElement('canvas');
    canvas.width = frameW * frames.length;
    canvas.height = frameH;
    const ctx = canvas.getContext('2d');
    frames.forEach((grid, i) => drawGrid(ctx, grid, i * frameW, 0, frameW, accents));
    // Two-call path: register the canvas texture, then parse numbered frames
    // onto the same key (3.60+ accepts a Texture as source with an empty key).
    const tex = scene.textures.addCanvas(key, canvas);
    scene.textures.addSpriteSheet('', tex, { frameWidth: frameW, frameHeight: frameH });
    return tex;
}

/* ---------------------------------- Player ---------------------------------- */
// 16x24, feet on the bottom row. Frames: 0-1 idle, 2-3 run, 4-5 strike, 6 jump, 7 hurt.

const P_HEAD = [
    '.....KKKKK......',
    '....KGGGGGK.....',
    '....KGAAAGK.....',
    '....KGGGGGK.....',
    '....KGGGGGK.....',
    '.....KKKKK......'
];
const P_TORSO = [
    '.....KPPPK......',
    '...KPPPPPPPK....',
    '...KPPAAAPPK....',
    '...KPPPPPPPK....',
    '...KPKPPPKPK....',
    '...KgKPPPKgK....',
    '....KDPPPDK.....'
];
const P_TORSO_STRIKE0 = [
    '.....KPPPK......',
    '...KPPPPPPPK....',
    '...KPPAAAPPKg...',
    '...KPPPPPPPK....',
    '...KPKPPPKPK....',
    '...KgKPPPK.K....',
    '....KDPPPDK.....'
];
const P_TORSO_STRIKE1 = [
    '.....KPPPK......',
    '...KPPPPPPPK....',
    '...KPPAAAPPKgACC',
    '...KPPPPPPPK....',
    '...KPKPPPKPK....',
    '...K.KPPPK.K....',
    '....KDPPPDK.....'
];
const P_LEGS_IDLE = [
    '.....KPKPK......',
    '.....KPKPK......',
    '.....KPKPK......',
    '.....KPKPK......',
    '.....KgKgK......',
    '....KgK.KgK.....',
    '....KKK.KKK.....'
];
const P_LEGS_RUN0 = [
    '.....KPKPK......',
    '....KPK.KPK.....',
    '....KPK..KPK....',
    '...KPK...KPK....',
    '...KgK....KgK...',
    '..KKK.....KKK...',
    ''
];
const P_LEGS_RUN1 = [
    '.....KPKPK......',
    '.....KPKPK......',
    '.....KPKPK......',
    '....KPKPK.......',
    '....KgKgK.......',
    '....KKKKK.......',
    ''
];
const P_LEGS_JUMP = [
    '....KPK.KPK.....',
    '....KPKKKPK.....',
    '.....KgKgK......',
    '.....KKKKK......',
    '', '', ''
];

function playerFrames() {
    const H = 24;
    const idle0 = padTop([...P_HEAD, ...P_TORSO, ...P_LEGS_IDLE], H);
    const idle1 = squash(idle0, idle0.length - 4);
    const run0 = padTop([...P_HEAD, ...P_TORSO, ...P_LEGS_RUN0], H);
    const run1 = padTop([...P_HEAD, ...P_TORSO, ...P_LEGS_RUN1], H);
    const strike0 = padTop([...P_HEAD, ...P_TORSO_STRIKE0, ...P_LEGS_IDLE], H);
    const strike1 = padTop([...P_HEAD, ...P_TORSO_STRIKE1, ...P_LEGS_RUN1], H);
    const jump = padTop([...P_HEAD, ...P_TORSO, ...P_LEGS_JUMP], H);
    const hurt = padTop(
        [...shiftRight(P_HEAD), ...replaceChars(P_TORSO, 'AAA', 'RRR'), ...P_LEGS_IDLE], H);
    return [idle0, idle1, run0, run1, strike0, strike1, jump, hurt];
}

/* ------------------------- Grounded enemies (16x24) ------------------------- */
// Shared body for swarmer/shielder, accent-swapped. Frames: 0-1 idle, 2-3 walk, 4-5 attack.

const E_HEAD = [
    '....KKKKK.......',
    '...KaAAAaK......',
    '...KAWAWAK......',
    '...KaAAAaK......',
    '....KKKKK.......'
];
const E_BODY = [
    '...KaaaaaK......',
    '..KaAAAAAaK.....',
    '..KaAAAAAaK.....',
    '..KaAAAAAaK.....',
    '...KaaaaaK......',
    '....KKKKK.......'
];
const E_BODY_ATK0 = [
    '...KaaaaaKg.....',
    '..KaAAAAAaKg....',
    '..KaAAAAAaK.....',
    '..KaAAAAAaK.....',
    '...KaaaaaK......',
    '....KKKKK.......'
];
const E_BODY_ATK1 = [
    '...KaaaaaKWW....',
    '..KaAAAAAaKWW...',
    '..KaAAAAAaKW....',
    '..KaAAAAAaK.....',
    '...KaaaaaK......',
    '....KKKKK.......'
];
const E_LEGS_IDLE = [
    '....KaKaK.......',
    '....KaKaK.......',
    '....KaKaK.......',
    '....KKKKK.......',
    ''
];
const E_LEGS_WALK0 = [
    '....KaKaK.......',
    '...KaK..KaK.....',
    '..KKK...KKK.....',
    '', ''
];
const E_LEGS_WALK1 = [
    '....KaKaK.......',
    '....KaKaK.......',
    '...KKKKK........',
    '', ''
];

function groundEnemyFrames() {
    const H = 24;
    const idle0 = padTop([...E_HEAD, ...E_BODY, ...E_LEGS_IDLE], H);
    const idle1 = squash(idle0, idle0.length - 3);
    const walk0 = padTop([...E_HEAD, ...E_BODY, ...E_LEGS_WALK0], H);
    const walk1 = padTop([...E_HEAD, ...E_BODY, ...E_LEGS_WALK1], H);
    const atk0 = padTop([...E_HEAD, ...E_BODY_ATK0, ...E_LEGS_IDLE], H);
    const atk1 = padTop([...shiftRight(E_HEAD), ...E_BODY_ATK1, ...E_LEGS_WALK0], H);
    return [idle0, idle1, walk0, walk1, atk0, atk1];
}

/* -------------------------- Charger / Brute (20x28) -------------------------- */

const C_HEAD = [
    '......KKKKKK........',
    '.....KaAAAAaK.......',
    '.....KAWAAWAK.......',
    '.....KaAAAAaK.......',
    '......KKKKKK........',
    '......KaaaaK........'
];
const C_BODY = [
    '....KaaaaaaaK.......',
    '...KaAAAAAAAaK......',
    '..KaaAAAAAAAaaK.....',
    '..KaAAAAAAAAAaK.....',
    '..KaAAAAAAAAAaK.....',
    '...KaAAAAAAAaK......',
    '....KaaaaaaaK.......',
    '.....KKKKKKK........'
];
const C_BODY_ATK0 = [
    '....KaaaaaaaKg......',
    '...KaAAAAAAAaKg.....',
    '..KaaAAAAAAAaaK.....',
    '..KaAAAAAAAAAaK.....',
    '..KaAAAAAAAAAaK.....',
    '...KaAAAAAAAaK......',
    '....KaaaaaaaK.......',
    '.....KKKKKKK........'
];
const C_BODY_ATK1 = [
    '....KaaaaaaaKWWW....',
    '...KaAAAAAAAaKWW....',
    '..KaaAAAAAAAaaKW....',
    '..KaAAAAAAAAAaK.....',
    '..KaAAAAAAAAAaK.....',
    '...KaAAAAAAAaK......',
    '....KaaaaaaaK.......',
    '.....KKKKKKK........'
];
const C_LEGS_IDLE = [
    '....KaaK.KaaK.......',
    '....KaaK.KaaK.......',
    '....KaaK.KaaK.......',
    '....KKKK.KKKK.......',
    '', ''
];
const C_LEGS_WALK0 = [
    '....KaaK.KaaK.......',
    '...KaaK...KaaK......',
    '..KKKK.....KKKK.....',
    '', '', ''
];
const C_LEGS_WALK1 = [
    '....KaaK.KaaK.......',
    '.....KaaKaaK........',
    '.....KKKKKKK........',
    '', '', ''
];

function chargerFrames() {
    const H = 28;
    const idle0 = padTop([...C_HEAD, ...C_BODY, ...C_LEGS_IDLE], H);
    const idle1 = squash(idle0, idle0.length - 4);
    const walk0 = padTop([...C_HEAD, ...C_BODY, ...C_LEGS_WALK0], H);
    const walk1 = padTop([...C_HEAD, ...C_BODY, ...C_LEGS_WALK1], H);
    const atk0 = padTop([...C_HEAD, ...C_BODY_ATK0, ...C_LEGS_IDLE], H);
    const atk1 = padTop([...shiftRight(C_HEAD), ...C_BODY_ATK1, ...C_LEGS_WALK0], H);
    return [idle0, idle1, walk0, walk1, atk0, atk1];
}

/* -------------------------------- Flyer (16x16) ------------------------------- */
// Frames: 0-1 hover, 2-3 fly, 4-5 dive.

const F_BODY = [
    '',
    '.....KKKKKK.....',
    '...KKaAAAAaKK...',
    '..KaAAAAAAAAaK..',
    '..KAWAAAAAAWAK..',
    '..KaAAAAAAAAaK..',
    '...KKKKKKKKKK...',
    '....K..K...K....',
    ''
];
const F_BODY_DIVE = [
    '',
    '.....KKKKKK.....',
    '...KKaAAAAaKK...',
    '..KaAAAAAAAAaK..',
    '..KRWAAAAAAWRK..',
    '..KaAAAAAAAAaK..',
    '...KKKKKKKKKK...',
    '...KW..KW..KW...',
    ''
];

function flyerFrames() {
    const H = 16;
    const hover0 = padTop([...F_BODY, ''], H);
    const hover1 = padTop(F_BODY, H - 1).concat(['']);
    const fly0 = hover0;
    const fly1 = hover1;
    const dive0 = padTop([...F_BODY_DIVE, ''], H);
    const dive1 = padTop(F_BODY_DIVE, H - 1).concat(['']);
    return [hover0, hover1, fly0, fly1, dive0, dive1];
}

/* ----------------------------------- FX ----------------------------------- */
// FX frames are generated procedurally (arcs and dithered walls are easier as
// math than as grids) but still on the integer pixel grid.

function makeGrid(w, h) {
    return Array.from({ length: h }, () => new Array(w).fill('.'));
}

function gridToRows(cells) {
    return cells.map((row) => row.join(''));
}

// 24x24 x3: cyan crescent sweeping outward, white leading edge.
function slashFrames() {
    const frames = [];
    const radii = [5, 8, 11];
    for (let f = 0; f < 3; f++) {
        const cells = makeGrid(24, 24);
        const r = radii[f];
        for (let y = 0; y < 24; y++) {
            for (let x = 0; x < 24; x++) {
                const dx = x - 4;
                const dy = y - 12;
                if (dx <= 0) continue;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const ang = Math.atan2(dy, dx);
                if (Math.abs(ang) > 0.9) continue;
                if (Math.abs(dist - r) < 1.2) {
                    cells[y][x] = f === 2 ? 'c' : 'C';
                } else if (dist - r >= 1.2 && dist - r < 2.2 && f < 2) {
                    cells[y][x] = 'W';
                }
            }
        }
        frames.push(gridToRows(cells));
    }
    return frames;
}

// 12x28 x2: magenta energy wall, shimmering dither.
function parryFrames() {
    const frames = [];
    for (let f = 0; f < 2; f++) {
        const cells = makeGrid(12, 28);
        for (let y = 1; y < 27; y++) {
            for (let x = 4; x < 8; x++) {
                if (x === 4 || x === 7) cells[y][x] = 'm';
                else cells[y][x] = (x + y + f) % 2 === 0 ? 'M' : 'W';
            }
        }
        cells[0][5] = 'M'; cells[0][6] = 'M';
        cells[27][5] = 'M'; cells[27][6] = 'M';
        frames.push(gridToRows(cells));
    }
    return frames;
}

// 8x24 x2: blue shield bar for the shielder.
function shieldFrames() {
    const frames = [];
    for (let f = 0; f < 2; f++) {
        const cells = makeGrid(8, 24);
        for (let y = 1; y < 23; y++) {
            for (let x = 2; x < 6; x++) {
                if (x === 2 || x === 5) cells[y][x] = 'K';
                else cells[y][x] = (y + f) % 3 === 0 ? 'c' : 'B';
            }
        }
        frames.push(gridToRows(cells));
    }
    return frames;
}

// 5x9 x1: pixel '!' warning marker.
function warningFrames() {
    return [[
        '.YYY.',
        '.YYY.',
        '.YYY.',
        '.YYY.',
        '..Y..',
        '..Y..',
        '.....',
        '.YYY.',
        '.YYY.'
    ]];
}

/* -------------------------------- Public API -------------------------------- */

export function createPixelTextures(scene) {
    buildSheet(scene, 'player', playerFrames(), 16, 24, ACCENTS.player);

    const ground = groundEnemyFrames();
    buildSheet(scene, 'swarmer', ground, 16, 24, ACCENTS.swarmer);
    buildSheet(scene, 'shielder', ground, 16, 24, ACCENTS.shielder);

    const charger = chargerFrames();
    buildSheet(scene, 'charger', charger, 20, 28, ACCENTS.charger);
    buildSheet(scene, 'brute', charger, 20, 28, ACCENTS.brute);

    buildSheet(scene, 'flyer', flyerFrames(), 16, 16, ACCENTS.flyer);

    buildSheet(scene, 'fx-slash', slashFrames(), 24, 24, {});
    buildSheet(scene, 'fx-parry', parryFrames(), 12, 28, {});
    buildSheet(scene, 'fx-shield', shieldFrames(), 8, 24, {});
    buildSheet(scene, 'fx-warning', warningFrames(), 5, 9, {});
}

export function registerAnimations(scene) {
    const a = scene.anims;
    a.create({ key: 'player-idle', frames: a.generateFrameNumbers('player', { start: 0, end: 1 }), frameRate: 3, repeat: -1 });
    a.create({ key: 'player-run', frames: a.generateFrameNumbers('player', { start: 2, end: 3 }), frameRate: 8, repeat: -1 });
    a.create({ key: 'player-strike', frames: a.generateFrameNumbers('player', { start: 4, end: 5 }), frameRate: 12, repeat: 0 });
    // player frames 6 (jump) and 7 (hurt) are static poses via setFrame

    for (const t of ['swarmer', 'charger', 'shielder', 'flyer', 'brute']) {
        a.create({ key: `${t}-idle`, frames: a.generateFrameNumbers(t, { start: 0, end: 1 }), frameRate: 3, repeat: -1 });
        a.create({ key: `${t}-walk`, frames: a.generateFrameNumbers(t, { start: 2, end: 3 }), frameRate: 6, repeat: -1 });
        a.create({ key: `${t}-attack`, frames: a.generateFrameNumbers(t, { start: 4, end: 5 }), frameRate: 10, repeat: 0 });
    }

    a.create({ key: 'fx-slash-anim', frames: a.generateFrameNumbers('fx-slash', { start: 0, end: 2 }), frameRate: 18, repeat: 0, hideOnComplete: true });
    a.create({ key: 'fx-parry-anim', frames: a.generateFrameNumbers('fx-parry', { start: 0, end: 1 }), frameRate: 8, repeat: -1 });
    a.create({ key: 'fx-shield-anim', frames: a.generateFrameNumbers('fx-shield', { start: 0, end: 1 }), frameRate: 4, repeat: -1 });
}
