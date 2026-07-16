// Chiptune audio built on raw Web Audio — no asset files. The AudioContext is
// created lazily inside unlock() (called from the first user input) to satisfy
// browser autoplay policies, iOS Safari included.
import { STORAGE_KEYS } from '../config.js';

export function createAudio() {
    let ctx = null;
    let master = null;
    let sfxGain = null;
    let musicGain = null;
    let noiseBuffer = null;
    let muted = false;
    let musicTimer = null;
    let musicStep = 0;
    let nextStepTime = 0;
    let bpm = 132;

    try {
        muted = localStorage.getItem(STORAGE_KEYS.MUTED) === '1';
    } catch { /* private mode */ }

    function unlock() {
        if (!ctx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return;
            ctx = new AC();
            master = ctx.createGain();
            master.gain.value = muted ? 0 : 1;
            master.connect(ctx.destination);
            sfxGain = ctx.createGain();
            sfxGain.gain.value = 0.8;
            sfxGain.connect(master);
            musicGain = ctx.createGain();
            musicGain.gain.value = 0.35;
            musicGain.connect(master);
            noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
            const data = noiseBuffer.getChannelData(0);
            for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        }
        if (ctx.state === 'suspended') ctx.resume();
    }

    function tone(dest, { type = 'square', freq, freqEnd, dur, gain, when, attack = 0.005 }) {
        if (!ctx) return;
        const t = when !== undefined ? when : ctx.currentTime;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t);
        if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(gain, t + attack);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.connect(g);
        g.connect(dest);
        osc.start(t);
        osc.stop(t + dur + 0.05);
    }

    function noise(dest, { dur, gain, filterType = 'bandpass', filterFreq, filterFreqEnd, when }) {
        if (!ctx) return;
        const t = when !== undefined ? when : ctx.currentTime;
        const src = ctx.createBufferSource();
        src.buffer = noiseBuffer;
        const filter = ctx.createBiquadFilter();
        filter.type = filterType;
        filter.frequency.setValueAtTime(filterFreq, t);
        if (filterFreqEnd) filter.frequency.exponentialRampToValueAtTime(filterFreqEnd, t + dur);
        const g = ctx.createGain();
        g.gain.setValueAtTime(gain, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        src.connect(filter);
        filter.connect(g);
        g.connect(dest);
        src.start(t);
        src.stop(t + dur + 0.05);
    }

    /* --------------------------------- Music --------------------------------- */
    // Lookahead step sequencer: a 25ms interval schedules every step that falls
    // within the next 120ms of AudioContext time, so setInterval jitter never
    // reaches the audible timeline.
    const BASS = [55, 55, 65.41, 55, 49, 55, 82.41, 73.42]; // A1 A1 C2 A1 G1 A1 E2 D2

    function scheduleSteps() {
        const stepDur = 60 / bpm / 2; // 8th notes
        while (nextStepTime < ctx.currentTime + 0.12) {
            const s = musicStep % 8;
            tone(musicGain, { type: 'square', freq: BASS[s], dur: stepDur * 0.9, gain: 0.12, when: nextStepTime });
            tone(musicGain, { type: 'triangle', freq: BASS[s] * 4, dur: stepDur * 0.4, gain: 0.06, when: nextStepTime + stepDur / 2 });
            if (s % 2 === 0) {
                noise(musicGain, { dur: 0.03, gain: 0.03, filterType: 'highpass', filterFreq: 6000, when: nextStepTime });
            }
            nextStepTime += stepDur;
            musicStep++;
        }
    }

    function startMusic() {
        if (!ctx || musicTimer) return;
        musicStep = 0;
        nextStepTime = ctx.currentTime + 0.05;
        musicTimer = setInterval(scheduleSteps, 25);
    }

    function stopMusic() {
        if (musicTimer) {
            clearInterval(musicTimer);
            musicTimer = null;
        }
    }

    return {
        unlock,
        isMuted: () => muted,
        setMuted(value) {
            muted = value;
            if (master) master.gain.value = muted ? 0 : 1;
            try { localStorage.setItem(STORAGE_KEYS.MUTED, muted ? '1' : '0'); } catch { /* ignore */ }
        },
        toggleMute() {
            this.setMuted(!muted);
            return muted;
        },
        suspend() { if (ctx) ctx.suspend(); },
        resume() { if (ctx && ctx.state === 'suspended') ctx.resume(); },
        startMusic,
        stopMusic,
        setMusicTempo(newBpm) { bpm = newBpm; },
        sfx: {
            strike() { noise(sfxGain, { dur: 0.09, gain: 0.18, filterFreq: 1400, filterFreqEnd: 400 }); },
            strikeHit() {
                tone(sfxGain, { freq: 220, freqEnd: 110, dur: 0.10, gain: 0.30 });
                noise(sfxGain, { dur: 0.05, gain: 0.15, filterFreq: 2500 });
            },
            kill() {
                if (!ctx) return;
                const t = ctx.currentTime;
                [440, 660, 880].forEach((f, i) =>
                    tone(sfxGain, { freq: f, dur: 0.07, gain: 0.22, when: t + i * 0.05 }));
                noise(sfxGain, { dur: 0.15, gain: 0.12, filterType: 'lowpass', filterFreq: 3000, filterFreqEnd: 500 });
            },
            parryDeflect() {
                tone(sfxGain, { type: 'triangle', freq: 1200, freqEnd: 2400, dur: 0.06, gain: 0.28 });
                tone(sfxGain, { freq: 1568, dur: 0.20, gain: 0.15 });
            },
            jump() { tone(sfxGain, { freq: 300, freqEnd: 700, dur: 0.12, gain: 0.18 }); },
            playerHurt() {
                tone(sfxGain, { type: 'sawtooth', freq: 200, freqEnd: 70, dur: 0.25, gain: 0.32 });
                noise(sfxGain, { dur: 0.10, gain: 0.20, filterFreq: 300 });
            },
            enemyWarning() {
                if (!ctx) return;
                const t = ctx.currentTime;
                tone(sfxGain, { type: 'triangle', freq: 880, dur: 0.04, gain: 0.13, when: t });
                tone(sfxGain, { type: 'triangle', freq: 880, dur: 0.04, gain: 0.13, when: t + 0.07 });
            },
            gameOver() {
                if (!ctx) return;
                const t = ctx.currentTime;
                [440, 330, 262, 196].forEach((f, i) =>
                    tone(sfxGain, { freq: f, dur: 0.16, gain: 0.28, when: t + i * 0.18 }));
            },
            comboUp(combo) {
                tone(sfxGain, { type: 'triangle', freq: 660 * Math.pow(2, Math.min(combo, 12) / 12), dur: 0.08, gain: 0.18 });
            }
        }
    };
}
