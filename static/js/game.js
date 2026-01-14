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
        this.particles = new ParticleManager(this);
        this.isRunning = false;

        // Difficulty settings
        this.bluntSpawnRate = 2000; //ms
        this.bluntLifeTime = 5000; // ms, decreases over time
        // State
        this.round = 1;
        this.hitsInRound = 0;
        this.speedMultiplier = 1;
        this.lastSpawnTime = 0;

        // Combo System
        this.combo = 0;
        this.multiplier = 1;
        this.shotHit = false;

        // Audio
        this.audio = new AudioManager();

        this.resize();
        window.addEventListener('resize', () => this.resize());

        // Screen Shake
        this.gameContainer = document.getElementById('game-container');
        this.shakeTime = 0;

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

        this.exitBtn = document.getElementById('exit-btn');
        if (this.exitBtn) this.exitBtn.addEventListener('click', () => this.exitToMenu());

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

        // Settings Logic
        this.settingsBtn = document.getElementById('settings-btn');
        this.settingsPopup = document.getElementById('settings-popup');
        this.closeSettingsBtn = document.getElementById('close-settings-btn');
        this.musicSlider = document.getElementById('music-volume');
        this.sfxSlider = document.getElementById('sfx-volume');

        if (this.settingsBtn) {
            this.settingsBtn.addEventListener('click', () => {
                this.settingsPopup.classList.remove('hidden');
                this.settingsBtn.classList.add('hidden'); // Hide self

                // Hide Start/Connect buttons
                const startConnectBtn = document.getElementById('start-connect-btn');
                if (startConnectBtn) startConnectBtn.classList.add('hidden');
                if (this.startBtn) this.startBtn.classList.add('hidden');

                // Hide Title/Subtitle
                const title = document.querySelector('#start-screen .title');
                const subtitle = document.querySelector('#start-screen .subtitle');
                if (title) title.classList.add('hidden');
                if (subtitle) subtitle.classList.add('hidden');
            });
        }
        if (this.closeSettingsBtn) {
            this.closeSettingsBtn.addEventListener('click', () => {
                this.settingsPopup.classList.add('hidden');
                this.settingsBtn.classList.remove('hidden'); // Show self

                // Restore Title/Subtitle
                const title = document.querySelector('#start-screen .title');
                const subtitle = document.querySelector('#start-screen .subtitle');
                if (title) title.classList.remove('hidden');
                if (subtitle) subtitle.classList.remove('hidden');

                // Restore Start/Connect based on wallet state
                const account = window.getCurrentWallet ? window.getCurrentWallet() : null;
                if (account) {
                    if (this.startBtn) this.startBtn.classList.remove('hidden');
                } else {
                    const startConnectBtn = document.getElementById('start-connect-btn');
                    if (startConnectBtn) startConnectBtn.classList.remove('hidden');
                }
            });
        }

        if (this.musicSlider) {
            this.musicSlider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value);
                this.audio.setMusicVolume(val);
            });
        }

        if (this.sfxSlider) {
            this.sfxSlider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value);
                this.audio.setSfxVolume(val);
            });
        }

        this.keySelect = document.getElementById('key-select');
        if (this.keySelect) {
            this.keySelect.addEventListener('change', (e) => {
                this.audio.setKey(e.target.value);
            });
        }
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
        if (this.isRunning) return;
        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('game-over-screen').classList.add('hidden');
        document.getElementById('nes-hud').classList.remove('hidden');

        // Ensure Header is Visible (in case we came from Game Over -> Try Again)
        document.getElementById('nes-header').style.visibility = 'visible';

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

        // Start Music
        this.audio.startMusic();

        requestAnimationFrame(this.loop);
    }

    gameOver() {
        this.isRunning = false;
        // Clear canvas to hide game elements
        this.ctx.clearRect(0, 0, this.width, this.height);

        // Stop Music
        this.audio.stopMusic();

        document.getElementById('final-score').innerText = this.score;
        document.getElementById('game-over-screen').classList.remove('hidden');

        // Hide Header (Leaderboard & Wallet)
        document.getElementById('nes-header').style.visibility = 'hidden';

        // Swap Back (logic kept for restart/exit consistency)
        document.getElementById('timer-display').classList.add('hidden');
        if (this.leaderboardBtn) this.leaderboardBtn.classList.remove('hidden');

        // Submit Score
        this.submitScore();
    }

    exitToMenu() {
        document.getElementById('game-over-screen').classList.add('hidden');
        document.getElementById('start-screen').classList.remove('hidden');
        document.getElementById('nes-hud').classList.add('hidden');

        // Restore Header
        document.getElementById('nes-header').style.visibility = 'visible';

        // Reset State (optional but good for clean start)
        this.score = 0;
        this.round = 1;
        this.hits = 0;
        this.updateHitMarkers();
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

        // Screen Shake Logic
        if (this.shakeTime > 0) {
            const dx = (Math.random() - 0.5) * 10;
            const dy = (Math.random() - 0.5) * 10;
            this.gameContainer.style.transform = `translate(${dx}px, ${dy}px)`;
            this.shakeTime--;
        } else {
            this.gameContainer.style.transform = 'none';
        }

        // Debug safe area (optional)
        // this.ctx.strokeStyle = 'red';
        // this.ctx.strokeRect(0, 0, this.width, this.height - this.hudHeight);

        this.updateTimer(timestamp);
        if (!this.isRunning) return; // Stop drawing if game ended in updateTimer

        // Update & Draw Particles (Behind sprites or on top? On top usually)
        this.particles.update();
        this.particles.draw(this.ctx);

        // Update & Draw Slingshot
        this.slingshot.draw(this.ctx);

        // Update & Draw Husky
        if (this.husky) {
            this.husky.update(timestamp);
            this.husky.draw(this.ctx);

            // Check boundaries
            if (this.husky.y > this.height + 100 || this.husky.x > this.width + 100 || this.husky.x < -100) {
                // Combo Reset on Miss
                if (!this.shotHit) {
                    this.combo = 0;
                    this.multiplier = 1;
                }

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

                const result = blunt.hit();
                if (!result.hit) continue; // Cooldown active, ignore collision

                if (!result.destroyed) {
                    // Armored Clink - Bounce husky
                    this.husky.dx *= -0.8;
                    this.husky.dy *= -0.8;

                    this.audio.clink(); // PLAY CLINK
                    this.particles.spawnFloatingText(blunt.x, blunt.y, "CLINK!", '#aaa');
                    this.particles.spawnExplosion(blunt.x, blunt.y, '#ccc');
                } else {
                    this.blunts.splice(i, 1);

                    // Track Hit for Combo
                    this.shotHit = true;
                    this.combo++;
                    // Simple multiplier logic: Every 2 hits increases tier (1x -> 2x -> 4x -> 8x)
                    // limit to 8x
                    this.multiplier = Math.min(8, Math.pow(2, Math.floor(this.combo / 2)));
                    if (this.combo < 1) this.multiplier = 1;

                    // Score based on Blunt Value
                    const points = result.score * this.multiplier;
                    this.updateScore(points);

                    // Trigger Visuals
                    if (blunt.type === 'gold') {
                        this.audio.goldHit();
                    } else {
                        this.audio.hit(); // PLAY CRUNCH
                    }
                    this.particles.spawnExplosion(blunt.x, blunt.y, blunt.type === 'gold' ? '#FFD700' : '#8b4513');

                    let text = `+${points}`;
                    if (this.multiplier > 1) {
                        text += ` (x${this.multiplier}!)`;
                    }
                    this.particles.spawnFloatingText(blunt.x, blunt.y, text, blunt.type === 'gold' ? '#FFD700' : '#fff');
                    this.triggerShake(10); // Shake for 10 frames

                    // Round Progression
                    this.hitsInRound++;

                    // Update hit markers visually
                    this.hits = this.hitsInRound;
                    this.updateHitMarkers();

                    if (this.hitsInRound >= 10) {
                        this.advanceRound();
                    }
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
        // Keep blunts strictly above the sling (which is at height - 90)
        const topLimit = 50; // Clear top header
        const bottomLimit = this.height - 150; // Keep well above sling (safe zone for amplitude)
        const spawnRange = Math.max(30, bottomLimit - topLimit);

        const y = Math.random() * spawnRange + topLimit;
        this.blunts.push(new Blunt(this, x, y, this.bluntLifeTime, this.speedMultiplier));
    }

    checkCollision(circle1, circle2) {
        // Use simpler collision, maybe bounding box or reduced radius for sprites
        const dx = circle1.x - circle2.x;
        const dy = circle1.y - circle2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        // Increase radius for easier hits (1.2x)
        return distance < (circle1.radius * 1.2 + circle2.radius * 1.2);
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

    triggerShake(duration) {
        this.shakeTime = duration;
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
        this.dragY = this.y - 40;
        this.maxPull = 150;

        // Sprite
        this.sprite = new Sprite({
            image: this.game.assets['slingshot']
        });

        // Husky Sprite for aiming
        this.huskySprite = new Sprite({
            image: this.game.assets['husky']
        });

        this.wobbleStartTime = 0;
    }

    updatePosition() {
        this.x = this.game.width / 2;
        // Position visually on the "grass" which is bottom of screen behind HUD
        // Since Canvas is now full height (overlaying HUD), we position it lower
        this.y = this.game.height - 90;

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
            this.basePoints = 50;
            this.color = '#FFD700';
        } else if (rand < 0.25) { // 15% Armored
            this.type = 'armored';
            this.speed *= 0.8;
            this.hp = 2; // Takes 2 hits
            this.basePoints = 20;
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

// --- Particle System ---
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
        this.image = new Image(); // Placeholder for maybe sprite particles
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
