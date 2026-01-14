/**
 * sprite.js
 * Handles asset loading and sprite rendering/animation.
 */

class AssetLoader {
    constructor() {
        this.assets = {};
        this.loadedCount = 0;
        this.totalCount = 0;
    }

    /**
     * Load an image asset.
     * @param {string} key - Unique key for the asset.
     * @param {string} src - URL of the image.
     * @returns {Promise} Resolves when image is loaded.
     */
    loadImage(key, src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            this.totalCount++;
            img.onload = () => {
                this.loadedCount++;
                this.assets[key] = img;
                console.log(`Loaded asset: ${key}`);
                resolve(img);
            };
            img.onerror = (e) => {
                console.error(`Failed to load asset: ${key}`, e);
                reject(e);
            };
            img.src = src;
        });
    }

}

class Sprite {
    /**
     * @param {object} options
     * @param {HTMLImageElement} options.image - The sprite sheet source image.
     * @param {number} options.frameWidth - Width of a single frame.
     * @param {number} options.frameHeight - Height of a single frame.
     * @param {object} options.animations - Map of animation names to row/col indices/array.
     *                                      Example: { idle: [0, 1, 2], fly: [3, 4, 5] }
     *                                      Or simple row based: { idle: 0, fly: 1 } if frames are sequential in a row.
     * @param {number} options.frameRate - Time in ms per frame (default 100ms).
     */
    constructor({ image, frameWidth, frameHeight, animations = {}, frameRate = 100 }) {
        this.image = image;
        this.frameWidth = frameWidth || image.width;
        this.frameHeight = frameHeight || image.height;
        this.animations = animations;
        this.frameRate = frameRate;

        this.currentAnim = null;
        this.currentFrameIndex = 0;
        this.lastFrameTime = 0;
        this.isLooping = true;
        this.isFinished = false;

        // Default to showing first frame if no animation set
        this.cols = Math.floor(this.image.width / this.frameWidth);
    }

    setAnimation(name, loop = true) {
        if (this.currentAnim !== name) {
            this.currentAnim = name;
            this.currentFrameIndex = 0;
            this.isLooping = loop;
            this.isFinished = false;
            this.lastFrameTime = performance.now();
        }
    }

    update(timestamp) {
        if (!this.currentAnim || this.isFinished) return;

        const frames = this.animations[this.currentAnim];
        // If undefined animation, do nothing
        if (!frames) return;

        if (timestamp - this.lastFrameTime >= this.frameRate) {
            this.currentFrameIndex++;

            // Check bounds
            if (this.currentFrameIndex >= frames.length) {
                if (this.isLooping) {
                    this.currentFrameIndex = 0;
                } else {
                    this.currentFrameIndex = frames.length - 1;
                    this.isFinished = true;
                }
            }

            this.lastFrameTime = timestamp;
        }
    }

    /**
     * Draws the sprite.
     * @param {CanvasRenderingContext2D} ctx 
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {number} width - Target width
     * @param {number} height - Target height
     * @param {number} rotation - Rotation in radians
     */
    draw(ctx, x, y, width, height, rotation = 0) {
        if (!this.image) return;

        let frameIndex = 0;

        // Determine frame index from animation or default 0
        if (this.currentAnim && this.animations[this.currentAnim]) {
            const frames = this.animations[this.currentAnim];
            frameIndex = frames[this.currentFrameIndex];
        }

        // Calculate source rectangle
        const col = frameIndex % this.cols;
        const row = Math.floor(frameIndex / this.cols);

        const sx = col * this.frameWidth;
        const sy = row * this.frameHeight;

        ctx.save();
        ctx.translate(x, y);
        if (rotation !== 0) {
            ctx.rotate(rotation);
        }

        // Draw centered
        // If width/height provided, scale to that, otherwise use frame size
        const w = width || this.frameWidth;
        const h = height || this.frameHeight;

        ctx.drawImage(
            this.image,
            sx, sy, this.frameWidth, this.frameHeight, // Source
            -w / 2, -h / 2, w, h                       // Dest (centered)
        );

        ctx.restore();
    }
}
