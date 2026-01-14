/**
 * Game Class
 * Manages the main game loop, state, and rendering context.
 * Coordinates interaction between the Slingshot, Husky, and Blunts.
 */
class Game {
    constructor(assets) {
        /** @type {HTMLCanvasElement} */
        this.canvas = document.getElementById('gameCanvas');
        /** @type {CanvasRenderingContext2D} */
        this.ctx = this.canvas.getContext('2d');
        this.assets = assets;

        // Fixed NES-like Resolution
        this.canvas.width = 320;
        this.canvas.height = 240; // Increased height to include HUD area for canvas coverage
        this.width = 320;
        this.height = 240;

        this.hudHeight = 40; // Visual height of HUD in game coordinates (approx)

        // Disable smoothing for pixel look
        this.ctx.imageSmoothingEnabled = false;

        this.slingshot = new Slingshot(this);
        this.husky = null;
        this.blunts = [];
        this.score = 0;
        this.isRunning = false;

        // Difficulty settings
        this.bluntSpawnRate = 2000; //ms
        this.bluntLifeTime = 5000; // ms, decreases over time
        // State
        this.round = 1;
        this.hitsInRound = 0;
        this.speedMultiplier = 1;
        this.lastSpawnTime = 0;

        this.resize();
        window.addEventListener('resize', () => this.resize());

        // Input handling
        this.canvas.addEventListener('mousedown', (e) => this.slingshot.onMouseDown(e.clientX, e.clientY));
        window.addEventListener('mousemove', (e) => this.slingshot.onMouseMove(e.clientX, e.clientY));
        window.addEventListener('mouseup', () => this.slingshot.onMouseUp());

        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.slingshot.onMouseDown(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: false });
        window.addEventListener('touchmove', (e) => {
            e.preventDefault();
            this.slingshot.onMouseMove(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: false });
        window.addEventListener('touchend', () => this.slingshot.onMouseUp());

        // UI
        this.startBtn = document.getElementById('start-btn');
        this.restartBtn = document.getElementById('restart-btn');

        this.startBtn.addEventListener('click', () => this.start());
        this.restartBtn.addEventListener('click', () => this.start());

        this.loop = this.loop.bind(this);

        // Populate hit markers for UI (10 slots for example)
        this.hitMarkers = document.getElementById('hit-markers');
        this.hitMarkers.innerHTML = '';
        for (let i = 0; i < 10; i++) {
            const dot = document.createElement('div');
            dot.className = 'hit-marker';
            this.hitMarkers.appendChild(dot);
        }
        this.hits = 0;

        // Leaderboard UI
        this.leaderboardBtn = document.getElementById('leaderboard-btn');
        this.leaderboardScreen = document.getElementById('leaderboard-screen');
        this.closeLeaderboardBtn = document.getElementById('close-leaderboard-btn');
        this.leaderboardRows = document.getElementById('leaderboard-rows');

        if (this.leaderboardBtn) this.leaderboardBtn.addEventListener('click', () => this.showLeaderboard());
        if (this.closeLeaderboardBtn) this.closeLeaderboardBtn.addEventListener('click', () => this.hideLeaderboard());
    }



    resize() {
        // Size canvas to its CSS dimensions (which are controlled by the 4:3 container)
        // We want 1:1 pixel mapping for crisp look
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;

        this.width = this.canvas.width;
        this.height = this.canvas.height;

        if (this.slingshot) {
            this.slingshot.updatePosition();
        }
    }

