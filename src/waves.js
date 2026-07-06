// ============================================
// waves.js — Wave/level progression + boss scheduling
// ============================================
import { game } from './state.js';
import { enemies, spawnEnemy, pickType } from './enemies.js';
import { spawnBoss, isBossAlive } from './boss.js';
import { showBanner } from './ui.js';
import { WAVES, EARLY_TYPES } from './config.js';

// phase: 'incoming' | 'clearing' | 'boss' | 'breather'
let phase = 'breather';
let toSpawn = 0;
let spawnTimer = 0;
let breatherTimer = 0;

export function resetWaves() {
    phase = 'breather';
    toSpawn = 0;
    spawnTimer = 0;
    breatherTimer = 800; // short delay before wave 1
}

function waveCount() {
    return Math.min(WAVES.maxCount, WAVES.baseCount + Math.floor((game.wave - 1) * WAVES.countPerWave));
}

function allowedTypes() {
    // Ease specials in after a couple of waves.
    return game.wave < 3 ? EARLY_TYPES : undefined; // undefined → all types
}

function beginWave() {
    game.wave++;
    if (game.wave % WAVES.bossEvery === 0) {
        phase = 'boss';
        spawnBoss();
        showBanner('WARNING', 'SECTOR BOSS INCOMING', 2200);
    } else {
        phase = 'incoming';
        toSpawn = waveCount();
        spawnTimer = 0;
        showBanner(`WAVE ${game.wave}`, `SECTOR ${game.sector}`, 1600);
    }
}

export function updateWaves(dt) {
    switch (phase) {
        case 'incoming':
            spawnTimer -= dt;
            if (toSpawn > 0 && spawnTimer <= 0) {
                spawnEnemy(pickType(allowedTypes()));
                toSpawn--;
                spawnTimer = WAVES.spawnGap;
            }
            if (toSpawn <= 0) phase = 'clearing';
            break;

        case 'clearing':
            if (enemies.length === 0) {
                phase = 'breather';
                breatherTimer = WAVES.breather;
            }
            break;

        case 'boss':
            if (!isBossAlive() && enemies.length === 0) {
                game.sector++;
                showBanner('SECTOR CLEARED', `SECTOR ${game.sector} AHEAD`, 2400);
                phase = 'breather';
                breatherTimer = WAVES.breather + 800;
            }
            break;

        case 'breather':
            breatherTimer -= dt;
            if (breatherTimer <= 0) beginWave();
            break;
    }
}
