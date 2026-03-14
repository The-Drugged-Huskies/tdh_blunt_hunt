# 🚀 Installation Guide: TDH Blunt Hunt v0.81 (Secured)

Your game is now upgraded with **Anti-Cheat Security** (Backend Signatures).
Follow these steps to deploy and launch.

## 1. Install Dependencies

Open your terminal in the project folder and run:

```bash
pip install -r requirements.txt
```

## 2. Generate a "Signer Wallet"

You need a secondary wallet to sign scores. **Do not use your main wallet.**

1. Go to [vanity-eth.tk](https://vanity-eth.tk/) (or use MetaMask to create a new Account).
2. Generate a fresh address.
3. **Copy the Private Key**.
4. **Copy the Address**.

## 3. Configure Server Secrets

1. Create a file named `.env` in the project root.
2. Add your Signer Private Key inside:

    ```env
    SIGNER_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE
    NETWORK_ID=dogechain
    ```

    *(Note: `SIGNER_PRIVATE_KEY` must be the private key of the account used in Step 6.)*

## 4. Deploy the Contract

1. Start your python server: `python app.py`.
2. Go to `http://localhost:5000/deploy`.
3. Connect Wallet (Your Main Owner Wallet).
4. Click **DEPLOY**.
5. **Copy the New Contract Address**.

1. Open `static/js/config.js`.
    * Find `LEADERBOARD_CONTRACT_ADDRESS`.
    * Paste your **NEW** address.
2. Open `static/admin.html`.
    * Find the input `value="..."` (near line 71).
    * Paste your **NEW** address.

## 6. Security Setup (Crucial Step!)

1. Go to `http://localhost:5000/admin`.
2. Connect Wallet (Owner).
3. Scroll to **SECURITY (BACKEND)**.
4. Paste the **Signer Address** (The Public Address from Step 2).
5. Click **SET SIGNER ADDRESS**.
6. *Wait for transaction confirmation.*

## 7. Verify

1. Play the game.
2. Submit a score.
3. Check your Python terminal. You should see:
    * `Requesting server signature...`
    * `Signature obtained: 0x...`
4. Check the Blockchain/Console: `Score submitted successfully!`.

## 8. Game Admin Config (Optional)

* In `admin.html`, set your desired **Duration** (e.g. 24 Hours).
* Set your **Time Alignment** (e.g. 16:20 UTC).