    start() {
        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('game-over-screen').classList.add('hidden');
        document.getElementById('nes-hud').classList.remove('hidden');

        // Swap Leaderboard Button with Timer
        if (this.leaderboardBtn) this.leaderboardBtn.classList.add('hidden');
        document.getElementById('timer-display').classList.remove('hidden');

        // Reset State
        this.score = 0;
        this.round = 1;
        this.hitsInRound = 0;
        this.speedMultiplier = 1;

        // Update UI
        this.updateScore(0);
        document.getElementById('round-display').innerText = `R=${this.round}`;

        // Set Background Image directly on DOM
        const bgDiv = document.getElementById('game-background');
        if (bgDiv && this.assets['background']) {
            bgDiv.style.backgroundImage = `url('${this.assets['background'].src}')`;
        }

        this.blunts = [];
        this.husky = null;
        this.isRunning = true;
        this.hits = 0; // Total hits (visual dots)
        this.updateHitMarkers();
        this.bluntLifeTime = 5000;
        this.lastSpawnTime = performance.now();

        // Timer Logic
        this.gameDuration = 60; // seconds
        this.startTime = performance.now();

        requestAnimationFrame(this.loop);
    }

    gameOver() {
        this.isRunning = false;
        document.getElementById('final-score').innerText = this.score;
        document.getElementById('game-over-screen').classList.remove('hidden');

        // Swap Back
        document.getElementById('timer-display').classList.add('hidden');
        if (this.leaderboardBtn) this.leaderboardBtn.classList.remove('hidden');

        // Submit Score
        this.submitScore();
    }

