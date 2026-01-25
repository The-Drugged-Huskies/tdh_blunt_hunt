/**
 * Wallet Interaction Module v0.69
 * Handles connection to Dogechain, contract interaction, and UI updates.
 */



const DOGECHAIN_ID = GameConfig.DOGECHAIN_ID;
const DOGECHAIN_CONFIG = GameConfig.DOGECHAIN_CONFIG;



// --- DOM Elements ---

const connectBtn = document.getElementById('connect-wallet-btn');

const startConnectBtn = document.getElementById('start-connect-btn');

const startBtn = document.getElementById('start-btn');

const walletPopup = document.getElementById('wallet-popup');

const popupBalance = document.getElementById('popup-balance');

const disconnectBtn = document.getElementById('disconnect-btn');



// --- State ---

let currentAccount = null;



// --- Exposed Helpers ---

window.getCurrentWallet = () => currentAccount;



window.showCustomModal = (message, isCheck = false, titleText = null) => {

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

        if (titleText) {

            title.innerText = titleText;

            title.style.color = '#fc9838'; // Defaulting to orange/gold for custom titles

        } else {

            title.innerText = isCheck ? "CONFIRM" : "NOTICE";

            title.style.color = isCheck ? '#fc9838' : '#83d313'; // Orange for confirm, Green for notice

        }



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



/**

 * Initiates the connection to MetaMask.

 * Switches network if necessary and sets up event listeners.

 */

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

        updateUI(currentAccount);



        // Listen for account/network changes

        window.ethereum.on('accountsChanged', (accounts) => {

            currentAccount = accounts[0] || null;

            updateUI(currentAccount);

        });

        window.ethereum.on('chainChanged', () => window.location.reload());



    } catch (error) {

        console.error('Wallet Connection Error:', error);

    }

}



/**

 * Requests MetaMask to switch to Dogechain.

 * Tries to add the chain configuration if it's missing.

 */

async function switchToDogechain() {

    try {

        await window.ethereum.request({

            method: 'wallet_switchEthereumChain',

            params: [{ chainId: DOGECHAIN_ID }],

        });

    } catch (switchError) {

        // Error code 4902 indicates that the chain has not been added to MetaMask.

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



/**

 * Updates Key UI elements based on connection state.

 * @param {string|null} account - The connected wallet address.

 */

function updateUI(account) {

    if (account) {

        // --- Connected State ---

        const shortAddr = `${account.substring(0, 4)}..${account.substring(account.length - 4)}`;

        connectBtn.innerText = shortAddr;

        connectBtn.classList.add('connected');



        // Logic handled in checkAndTriggerPayout()

        if (startConnectBtn) startConnectBtn.classList.add('hidden');

        if (startBtn) {

            startBtn.classList.remove('hidden');

            startBtn.disabled = true; // Initially disabled until payout check passes

        }



        fetchBalance(account);

        window.checkAndTriggerPayout();

    } else {

        // --- Disconnected State ---

        connectBtn.innerText = 'CONNECT';

        connectBtn.classList.remove('connected');

        if (walletPopup) walletPopup.classList.add('hidden');



        if (startConnectBtn) {

            startConnectBtn.classList.remove('hidden');

            startConnectBtn.disabled = false; // "Start Game" effectively means "Connect" here

        }

        if (startBtn) {

            startBtn.classList.add('hidden');

            startBtn.disabled = true;

        }

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

            if (window.game && window.game.isRunning) {

                window.game.togglePause();

            }

            togglePopup();

        });

    }

    if (startConnectBtn) {
        startConnectBtn.addEventListener('click', () => connectWallet());
        startConnectBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            connectWallet();
        }, { passive: false });
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

    window.fetchDynamicGameCost();

});



// --- Leaderboard Integration ---

// Placeholder - User must update this after deployment!
// Used from config.js
const LEADERBOARD_CONTRACT_ADDRESS = GameConfig.LEADERBOARD_CONTRACT_ADDRESS;
// Initial value from config, but will be updated dynamically
let GAME_COST_DOGE = GameConfig.GAME_COST_DOGE;

