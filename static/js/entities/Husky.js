class Husky {
    constructor(game, x, y, dx, dy) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.dx = dx;
        this.dy = dy;
        this.radius = 25;
        this.gravity = 0.4;
        this.friction = 0.99;
        this.rotation = 0;
        this.wobble = 0;

        this.sprite = new Sprite({
            image: this.game.assets['husky']
        });
    }

    update(timestamp) {
        this.x += this.dx;
        this.y += this.dy;
        this.dy += this.gravity;

        // Calculate rotation based on velocity
        this.rotation = Math.atan2(this.dy, this.dx);

        // Animate wobbling
        this.wobble += 0.5;

        this.sprite.update(timestamp);
    }

    draw(ctx) {
        // Procedural Animation: Squash and Stretch
        const scale = 1 + Math.sin(this.wobble) * 0.25;
        const width = 70 * scale;
        const height = 70 * (2 - scale); // Preserve approximate area

        this.sprite.draw(ctx, this.x, this.y, width, height, this.rotation);
    }
}
