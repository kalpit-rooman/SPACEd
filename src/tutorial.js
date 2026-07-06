// ============================================
// tutorial.js — First-run contextual coaching (persisted, shows once)
// ============================================
import { showBanner } from './ui.js';

const LS_KEY = 'spaced_tutorial_v1';
let done = {};
try { done = JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch (e) { done = {}; }

export function teach(key, title, sub) {
    if (done[key]) return;
    done[key] = true;
    try { localStorage.setItem(LS_KEY, JSON.stringify(done)); } catch (e) { /* ignore */ }
    showBanner(title, sub, 1700);
}
