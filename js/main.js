import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import GameScene from './scenes/GameScene.js';
import { GAME } from './config.js';

const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game-container',
    backgroundColor: '#0a0914',
    pixelArt: true, // antialias off + roundPixels on
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: GAME.WIDTH,
        height: GAME.HEIGHT,
        max: { width: GAME.WIDTH * 2, height: GAME.HEIGHT * 2 }
    },
    scene: [BootScene, GameScene]
});

game.canvas.id = 'gameCanvas';

window.__game = game; // debug/testing handle
