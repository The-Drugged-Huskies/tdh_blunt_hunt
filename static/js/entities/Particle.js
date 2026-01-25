class Particle {
    constructor(x, y, color, speed, life) {
        this.x = x;
        this.y = y;
        this.color = color;
        const angle = Math.random() * Math.PI * 2;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.life = life;
        this.maxLife = life;
        this.size = Math.random() * 4 + 2;
        this.gravity = 0.1;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.life--;
    }
    draw(ctx) {
        ctx.globalAlpha = this.life / this.maxLife;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.globalAlpha = 1;
    }
}

class FloatingText {
    constructor(x, y, text, color) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.life = 60; // frames
        this.maxLife = 60;
        this.vy = -1; // float up
    }
    update() {
        this.y += this.vy;
        this.life--;
    }
    draw(ctx) {
        ctx.globalAlpha = this.life / this.maxLife;
        ctx.fillStyle = this.color;
        ctx.font = '10px "Press Start 2P"';
        ctx.fillText(this.text, this.x, this.y);
        ctx.globalAlpha = 1;
    }
}

class ParticleManager {
    constructor(game) {
        this.game = game;
        this.particles = [];
        this.texts = [];
        // Sprite particles not currently used, keeping logic simple for now
    }
    spawnExplosion(x, y, color = '#8b4513') { // blunt brown
        for (let i = 0; i < 10; i++) {
            this.particles.push(new Particle(x, y, color, Math.random() * 2 + 1, 30 + Math.random() * 20));
        }
    }
    spawnFloatingText(x, y, text, color = '#fff') {
        this.texts.push(new FloatingText(x, y, text, color));
    }
    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            p.update();
            if (p.life <= 0) this.particles.splice(i, 1);
        }
        for (let i = this.texts.length - 1; i >= 0; i--) {
            let t = this.texts[i];
            t.update();
            if (t.life <= 0) this.texts.splice(i, 1);
        }
    }
    draw(ctx) {
        this.particles.forEach(p => p.draw(ctx));
        this.texts.forEach(t => t.draw(ctx));
    }
}
