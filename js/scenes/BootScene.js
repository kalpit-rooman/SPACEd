import Phaser from 'phaser';
import { createPixelTextures, registerAnimations } from '../systems/pixelArt.js';
import { createBackgroundTextures } from '../systems/pixelBackground.js';

// All art is generated at boot — no asset loading, no preload step.
export default class BootScene extends Phaser.Scene {
    constructor() {
        super('Boot');
    }

    create() {
        createPixelTextures(this);
        createBackgroundTextures(this);
        registerAnimations(this);
        this.scene.start('Game');
    }
}
