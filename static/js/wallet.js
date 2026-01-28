/**
 * Wallet UI Controller
 * Bridges WalletManager, LeaderboardService, and the DOM.
 */

// --- Global Aliases ---
const wm = window.walletManager; // Assumes these are init in their files
const ls = window.leaderboardService;

// Configs from Config.js
let GAME_COST_DOGE = GameConfig.GAME_COST_DOGE;

// --- DOM Elements ---
const connectBtn = document.getElementById('connect-wallet-btn');
const startConnectBtn = document.getElementById('start-connect-btn');
const startBtn = document.getElementById('start-btn');
const walletPopup = document.getElementById('wallet-popup');
const popupBalance = document.getElementById('popup-balance');
const disconnectBtn = document.getElementById('disconnect-btn');

// --- Initialization ---

function initWalletUI() {
    console.log("Initializing Wallet UI...");

    // Subscribe to Wallet Manager
    wm.onAccountChange((account) => {
        updateUI(account);
    });

    // Button Listeners
    if (connectBtn) {
        connectBtn.addEventListener('click', () => {
            if (wm.currentAccount) {
                togglePopup();
            } else {
                wm.connect().catch(e => console.error("Connection failed", e));
            }
        });
    }

    if (startConnectBtn) {
        startConnectBtn.addEventListener('click', () => wm.connect());
    }

    if (disconnectBtn) {
        disconnectBtn.addEventListener('click', () => {
            wm.disconnect();
            togglePopup();
        });
    }

    // Auto-Connect (Logic moved to WalletManager, but we trigger init here)
    wm.init();

    // Periodic Pot Check
    checkAndTriggerPayout();
    setInterval(checkAndTriggerPayout, 60000); // Check every minute
}

// --- UI Logic ---

let currentAccount = null; // Local State Mirror

async function updateUI(account) {
    currentAccount = account;

    if (account) {
        // Connected
        const shortAddr = `${account.substring(0, 4)}..${account.substring(account.length - 4)}`;
        if (connectBtn) {
            connectBtn.innerText = shortAddr;
            connectBtn.classList.add('connected');
        }

        if (startConnectBtn) startConnectBtn.classList.add('hidden');
        if (startBtn) {
            startBtn.classList.remove('hidden');
            startBtn.disabled = true; // Wait for payout check
        }

        updateBalance(account);
        checkAndTriggerPayout();

    } else {
        // Disconnected
        if (connectBtn) {
            connectBtn.innerText = "CONNECT";
            connectBtn.classList.remove('connected');
        }
        if (walletPopup) walletPopup.classList.add('hidden');

        if (startConnectBtn) {
            startConnectBtn.classList.remove('hidden');
            startConnectBtn.disabled = false;
        }
        if (startBtn) {
            startBtn.classList.add('hidden');
        }
    }
}

async function updateBalance(account) {
    if (!popupBalance) return;
    try {
        const provider = ls.getProvider();
        const bal = await provider.getBalance(account);
        popupBalance.innerText = parseFloat(ethers.utils.formatEther(bal)).toFixed(2) + " DOGE";
    } catch (e) {
        popupBalance.innerText = "Error";
    }
}

function togglePopup() {
    if (walletPopup) walletPopup.classList.toggle('hidden');
}

// --- exposed globals for Game.js compatibility ---
// Some functions are called directly by game.js or onclick handlers

window.getCurrentWallet = () => wm.currentAccount;

window.payEntryFee = async () => {
    if (!wm.currentAccount) {
        await window.showCustomModal("Please connect wallet first!");
        return { success: false };
    }

    const res = await ls.payEntryFee(GAME_COST_DOGE);
    if (!res.success) {
        const msg = (res.error && res.error.message && res.error.message.includes("INSUFFICIENT"))
            ? "Insufficient Funds!"
            : "Payment Failed. See console.";
        await window.showCustomModal(msg);
    }
    return res;
};

window.submitHighScore = async (score) => {
    if (!wm.currentAccount) return { success: false, reason: "No Wallet" };
    return await ls.submitScore(wm.currentAccount, score);
}

window.fetchPotInfo = async () => {
    return await ls.fetchPotInfo();
};

window.fetchLeaderboard = async () => {
    return await ls.fetchLeaderboard();
};

window.fetchAllTimeLeaderboard = async () => {
    return await ls.fetchAllTimeLeaderboard();
};

window.checkLeaderboardEligibility = async (score) => {
    return await ls.checkEligibility(score);
};

window.checkIsTopScore = async (score) => {
    return await ls.checkIsTopScore(score);
};

// --- Payout Logic ---

window.checkAndTriggerPayout = async () => {
    if (!wm.currentAccount) return;

    try {
        const status = await ls.checkPayoutStatus();
        if (!status) return;

        if (status.needsPayout) {
            // Logic from original: Ask user to distribute
            const confirm = await window.showCustomModal(
                "Round ended! Distribute prize pool?",
                true
            );
            if (confirm) {
                await ls.distributePrize();
                await window.showCustomModal("Prize Distributed! Round Reset.");
            }
        }

        // Always enable start button if we are connected and things are checked
        if (startBtn) startBtn.disabled = false;

    } catch (e) {
        console.error("Payout trigger error:", e);
        if (startBtn) startBtn.disabled = false; // Fallback
    }
}

// Start
window.addEventListener('DOMContentLoaded', initWalletUI);
