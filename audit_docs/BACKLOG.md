# 📝 Project Backlog

Derived from Technical Audit (Updated Mar 2026).

## 🔥 High Priority (Security & Critical Features)

- [x] **Fix Leaderboard Contract**:
  - Change `submitScore` to be "Fail-Closed" (Mandatory Signer).
  - Redeploy contract.
- [x] **Security: Payout DoS Protection**:
  - **Critical**: If a winner is a contract that rejects funds, `distributePrize` reverts, causing `startGame` to fail. The game halts.
  - Fix: Implement "Pull vs Push" or "Rollover on Failure" (don't `require` success).
- [x] **Optimization: Struct Packing**:
  - `Score` struct currently uses 3 storage slots.
  - Optimization: Pack `player` (160), `score` (48), `timestamp` (48) into 1 slot to reduce gas by ~60%.
- [x] **Feature: Adjustable Dev Fee**:
  - Change hardcoded `25` to a variable `devFeePercent` adjustable by owner.
- [x] **Implement All-Time Leaderboard**:
  - The current contract `Leaderboard.sol` **does not** store all-time high scores, only the current round.
  - Fix: Add `allTimeLeaderboard` array (persistent) alongside `leaderboard` (resets daily).
- [x] **Code Cleanup: Remove Duplicate Event Listeners**:
  - `game.js`: Found duplicate listeners for start/restart buttons.
  - Action: Refactor to single initialization.
- [x] **Backend: Secure Score Verification (Anti-Cheat)**:
  - **Issue**: Arbitrary score signing without session verification.
  - **Fix**: Implemented session-based validation for score-to-time plausibility.
- [x] **Frontend: Client-Side Score Protection (Anti-Tamper)**:
  - **Issue**: score variable modifiable via console.
  - **Fix**: Implemented bitwise XOR masking and protected property getters.
- [x] **Production Hardening**:
  - **Action**: Added `Flask-Limiter` for rate protection and disabled Flask Debug mode.
- [x] **Cleanup**:
  - Delete `verify_signer.py`.
  - Secure/Remove `static/signer_debug.html`.

## 🛠 Technical

- [x] **Frontend <-> Contract Sync**:
  - Ensure `static/deploy.html` and `contracts/Leaderboard.sol` remain in sync (currently potential drift).

## 🚀 Post-Deployment

- [x] **Update `static/js/config.js` with New Address**:
  - Address: `0xDeCfB1e43F4B981Cb5F1EeafFC2E11847B8Ad8A1`
- [ ] **Verify New Contract on Explorer**:
  - **Action**: Upload `contracts/Leaderboard.sol` to Dogechain Explorer.
  - *Note: The file is already flattened and ready for "Single File" verification.*
