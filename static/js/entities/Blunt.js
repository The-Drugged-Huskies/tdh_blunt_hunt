class Blunt {
    constructor(game, x, y, lifetime, speedMultiplier = 1) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.radius = 25;
        this.spawnTime = performance.now();
        this.lifetime = lifetime;
        this.baseY = y;

        this.sprite = new Sprite({
            image: this.game.assets['blunt']
        });

        // Speed increases with multiplier
        this.speed = (Math.random() * 2 + 1) * speedMultiplier;

        // Special Types
        const rand = Math.random();
        this.type = 'normal';
        this.basePoints = 10;
        this.hp = 1;
        this.color = null; // Default use sprite

        if (rand < 0.1) { // 10% Golden
            this.type = 'gold';
            this.speed *= 1.5;
            this.hp = 1;
            this.basePoints = 50; // 5x Standard
            this.color = '#FFD700';
        } else if (rand < 0.25) { // 15% Armored
            this.type = 'armored';
            this.speed *= 0.8;
            this.hp = 2; // Takes 2 hits
            this.basePoints = 25;
            this.color = '#A0A0A0';
        }

        // Reduced amplitude to prevent swooping too low
        this.amplitude = Math.random() * 20 + 20;
        this.frequency = Math.random() * 0.005 + 0.002;
        this.direction = Math.random() > 0.5 ? 1 : -1;
        this.lastHitTime = 0;
    }

    hit() {
        const now = performance.now();
        if (now - this.lastHitTime < 400) {
            return { hit: false };
        }
        this.lastHitTime = now;
        this.hp--;
        return {
            hit: true,
            destroyed: this.hp <= 0,
            score: this.basePoints
        };
    }

    isExpired(timestamp) {
        return (timestamp - this.spawnTime) > this.lifetime;
    }

    update(timestamp) {
        const age = timestamp - this.spawnTime;

        // Horizontal movement
        this.x += this.speed * this.direction;

        // Zigzag / Sine wave
        this.y = this.baseY + Math.sin(age * this.frequency) * this.amplitude;

        // Bounce off walls
        if (this.x > this.game.width - 50 || this.x < 50) {
            this.direction *= -1;
        }

        this.sprite.update(timestamp);
    }

    draw(ctx) {
        const age = performance.now() - this.spawnTime;
        // Opacity fade out near end
        let alpha = 1;
        if (age > this.lifetime - 1000) {
            alpha = (this.lifetime - age) / 1000;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, alpha);

        this.sprite.draw(ctx, this.x, this.y, 60, 60, 0); // Slight larger

        // Overlay for special types
        if (this.type === 'gold') {
            ctx.globalCompositeOperation = 'source-atop'; // Tint? or just draw circle
            ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
            ctx.beginPath();
            ctx.arc(this.x, this.y, 30, 0, Math.PI * 2);
            ctx.fill();
            // Sparkle effect?
            if (Math.random() < 0.2) {
                ctx.fillStyle = '#fff';
                ctx.fillRect(this.x + (Math.random() - 0.5) * 40, this.y + (Math.random() - 0.5) * 40, 4, 4);
            }
        } else if (this.type === 'armored') {
            ctx.fillStyle = 'rgba(100, 100, 100, 0.4)';
            ctx.beginPath();
            ctx.arc(this.x, this.y, 30, 0, Math.PI * 2);
            ctx.fill();
            // Draw HP indicator if damaged?
        }

        ctx.restore();
    }
}