const LEADERBOARD_ABI = [
    "function startGame() external payable",
    "function submitScore(uint256 _score, bytes _signature) external",
    "function getLeaderboard() external view returns (tuple(address player, uint256 score, uint256 timestamp)[])",
    "function getLowestQualifyingScore() external view returns (uint256)",
    "function getPotInfo() external view returns (uint256 pot, uint256 endTime)",
    "function hasTicket(address player) external view returns (bool)",
    "function distributePrize() external",
    "function signerAddress() external view returns (address)",
    "function setSignerAddress(address _signer) external",
    "function gameRoundDuration() external view returns (uint256)",
    "function gameCost() external view returns (uint256)"
];

window.getLeaderboardContract = () => {
    if (!currentAccount) return null;
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    return new ethers.Contract(LEADERBOARD_CONTRACT_ADDRESS, LEADERBOARD_ABI, signer);
};

// Helper to activate the green start button
function activateStartButton() {
    if (startConnectBtn) startConnectBtn.disabled = false;
    if (startBtn) startBtn.disabled = false;
}

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
                msg += "Be friendly and click OK to distribute the Prize Pool and restart the tournament?";
            } else {
                msg += "No winners! Be friendly and click OK to distribute Prize Pool, reset the timer and restart the tournament?";
            }

            if (await window.showCustomModal(msg, true)) {
                try {
                    const tx = await contract.distributePrize();
                    console.log("Distribute TX:", tx.hash);
                    await window.showCustomModal("Transaction Sent! Waiting for confirmation...");
                    await tx.wait();
                    await window.showCustomModal("Round Reset!");
                    activateStartButton();
                    if (window.game) {
                        window.game.updatePotDisplay();
                    }
                } catch (err) {
                    console.error("Payout failed:", err);
                    await window.showCustomModal("Payout failed or cancelled.");
                    activateStartButton(); // Activate on failure
                }
            } else {
                // User cancelled the payout modal
                activateStartButton();
            }
        } else {
            // Timer is running, safe to start
            activateStartButton();
        }
    } catch (e) {
        console.error("Payout Check Error:", e);
        // Activate anyway so user isn't stuck
        activateStartButton();
    }
}

// --- Leaderboard & Contract Helpers ---

window.getPublicLeaderboardContract = () => {
    const rpcUrl = 'https://rpc.dogechain.dog';
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl, { name: 'dogechain', chainId: 2000 });
    return new ethers.Contract(LEADERBOARD_CONTRACT_ADDRESS, LEADERBOARD_ABI, provider);
}

/**
 * Triggers the payment transaction for the game fee.
 * @returns {Promise<{success: boolean, reason?: string}>}
 */
window.payEntryFee = async () => {
    try {
        const contract = window.getLeaderboardContract();
        if (!contract) throw new Error("Wallet not connected");

        const tx = await contract.startGame({
            value: ethers.utils.parseEther(GAME_COST_DOGE)
        });

        // Debug info - kept for transparency during dev/beta
        console.log(`Payment Sent: ${tx.hash}`);

        await tx.wait();
        console.log("Payment confirmed!");
        return { success: true };
    } catch (err) {
        console.error("Payment failed:", err);
        return { success: false, reason: err.message };
    }
};

/**
 * Fetches the current Pot size and End Time.
 * @returns {Promise<{pot: string, endTime: number}|null>}
 */
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

/**
 * Submits the high score to the blockchain.
 * @param {number} score 
 * @returns {Promise<{success: boolean, hash?: string, reason?: string}>}
 */
window.submitHighScore = async (score) => {
    try {
        const contract = window.getLeaderboardContract();
        if (!contract) throw new Error("Wallet not connected");

        let signature = "0x";

        // Request Signature from Backend
        try {
            console.log("Requesting server signature...");
            const res = await fetch('/api/sign-score', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    player: currentAccount,
                    score: score,
                    contract: LEADERBOARD_CONTRACT_ADDRESS
                })
            });
            const data = await res.json();

            if (data.success && data.signature) {
                signature = data.signature;
                console.log("Signature obtained:", signature);
            } else {
                console.warn("Signature request failed:", data.error);
            }
        } catch (e) {
            console.error("Signature fetch error:", e);
        }

        const tx = await contract.submitScore(score, signature);
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

