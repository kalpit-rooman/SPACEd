// ============================================
// assets.js — Asset loading + transparency
// ============================================

export const images = {};

const assetSources = {
    background: 'space_background.png',
    player: 'player_sprite.png',
    swarmer: 'swarmer_sprite.png',
    charger: 'charger_sprite.png',
    shielder: 'shielder_sprite.png',
};

export const totalAssets = Object.keys(assetSources).length;
export let assetsLoaded = 0;
export let assetsReady = false;

// Chroma-key: convert near-black pixels to transparent. The source art is
// opaque JPEG on a black field, so this fakes an alpha channel at load time.
function makeBlackTransparent(img) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = img.width;
    tempCanvas.height = img.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(img, 0, 0);

    const imgData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        if (r < 15 && g < 15 && b < 15) {
            data[i + 3] = 0;
        }
    }
    tempCtx.putImageData(imgData, 0, 0);
    return tempCanvas;
}

// callback() runs once all assets have loaded (or failed).
// onProgress(loaded, total) fires after each asset settles.
export function loadAssets(callback, onProgress) {
    for (const key in assetSources) {
        const img = new Image();
        img.src = assetSources[key];
        img.onload = () => {
            images[key] = key === 'background' ? img : makeBlackTransparent(img);
            settle(callback, onProgress);
        };
        img.onerror = () => {
            console.error('Failed to load asset:', assetSources[key]);
            settle(callback, onProgress);
        };
        images[key] = img;
    }
}

function settle(callback, onProgress) {
    assetsLoaded++;
    if (onProgress) onProgress(assetsLoaded, totalAssets);
    if (assetsLoaded === totalAssets) {
        assetsReady = true;
        callback();
    }
}
