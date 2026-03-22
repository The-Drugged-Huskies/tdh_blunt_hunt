# TDH Blunt Hunt — Full Security & Bug Audit

**Version**: v0.82  
**Date**: 2026-03-21  
**Scope**: Smart contract, Flask backend, frontend JavaScript, deployment configuration

---

## Executive Summary

The project has a solid architecture for a Web3 arcade game, with several good security patterns already in place (rate limiting, server-side score signing, anti-cheat checks, fail-closed signer requirement). However, the audit identified **7 critical**, **9 high**, and **12 medium** severity issues across the smart contract, backend, and frontend layers.

---

## 🔴 Critical Severity

### ✅ C-1 · ECDSA Signature Prefix Bug (Smart Contract) — FIXED

**File**: [Leaderboard.sol](file:///home/x/Gaissa's%20%20materials%20and%20herbs/projects/TDH_BLUNT_HUNT/contracts/Leaderboard.sol#L146-L148)

The `toEthSignedMessageHash` function uses double-escaped backslashes:

```solidity
return keccak256(abi.encodePacked("\\x19Ethereum Signed Message:\\n32", hash));
```

This produces the **literal string** `\\x19Ethereum Signed Message:\\n32` instead of the standard Ethereum prefix `\x19Ethereum Signed Message:\n32`. This means:
- The hash computed on-chain **will never match** the hash computed by `eth_account` in Python (which uses the correct prefix)
- Score submissions will **always revert** with "Invalid signature"

> [!NOTE]
> **Fixed** in `Leaderboard.sol` — changed `\\x19...\\n32` to `\x19...\n32`. The `deploy.html` copy was verified correct (JS template literal escaping produces the right bytes for solc).

**Fix**: Use single backslashes: `"\x19Ethereum Signed Message:\n32"`

---

### ✅ C-2 · In-Memory Session Storage (Backend — Production DoS) — FIXED

**File**: [app.py](file:///home/x/Gaissa's%20%20materials%20and%20herbs/projects/TDH_BLUNT_HUNT/app.py#L30-L32)

```python
game_sessions = {}  # In-memory session storage
```

On Vercel (serverless), each invocation may run in a **different container**. A session started on Container A cannot be found on Container B. This means:
- Score signing will **randomly fail** with "No active session found"  
- On process restart, all sessions are lost
- No session expiry cleanup — indefinite memory growth on long-lived processes

> [!NOTE]
> **Fixed** — Replaced in-memory dict with stateless **JWT tokens**. `/api/session/start` now returns a signed `session_token` (with embedded player, start_time, and expiry). `/api/sign-score` decodes and verifies the token — no shared state needed. Added `PyJWT` to `requirements.txt`. Set `JWT_SECRET` env var in production for persistence across deploys.

---

### ✅ C-3 · `isCheater` Flag is Client-Controlled (Anti-Cheat Bypass) — FIXED

**Files**: [LeaderboardService.js:120](file:///home/x/Gaissa's%20%20materials%20and%20herbs/projects/TDH_BLUNT_HUNT/static/js/LeaderboardService.js#L120-L129) → [app.py:111](file:///home/x/Gaissa's%20%20materials%20and%20herbs/projects/TDH_BLUNT_HUNT/app.py#L111-L114)

The `cheater` flag is sent **from the client** in the JSON body:

```javascript
body: JSON.stringify({ player, score, contract, cheater: isCheater })
```

An attacker can simply send `cheater: false` regardless of actual state, completely bypassing this check. The server blindly trusts the flag.

> [!NOTE]
> **Fixed** — Removed `cheater` field from `LeaderboardService.js` request body and removed the server-side `is_cheater` check from `app.py`. Anti-cheat now relies entirely on server-side session/plausibility checks.

---

### C-4 · No CORS Configuration (Backend)

**File**: [app.py](file:///home/x/Gaissa's%20%20materials%20and%20herbs/projects/TDH_BLUNT_HUNT/app.py)

There is no CORS restriction. Any website can call `/api/sign-score` and `/api/session/start`. An attacker could:
- Build a malicious site that starts sessions and requests score signatures
- Replay legitimate player addresses with arbitrary scores

**Fix**: Add `flask-cors` with explicit origin whitelist matching your Vercel deployment domain.

---

### ✅ C-5 · No Flask Secret Key Set — FIXED

**File**: [app.py](file:///home/x/Gaissa's%20%20materials%20and%20herbs/projects/TDH_BLUNT_HUNT/app.py#L20)

> [!NOTE]
> **Fixed** — Added `app.config['SECRET_KEY']` loading from `FLASK_SECRET_KEY` env var with a safe `os.urandom(32).hex()` fallback. This enables secure session signing and future CSRF protection.

---

### C-6 · Admin & Deploy Pages Publicly Accessible

**Files**: [app.py:44-53](file:///home/x/Gaissa's%20%20materials%20and%20herbs/projects/TDH_BLUNT_HUNT/app.py#L44-L53)

```python
@app.route('/admin')
def admin():
    return send_from_directory('static', 'admin.html')

@app.route('/deploy')
def deploy():
    return send_from_directory('static', 'deploy.html')
```

Both routes have **zero authentication**. Anyone who knows the URL can access:
- The admin panel (contract configuration, fund recovery, signer setup)
- The deployment tool

> [!IMPORTANT]
> While the smart contract functions themselves are owner-gated, exposing these tools reveals internal contract addresses, ABIs, and deployment infrastructure. The `.gitignore` excludes these files from the repo but they're served by the live application.

**Fix**: Remove these routes from production, or add authentication middleware.

---

### ✅ C-7 · Score Signing Key Leakable via Error Messages — FIXED

**File**: [app.py:173](file:///home/x/Gaissa's%20%20materials%20and%20herbs/projects/TDH_BLUNT_HUNT/app.py#L173)

```python
except Exception as e:
    return jsonify({"success": False, "error": str(e)}), 500
```

A generic exception could leak sensitive information including stack traces, file paths, or key-related errors. The `start_session` endpoint (line 73) has the same issue.

> [!NOTE]
> **Fixed** — Both exception handlers now use `app.logger.exception()` to log the full error server-side, while returning only generic messages (`"Invalid request"` / `"Internal server error"`) to the client.

---

## 🟠 High Severity

### ✅ H-1 · Signature Replay Across Contracts — FIXED

**Files**: [app.py:158-160](file:///home/x/Gaissa's%20%20materials%20and%20herbs/projects/TDH_BLUNT_HUNT/app.py#L158-L160), [Leaderboard.sol:262](file:///home/x/Gaissa's%20%20materials%20and%20herbs/projects/TDH_BLUNT_HUNT/contracts/Leaderboard.sol#L262)

The signed message hash includes `player`, `score`, and `contract address` — but does **not** include a nonce or timestamp. While the `hasTicket` mechanism prevents duplicate submits on the same contract, if a player has tickets on multiple contract deployments, a single signature can be replayed.

> [!NOTE]
> **Fixed** — Added `nonces` mapping to contract. `submitScore` now includes `nonces[msg.sender]` in the hash and increments it after use. Backend queries the on-chain nonce before signing. Each signature is single-use.

---

### ✅ H-2 · `devFeePercent` Can Be Set to 100% (Smart Contract) — FIXED

**File**: [Leaderboard.sol:288-291](file:///home/x/Gaissa's%20%20materials%20and%20herbs/projects/TDH_BLUNT_HUNT/contracts/Leaderboard.sol#L288-L291)

```solidity
function setDevFeePercent(uint256 _percent) external onlyOwner {
    require(_percent <= 100, "Fee cannot exceed 100%");
    devFeePercent = _percent;
}
```

The owner can set the fee to 100%, meaning **all player payments go to the owner** and nothing enters the prize pool. This is a rug-pull vector. Players trusting the tournament mechanism would be defrauded.

> [!NOTE]
> **Fixed** — Changed cap from `<= 100` to `<= 50`.

---

### H-3 · `recoverFunds` Drains Entire Contract (Smart Contract)

**File**: [Leaderboard.sol:414-418](file:///home/x/Gaissa's%20%20materials%20and%20herbs/projects/TDH_BLUNT_HUNT/contracts/Leaderboard.sol#L414-L418)

```solidity
function recoverFunds() external onlyOwner {
    prizePool = 0; 
    (bool success, ) = payable(owner()).call{value: address(this).balance}("");
    require(success, "Transfer failed");
}
```

This withdraws **everything** — the full prize pool that players have funded. There's no timelock, no conditions, no multi-sig protection. Combined with `setDevFeePercent(100)`, this gives the owner complete fund extraction capabilities.

**Fix**: At minimum, add an event for transparency, or implement a timelock/multi-sig for large withdrawals.

---

### ✅ H-4 · `gameInterval` Can Be Set to 0 (Smart Contract) — FIXED

**File**: [Leaderboard.sol:394-396](file:///home/x/Gaissa's%20%20materials%20and%20herbs/projects/TDH_BLUNT_HUNT/contracts/Leaderboard.sol#L394-L396)

Setting `gameInterval = 0` would cause a **division-by-zero revert** in `calculateNextEndTime()` at line 223:

```solidity
uint256 next = ((current - alignmentOffset) / gameInterval + 1) * gameInterval + alignmentOffset;
```

This would brick the contract — `startGame` and `submitScore` both call `distributePrize`, which calls `calculateNextEndTime`.

> [!NOTE]
> **Fixed** — Added `require(_interval > 0, "Interval must be positive")` to `setGameInterval`.

---

### ✅ H-5 · `alignmentOffset` Underflow Risk (Smart Contract) — FIXED

**File**: [Leaderboard.sol:223](file:///home/x/Gaissa's%20%20materials%20and%20herbs/projects/TDH_BLUNT_HUNT/contracts/Leaderboard.sol#L223)

```solidity
uint256 next = ((current - alignmentOffset) / gameInterval + 1) * gameInterval + alignmentOffset;
```

If `alignmentOffset > current` (e.g., admin sets an offset larger than `block.timestamp`), this wraps around due to unsigned integer arithmetic, producing an unpredictable massive timestamp.

> [!NOTE]
> **Fixed** — Added `require(_offset < gameInterval, "Offset must be less than interval")` to `setHelperAlignment`.

---

### H-6 · No Pinned Dependency Versions (Backend)

**File**: [requirements.txt](file:///home/x/Gaissa's%20%20materials%20and%20herbs/projects/TDH_BLUNT_HUNT/requirements.txt)

```
Flask
web3
eth-account
python-dotenv
Flask-Limiter
```

No versions are pinned. A supply-chain attack or breaking change in any dependency would silently affect production.

**Fix**: Pin exact versions (e.g., `Flask==3.0.0`, `web3==6.15.0`).

---

### H-7 · Exposed Hardcoded Contract Address

**File**: [config.js](file:///home/x/Gaissa's%20%20materials%20and%20herbs/projects/TDH_BLUNT_HUNT/static/js/config.js#L7)

```javascript
LEADERBOARD_CONTRACT_ADDRESS: "0x68B71266553A8A37F645798bc46B7F3D5285B517",
```

This is also duplicated in [admin.html:71](file:///home/x/Gaissa's%20%20materials%20and%20herbs/projects/TDH_BLUNT_HUNT/static/admin.html#L71). While not a vulnerability per se, if a contract is redeployed, forgetting to update one of the locations would cause inconsistent behavior. Consider centralizing the config.

---

### H-8 · Pot Display Updates Every 1 Second via RPC

**File**: [game.js:276](file:///home/x/Gaissa's%20%20materials%20and%20herbs/projects/TDH_BLUNT_HUNT/static/js/game.js#L276)

```javascript
setInterval(() => this.updatePotDisplay(), 1000);
```

The comment says "poll every 10s" but the actual interval is 1000ms. Each call hits `getPublicContract()` which creates a `JsonRpcProvider` and queries the chain. This is:
- 60 RPC calls per minute per user (potential rate limit/ban from public RPC)
- Wasteful — pot info rarely changes

**Fix**: Reduce to 30s or 60s; cache the `JsonRpcProvider` instance.

---

### H-9 · `XSS` Risk in Leaderboard Rendering

**File**: [game.js:1022](file:///home/x/Gaissa's%20%20materials%20and%20herbs/projects/TDH_BLUNT_HUNT/static/js/game.js#L1022)

```javascript
row.innerHTML = `<span>${entry.rank}</span><span>${displayName}</span><span>${entry.score}</span>`;
```

`displayName` originates from on-chain player addresses (which are hex-safe), but if any processing changes or the data source changes, this `innerHTML` usage creates an XSS vector. Same pattern at line 962.

**Fix**: Use `textContent` or DOM element creation instead of `innerHTML` for user-derived data.

---

## 🟡 Medium Severity

### M-1 · `exitToMenu` Triggers `isCheater` Flag

**File**: [game.js:598](file:///home/x/Gaissa's%20%20materials%20and%20herbs/projects/TDH_BLUNT_HUNT/static/js/game.js#L598)

```javascript
this.score = 0; // This triggers the setter, setting isCheater = true
```

The `score` property has a custom setter (line 60-65) that flags any direct assignment as tampering. The `exitToMenu` method triggers this, meaning after exiting to menu, `isCheater` is permanently `true` for the game instance.

**Fix**: Use `this._s = 0 ^ this._k;` instead of `this.score = 0;`, matching the pattern used in `start()` at line 429.

---

### M-2 · Duplicate `this.husky = null` Assignment

**File**: [game.js:448-449](file:///home/x/Gaissa's%20%20materials%20and%20herbs/projects/TDH_BLUNT_HUNT/static/js/game.js#L448-L449)

```javascript
this.husky = null;
this.husky = null;
```

Harmless duplicate line — likely a copy-paste artifact.

---

### M-3 · `keySelect` Never Initialized

**File**: [game.js:228-232](file:///home/x/Gaissa's%20%20materials%20and%20herbs/projects/TDH_BLUNT_HUNT/static/js/game.js#L228-L232)

```javascript
if (this.keySelect) {
    this.keySelect.addEventListener('change', (e) => { ... });
}
```

`this.keySelect` is never assigned (no `this.keySelect = document.getElementById('key-select')` exists), so the musical key selector in settings has **no effect**. A silent bug.

**Fix**: Add `this.keySelect = document.getElementById('key-select');` near the other slider initializations.

---

### M-4 · No HTTPS Enforcement

**File**: [vercel.json](file:///home/x/Gaissa's%20%20materials%20and%20herbs/projects/TDH_BLUNT_HUNT/vercel.json)

No security headers are configured. Missing:
- `Strict-Transport-Security` (HSTS)
- `Content-Security-Policy`
- `X-Frame-Options` (clickjacking protection)
- `X-Content-Type-Options`

**Fix**: Add a `headers` block in `vercel.json`:
```json
"headers": [{
    "source": "/(.*)",
    "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Strict-Transport-Security", "value": "max-age=31536000" }
    ]
}]
```

---

### M-5 · Rate Limiter Uses In-Memory Storage

**File**: [app.py:23-28](file:///home/x/Gaissa's%20%20materials%20and%20herbs/projects/TDH_BLUNT_HUNT/app.py#L23-L28)

```python
storage_uri="memory://",
```

On Vercel serverless, rate limit counters are per-container and reset on cold starts. An attacker can bypass rate limits by waiting for container rotation or triggering cold starts.

**Fix**: Use `redis://` or a persistent backend for rate limiting.

---

### M-6 · `getRemoteAddress` Returns Proxy IP on Vercel

**File**: [app.py:24](file:///home/x/Gaissa's%20%20materials%20and%20herbs/projects/TDH_BLUNT_HUNT/app.py#L24)

On Vercel, `get_remote_address` returns the load balancer IP, not the client IP. All users share the same rate limit counter.

**Fix**: Use `X-Forwarded-For` header, but validate it carefully on Vercel: `request.headers.get('X-Forwarded-For', request.remote_addr).split(',')[0].strip()`

---

### ✅ M-7 · `Ownable` Allows `renounceOwnership` (Smart Contract) — FIXED

**File**: [Leaderboard.sol:49-51](file:///home/x/Gaissa's%20%20materials%20and%20herbs/projects/TDH_BLUNT_HUNT/contracts/Leaderboard.sol#L49-L51)

The inherited `Ownable` contract exposes `renounceOwnership()`. If called, ownership transfers to `address(0)`, permanently locking:
- All `onlyOwner` admin functions
- Fund recovery
- Signer updates

> [!NOTE]
> **Fixed** — `renounceOwnership()` now reverts with `"Ownership renunciation is disabled"`.

---

### ✅ M-8 · Uncapped Leaderboard Gas Consumption (Smart Contract) — FIXED

**File**: [Leaderboard.sol:375-377](file:///home/x/Gaissa's%20%20materials%20and%20herbs/projects/TDH_BLUNT_HUNT/contracts/Leaderboard.sol#L375-L377)

`getLeaderboard()` and `getAllTimeLeaderboard()` return the **entire array** (up to 100 entries). For view functions this is generally acceptable, but on some chains with strict gas limits for `eth_call`, this could fail if structs are large or the RPC is restrictive. The capped size of 100 mitigates this somewhat.

> [!NOTE]
> **Fixed** — Added `getLeaderboardPaginated(offset, limit)` and `getAllTimeLeaderboardPaginated(offset, limit)` with an internal `_paginate` helper. Original full-array getters kept for backward compatibility.

---

### ✅ M-9 · `startGame` Allows Overpayment Without Refund (Smart Contract) — FIXED

**File**: [Leaderboard.sol:233-234](file:///home/x/Gaissa's%20%20materials%20and%20herbs/projects/TDH_BLUNT_HUNT/contracts/Leaderboard.sol#L233-L234)

```solidity
require(msg.value >= gameCost, "Insufficient payment");
```

If a user sends 10 DOGE when cost is 1 DOGE, the excess 9 DOGE is silently absorbed (split between dev fee and pot). This could happen from UI bugs or manual contract interactions.

> [!NOTE]
> **Fixed** — Changed `require(msg.value >= gameCost)` to `require(msg.value == gameCost, "Payment must be exact game cost")`.

---

### M-10 · Missing `receive()` and `fallback()` Functions (Smart Contract)

**File**: [Leaderboard.sol](file:///home/x/Gaissa's%20%20materials%20and%20herbs/projects/TDH_BLUNT_HUNT/contracts/Leaderboard.sol)

The contract has no `receive()` or `fallback()` function. Any direct DOGE transfers to the contract (not through `startGame`) will revert. This is arguably correct behavior, but worth documenting — if the `distributePrize` failure rollover tries to self-credit, the accounting relies on `prizePool` and not `address(this).balance`.

---

### M-11 · No `chainId` Validation in Backend Signing

**File**: [app.py:158-161](file:///home/x/Gaissa's%20%20materials%20and%20herbs/projects/TDH_BLUNT_HUNT/app.py#L158-L161)

The backend signs scores for any contract address the client provides. A user could pass a contract address from a testnet or different chain, and the signature would still be generated.

**Fix**: Validate `contract_addr` against an expected deployed address stored as environment variable.

---

### ✅ M-12 · `NewHighScore` Event Never Emitted (Smart Contract) — FIXED

**File**: [Leaderboard.sol:195](file:///home/x/Gaissa's%20%20materials%20and%20herbs/projects/TDH_BLUNT_HUNT/contracts/Leaderboard.sol#L195)

```solidity
event NewHighScore(address indexed player, uint256 score, uint256 rank);
```

> [!NOTE]
> **Fixed** — `_updateLeaderboard` now returns the insertion index. `submitScore` emits `NewHighScore` when the player achieves rank #1 on the tournament board.

---

## 🔵 Low Severity & Code Quality

| # | Issue | File | Description |
|---|-------|------|-------------|
| L-1 | Comment says "poll every 10s" | `game.js:275` | Actual interval is 1000ms |
| L-2 | Dead code: `window.fetchGameConfig` | `game.js:463` | Never defined anywhere — the config fetch silently no-ops |
| L-3 | Duplicate contract source | `deploy.html` | The entire Solidity contract is duplicated as a JS string; changes to `Leaderboard.sol` won't propagate |
| L-4 | Unused `Scaler.isStretch` | `Scaler.js:14` | Marked "deprecated" but not removed |
| L-5 | `audio.js` not audited in detail | `audio.js` (30KB) | Large procedural audio engine — potential perf issues but no security impact |
| L-6 | No CSP meta tag | `index.html` | Loading ethers.js from CDN without SRI hash |
| L-7 | No `.env.example` file | Project root | Developers won't know which env vars are required (`SIGNER_PRIVATE_KEY`) |
| L-8 | The `ethers.js` CDN URL uses v5.7.2 | `index.html:16` | Consider updating or at minimum adding an SRI integrity hash |

---

## Summary Table

| Severity | Count | Key Themes |
|----------|-------|------------|
| 🔴 Critical | 7 | Signature verification broken, session storage on serverless, client-controlled anti-cheat, no CORS/auth |
| 🟠 High | 9 | Rug-pull vectors, DoS via division-by-zero, dependency pinning, RPC spam, XSS |
| 🟡 Medium | 12 | Logic bugs, header hardening, gas concerns, event gaps |
| 🔵 Low | 8 | Dead code, documentation, CDN integrity |

---

## Recommended Priority Order (Remaining)

> 13 of 28 issues have been fixed. The following are the remaining unfixed issues in priority order.

1. **Fix C-4** (CORS) — add origin whitelist to prevent cross-site API abuse
2. **Fix C-6** (admin routes) — remove from production or add authentication
3. **Fix H-3** (recoverFunds) — add timelock or event for transparency
4. **Fix H-6** (dependency pinning) — pin exact versions in `requirements.txt`
5. **Fix H-8** (RPC spam) — reduce pot poll from 1s to 30s+, cache provider
6. **Fix H-9** (XSS risk) — use `textContent` instead of `innerHTML`
7. **Fix M-1** (exitToMenu cheater bug) — use internal score reset pattern
8. **Fix M-3** (key selector) — wire up DOM element
9. **Fix M-4** (security headers) — add HSTS, X-Frame-Options to `vercel.json`
10. **Fix M-5** (rate limiter) — accept risk or switch to Redis/Upstash
11. **Fix M-6** (IP detection) — use `X-Forwarded-For` on Vercel
12. Address remaining medium/low issues (M-10, M-11, H-7, L-1 through L-8)
