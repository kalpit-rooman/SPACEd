// ============================================
// audio.js — Procedural Web Audio SFX + music (zero asset files)
// ============================================

let ctx = null;
let master = null;
let sfxGain = null;
let musicGain = null;

let volumes = { master: 0.8, sfx: 0.9, music: 0.5 };

// --- Setup / lifecycle ---
export function ensureAudio() {
    if (ctx) {
        if (ctx.state === 'suspended') ctx.resume();
        return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = volumes.master;
    master.connect(ctx.destination);

    sfxGain = ctx.createGain();
    sfxGain.gain.value = volumes.sfx;
    sfxGain.connect(master);

    musicGain = ctx.createGain();
    musicGain.gain.value = volumes.music;
    musicGain.connect(master);
}

export function getVolumes() { return { ...volumes }; }

// Introspection (used by verification harness).
export function audioState() {
    return { ready: !!ctx, state: ctx ? ctx.state : 'none', musicOn };
}

export function setVolume(kind, value) {
    volumes[kind] = value;
    if (!ctx) return;
    if (kind === 'master' && master) master.gain.value = value;
    if (kind === 'sfx' && sfxGain) sfxGain.gain.value = value;
    if (kind === 'music' && musicGain) musicGain.gain.value = value;
}

// --- Synth primitives ---
function tone({ freq = 440, type = 'sine', dur = 0.15, vol = 0.3, slideTo = null, attack = 0.005 }) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(sfxGain);
    osc.start(t); osc.stop(t + dur + 0.02);
}

function noise({ dur = 0.15, vol = 0.3, filterType = 'bandpass', freq = 1200, q = 1, slideTo = null }) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const frames = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(freq, t);
    if (slideTo) filter.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
    filter.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter); filter.connect(g); g.connect(sfxGain);
    src.start(t); src.stop(t + dur + 0.02);
}

// --- SFX kit ---
export const sfx = {
    strike() {
        noise({ dur: 0.14, vol: 0.25, filterType: 'bandpass', freq: 2400, q: 0.8, slideTo: 600 });
        tone({ freq: 520, type: 'triangle', dur: 0.1, vol: 0.12, slideTo: 200 });
    },
    hit() {
        noise({ dur: 0.09, vol: 0.35, filterType: 'lowpass', freq: 3000, q: 1 });
        tone({ freq: 180, type: 'square', dur: 0.07, vol: 0.18, slideTo: 90 });
    },
    parry() {
        // Bright metallic clash: two detuned high tones + noise ping.
        tone({ freq: 1760, type: 'square', dur: 0.18, vol: 0.14, slideTo: 2200 });
        tone({ freq: 1730, type: 'square', dur: 0.18, vol: 0.12, slideTo: 2100 });
        noise({ dur: 0.12, vol: 0.25, filterType: 'bandpass', freq: 5000, q: 3 });
    },
    block() {
        tone({ freq: 130, type: 'square', dur: 0.1, vol: 0.2, slideTo: 80 });
        noise({ dur: 0.06, vol: 0.15, filterType: 'lowpass', freq: 800 });
    },
    hurt() {
        tone({ freq: 220, type: 'sawtooth', dur: 0.28, vol: 0.28, slideTo: 60 });
        noise({ dur: 0.2, vol: 0.2, filterType: 'lowpass', freq: 1200 });
    },
    death() {
        tone({ freq: 400, type: 'square', dur: 0.32, vol: 0.22, slideTo: 70 });
        noise({ dur: 0.25, vol: 0.22, filterType: 'bandpass', freq: 1500, q: 0.7, slideTo: 300 });
    },
    combo(n) {
        // Rising pitch with combo count.
        const freq = 440 * Math.pow(2, Math.min(n, 12) / 12);
        tone({ freq, type: 'triangle', dur: 0.1, vol: 0.15 });
    },
    powerup() {
        tone({ freq: 523, type: 'triangle', dur: 0.1, vol: 0.2 });
        tone({ freq: 784, type: 'triangle', dur: 0.14, vol: 0.2, slideTo: 1046 });
    },
    uiSelect() {
        tone({ freq: 660, type: 'square', dur: 0.08, vol: 0.16, slideTo: 880 });
    },
    gameStart() {
        tone({ freq: 330, type: 'triangle', dur: 0.12, vol: 0.2, slideTo: 660 });
        tone({ freq: 660, type: 'triangle', dur: 0.2, vol: 0.18, slideTo: 990, attack: 0.08 });
    },
    gameOver() {
        tone({ freq: 440, type: 'sawtooth', dur: 0.6, vol: 0.25, slideTo: 110 });
        tone({ freq: 220, type: 'square', dur: 0.7, vol: 0.15, slideTo: 55 });
    },
    bossRoar() {
        tone({ freq: 90, type: 'sawtooth', dur: 0.9, vol: 0.3, slideTo: 45 });
        noise({ dur: 0.8, vol: 0.25, filterType: 'lowpass', freq: 500, slideTo: 120 });
    },
};

// --- Procedural music: a looping minor-key pulse ---
// Lookahead scheduler over a fixed 16-step pattern.
const SCALE = [0, 3, 5, 7, 10]; // minor pentatonic offsets (semitones)
const ROOT = 220; // A3
const BASS = [0, 0, 5, 0, 3, 0, 7, 5]; // 8-step bassline (scale indices)
let musicOn = false;
let step = 0;
let nextNoteTime = 0;
let schedulerTimer = null;
let intensity = 0; // 0..1, driven by wave/combo

function midiToFreq(root, semis) { return root * Math.pow(2, semis / 12); }

function playBass(i, time) {
    const semis = SCALE[BASS[i % BASS.length] % SCALE.length] - 12;
    voice({ freq: midiToFreq(ROOT, semis), type: 'triangle', time, dur: 0.22, vol: 0.35 });
}

function playArp(i, time) {
    if (intensity < 0.25 && i % 2 === 1) return; // sparser when calm
    const idx = (i * 3) % SCALE.length;
    const oct = 12 * (i % 3 === 0 ? 1 : 0);
    voice({ freq: midiToFreq(ROOT, SCALE[idx] + oct), type: 'square', time, dur: 0.12, vol: 0.12 + intensity * 0.1 });
}

function voice({ freq, type, time, dur, vol }) {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 600 + intensity * 3000;
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(vol, time + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc.connect(filter); filter.connect(g); g.connect(musicGain);
    osc.start(time); osc.stop(time + dur + 0.02);
}

function scheduler() {
    if (!ctx || !musicOn) return;
    const tempo = 132 + intensity * 24; // BPM
    const stepDur = 60 / tempo / 4; // 16th notes
    while (nextNoteTime < ctx.currentTime + 0.1) {
        playArp(step, nextNoteTime);
        if (step % 2 === 0) playBass(step / 2, nextNoteTime);
        step = (step + 1) % 16;
        nextNoteTime += stepDur;
    }
    schedulerTimer = setTimeout(scheduler, 25);
}

export const music = {
    start() {
        if (!ctx || musicOn) return;
        musicOn = true;
        step = 0;
        nextNoteTime = ctx.currentTime + 0.05;
        scheduler();
    },
    stop() {
        musicOn = false;
        if (schedulerTimer) clearTimeout(schedulerTimer);
        schedulerTimer = null;
    },
    setIntensity(v) { intensity = Math.max(0, Math.min(1, v)); },
};
