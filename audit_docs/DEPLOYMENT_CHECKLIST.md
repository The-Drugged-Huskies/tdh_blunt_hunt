# Deployment Checklist — Security Audit Fixes

**Date**: 2026-03-22  
**Fixes included**: C-1, C-2, C-3, C-5, C-7, H-1, H-2, H-4, H-5, M-7, M-8, M-9, M-12

---

## 1. Set Environment Variables (Vercel Dashboard)

Go to **Vercel → Project → Settings → Environment Variables** and add:

| Variable | Required | How to Generate | Notes |
|----------|----------|-----------------|-------|
| `JWT_SECRET` | ✅ **Yes** | Run `openssl rand -hex 32` | Without this, JWT tokens break across serverless cold starts |
| `FLASK_SECRET_KEY` | ✅ **Yes** | Run `openssl rand -hex 32` | Required for secure session signing and CSRF protection |
| `RPC_URL` | Optional | Default: `https://rpc.dogechain.dog` | Used by backend to query on-chain nonces for replay protection |
| `SIGNER_PRIVATE_KEY` | Already set | — | No change needed |

> ⚠️ `JWT_SECRET` must be the same across all environments (Production, Preview) or tokens won't validate.

---

## 2. Install New Dependency (Local Dev)

```bash
pip install PyJWT
```

Vercel will auto-install from `requirements.txt` on deploy — this is only needed for local testing.

---

## 3. Redeploy Smart Contract

The following fixes **require a new contract deployment** (the old contract still has the broken ECDSA prefix and old validation logic):

| Fix | What Changed |
|-----|-------------|
| C-1 | ECDSA signature prefix now correct |
| H-1 | Nonce-based replay protection added |
| H-2 | Dev fee capped at 50% |
| H-4 | `gameInterval` must be > 0 |
| H-5 | `alignmentOffset` must be < `gameInterval` |
| M-7 | `renounceOwnership` now reverts |
| M-8 | Paginated leaderboard getters added |
| M-9 | `startGame` requires exact payment |
| M-12 | `NewHighScore` event now emits |

### Steps:

1. **If there are active funds** on the old contract:
   - Call `recoverFunds()` from the owner wallet first
   - Distribute any owed prizes manually

2. **Deploy the new contract**:
   - Go to your `/deploy` page, or use Remix/Hardhat
   - Deploy the updated `contracts/Leaderboard.sol`
   - **Save the new contract address**

3. **Configure the new contract** (via `/admin` or direct calls):
   - `setSignerAddress()` → Set to the public address matching your `SIGNER_PRIVATE_KEY`
   - `setGameCost()` → Set your game price (default: 1 DOGE)
   - `setGameInterval()` → Set round duration (default: 1 hour)
   - `setHelperAlignment()` → Set offset if needed (default: 0)
   - `setDevFeePercent()` → Set fee percentage (max 50%, default: 25%)
   - `setGameRoundDuration()` → Set seconds per game session (default: 60)

4. **Update the frontend config**:
   - Edit `static/js/config.js`:
     ```javascript
     LEADERBOARD_CONTRACT_ADDRESS: "0xYOUR_NEW_ADDRESS_HERE",
     ```
   - Also update `static/admin.html` line 71 if the address is hardcoded there

---

## 4. Deploy Backend + Frontend (Vercel)

```bash
git add -A
git commit -m "Security fixes: C-1 C-2 C-3 C-7 H-1 H-2 H-4 H-5 M-7 M-8 M-9 M-12"
git push
```

Vercel auto-deploys on push. This covers:
- `app.py` — JWT sessions, removed cheater flag, safe error messages
- `static/js/LeaderboardService.js` — session token handling
- `requirements.txt` — added PyJWT
- `contracts/Leaderboard.sol` — all contract fixes

---

## 5. Post-Deploy Verification

- [ ] Visit the game and confirm it loads
- [ ] Connect wallet and start a game (should deduct exact `gameCost`)
- [ ] Complete a game and submit score (should succeed with the new signature)
- [ ] Check leaderboard updates correctly
- [ ] Verify `/admin` and `/deploy` routes still work for owner
- [ ] Check Vercel function logs for any JWT errors

---

## Files Changed

| File | Changes |
|------|---------|
| `app.py` | JWT sessions, removed cheater flag, safe error messages, nonce-based signing |
| `static/js/LeaderboardService.js` | Stores/sends session token, removed cheater field |
| `requirements.txt` | Added `PyJWT` |
| `contracts/Leaderboard.sol` | 9 fixes (C-1, H-1, H-2, H-4, H-5, M-7, M-8, M-9, M-12) |
