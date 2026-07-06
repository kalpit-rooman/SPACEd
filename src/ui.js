// ============================================
// ui.js — HUD + screen overlays
// ============================================
import { game } from './state.js';
import { player } from './player.js';
import { settings, saveSettings, applyVolumes, DIFFICULTY } from './settings.js';
import { best } from './highscore.js';
import { ensureAudio } from './audio.js';

const el = {
    score: document.getElementById('score'),
    healthFill: document.getElementById('health-fill'),
    combo: document.getElementById('combo'),
    wave: document.getElementById('wave'),
    buffs: document.getElementById('buffs'),
    banner: document.getElementById('banner'),
    bannerTitle: document.getElementById('banner-title'),
    bannerSub: document.getElementById('banner-sub'),
    startScreen: document.getElementById('start-screen'),
    pauseScreen: document.getElementById('pause-screen'),
    gameOverScreen: document.getElementById('game-over-screen'),
    finalScore: document.getElementById('final-score'),
    bestLine: document.getElementById('best-line'),
    bestFinal: document.getElementById('best-final'),
    recordBadge: document.getElementById('record-badge'),
    diffButtons: document.getElementById('difficulty-buttons'),
    volMaster: document.getElementById('vol-master'),
    loadingScreen: document.getElementById('loading-screen'),
    loadingFill: document.getElementById('loading-fill'),
};

// Wire up the start-screen controls (difficulty + volume + best score).
export function initStartScreen() {
    if (el.bestLine) el.bestLine.textContent = best.score > 0 ? `BEST  ${best.score}  ·  WAVE ${best.wave}` : '';

    if (el.diffButtons) {
        const refresh = () => el.diffButtons.querySelectorAll('.diff-btn').forEach(b =>
            b.classList.toggle('active', b.dataset.diff === settings.difficulty));
        el.diffButtons.querySelectorAll('.diff-btn').forEach(b => {
            b.addEventListener('click', () => {
                settings.difficulty = b.dataset.diff;
                saveSettings();
                refresh();
            });
        });
        refresh();
    }

    if (el.volMaster) {
        el.volMaster.value = settings.master;
        el.volMaster.addEventListener('input', () => {
            settings.master = parseFloat(el.volMaster.value);
            ensureAudio();
            applyVolumes();
            saveSettings();
        });
    }
}

export function showPause() { if (el.pauseScreen) el.pauseScreen.classList.remove('hidden'); }
export function hidePause() { if (el.pauseScreen) el.pauseScreen.classList.add('hidden'); }

// --- Loading screen ---
export function initLoading() {
    if (el.startScreen) el.startScreen.classList.add('hidden');
}

export function setLoadingProgress(loaded, total) {
    if (el.loadingFill) el.loadingFill.style.width = (loaded / total * 100) + '%';
}

export function finishLoading() {
    if (el.loadingScreen) el.loadingScreen.classList.add('hidden');
    if (el.startScreen) el.startScreen.classList.remove('hidden');
}

export function updateUI() {
    el.score.textContent = game.score;
    el.healthFill.style.width = Math.max(0, player.health / player.maxHealth * 100) + '%';
    if (game.combo > 1) {
        el.combo.textContent = `x${game.combo}`;
        el.combo.classList.add('visible');
    } else {
        el.combo.classList.remove('visible');
    }
    if (el.wave) el.wave.textContent = game.wave > 0 ? `WAVE ${game.wave}` : '';

    // Active power-up chips.
    if (el.buffs) {
        let html = '';
        if (game.strikeMultTimer > 0) html += `<span class="buff power">×2 ${(game.strikeMultTimer / 1000).toFixed(0)}s</span>`;
        if (game.slowTimer > 0) html += `<span class="buff slow">SLOW ${(game.slowTimer / 1000).toFixed(0)}s</span>`;
        el.buffs.innerHTML = html;
    }
}

let bannerTimeout = null;
export function showBanner(title, sub, ms = 1600) {
    if (!el.banner) return;
    el.bannerTitle.textContent = title;
    el.bannerSub.textContent = sub || '';
    el.banner.classList.remove('show');
    // Force reflow so the animation restarts even on rapid re-trigger.
    void el.banner.offsetWidth;
    el.banner.classList.add('show');
    clearTimeout(bannerTimeout);
    bannerTimeout = setTimeout(() => el.banner.classList.remove('show'), ms);
}

export function hideScreens() {
    el.startScreen.classList.add('hidden');
    el.gameOverScreen.classList.add('hidden');
}

export function showGameOver(isRecord) {
    el.finalScore.textContent = `Score ${game.score}  ·  Reached Wave ${game.wave}`;
    if (el.recordBadge) el.recordBadge.classList.toggle('hidden', !isRecord);
    if (el.bestFinal) el.bestFinal.textContent = `Best  ${best.score}  ·  Wave ${best.wave}`;
    el.gameOverScreen.classList.remove('hidden');
}
