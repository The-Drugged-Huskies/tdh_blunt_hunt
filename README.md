# Blunt Hunt v0.82

**Blunt Hunt** is a retro-style arcade game built for **Dogechain**, inspired by classic NES shooters. Launch a flying Husky from a physics-based slingshot to catch "Blunts" flying through the air!

[**GitHub Repository**](https://github.com/The-Drugged-Huskies/tdh_blunt_hunt)

---

## 📚 Documentation

- [**Architecture**](docs/Architecture.md) - System overview and tech stack.
- [**Install Guide**](docs/Install.md) - How to setup and run locally.
- [**User Guide**](docs/UserGuide.md) - Detailed gameplay instructions.
- [**Admin Guide**](docs/Admin.md) - Managing the contract and tournament.
- [**Deployment (Vercel)**](docs/Vercel.md) - Hosting the game.
- [**Music Engine**](docs/Music.md) - How the procedural audio works.
- [**Project Roadmap & TODO**](docs/TODO.md) - Current priorities and completed features.

---

## 🎮 How to Play

**Objective**: Score as many points as possible before the tournament ends!

### 🎯 The Blunts

Identify your targets carefully.

| Type | Color | HP | Points | Behavior |
| :--- | :--- | :--- | :--- | :--- |
| **Normal** | 🌿 Green | **1** | **10** | Standard flying path. |
| **Gold** | 🟡 Gold | **1** | **50** | Fast moving! High value. |
| **Armored** | ⚪ Grey | **2** | **25** | First hit bounces off (Safe!). Second hit destroys it. |

### 🔥 Combo System

Build your streak to maximize your score!

- **Streak Multiplier**: Your multiplier increases with every consecutive hit (up to **5x**).
  - 1 Hit: **1x**
  - 2 Hits: **2x**
  - ...
  - 5+ Hits: **5x (MAX)**
- **Reset**: If a Blunt escapes off-screen or the Husky misses everything, your combo resets to **0**.
- **Armored Strategy**: Hitting an Armored Blunt (the "Clink") **keeps your streak alive**. Destroying it adds to the streak.

### ⏳ Time Bonuses

Extend your run!

- **Round Clear**: Advancing to the next round (every 10 hits) grants **+5 Seconds**.

---

## 🔒 Security & Fair Play

To ensure a fair tournament for all players:
- **Mandatory Signer**: The contract requires a signer address to be set - unsigned scores are rejected.
- **Session Validation**: Active play sessions are monitored for tampering.
- **Expiry**: Tournament entries expire after 5 minutes of inactivity.

---

## 🕹️ Controls

- **Desktop**: Click and drag the slingshot to aim. Release to fire.
- **Mobile**: Touch and drag to aim. Release to fire.
- **Screen Rotation**: Click the ↻ button to rotate the game view 90°.
- **Settings**: Click the **Gear Icon** to adjust volume or access settings.

---

## 🚀 Quick Start (Dev)

1. **Install**: `pip install -r requirements.txt`
2. **Run**: `python app.py`
3. **Play**: `http://localhost:5000`

---

## ✅ Current Features

- **Core Loop**: Physics slingshot, spawning blunts, scoring.
- **Visuals**: Particle effects, Screen shake, Procedural sprites.
- **Audio**: Procedural Sound Effects (Web Audio API).
- **Progression**: Combo system, Special Blunts (Gold/Armored), Difficulty scaling.
- **Web3**: Wallet integration, on-chain leaderboard, tournament pot.
- **Mobile Support**: Touch controls, screen rotation.

---

*Built for the Dogechain Community.*
