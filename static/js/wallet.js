/**
 * Wallet UI Controller
 * Bridges WalletManager, LeaderboardService, and the DOM.
 */

// --- Global Aliases ---
const wm = window.walletManager; // Assumes these are init in their files
const ls = window.leaderboardService;

// Configs from Config.js
// Configs from Config.js

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

    // Fetch dynamic cost just before paying
    const currentCost = await ls.getGameCost();
    // console.log("Paying Entry Fee:", currentCost);

    const res = await ls.payEntryFee(currentCost);
    if (!res.success) {
        const msg = (res.error && res.error.message && res.error.message.includes("INSUFFICIENT"))
            ? "Insufficient Funds!"
            : "Payment Failed. See console.";
        await window.showCustomModal(msg);
    }
    return res;
};

window.fetchGameCost = async () => {
    return await ls.getGameCost();
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

/**
 * Shows the custom modal/dialog.
 * @param {string} message - The message to display.
 * @param {boolean} isConfirmation - If true, shows Cancel button.
 * @param {string} title - The title of the modal.
 * @returns {Promise<boolean>} - Resolves true if OK clicked, false if Cancelled.
 */
window.showCustomModal = (message, isConfirmation = false, title = "NOTICE") => {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-modal');
        const titleEl = document.getElementById('modal-title');
        const msgEl = document.getElementById('modal-message');
        const okBtn = document.getElementById('modal-ok-btn');
        const cancelBtn = document.getElementById('modal-cancel-btn');

        if (!modal || !titleEl || !msgEl || !okBtn) {
            console.error("Modal elements missing in DOM");
            // Fallback to native alert/confirm
            if (isConfirmation) {
                resolve(confirm(message));
            } else {
                alert(message);
                resolve(true);
            }
            return;
        }

        titleEl.innerText = title;
        msgEl.innerText = message;

        if (isConfirmation) {
            cancelBtn.classList.remove('hidden');
        } else {
            cancelBtn.classList.add('hidden');
        }

        modal.classList.remove('hidden');

        // One-time event listeners helper
        const cleanup = () => {
            okBtn.onclick = null;
            cancelBtn.onclick = null;
            modal.classList.add('hidden');
        };

        okBtn.onclick = () => {
            cleanup();
            resolve(true);
        };

        cancelBtn.onclick = () => {
            cleanup();
            resolve(false);
        };
    });
};

window.addEventListener('DOMContentLoaded', initWalletUI);
