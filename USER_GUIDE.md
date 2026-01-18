# Blunt Hunt - Developer User Guide

This document contains internal development notes, deployment instructions, and maintenance details for **Blunt Hunt**.

## 📂 Project Structure

- **app.py**: Main Flask application entry point. Handles routes and API endpoints.
- **templates/**: HTML templates. `index.html` is the main game interface.
- **static/**: Static assets.
  - **css/**: Stylesheets (`style.css`).
  - **js/**: Game logic (`game.js`, `sprite.js`, `audio.js`, `wallet.js`).
  - **images/**: Game assets.

## ⚙️ Game Mechanics Implementation

### Score & Multipliers (`game.js`)

- **Combo Logic**:
  - `this.combo`: Increments on every fatal hit. Resets to 0 if `!this.shotHit` when Husky leaves screen.
  - `this.multiplier`: `Math.min(5, Math.max(1, this.combo))`. Capped at 5x.
  - **Visuals**: The purple floating text (`x5`) **only** displays this Combo Multiplier.
- **Round Multiplier**:
  - There is a hidden global multiplier: `totalMultiplier = this.multiplier * this.round`.
  - UI shows the *result* of this in the Points text (`+50`), but the explicit "x?" text remains focused on the Combo streak logic.

### Blunt Types (`game.js` -> `spawnBlunt`)

- **Normal**: Base speed, 1 HP.
- **Gold** (`rand < 0.1`): 1.5x Speed, 50 Pts.
- **Armored** (`rand < 0.25`): 0.8x Speed, 25 Pts, **2 HP**.
  - **Collision**: Logic handles `!result.destroyed` to trigger a bounce (`dx *= -0.8`), play a "Clink" sound, and most importantly sets `this.shotHit = true` to preserve the combo.

### Progression (`advanceRound`)

- Triggered when `hitsInRound >= 10`.
- **Speed**: Increases by 20% per round (`this.speedMultiplier += 0.2`).
- **Time Bonus**: Adds **5 seconds** to `this.gameDuration`.
  - *Visual*: Injects a temporary DOM element into `#header-left` for the "+5 SEC" green text.

## 🎵 Audio System (`audio.js`)

- **Procedural Generation**: Uses Web Audio API to generate Dub Reggae-style music on the fly.
- **Stability**: Uses `linearRampToValueAtTime` for volume envelopes to prevent `RangeError` crashes at 0 volume.
- **Siren**: A procedural Dub Siren (`playSiren`) plays on round transitions.

## 🛠️ Local Development

1. **Environment Setup**:

    ```bash
    python -m venv venv
    .\venv\Scripts\activate
    pip install -r requirements.txt
    ```

2. **Run Locally**:

    ```bash
    python app.py
    ```

    Access at `http://localhost:5000`.

## ☁️ Deployment (Vercel)

- Configured via `vercel.json` to use `@vercel/python` runtime.
- **Note**: Local `leaderboard.json` is ephemeral and resets on deployment. Use Smart Contract or DB for production.
