# TDH BLUNT HUNT

**TDH BLUNT HUNT** is a retro-style arcade game built for **Dogechain**, inspired by the classic *Duck Hunt*. Instead of hunting ducks with a zapper, you launch a flying Husky from a physics-based slingshot to catch "Blunts" flying through the air!

## 🎮 Gameplay
- **Objective**: Use your slingshot to launch the Husky and intercept the flying Blunts.
- **Physics**: The slingshot features realistic rubber band physics with a dynamic "wobble" effect. The harder you pull, the more it shakes!
- **Visuals**: 
    - 8-bit NES aesthetic.
    - Procedurally animated sprites (squash-and-stretch Husky).
    - Juice effects: Screen shake, particle explosions, and floating score texts.
- **Progression**: Catch blunts to increase your score and advance through rounds. The game gets faster as you go!

## 🕹️ Controls
- **Aim & Shoot**: Click and drag on the slingshot (or the Husky) to pull back the bands. Release to launch.
- **Mobile Friendly**: Supports touch controls for playing on mobile devices.

## 🛠️ Tech Stack
- **Frontend**: Vanilla JavaScript (Canvas API)
    - Custom sprite animation system.
    - Physics-based particle system.
- **Backend**: Python (Flask)
- **Blockchain**: Dogechain integration (Wallet connection, Leaderboard).

## 🚀 Setup & Run
1. **Install Dependencies**:
   ```bash
   pip install flask
   ```
2. **Run the Server**:
   ```bash
   python index.py
   ```
3. **Play**:
   Open your browser and navigate to `http://localhost:5000`.

## 📜 Features
- [x] **Leaderboard**: Track top scores (mock/on-chain data).
- [x] **Wallet Connection**: Connect your Dogechain wallet to save scores.
- [x] **Responsive Design**: Fits 4:3 NES aspect ratio on any screen.
- [x] **Game Loop**: Rounds, difficulty scaling, timer, and Game Over states.

---
*Built with ❤️ for the Dogechain Community.*
