// ============================================
// input.js — One-button (Space) input state machine
// Tap = Strike | Hold = Parry | Double-tap = Jump
// ============================================
import { game } from './state.js';
import { player } from './player.js';
import { startGame, togglePause } from './flow.js';
import { INPUT } from './config.js';
import { ensureAudio } from './audio.js';

let spaceDown = false;
let lastSpaceUpTime = 0;
let holdTimeout = null;
let isStrikeActive = false; // true when the current press was consumed by a jump

export function initInput() {
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
}

function onKeyDown(e) {
    // Pause toggle (Esc / P) while in a run.
    if (e.code === 'Escape' || e.code === 'KeyP') {
        if (game.state === 'playing' || game.state === 'paused') {
            e.preventDefault();
            togglePause();
        }
        return;
    }

    if (e.code !== 'Space') return;
    e.preventDefault();
    ensureAudio(); // unlock/resume the audio context on the first user gesture

    if (game.state === 'start' || game.state === 'gameover') {
        startGame();
        return;
    }
    if (game.state === 'paused') return; // ignore gameplay input while paused
    if (e.repeat) return;
    if (spaceDown) return;

    spaceDown = true;
    const now = performance.now();

    // Double-tap → jump
    if (now - lastSpaceUpTime < INPUT.doubleTapWindow) {
        player.jump();
        lastSpaceUpTime = 0;
        isStrikeActive = true;
    } else {
        isStrikeActive = false;
        // Hold → parry (fires if still held after threshold)
        holdTimeout = setTimeout(() => {
            if (spaceDown && !isStrikeActive && game.state === 'playing') {
                player.startParry();
            }
        }, INPUT.holdThreshold);
    }
}

function onKeyUp(e) {
    if (e.code !== 'Space') return;
    e.preventDefault();
    if (!spaceDown) return;

    spaceDown = false;
    clearTimeout(holdTimeout);
    const now = performance.now();

    if (player.state === 'parrying') {
        player.stopParry();
    } else if (!isStrikeActive && game.state === 'playing') {
        player.startStrike(); // tap → strike
        lastSpaceUpTime = now;
    }
    isStrikeActive = false;
}
