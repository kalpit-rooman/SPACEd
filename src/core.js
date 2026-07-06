// ============================================
// core.js — Canvas, context, and sizing
// ============================================
import { CANVAS } from './config.js';

export const canvas = document.getElementById('gameCanvas');
export const ctx = canvas.getContext('2d');

export function resizeCanvas() {
    canvas.width = Math.min(window.innerWidth - CANVAS.margin, CANVAS.maxWidth);
    canvas.height = Math.min(window.innerHeight - CANVAS.margin, CANVAS.maxHeight);
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);