    async submitScore() {
        const wallet = window.getCurrentWallet ? window.getCurrentWallet() : null;
        const name = wallet ? wallet : "Guest";

        try {
            const res = await fetch('/submit-score', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name, score: this.score })
            });
            const data = await res.json();
            if (data.success) {
                console.log("Score submitted! Rank:", data.rank);
                // Optional: Update UI to show submission status
            }
        } catch (err) {
            console.error("Failed to submit score:", err);
        }
    }

    updateScore(points) {
        this.score += points;
        // Pad score to 6 digits
        const scoreStr = this.score.toString().padStart(6, '0');
        document.getElementById('score').innerText = scoreStr;

        if (points > 0) {
            // this.hits++; removed, handled in collision
            // this.updateHitMarkers();
        }

        // Increase difficulty based on total score or rounds if desired
        // this.bluntLifeTime = Math.max(1000, 5000 - (this.score * 100));
    }

    advanceRound() {
        this.round++;
        this.speedMultiplier += 0.2; // 20% speed increase per round
        this.hitsInRound = 0;

        // Update UI
        document.getElementById('round-display').innerText = `R=${this.round}`;

        // Visual Effect
        const hudCenter = document.querySelector('.hud-section.center');
        hudCenter.classList.add('flash-success');
        setTimeout(() => hudCenter.classList.remove('flash-success'), 1500);

        // Reset visuals for round progression
        this.hits = 0;
        this.updateHitMarkers();
    }

    updateHitMarkers() {
        const markers = this.hitMarkers.children;
        for (let i = 0; i < markers.length; i++) {
            if (i < this.hits) {
                markers[i].classList.add('active');
            } else {
                markers[i].classList.remove('active');
            }
        }
    }

    updateTimer(timestamp) {
        const elapsed = (timestamp - this.startTime) / 1000;
        const remaining = Math.max(0, this.gameDuration - elapsed);

        const seconds = Math.ceil(remaining);
        const fmt = seconds < 10 ? `0${seconds}` : seconds;

        // Update Timer Display in HUD
        const timerEl = document.getElementById('timer-display');
        if (timerEl) {
            timerEl.innerText = `TIME: ${fmt}`;
            // Red warning
            timerEl.style.color = remaining < 10 ? 'red' : 'white';
        }

        if (remaining <= 0) {
            this.gameOver();
        }
        // No timer display in NES HUD for now, or could map to one of the boxes
    }

    loop(timestamp) {
        if (!this.isRunning) return;

        this.ctx.clearRect(0, 0, this.width, this.height);



        // Background is now handled by CSS/DOM layer behind canvas
        // HUD is also a DOM element behind canvas but z-index 5

        // Debug safe area (optional)
        // this.ctx.strokeStyle = 'red';
        // this.ctx.strokeRect(0, 0, this.width, this.height - this.hudHeight);

        this.updateTimer(timestamp);

        // Update & Draw Slingshot
        this.slingshot.draw(this.ctx);

        // Update & Draw Husky
        if (this.husky) {
            this.husky.update(timestamp);
            this.husky.draw(this.ctx);

            // Check boundaries
            if (this.husky.y > this.height + 100 || this.husky.x > this.width + 100 || this.husky.x < -100) {
                this.husky = null; // Reset husky if it goes off screen
                this.slingshot.reset();
            }
        }

        // Spawn Blunts
        if (timestamp - this.lastSpawnTime > this.bluntSpawnRate) {
            this.spawnBlunt();
            this.lastSpawnTime = timestamp;
        }

        // Update & Draw Blunts
        for (let i = this.blunts.length - 1; i >= 0; i--) {
            let blunt = this.blunts[i];
            blunt.update(timestamp);
            blunt.draw(this.ctx);

            // Collision Detection
            if (this.husky && this.checkCollision(this.husky, blunt)) {
                this.blunts.splice(i, 1);

                // Score based on Round
                this.updateScore(this.round);

                // Round Progression
                this.hitsInRound++;

                // Update hit markers visually
                this.hits = this.hitsInRound;
                this.updateHitMarkers();

                if (this.hitsInRound >= 10) {
                    this.advanceRound();
                }

                continue;
            }

            // Remove if expired
            if (blunt.isExpired(timestamp)) {
                this.blunts.splice(i, 1);
            }
        }

        requestAnimationFrame(this.loop);
    }

    spawnBlunt() {
        const x = Math.random() * (this.width - 100) + 50;

        // Dynamic Spawn Range
        // Keep blunts above the HUD area
        const topLimit = 60; // Clear top header
        const bottomLimit = this.height - 80; // Clear HUD area significantly
        const spawnRange = Math.max(50, bottomLimit - topLimit);

        const y = Math.random() * spawnRange + topLimit;
        this.blunts.push(new Blunt(this, x, y, this.bluntLifeTime, this.speedMultiplier));
    }

    checkCollision(circle1, circle2) {
        // Use simpler collision, maybe bounding box or reduced radius for sprites
        const dx = circle1.x - circle2.x;
        const dy = circle1.y - circle2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        // Reduce radius for tighter hitboxes
        return distance < (circle1.radius * 0.8 + circle2.radius * 0.8);
    }
    async showLeaderboard() {
        this.leaderboardScreen.classList.remove('hidden');
        document.getElementById('start-screen').classList.add('hidden');

        try {
            const res = await fetch('/static/data/leaderboard.json');
            const data = await res.json();

            // Filter Top 10
            const top10 = data.slice(0, 10);

            this.leaderboardRows.innerHTML = '';
            top10.forEach(entry => {
                let displayName = entry.name;
                if (displayName.length > 12) {
                    // Formatting like wallet: 0x1234...5678
                    if (displayName.startsWith('0x')) {
                        displayName = `${displayName.substring(0, 6)}...${displayName.substring(displayName.length - 4)}`;
                    } else {
                        displayName = displayName.substring(0, 10) + '...';
                    }
                }

                const row = document.createElement('div');
                row.className = 'leaderboard-row';
                row.innerHTML = `<span>${entry.rank}</span><span>${displayName}</span><span>${entry.score}</span>`;
                this.leaderboardRows.appendChild(row);
            });

        } catch (err) {
            console.error("Failed to load leaderboard", err);
            this.leaderboardRows.innerHTML = '<p>Failed to load data.</p>';
        }
    }

    hideLeaderboard() {
        this.leaderboardScreen.classList.add('hidden');
        document.getElementById('start-screen').classList.remove('hidden');
    }
}

/**
 * Slingshot Class
 * Handles the physics and user interaction for aiming and launching projectiles.
 */
