# 📝 Project Backlog

Derived from Technical Audit (2026-01-28).

## 🔥 High Priority (Security & Critical Features)

- [ ] **Fix Leaderboard Contract**:
  - Change `submitScore` to be "Fail-Closed" (Mandatory Signer).
  - Redeploy contract.
- [x] **Implement All-Time Leaderboard**:
  - The current contract `Leaderboard.sol` **does not** store all-time high scores, only the current round.
  - Add `Score[] public allTimeLeaderboard` and logic to update it.
- [x] **Cleanup**:
  - Delete `verify_signer.py`.
  - Secure/Remove `static/signer_debug.html`.

## 📱 Mobile & Validation

- [ ] **Contract Verification (No Deploy Needed)**:
  - Verify source code on Dogechain Explorer to publish Natspec comments.
  - *Note: Do not redeploy. Use the current `Leaderboard.sol` to verify the existing address.*

## 🛠 Technical

- [x] **Frontend <-> Contract Sync**:
  - Ensure `static/deploy.html` and `contracts/Leaderboard.sol` remain in sync (currently potential drift).
