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

// Chroma-key the solid background field to transparent, faking an alpha channel
// at load. Sprites here are opaque JPEG on either a black OR white field
// (charger is white-backed), so we detect the corner luminance and key that
// end of the range, with a feathered band to soften the fringe.
const DARK_LOW = 24, DARK_HIGH = 60;      // black bg: transparent below, opaque above
const LIGHT_HIGH = 231, LIGHT_LOW = 195;  // white bg: transparent above, opaque below
function makeBlackTransparent(img) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = img.width;
    tempCanvas.height = img.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(img, 0, 0);

    const imgData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const data = imgData.data;
    const w = tempCanvas.width, h = tempCanvas.height;
    const lumAt = (i) => 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    // Vote across all four corners so one corner touched by artwork can't flip
    // the black-vs-white background decision.
    const corners = [0, (w - 1) * 4, (h - 1) * w * 4, ((h - 1) * w + (w - 1)) * 4];
    const lightBg = corners.filter(c => lumAt(c) > 128).length >= 2;

    for (let i = 0; i < data.length; i += 4) {
        const lum = lumAt(i);
        if (lightBg) {
            if (lum >= LIGHT_HIGH) data[i + 3] = 0;
            else if (lum > LIGHT_LOW) data[i + 3] = Math.round(((LIGHT_HIGH - lum) / (LIGHT_HIGH - LIGHT_LOW)) * 255);
        } else {
            if (lum <= DARK_LOW) data[i + 3] = 0;
            else if (lum < DARK_HIGH) data[i + 3] = Math.round(((lum - DARK_LOW) / (DARK_HIGH - DARK_LOW)) * 255);
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
