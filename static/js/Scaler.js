/**
 * Scaler.js
 * Responsible for scaling the fixed-resolution #app-root to fit the window.
 * Maintains aspect ratio and centers the content.
 */
class Scaler {
    constructor(targetId, baseWidth, baseHeight) {
        this.target = document.getElementById(targetId);
        this.baseWidth = baseWidth;
        this.baseHeight = baseHeight;

        // Debounce resize
        this.resizeTimeout = null;
        this.isLandscape = false;

        if (this.target) {
            this.init();
        } else {
            console.warn(`Scaler: Target #${targetId} not found.`);
        }
    }

    init() {
        // Initial Scale
        this.applyScale();

        // Listen for Window Resize
        window.addEventListener('resize', () => {
            if (this.resizeTimeout) cancelAnimationFrame(this.resizeTimeout);
            this.resizeTimeout = requestAnimationFrame(() => this.applyScale());
        });

        // Force opacity 1 after init to prevent FOUC (Flash of Unstyled Content)
        setTimeout(() => {
            if (this.target) this.target.style.opacity = '1';
        }, 100);
    }

    applyScale() {
        if (!this.target) return;

        // Current Window Dimensions
        const winW = window.innerWidth;
        const winH = window.innerHeight;

        // Use dimensions based on orientation mode
        // If Landscape mode is forced, we swap the "available" window space logic
        // strictly for the purpose of calculating the fit.
        // But visually we are just rotating the container.

        let availableW = winW;
        let availableH = winH;

        if (this.isLandscape) {
            // If we rotate 90deg, the "width" of the space is the window's height
            availableW = winH;
            availableH = winW;
        }

        // Calculate Scale ratios against the Base Game Resolution
        const scaleX = availableW / this.baseWidth;
        const scaleY = availableH / this.baseHeight;

        // "Contain" logic: fit completely visible
        // We ALWAYS preserve aspect ratio
        const scale = Math.min(scaleX, scaleY);
        let finalScaleX = scale;
        let finalScaleY = scale;

        // Apply
        // We set the transform
        let transform = `scale(${finalScaleX}, ${finalScaleY})`;
        if (this.isLandscape) {
            transform += ' rotate(90deg)';
        }

        this.target.style.transform = transform;

        // Update Global Scale Globals
        window.GAME_SCALE_X = finalScaleX;
        window.GAME_SCALE_Y = finalScaleY;
        window.GAME_SCALE = finalScaleX;

        // Expose Landscape state for Inputs
        window.IS_LANDSCAPE = this.isLandscape;

        // Scaler Applied
    }

    toggleLandscape() {
        this.isLandscape = !this.isLandscape;
        this.applyScale();
        return this.isLandscape;
    }
}

// Auto-init on load
window.addEventListener('DOMContentLoaded', () => {
    // 640x480 Game + ~30px Footer space = ~510px height ?
    // Let's target the exact container definition we will set in CSS.
    // Width: 640
    // Height: 520 (480 Game + 40 Footer/Margin area)
    window.scaler = new Scaler('app-root', 640, 520);
});
