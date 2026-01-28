# TDH Blunt Hunt - Dogechain Edition

A browser-based physics game where you hunt huskies with blunts, featuring an on-chain Dogechain leaderboard and prize pot system.

## 🛠 Tech Stack

* **Frontend**: Vanilla JavaScript (ES6+), HTML5 Canvas.
* **Backend**: Python (Flask) for signature generation.
* **Blockchain**: Solidity (Dogechain Smart Contract).
* **Web3**: `ethers.js` (Frontend), `web3.py` (Backend).

## 🚀 Setup & Installation

1. **Install Dependencies**:

    ```bash
    pip install -r requirements.txt
    npm install
    ```

2. **Environment Configuration**:
    Create a `.env` file in the root with:

    ```env
    SIGNER_PRIVATE_KEY=your_backend_signer_private_key
    ```

    *Note: The corresponding public address must be set in the smart contract via `setSignerAddress`.*

3. **Run Locally**:

    ```bash
    python app.py
    ```

    Access at `http://localhost:5000`.

## 📜 Smart Contract Deployment

If you change the contract, you must redeploy it:

1. **Access the Deploy Tool**:
    * Navigate to `http://localhost:5000/deploy`.

2. **Connect Wallet**:
    * Click "Connect Wallet" (ensure you are on Dogechain).
    * *Note: Only the Owner can successfully deploy specific admin configurations if hardcoded, but generally anyone can deploy a fresh instance.*

3. **Deploy**:
    * Click "Deploy Contract".
    * Wait for Metamask confirmation.

4. **Update Config**:
    * Copy the **New Contract Address** from the log.
    * Update `static/js/config.js` with the new address.
    * Restart the backend server.
