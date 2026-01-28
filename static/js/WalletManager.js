/**
 * WalletManager.js
 * Handles MetaMask connection and network switching logic.
 */
class WalletManager {
    constructor() {
        this.currentAccount = null;
        this.chainId = GameConfig.DOGECHAIN_ID;
        this.config = GameConfig.DOGECHAIN_CONFIG;
        this.listeners = [];
    }

    onAccountChange(callback) {
        this.listeners.push(callback);
    }

    notifyListeners() {
        this.listeners.forEach(cb => cb(this.currentAccount));
    }

    async connect() {
        if (typeof window.ethereum === 'undefined') {
            throw new Error("MetaMask not installed");
        }

        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        await this.checkNetwork();
        this.currentAccount = accounts[0];
        this.notifyListeners();
        return this.currentAccount;
    }

    async checkNetwork() {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        if (chainId !== this.chainId) {
            await this.switchToDogechain();
        }
    }

    async switchToDogechain() {
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: this.chainId }],
            });
        } catch (switchError) {
            if (switchError.code === 4902) {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [this.config],
                });
            } else {
                throw switchError;
            }
        }
    }

    init() {
        if (typeof window.ethereum !== 'undefined') {
            window.ethereum.on('accountsChanged', (accounts) => {
                this.currentAccount = accounts[0] || null;
                this.notifyListeners();
            });
            window.ethereum.on('chainChanged', () => window.location.reload());

            // Auto check
            window.ethereum.request({ method: 'eth_accounts' }).then(accounts => {
                if (accounts.length > 0) {
                    // Verify chain first
                    window.ethereum.request({ method: 'eth_chainId' }).then(cid => {
                        if (cid === this.chainId) {
                            this.currentAccount = accounts[0];
                            this.notifyListeners();
                        }
                    });
                }
            }).catch(console.error);
        }
    }

    disconnect() {
        this.currentAccount = null;
        this.notifyListeners();
    }
}

// Global Instance
window.walletManager = new WalletManager();
