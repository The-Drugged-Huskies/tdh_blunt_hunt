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
window.getCurrentWallet = () => currentAccount;

async function connectWallet() {
    if (typeof window.ethereum === 'undefined') {
        alert('Please install MetaMask to play on Dogechain!');
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
            e.stopPropagation(); // Prevent immediate close
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
