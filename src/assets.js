// ============================================
// assets.js — Asset loading + transparency
// ============================================

export const images = {};
// White-tinted silhouettes (same alpha mask) for clean hit-flash overlays.
export const silhouettes = {};

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

// Chroma-key: convert the black field to transparent. Source art is opaque
// JPEG on a near-black background, so this fakes an alpha channel at load.
// A feathered band (LOW→HIGH luminance) softens the hard fringe the old
// single-threshold cut left around sprites.
const CHROMA_LOW = 24;   // fully transparent at/below this luminance
const CHROMA_HIGH = 60;  // fully opaque at/above this luminance
function makeBlackTransparent(img) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = img.width;
    tempCanvas.height = img.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(img, 0, 0);

    const imgData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const data = imgData.data;
    const span = CHROMA_HIGH - CHROMA_LOW;
    for (let i = 0; i < data.length; i += 4) {
        // Perceived luminance of the pixel.
        const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        if (lum <= CHROMA_LOW) {
            data[i + 3] = 0;
        } else if (lum < CHROMA_HIGH) {
            data[i + 3] = Math.round(((lum - CHROMA_LOW) / span) * 255);
        }
    }
    tempCtx.putImageData(imgData, 0, 0);
    return tempCanvas;
}

// Build a solid-white copy that keeps the source's alpha mask — used for a
// clean silhouette flash (unlike a brightness filter, this never reveals the
// sprite's residual dark background).
function makeSilhouette(src) {
    const c = document.createElement('canvas');
    c.width = src.width;
    c.height = src.height;
    const x = c.getContext('2d');
    x.drawImage(src, 0, 0);
    x.globalCompositeOperation = 'source-atop';
    x.fillStyle = '#ffffff';
    x.fillRect(0, 0, c.width, c.height);
    return c;
}

// callback() runs once all assets have loaded (or failed).
// onProgress(loaded, total) fires after each asset settles.
export function loadAssets(callback, onProgress) {
    for (const key in assetSources) {
        const img = new Image();
        img.src = assetSources[key];
        img.onload = () => {
            if (key === 'background') {
                images[key] = img;
            } else {
                const keyed = makeBlackTransparent(img);
                images[key] = keyed;
                silhouettes[key] = makeSilhouette(keyed);
            }
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
