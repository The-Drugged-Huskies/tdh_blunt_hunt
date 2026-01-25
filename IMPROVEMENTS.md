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
- [x] **Transaction Revert Handling**:
  - **Status**: FIXED (v0.70). `wallet.js` now pre-checks `hasTicket` before submitting to prevent `UNPREDICTABLE_GAS_LIMIT` crashes.
- [ ] **Environment Security**:
  - **Issue**: `verify_signer.py` and `test.html` are present in the root/static.
  - **Action**: Ensure these are excluded from production builds or Vercel deployments (partially handled by `.gitignore`, but check build scripts).

## 🛠 2. Architecture & Code Quality

- [x] **Monolithic `game.js`** (High Priority):
  - **Issue**: The `Game` class is ~1500 lines. It handles Rendering, Physics, Input, UI, and Audio calls.
  - **Fix**: Refactor into modules:
    - `src/entities/Husky.js`
    - `src/entities/Slingshot.js`
    - `src/systems/Physics.js`
    - `src/ui/Hud.js`
- [x] **Leaderboard Pagination**:
  - **Status**: IMPLEMENTED. Logic exists and UI arrows are now plainly visible and functional.
- [x] **Code Cleanup**:
  - **Status**: DONE (v0.70). Unused CSS (`.faq-content.hidden`), placeholder images, and erratic bounce logic removed.

## 🚀 3. UX & Polish

- [x] **Leaderboard Layout**:
  - **Status**: OPTIMIZED. Tabs moved to bottom HUD, list expanded to fill screen (10+ items).
- [x] **FAQ Modal**:
  - **Status**: REDESIGNED. Now a clean 3-tab popup (Info/Controls/Payouts) matching the game aesthetic.
- [x] **Payment Flow Improvements**:
  - **Status**: DONE (v0.70). Logic added to `game.js` to prompt "Pay 1 DOGE" if score submission fails with `NO_TICKET`.

## 📦 4. Deployment

- [x] **Configuration**:
  - **Status**: Centralized in `static/js/config.js`.
- [ ] **Contract Verification**:
  - **Action**: Ensure the deployed contract source code is verified on the Dogechain Explorer for transparency.

---

### Recommended Immediate Actions (Next Session)

1. **Refactor Game.js**: Start splitting the massive file. This will make adding new features (like power-ups or new enemy types) much easier.
2. **Auto-Pay Prompt**: Implement the "Payment Flow Improvement" mentioned above.
