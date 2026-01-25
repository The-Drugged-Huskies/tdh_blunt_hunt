class Slingshot {
    constructor(game) {
        this.game = game;

        // Default values, will be set by updatePosition
        this.x = 0;
        this.y = 0;
        this.dragX = 0;
        this.dragY = 0;

        this.isDragging = false;
        this.maxPull = 140;
        this.wobbleStartTime = 0;

        this.sprite = new Sprite({
            image: this.game.assets['slingshot']
        });

        this.huskySprite = new Sprite({
            image: this.game.assets['husky']
        });

        this.updatePosition();
    }

    updatePosition() {
        // NES Resolution 320x240
        this.x = this.game.width / 2;

        // Ground/Positioning:
        // Reset to 400 (Original/Base position)
        this.y = 400;

        if (!this.isDragging) {
            this.dragX = this.x;
            this.dragY = this.y - 40;
        }
    }

    onMouseDown(x, y) {
        // Scale input coordinates to canvas 320x180
        const rect = this.game.canvas.getBoundingClientRect();
        const scaleX = this.game.width / rect.width;
        const scaleY = this.game.height / rect.height;

        const gameX = (x - rect.left) * scaleX;
        const gameY = (y - rect.top) * scaleY;

        const dist = Math.hypot(gameX - this.x, gameY - this.y);
        // Interaction radius increased for easier grabbing (covers the husky position)
        if (dist < 80) {
            this.isDragging = true;
            this.dragX = gameX;
            this.dragY = gameY;
        }
    }

    onMouseMove(x, y) {
        if (this.isDragging) {
            const rect = this.game.canvas.getBoundingClientRect();
            const scaleX = this.game.width / rect.width;
            const scaleY = this.game.height / rect.height;

            const gameX = (x - rect.left) * scaleX;
            const gameY = (y - rect.top) * scaleY;

            const dx = gameX - this.x;
            const dy = gameY - this.y;
            const dist = Math.hypot(dx, dy);

            if (dist > this.maxPull) {
                const angle = Math.atan2(dy, dx);
                this.dragX = this.x + Math.cos(angle) * this.maxPull;
                this.dragY = this.y + Math.sin(angle) * this.maxPull;
            } else {
                this.dragX = gameX;
                this.dragY = gameY;
            }
        }
    }

    onMouseUp() {
        if (this.isDragging) {
            this.isDragging = false;
            this.shoot();
            this.dragX = this.x;
            this.dragY = this.y - 40;
        }
    }

    shoot() {
        const dx = this.x - this.dragX;
        const dy = this.y - this.dragY;
        const power = 0.15;

        if (!this.game.husky) {
            this.game.husky = new Husky(this.game, this.x, this.y, dx * power, dy * power);
            this.wobbleStartTime = performance.now();
            this.game.shotHit = false; // Reset hit tracking for this shot
            this.game.audio.shoot(); // PLAY SHOOT
        }
    }

    reset() {
        // Called when husky is off screen, can animate return of band
    }

    draw(ctx) {
        // Draw Bands Behind
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 6;
        ctx.beginPath();
        const leftTipX = this.x - 20;
        const leftTipY = this.y - 38;
        const rightTipX = this.x + 20;
        const rightTipY = this.y - 38;

        if (this.isDragging) {
            // Taut Lines (Dragging)
            ctx.moveTo(leftTipX, leftTipY);
            ctx.lineTo(this.dragX, this.dragY);
            ctx.lineTo(rightTipX, rightTipY);
        } else {
            // Relaxed / Drooping (Idle or Empty)
            ctx.moveTo(leftTipX, leftTipY);

            let controlY = this.y - 20; // Base relaxed depth

            // Add wobble if Empty (Husky flying)
            if (this.game.husky) {
                const timeSinceRelease = performance.now() - this.wobbleStartTime;
                if (timeSinceRelease < 1000) {
                    const frequency = 0.02;
                    const decay = 0.005;
                    const amplitude = 30;
                    const wobbleY = amplitude * Math.exp(-decay * timeSinceRelease) * Math.sin(frequency * timeSinceRelease);
                    controlY += wobbleY;
                }
            }

            // Curve down to the center
            ctx.quadraticCurveTo(this.x, controlY, rightTipX, rightTipY);
        }
        ctx.stroke();

        // Draw Sprite Base
        // Assuming sprite is centered at bottom
        this.sprite.draw(ctx, this.x, this.y, 80, 80);

        // Draw Husky if ready to shoot (not flying)
        if (!this.game.husky) {
            // Determine position: drag position if dragging, or center if idle
            const hx = this.isDragging ? this.dragX : this.x;
            // Align idle Y with the relaxed curve bottom (y - 20)
            const hy = this.isDragging ? this.dragY : this.y - 30;

            // Draw slightly smaller sized husky for the sling
            this.huskySprite.draw(ctx, hx, hy, 60, 60);
        }
    }
}
