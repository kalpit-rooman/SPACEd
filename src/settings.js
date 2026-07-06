// ============================================
// settings.js — Difficulty + volume, persisted to localStorage
// ============================================
import { setVolume } from './audio.js';

const LS_KEY = 'spaced_settings_v1';

export const DIFFICULTY = {
    easy: { label: 'EASY', dmgMult: 0.7, countMult: 0.8, health: 120 },
    normal: { label: 'NORMAL', dmgMult: 1.0, countMult: 1.0, health: 100 },
    hard: { label: 'HARD', dmgMult: 1.4, countMult: 1.25, health: 80 },
};

export const settings = {
    difficulty: 'normal',
    master: 0.8,
    sfx: 0.9,
    music: 0.5,
};

export function loadSettings() {
    try {
        const raw = localStorage.getItem(LS_KEY);
        if (raw) Object.assign(settings, JSON.parse(raw));
    } catch (e) { /* ignore corrupt/blocked storage */ }
    if (!DIFFICULTY[settings.difficulty]) settings.difficulty = 'normal';
}

export function saveSettings() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(settings)); } catch (e) { /* ignore */ }
}

export function applyVolumes() {
    setVolume('master', settings.master);
    setVolume('sfx', settings.sfx);
    setVolume('music', settings.music);
}

export function diff() {
    return DIFFICULTY[settings.difficulty];
}
