const DOGECHAIN_ID = '0x7D0'; // 2000 in hex
const DOGECHAIN_CONFIG = {
    chainId: DOGECHAIN_ID,
    chainName: 'Dogechain Mainnet',
    nativeCurrency: {
        name: 'DOGE',
        symbol: 'DOGE', // or wDOGE
        decimals: 18,
    },
    rpcUrls: ['https://rpc.dogechain.dog'],
    blockExplorerUrls: ['https://explorer.dogechain.dog/'],
};

const connectBtn = document.getElementById('connect-wallet-btn');
const startConnectBtn = document.getElementById('start-connect-btn');
const startBtn = document.getElementById('start-btn');
const walletPopup = document.getElementById('wallet-popup');
const popupBalance = document.getElementById('popup-balance');
const disconnectBtn = document.getElementById('disconnect-btn');

let currentAccount = null;

// Expose for game.js
// Expose for game.js
window.getCurrentWallet = () => currentAccount;

window.showCustomModal = (message, isCheck = false) => {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-modal');
        const title = document.getElementById('modal-title');
        const msg = document.getElementById('modal-message');
        const okBtn = document.getElementById('modal-ok-btn');
        const cancelBtn = document.getElementById('modal-cancel-btn');

        if (!modal) {
            // Fallback
            if (isCheck) resolve(confirm(message));
            else { alert(message); resolve(true); }
            return;
        }

        msg.innerText = message;
        title.innerText = isCheck ? "CONFIRM" : "NOTICE";
        title.style.color = isCheck ? '#fc9838' : '#83d313'; // Orange for confirm, Green for notice

        // Reset listeners by cloning
        const newOk = okBtn.cloneNode(true);
        const newCancel = cancelBtn.cloneNode(true);
        okBtn.parentNode.replaceChild(newOk, okBtn);
        cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);

        modal.classList.remove('hidden');

        if (isCheck) {
            newCancel.classList.remove('hidden');
        } else {
            newCancel.classList.add('hidden');
        }

        newOk.onclick = () => {
            modal.classList.add('hidden');
            resolve(true);
        };

        newCancel.onclick = () => {
            modal.classList.add('hidden');
            resolve(false);
        };
    });
};

async function connectWallet() {
    if (typeof window.ethereum === 'undefined') {
        await window.showCustomModal('Please install MetaMask to play on Dogechain!');
        return;
    }

    try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const account = accounts[0];

        const chainId = await window.ethereum.request({ method: 'eth_chainId' });

        if (chainId !== DOGECHAIN_ID) {
            await switchToDogechain();
        }

        currentAccount = account;
        updateUI(account);

        window.ethereum.on('accountsChanged', (accounts) => {
            currentAccount = accounts[0] || null;
            updateUI(currentAccount);
        });
        window.ethereum.on('chainChanged', () => window.location.reload());

    } catch (error) {
        console.error('Wallet Connection Error:', error);
    }
}

async function switchToDogechain() {
    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: DOGECHAIN_ID }],
        });
    } catch (switchError) {
        // This error code indicates that the chain has not been added to MetaMask.
        if (switchError.code === 4902) {
            try {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [DOGECHAIN_CONFIG],
                });
            } catch (addError) {
                console.error('Error adding Dogechain:', addError);
            }
        } else {
            console.error('Error switching network:', switchError);
        }
    }
}

function updateUI(account) {
    if (account) {
        // Connected
        const shortAddr = `${account.substring(0, 4)}..${account.substring(account.length - 4)}`;
        connectBtn.innerText = shortAddr;
        connectBtn.classList.add('connected');

        // Start Screen Logic
        if (startConnectBtn) startConnectBtn.classList.add('hidden');
        if (startBtn) startBtn.classList.remove('hidden');

        fetchBalance(account);

        // Payout Check: Trigger immediately if round ended
        window.checkAndTriggerPayout();
    } else {
        // Disconnected
        connectBtn.innerText = 'CONNECT';
        connectBtn.classList.remove('connected');
        if (walletPopup) walletPopup.classList.add('hidden'); // Ensure popup is closed

        // Start Screen Logic
        if (startConnectBtn) startConnectBtn.classList.remove('hidden');
        if (startBtn) startBtn.classList.add('hidden');
    }
}

