# Blunt Hunt v0.78 - Developer User Guide

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

### Pause Feature (`game.js`)

- **Trigger**: Toggled by clicking the wallet address button in the top right corner.
- **Mechanics**: Sets `this.paused` flag. Stops `update()` loop but keeps `draw()` loop running for a static frame.
- **Visuals**: Displays a white "PAUSED" overlay in the center of the screen.

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
- **Dependencies**: Only `requirements.txt` is needed (`Flask`).
- **Ignore**: Do NOT upload `node_modules`.

## ⛓️ Smart Contract Workflow

### 1. Deployment (`deploy.html`)

We use a client-side deployment tool to avoid requiring a complex local crypto environment.

1. Open `static/deploy.html` in your browser.
2. Connect your MetaMask (ensure Dogechain network).
3. Click **Deploy Contract**.
4. **COPY** the resulting Contract Address from the log.

### 2. Configuration (`wallet.js`)

You must tell the frontend where to find your new contract.

1. Open `static/js/wallet.js`.
2. Find line ~191: `const LEADERBOARD_CONTRACT_ADDRESS = "..."`.
3. Paste your new address there.
4. Save and deploy your frontend.

### 3. Admin: Fund Recovery (`admin.html`)

The contract collects 25% of fees for the Dev and 75% for the Pot. The Pot pays out automatically, but if you need to recover funds manually:

1. Open `static/admin.html` in your browser.
2. Connect the **Owner Wallet** (the one that deployed the contract).
3. Click **Recover Funds** to withdraw the entire contract balance to your wallet.

## 🕒 Game Schedule & Payout Mechanics

The game operates on a strict **Hourly Schedule**, ending at **Minute 42** of every hour.

### 1. The Schedule (Automatic)

The Smart Contract automatically calculates the deadline.

- If a game starts at **14:30**, it ends at **14:42**.
- If a game starts at **14:50**, it ends at **15:42**.
- **Payout Time**: The moment the clock strikes **XX:42**, the round is officially Over.

### 2. The Payout Trigger (Hybrid System)

Because the blockchain cannot "wake up" by itself, the payout needs a nudge. This happens in two reliable ways:

#### A. The "Polite" Trigger (Primary)

- **When**: You (or any user) connect your wallet to the site.
- **What Happens**: The site checks if the time is past XX:42.
- **Action**: A popup appears: *"Round Ended! Click OK to distribute prize."*
- **Result**: You sign the transaction -> Winner gets paid -> Leaderboard Wipes -> Timer Resets.

#### B. The "Forceful" Trigger (Backup)

- **When**: Only if nobody connects via the site, but someone manages to send a "Pay 1 DOGE" transaction directly.
- **Action**: The contract prevents the new game from starting until the old business is settled.
- **Result**: The new player's transaction *automatically* pays the previous winner first, resets the leaderboard, and **then** starts the new game.

### 3. What Happens During Payout?

All of these actions happen **simultaneously** in a single transaction:

1. **Prize Sent**: The entire Pot is sent to the wallet of Rank #1.
2. **Leaderboard Wiped**: The list of names and scores is permanently deleted.
3. **Timer Reset**: The `gameEndTime` is updated to the *next* XX:42.

### 4. Example Scenario

1. **10:30 AM**: Players play, pot grows to 500 DOGE.
2. **10:42 AM**: Time is up.
3. **10:43 AM**: You visit the site.
4. **Popup**: "Round Ended". You click OK.
5. **Transaction**: The 500 DOGE is sent to the winner. The board is now empty.
6. **10:44 AM**: New round begins! Timer counts down to 11:42 AM.

### 5. FAQ Modal

- Accessible via the **"faq"** link in the footer.
- Explains the Pot mechanics: 75% to Pot, Winner takes all (Rank #1), resets on payout.

### 6. UX Improvements

- **Start Button**: Automatically disabled until the system verifies the payout status.
- **Seamless Reset**: Confirming a payout resets the UI and Pot *without* reloading the page.
