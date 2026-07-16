// One-button gesture recognizer shared by keyboard (SPACE) and pointer/touch.
//
// tap        -> strike (committed DOUBLE_TAP_WINDOW ms after release, so a
//               second press can turn it into a jump — this is the fix for the
//               old stray-strike-before-every-jump bug)
// hold       -> parry (starts HOLD_THRESHOLD ms into the press, instant feel)
// double tap -> jump (second press cancels the pending strike)
import { INPUT } from '../config.js';

export function setupOneButtonInput(scene, callbacks) {
    const {
        onStrike, onParryStart, onParryStop, onJump, onStartOrRestart,
        onAnyInput, isParrying, getGameState
    } = callbacks;

    let isDown = false;
    let suppressRelease = false;
    let holdTimeout = null;
    let pendingStrike = null;
    let lastTouchTime = 0;

    function reset() {
        clearTimeout(holdTimeout);
        clearTimeout(pendingStrike);
        holdTimeout = null;
        pendingStrike = null;
        isDown = false;
        suppressRelease = false;
    }

    function press() {
        if (onAnyInput) onAnyInput();
        const gameState = getGameState();
        if (gameState === 'start' || gameState === 'gameover') {
            // Swallow the starting press entirely so its release can't
            // schedule a strike into the fresh run.
            reset();
            suppressRelease = true;
            isDown = true;
            onStartOrRestart();
            return;
        }
        if (isDown) return; // second finger / key repeat
        isDown = true;

        if (pendingStrike) {
            // Second tap inside the window: it's a jump, the strike never fires.
            clearTimeout(pendingStrike);
            pendingStrike = null;
            suppressRelease = true;
            if (gameState === 'playing') onJump();
            return;
        }

        suppressRelease = false;
        holdTimeout = setTimeout(() => {
            if (isDown && !suppressRelease && getGameState() === 'playing') {
                onParryStart();
            }
        }, INPUT.HOLD_THRESHOLD);
    }

    function release() {
        if (!isDown) return;
        isDown = false;
        clearTimeout(holdTimeout);
        holdTimeout = null;

        if (suppressRelease) {
            suppressRelease = false;
            return;
        }
        if (isParrying()) {
            onParryStop();
            return;
        }
        if (getGameState() !== 'playing') return;
        pendingStrike = setTimeout(() => {
            pendingStrike = null;
            if (getGameState() === 'playing') onStrike();
        }, INPUT.DOUBLE_TAP_WINDOW);
    }

    // Some devices emit synthetic mouse events after touch; ignore non-touch
    // pointer events shortly after any touch event.
    function pointerGuarded(pointer, fn) {
        const now = performance.now();
        if (pointer.wasTouch) {
            lastTouchTime = now;
        } else if (now - lastTouchTime < INPUT.TOUCH_MOUSE_GUARD) {
            return;
        }
        fn();
    }

    scene.input.keyboard.on('keydown-SPACE', (event) => {
        event.preventDefault();
        if (event.repeat) return;
        press();
    });
    scene.input.keyboard.on('keyup-SPACE', (event) => {
        event.preventDefault();
        release();
    });

    scene.input.on('pointerdown', (pointer) => pointerGuarded(pointer, press));
    scene.input.on('pointerup', (pointer) => pointerGuarded(pointer, release));
    // Finger dragged off the canvas mid-hold must still release the parry.
    scene.input.on('pointerupoutside', (pointer) => pointerGuarded(pointer, release));

    return { reset };
}