function disconnectWallet() {
    currentAccount = null;
    updateUI(null);
    console.log("Disconnected (UI State Reset)");
}

function togglePopup() {
    if (currentAccount) {
        if (walletPopup) walletPopup.classList.toggle('hidden');
    } else {
        connectWallet();
    }
}

async function fetchBalance(account) {
    try {
        // Use the official Dogechain RPC for reliable data
        const rpcUrl = 'https://rpc.dogechain.dog';
        const provider = new ethers.providers.JsonRpcProvider(rpcUrl, {
            name: 'dogechain',
            chainId: 2000
        });

        const balance = await provider.getBalance(account);
        const formattedBalance = ethers.utils.formatEther(balance);

        if (popupBalance) popupBalance.innerText = `${parseFloat(formattedBalance).toFixed(2)} DOGE`;
    } catch (error) {
        console.error('Error fetching balance:', error);
        if (popupBalance) popupBalance.innerText = 'Error';
    }
}

function initWallet() {
    console.log("Initializing Wallet...");
    if (connectBtn) {
        connectBtn.addEventListener('click', (e) => {
            // e.stopPropagation(); // Allow bubbling if needed, but we connect directly here

            // Trigger Pause if game is running
            if (window.game && window.game.isRunning) {
                window.game.togglePause();
            }

            togglePopup();
        });
    }
    if (startConnectBtn) {
        startConnectBtn.addEventListener('click', () => connectWallet());
    }
    if (disconnectBtn) {
        disconnectBtn.addEventListener('click', () => disconnectWallet());
    }

    // Close popup when clicking outside
    document.addEventListener('click', (e) => {
        if (walletPopup && !walletPopup.contains(e.target) && e.target !== connectBtn) {
            walletPopup.classList.add('hidden');
        }
    });
}

// Check if already connected on load
async function checkConnection() {
    if (typeof window.ethereum !== 'undefined') {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts.length > 0) {
                const chainId = await window.ethereum.request({ method: 'eth_chainId' });
                // Note: chainId returns hex string
                if (chainId === DOGECHAIN_ID) {
                    updateUI(accounts[0]);
                }
            }
        } catch (err) {
            console.error("Connection Check Failed:", err);
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    initWallet();
    checkConnection();
});

// --- Leaderboard Integration ---

// Placeholder - User must update this after deployment!
const LEADERBOARD_CONTRACT_ADDRESS = "0x10f2F8c009704FADBf989c6387a5ecA1B7c5914B";
const GAME_COST_DOGE = "1.0"; // 1 DOGE

const LEADERBOARD_ABI = [
    "function startGame() external payable",
    "function submitScore(uint256 _score) external",
    "function getLeaderboard() external view returns (tuple(address player, uint256 score, uint256 timestamp)[])",
    "function getLowestQualifyingScore() external view returns (uint256)",
    "function getPotInfo() external view returns (uint256 pot, uint256 endTime)",
    "function hasTicket(address player) external view returns (bool)",
    "function distributePrize() external"
];

window.getLeaderboardContract = () => {
    if (!currentAccount) return null;
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    return new ethers.Contract(LEADERBOARD_CONTRACT_ADDRESS, LEADERBOARD_ABI, signer);
};

