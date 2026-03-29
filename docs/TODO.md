# TDH BLUNT HUNT - Project Roadmap & Improvements

**Status**: 🟢 Operational (Deployed)
**Version**: 0.85
**Date**: 2026-03-29

---

## 🚀 Next Priorities

### Web3 Integration

- [ ] **NFT Skins**: Allow players to use their connected wallet's NFTs as the projectile (replacing the Husky).
- [x] **On-Chain High Scores**: Periodically commit daily/weekly high scores to a smart contract.
- [ ] **Leaderboard Filters**: Support **Weekly** and **All-Time** views once on-chain.
- [ ] **Token Wagering**: (Advanced) Allow wagering DOGE on achieving target scores.

### Mobile & UI

- [ ] **Touch Controls**: Add a visual "virtual joystick" or clearer drag indicators for mobile users.
- [x] **Pause Menu**: Add ability to pause the game loop.

---

## 🔮 Backlog / "Perhaps"

### Visuals & Juice

- [ ] **Flash Effect**: Simple white screen flash on shooting (NES Zapper style).

### Gameplay

- [ ] **Power-ups**:
  - **Slo-mo**: Slow down time/blunts.
  - **Multi-Husky**: Shotgun spread.
  - **Magnet**: Attract blunts?

---

## 🚨 Critical & Security

- [x] **Fail-Open Contract Design**:
  - **Status**: FIXED. `Leaderboard.sol` now uses `require(signerAddress != address(0), "Security: Signer not initialized")` - the signer is mandatory.
- [x] **Transaction Revert Handling**:
  - **Status**: FIXED (v0.70). `wallet.js` now pre-checks `hasTicket` before submitting to prevent `UNPREDICTABLE_GAS_LIMIT` crashes.
- [x] **Environment Security**:
  - **Status**: FIXED. `verify_signer.py` and `test.html` no longer exist in the project.
- [x] **recoverFunds Rug-Pull Vector (H-3)**:
  - **Status**: FIXED (v0.85). `recoverFunds()` removed entirely. Funds flow only through `distributePrize()`.
- [x] **Missing receive/fallback (M-10)**:
  - **Status**: FIXED (v0.85). `receive()` and `fallback()` now revert with descriptive messages.
- [x] **Security Audit Remediation**:
  - **Status**: 27 of 28 issues resolved. Only L-5 (`audio.js` audit) remains.

---

## 🛠 Architecture & Code Quality

- [x] **Monolithic `game.js`** (High Priority):
  - **Status**: COMPLETED. `Game` class has been partially modularized.
  - **Details**: Entities (`Husky.js`, `Slingshot.js`, `Blunt.js`, `Particle.js`) have been moved to `static/js/entities/`.
- [x] **Leaderboard Pagination**:
  - **Status**: IMPLEMENTED. Logic exists and UI arrows are now plainly visible and functional.
- [x] **Code Cleanup**:
  - **Status**: CONTINUOUS. Unused CSS (`.faq-content.hidden`), placeholder images, and erratic bounce logic removed.

---

## 🚀 UX & Polish

- [x] **Leaderboard Layout**:
  - **Status**: OPTIMIZED. Tabs moved to bottom HUD, list expanded to fill screen (10+ items).
- [x] **FAQ Modal**:
  - **Status**: REDESIGNED. Now a clean 3-tab popup (Info/Controls/Payouts) matching the game aesthetic.
- [x] **Payment Flow Improvements**:
  - **Status**: DONE (v0.70). Logic added to `game.js` to prompt "Pay 1 DOGE" if score submission fails with `NO_TICKET`.

---

## 📦 Deployment

- [x] **Configuration**:
  - **Status**: Centralized in `static/js/config.js`.
- [ ] **Contract Verification**:
  - **Action**: Ensure the deployed contract source code is verified on the Dogechain Explorer for transparency.

---

## ✅ Completed Features

- **Core Loop**: Physics slingshot, spawning blunts, scoring.
- **Visuals**: Particle effects, Screen shake, Procedural sprites.
- **Audio**: Procedural Sound Effects (Web Audio API).
- **Progression**: Combo system, Special Blunts (Gold/Armored), Difficulty scaling.

---

## 📋 Recommended Next Actions

1. **Verify Contract**: Ensure the deployed `Leaderboard.sol` is verified on the block explorer for user trust.
2. **Mobile Controls**: Further refine touch interactions for mobile players (e.g., virtual joystick).
