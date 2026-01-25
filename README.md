# Blunt Hunt

**Blunt Hunt** is a retro-style arcade game built for **Dogechain**, inspired by classic NES shooters. Launch a flying Husky from a physics-based slingshot to catch "Blunts" flying through the air!

---

## 📚 Documentation

- [**Architecture**](docs/Architecture.md) - System overview and tech stack.
- [**Install Guide**](docs/Install.md) - How to setup and run locally.
- [**User Guide**](docs/UserGuide.md) - Detailed gameplay instructions.
- [**Admin Guide**](docs/Admin.md) - Managing the contract and tournament.
- [**Deployment (Vercel)**](docs/Vercel.md) - Hosting the game.
- [**Music Engine**](docs/Music.md) - How the procedural audio works.

---

## 🎮 How to Play

**Objective**: Score as many points as possible before time runs out!

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

- **Round Clear**: Advancing to the next round grants **+5 Seconds**.

---

## 🕹️ Controls

- **Desktop**: Click and drag the slingshot to aim. Release to fire.
- **Mobile**: Touch and drag to aim. Release to fire.
- **Settings**: Click the **Gear Icon** (top right) to adjust volume or pause.

---

## 🚀 Quick Start (Dev)

1. **Install**: `pip install flask`
2. **Run**: `python app.py`
3. **Play**: `http://localhost:5000`

---
*Built for the Dogechain Community.*