window.checkAndTriggerPayout = async () => {
    try {
        const contract = window.getLeaderboardContract();
        if (!contract) return;

        const [pot, endTime] = await contract.getPotInfo();
        const now = Math.floor(Date.now() / 1000);

        if (now >= endTime.toNumber()) {
            // Check if there are players to pay
            const lb = await contract.getLeaderboard();
            let msg = "Round ended! ";
            if (lb.length > 0 && pot.gt(0)) {
                msg += "Click OK to distribute the Prize Pool and restart the timer.";
            } else {
                msg += "Click OK to reset the timer (No winners).";
            }

            if (await window.showCustomModal(msg, true)) {
                try {
                    const tx = await contract.distributePrize();
                    console.log("Distribute TX:", tx.hash);
                    await window.showCustomModal("Transaction Sent! Waiting for confirmation...");
                    await tx.wait();
                    await window.showCustomModal("Round Reset! Page will reload.");
                    window.location.reload();
                } catch (err) {
                    console.error("Payout failed:", err);
                    await window.showCustomModal("Payout failed or cancelled.");
                }
            }
        }
    } catch (e) {
        console.error("Payout Check Error:", e);
    }
}

window.getPublicLeaderboardContract = () => {
    const rpcUrl = 'https://rpc.dogechain.dog';
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl, { name: 'dogechain', chainId: 2000 });
    return new ethers.Contract(LEADERBOARD_CONTRACT_ADDRESS, LEADERBOARD_ABI, provider);
}

window.payEntryFee = async () => {
    try {
        const contract = window.getLeaderboardContract();
        if (!contract) throw new Error("Wallet not connected");

        const tx = await contract.startGame({
            value: ethers.utils.parseEther(GAME_COST_DOGE)
        });
        console.log("Payment sent:", tx.hash);
        await tx.wait();
        console.log("Payment confirmed! Game starting...");
        return { success: true };
    } catch (err) {
        console.error("Payment failed:", err);
        return { success: false, reason: err.message };
    }
};

window.fetchPotInfo = async () => {
    try {
        const contract = window.getPublicLeaderboardContract();
        if (LEADERBOARD_CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") return null;

        const [pot, endTime] = await contract.getPotInfo();
        return {
            pot: ethers.utils.formatEther(pot),
            endTime: endTime.toNumber() * 1000 // Convert to ms
        };
    } catch (err) {
        console.error("Error fetching pot info:", err);
        return null;
    }
};

window.fetchLeaderboard = async () => {
    try {
        const contract = window.getPublicLeaderboardContract();
        if (LEADERBOARD_CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") {
            return [];
        }
        const data = await contract.getLeaderboard();
        return data.map(item => ({
            name: item.player,
            score: item.score.toNumber(),
            timestamp: item.timestamp.toNumber()
        }));
    } catch (err) {
        console.error("Error fetching leaderboard:", err);
        return [];
    }
};

window.submitHighScore = async (score) => {
    try {
        const contract = window.getLeaderboardContract();
        if (!contract) throw new Error("Wallet not connected");

        // Note: Credits are checked on-chain, but good to have UI feedback if 0 credits.
        // For now we rely on the contract revert.

        const tx = await contract.submitScore(score);
        console.log("Transaction sent:", tx.hash);
        await tx.wait();
        console.log("Score submitted successfully!");
        return { success: true, hash: tx.hash };
    } catch (err) {
        console.error("Error submitting score:", err);
        return { success: false, reason: err.message };
    }
};

window.checkLeaderboardEligibility = async (score) => {
    try {
        // Eligibility now implies having a credit AND being high enough score
        // But for simplicity, we just check score vs lowest. Credit check happens at Start.
        const contract = window.getPublicLeaderboardContract();
        if (LEADERBOARD_CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") return false;

        const lowest = await contract.getLowestQualifyingScore();
        return score > lowest.toNumber();
    } catch (err) {
        console.error("Error checking eligibility:", err);
        return false;
    }
};

window.checkIsTopScore = async (score) => {
    try {
        const contract = window.getPublicLeaderboardContract();
        if (LEADERBOARD_CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") return true;

        const data = await contract.getLeaderboard();
        if (data.length === 0) return true;
        const topScore = data[0].score.toNumber();
        return score > topScore;
    } catch (e) {
        console.warn("Error checking top score:", e);
        return false;
    }
};
