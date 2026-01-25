# 🕵️ Supervisor Code Audit & Improvement Plan

**Status**: 🟢 Operational (Deployed)
**Version**: 0.70 (Polished)
**Date**: 2026-01-25

After inspecting the current codebase (`app.py`, `Leaderboard.sol`, `game.js`, `wallet.js`), I have compiled the following list of critical fixes, architectural improvements, and polish items.

## 🚨 1. Critical & Security

- [ ] **Fail-Open Contract Design**:
  - **Issue**: In `Leaderboard.sol`, the logic `if (signerAddress != address(0))` means that if the signer is *not* set, the contract accepts **any** score.
  - **Risk**: If you accidentally unset the signer or redeploy without setting it, the leaderboard is open to basic spoofing.
  - **Fix**: Consider making the signer mandatory or emitting a "SecurityWarning" event if playing in unsecured mode.
- [x] **Hardcoded Contract Addresses (Don't Repeat Yourself)**:
  - **Status**: FIXED. Centralized in `static/js/config.js`.
- [ ] **Git History Cleanliness**:
  - **Issue**: `env.json` was deleted, but ensure it wasn't committed in previous git commits.
  - **audit**: Run a BFG Repo-Cleaner or similar if this was a public repo.

## 🛠 2. Architecture & Code Quality

- [ ] **Monolithic `game.js`**:
  - **Issue**: The `Game` class is approaching 1500 lines. It handles Rendering, Physics, Input, UI, and Audio calls.
  - **Fix**: Refactor into modules:
    - `src/entities/Husky.js`
    - `src/entities/Slingshot.js`
    - `src/systems/Physics.js`
    - `src/ui/Hud.js`
- [x] **Frontend/Backend Configuration Sync**:
  - **Status**: FIXED. `wallet.js` now dynamically fetches `gameCost()` from the blockchain on load.
- [ ] **Mobile Touch Handling**:
  - **Status**: IMPROVED. `touchstart` listeners added, but `game.js` input handling logic is still mixed with mouse logic. Could be cleaner.

## 🚀 3. UX & Polish

- [x] **consistent Error UI**:
  - **Status**: IMPROVED. "Insufficient Funds" uses a custom modal now.
  - **Action**: detailed audit of any remaining `alert()` calls.
- [ ] **Ticket State Clarity**:
  - **Issue**: Players might not understand why they need to "Pay 1 DOGE".
  - **Fix**: The UI should explicitly say "Ticket Required" vs "Ticket Active" in a permanent HUD element, rather than just disabling the button.

## 📦 4. Deployment

- [ ] **Cleanup**:
  - `static/test.html` and `deploy.html` are dev tools.
  - **Action**: Ensure `test.html` is removed or protected before a "Launch" to production, or move it to a `dev/` folder.

---

### Recommended Immediate Actions (Next Session)

1. **Ticket UI**: Add a clear visual indicator for "Ticket Active" in the HUD.
2. **Refactor Game.js**: Start splitting the massive 1500-line file into smaller classes (e.g. `Husky.js`).