class Slingshot {
    /**
     * @param {Game} game - Reference to the main game instance.
     */
    constructor(game) {
        this.game = game;
        this.updatePosition();
        this.isDragging = false;
        this.dragX = this.x;
        this.dragY = this.y;
        this.isDragging = false;
        this.dragX = this.x;
        this.dragY = this.y;
        this.maxPull = 150;

        // Sprite
        this.sprite = new Sprite({
            image: this.game.assets['slingshot']
        });

        // Husky Sprite for aiming
        this.huskySprite = new Sprite({
            image: this.game.assets['husky']
        });
    }

    updatePosition() {
        this.x = this.game.width / 2;
        // Position visually on the "grass" which is bottom of screen behind HUD
        // Since Canvas is now full height (overlaying HUD), we position it lower
        this.y = this.game.height - 90;
    }

    onMouseDown(x, y) {
        // Scale input coordinates to canvas 320x180
        const rect = this.game.canvas.getBoundingClientRect();
        const scaleX = this.game.width / rect.width;
        const scaleY = this.game.height / rect.height;

        const gameX = (x - rect.left) * scaleX;
        const gameY = (y - rect.top) * scaleY;

        const dist = Math.hypot(gameX - this.x, gameY - this.y);
        if (dist < 40) { // Interaction radius
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
            this.dragY = this.y;
        }
    }

    shoot() {
        const dx = this.x - this.dragX;
        const dy = this.y - this.dragY;
        const power = 0.15;

        if (!this.game.husky) {
            this.game.husky = new Husky(this.game, this.x, this.y, dx * power, dy * power);
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
        ctx.moveTo(this.x - 25, this.y - 40); // Left fork tip approx
        ctx.lineTo(this.dragX, this.dragY);
        ctx.lineTo(this.x + 25, this.y - 40); // Right fork tip approx
        ctx.stroke();

        // Draw Sprite Base
        // Assuming sprite is centered at bottom
        this.sprite.draw(ctx, this.x, this.y, 80, 80);

        // Draw Husky if ready to shoot (not flying)
        if (!this.game.husky) {
            // Determine position: drag position if dragging, or center if idle
            const hx = this.isDragging ? this.dragX : this.x;
            const hy = this.isDragging ? this.dragY : this.y - 40; // Approx pouch height if idle

            // Draw slightly smaller sized husky for the sling
            this.huskySprite.draw(ctx, hx, hy, 60, 60);
        }
    }
}

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

        this.sprite = new Sprite({
            image: this.game.assets['husky']
        });
        // this.sprite.setAnimation('fly');
    }

    update(timestamp) {
        this.x += this.dx;
        this.y += this.dy;
        this.dy += this.gravity;
        // this.dx *= this.friction; 

        // Calculate rotation based on velocity
        this.rotation = Math.atan2(this.dy, this.dx);

        this.sprite.update(timestamp);
    }

    draw(ctx) {
        this.sprite.draw(ctx, this.x, this.y, 70, 70, this.rotation);
    }
}

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
        this.amplitude = Math.random() * 50 + 20;
        this.frequency = Math.random() * 0.005 + 0.002;
        this.direction = Math.random() > 0.5 ? 1 : -1;
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
            // Slightly erratic bounce speed change?
            // this.speed = (Math.random() * 2 + 1) * this.game.speedMultiplier; 
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

        ctx.restore();
    }
}

// Initialize game on load
window.onload = async () => {
    const loader = new AssetLoader();
    const assetsToLoad = {
        'husky': '/static/images/husky.png',
        'blunt': '/static/images/blunt.png',
        'slingshot': '/static/images/slingshot.png',
        'background': '/static/images/background.png'
    };

    try {
        const loadedAssets = {};
        for (const [key, url] of Object.entries(assetsToLoad)) {
            loadedAssets[key] = await loader.loadImage(key, url);
        }

        // Start Game
        const game = new Game(loadedAssets);

    } catch (err) {
        console.error("Error loading assets:", err);
        alert("Failed to load game assets. Check console.");
    }
};
