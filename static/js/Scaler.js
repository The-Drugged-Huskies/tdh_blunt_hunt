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
        this.isStretch = false;

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
        // We use innerWidth/Height to account for mobile bars dynamically
        const winW = window.innerWidth;
        const winH = window.innerHeight;

        // Calculate Scale ratios
        const scaleX = winW / this.baseWidth;
        const scaleY = winH / this.baseHeight;

        // "Contain" logic: fit completely visible
        // If stretch mode is on, we scale X and Y independently
        let finalScaleX = scaleX;
        let finalScaleY = scaleY;

        if (!this.isStretch) {
            const scale = Math.min(scaleX, scaleY);
            finalScaleX = scale;
            finalScaleY = scale;
        }

        // Apply
        // We set the transform
        this.target.style.transform = `scale(${finalScaleX}, ${finalScaleY})`;

        // Centering is handled by CSS (flex parent), 
        // but we assume parent is Flex Center.

        // Expose scale for InputSystem (Uniform scale assumption for mouse logic might break with stretch?)
        // InputSystem needs both scales if we stretch.
        window.GAME_SCALE_X = finalScaleX;
        window.GAME_SCALE_Y = finalScaleY;
        window.GAME_SCALE = finalScaleX; // Legacy fallback

        console.log(`[Scaler] Applied Scale: ${finalScaleX.toFixed(3)}x${finalScaleY.toFixed(3)} (Window: ${winW}x${winH})`);
    }

    toggleStretch() {
        this.isStretch = !this.isStretch;
        this.applyScale();
        return this.isStretch;
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