/**
 * Client-Side Indexer
 * Fetches all 'ScoreSubmitted' events to build an infinite All-Time Leaderboard.
 */
window.fetchAllTimeLeaderboard = async () => {
    try {
        if (LEADERBOARD_CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") return [];

        const rpcUrl = 'https://rpc.dogechain.dog';
        const provider = new ethers.providers.JsonRpcProvider(rpcUrl, { name: 'dogechain', chainId: 2000 });

        // Event Signature: ScoreSubmitted(address,uint256)
        const topic0 = ethers.utils.id("ScoreSubmitted(address,uint256)");

        // Fix: Dogechain RPC limits range to 5000 blocks.
        // Since you just deployed, we check the last 20,000 blocks in chunks.
        const currentBlock = await provider.getBlockNumber();
        const range = 4500; // Safe under 5000 limit
        const lookback = 20000; // Look back ~10 hours (approx) -> Covers "All Time" for new contract
        let fromBlock = Math.max(0, currentBlock - lookback);
        const toBlock = currentBlock;

        let allLogs = [];

        // Chunk Loop
        for (let i = fromBlock; i < toBlock; i += range) {
            const end = Math.min(i + range, toBlock);
            try {
                const logs = await provider.getLogs({
                    fromBlock: i,
                    toBlock: end,
                    address: LEADERBOARD_CONTRACT_ADDRESS,
                    topics: [topic0]
                });
                allLogs = allLogs.concat(logs);
            } catch (chunkErr) {
                console.warn(`Error fetching logs ${i}-${end}:`, chunkErr);
            }
        }

        console.log(`[AllTime] Logs found: ${allLogs.length}`);

        const leaderboard = [];

        allLogs.forEach(log => {
            try {
                // Decode Data
                const player = ethers.utils.getAddress('0x' + log.topics[1].slice(26));
                const score = ethers.BigNumber.from(log.data).toNumber();

                leaderboard.push({ name: player, score: score });
            } catch (e) {
                console.warn("Error parsing log:", e);
            }
        });

        leaderboard.sort((a, b) => b.score - a.score);

        return leaderboard;
    } catch (err) {
        console.error("Error fetching all-time leaderboard:", err);
        return [];
    }
};

/**
 * Fetches game configuration (Round Duration).
 * @returns {Promise<{duration: number}|null>}
 */
window.fetchGameConfig = async () => {
    try {
        const contract = window.getPublicLeaderboardContract();
        if (LEADERBOARD_CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") return null;

        // Try-catch for backward compatibility with old contracts
        try {
            const duration = await contract.gameRoundDuration();
            return { duration: duration.toNumber() };
        } catch (e) {
            console.warn("Could not fetch game duration (old contract?) defaulting to 60s");
            return { duration: 60 };
        }
    } catch (err) {
        console.error("Error fetching game config:", err);
        return { duration: 60 };
    }
};

window.fetchDynamicGameCost = async () => {
    try {
        const contract = window.getPublicLeaderboardContract();
        if (LEADERBOARD_CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") return;

        const cost = await contract.gameCost();
        const costEth = ethers.utils.formatEther(cost);

        console.log(`Dynamic Game Cost Fetched: ${costEth} DOGE`);
        GAME_COST_DOGE = costEth;

        // Update Start Button Text if it exists
        if (startConnectBtn) {
            // Only update if it says "START GAME" (default) or matches old price?
            // Actually, simpler to just append price?
            // But the button handles "CONNECT" vs "START".
            // Let's just log it for now as the button doesn't explicitly show price in text in HTML.
            // If user wants price on button, I should add it. 
            // HTML: <button ...>START GAME</button>
            // Let's change it to `START GAME (${costEth} DOGE)`?
            // The user didn't explicitly ask for UI change, just "fetch the cost".
            // But "make game cost on config match" implies they want the logic to match.
            // I'll stick to logic update first.
        }

    } catch (e) {
        console.warn("Using default cost from config (Fetch failed):", e);
    }
};
