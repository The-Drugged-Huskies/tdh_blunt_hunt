# 👑 Admin Dashboard Manual v0.85

Access the dashboard at: `http://localhost:5000/admin?secret=YOUR_ADMIN_SECRET`

> **Note**: The `?secret=` value must match the `ADMIN_SECRET` in your `.env` file. Without it, you'll get a 403 error.

## 1. Quick Status Check

When you connect your wallet, the dashboard shows **Current Values** for all settings:

* **GREEN**: Everything is good (Owner verified, Security active).
* **YELLOW**: Unsecured (Signer not set).
* **RED**: Errors or You are not the owner.

## 2. Managing the Game

### 💰 Entry Price

* **What**: How much DOGE players pay to enter.
* **Default**: `1.0` DOGE.
* **How to change**: Enter a number (e.g. `5.0`) and click **SET PRICE**.

### ⏱️ Game Round Duration (Gameplay)

* **What**: How long a single game session lasts (e.g. 60 seconds).
* **Default**: `60` Seconds.
* **How to change**: Enter seconds and click **SET ROUND TIMER**.
* **Effect**: Updates the countdown timer for all players immediately (on next reload/game start).

### 💸 Dev Fee %

* **What**: Percentage of each entry fee sent to the owner wallet.
* **Default**: `25%`.
* **Max**: `50%` (capped in contract to prevent abuse).
* **How to change**: Enter a percentage and click **SET FEE (%)**.

### ⏳ Tournament Duration

* **What**: How long a "Match" lasts before the Prize Pot is distributed.
* **Options**: 1 Hour, 24 Hours, 1 Week, 30 Days.
* **Custom**: You can enter specific seconds (e.g. `300` for 5 minutes).
* **Effect**: Changes take effect **after the current tournament ends**.

### ⏱️ Timer Controls (Crucial)

* **Align To Specific Time**:
  * Example: You want the tournament to end at **4:20 PM** every day.
  * Pick `16:20` in the picker -> Click **SET NEXT END TIME**.
  * The timer will adjust so the *current* game ends at that time.
* **Sync Timer (XX:42)**:
  * Emergency button to reset the clock to the "blunt number" (minute 42).
* **Force Reset**:
  * **DANGER BUTTON**. Immediately ends the current game, pays the winner, and restarts the clock. Use only if the game is stuck.

### 🛡️ Security (Anti-Cheat)

* **Signer Address**: This controls the backend verification logic.
  * **Status**:
    * **RED ("NOT SET")**: Contract is Open Mode (anyone can submit any score). Default after deployment.
    * **GREEN (Address)**: Contract is Secured (only backend can sign scores).
* **How to Set**:
    1. Deploy your contract.
    2. Go to the admin dashboard.
    3. Derive the **Signer Public Address** from the `SIGNER_PRIVATE_KEY` in your `.env`.
    4. Paste it into the input field.
    5. Click **SET SIGNER ADDRESS**.
    6. **Verify**: The status text should turn GREEN.

---

## 💡 Pro Tips

* **Payouts are Automatic**: You do not need to click anything. When a player logs in after the time is up, the payout triggers automatically.
* **Fees**: You (Owner) automatically get your configured fee % of every entry sent to your wallet immediately when a player enters. You don't need to withdraw it manually.
* **No Fund Recovery**: The contract does not have a `recoverFunds()` function. All funds flow through the normal prize distribution to prevent rug-pull concerns.
