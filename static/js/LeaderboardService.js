/**
 * LeaderboardService.js
 * Service layer for interacting with the Leaderboard Scmart Contract.
 * Handles:
 * - Data fetching (Rankings, Pot Info)
 * - Transactions (Start Game, Submit Score, Pay Entry)
 * - Payout Checks
 */
class LeaderboardService {
    constructor() {
        this.contractAddress = GameConfig.LEADERBOARD_CONTRACT_ADDRESS;
        this.abi = [
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
            "function gameCost() external view returns (uint256)",
            "function getAllTimeLeaderboard() external view returns (tuple(address player, uint256 score, uint256 timestamp)[])"
        ];
    }

    getProvider() {
        return new ethers.providers.Web3Provider(window.ethereum);
    }

    getContract(signerOrProvider) {
        if (!this.contractAddress || this.contractAddress === "0x0000000000000000000000000000000000000000") return null;
        return new ethers.Contract(this.contractAddress, this.abi, signerOrProvider);
    }

    getPublicContract() {
        const rpcUrl = GameConfig.RPC_URL || 'https://rpc.dogechain.dog';
        const provider = new ethers.providers.JsonRpcProvider(rpcUrl, { name: 'dogechain', chainId: parseInt(GameConfig.DOGECHAIN_ID, 16) });
        return new ethers.Contract(this.contractAddress, this.abi, provider);
    }

    async fetchPotInfo() {
        try {
            const contract = this.getPublicContract();
            const [pot, endTime] = await contract.getPotInfo();
            return {
                pot: ethers.utils.formatEther(pot),
                endTime: endTime.toNumber() * 1000
            };
        } catch (e) {
            console.error("Fetch Pot Info Error:", e);
            return null;
        }
    }

    async fetchLeaderboard() {
        try {
            const contract = this.getPublicContract();
            const data = await contract.getLeaderboard();
            return data.map((item, index) => ({
                name: item.player,
                score: item.score.toNumber(),
                timestamp: item.timestamp.toNumber(),
                rank: index + 1
            }));
        } catch (e) {
            console.error("Fetch Leaderboard Error:", e);
            return [];
        }
    }

    async startSession(account) {
        try {
            const res = await fetch('/api/session/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ player: account })
            });
            const data = await res.json();
            return data;
        } catch (e) {
            console.error("Session Start Error:", e);
            return { success: false, error: e };
        }
    }

    async payEntryFee(costDoge) {
        try {
            const provider = this.getProvider();
            const signer = provider.getSigner();
            const contract = this.getContract(signer);

            // Check Balance
            const balance = await signer.getBalance();
            const costWei = ethers.utils.parseEther(costDoge);

            if (balance.lt(costWei)) {
                throw new Error("INSUFFICIENT_FUNDS");
            }

            const tx = await contract.startGame({ value: costWei });
            await tx.wait();
            return { success: true };

        } catch (e) {
            return { success: false, error: e };
        }
    }

    async submitScore(account, score) {
        try {
            const provider = this.getProvider();
            const signer = provider.getSigner();
            const contract = this.getContract(signer);

            const hasTicket = await contract.hasTicket(account);
            if (!hasTicket) return { success: false, reason: "NO_TICKET" };

            const isCheater = window.game ? window.game.isCheater : false;

            const sigRes = await fetch('/api/sign-score', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    player: account,
                    score,
                    contract: this.contractAddress,
                    cheater: isCheater
                })
            });
            const sigData = await sigRes.json();

            if (!sigData.success) {
                console.error("❌ Signature Failed:", sigData.error);
                return { success: false, reason: "SIGNATURE_FAILED" };
            }

            console.log("✅ Signature Received:", sigData.signature);
            console.log("📝 Submitting to Contract...");

            const tx = await contract.submitScore(score, sigData.signature);
            await tx.wait();
            return { success: true, hash: tx.hash };
        } catch (e) {
            console.error(e);
            if (e.message && (e.message.includes('revert') || e.code === 'UNPREDICTABLE_GAS_LIMIT')) {
                return { success: false, reason: "TRANSACTION_REVERTED" };
            }
            return { success: false, reason: "TRANSACTION_FAILED" };
        }
    }

    async checkPayoutStatus() {
        // Logic to check if payout is needed (time > end && pot > 0)
        // Returns true/false or specific state
        const info = await this.fetchPotInfo();
        if (!info) return null;

        const now = Date.now();
        const timeLeft = info.endTime - now;
        console.log(`[PayoutCheck] Now: ${new Date(now).toISOString()} | End: ${new Date(info.endTime).toISOString()} | Left: ${timeLeft}ms`);

        if (now >= info.endTime) {
            console.warn("⚠️ Payout Condition MET! Prompting user...");
            // Further check if there are winners... logic from original wallet.js
            // Keeping it simple for now, the caller handles the UI modal logic
            return { needsPayout: true, pot: info.pot };
        }
        return { needsPayout: false };
    }

    async distributePrize() {
        const provider = this.getProvider();
        const signer = provider.getSigner();
        const contract = this.getContract(signer);
        const tx = await contract.distributePrize();
        await tx.wait();
        return tx.hash;
    }

    async getGameCost() {
        try {
            const contract = this.getPublicContract();
            const cost = await contract.gameCost();
            return ethers.utils.formatEther(cost);
        } catch (e) {
            console.error("Fetch Cost Error:", e);
            return "1.0"; // Fallback
        }
    }

    async checkEligibility(score) {
        try {
            const contract = this.getPublicContract();
            if (this.contractAddress === "0x0000000000000000000000000000000000000000") return false;
            const lowest = await contract.getLowestQualifyingScore();
            return score > lowest.toNumber();
        } catch (err) {
            console.error("Error checking eligibility:", err);
            return false;
        }
    }

    async checkIsTopScore(score) {
        try {
            const contract = this.getPublicContract();
            if (this.contractAddress === "0x0000000000000000000000000000000000000000") return true;
            const data = await contract.getLeaderboard();
            if (data.length === 0) return true;
            return score > data[0].score.toNumber();
        } catch (e) {
            console.warn("Error checking top score:", e);
            return false;
        }
    }

    async fetchAllTimeLeaderboard() {
        try {
            // Attempt to call the new contract methods
            const contract = this.getPublicContract();

            // NOTE: If contract is old, this call will revert/fail.
            // We can wrap it.
            const data = await contract.getAllTimeLeaderboard();

            return data.map((item, index) => ({
                name: item.player,
                score: item.score.toNumber(),
                timestamp: item.timestamp.toNumber(),
                rank: index + 1
            }));

        } catch (e) {
            console.warn("Fast All-Time Fetch failed (Old Contract?). Falling back to logs...", e);
            // Optional: Fallback to log scanning if you want to support old contracts
            // For now, returning empty or error to prompt update
            return [];
        }
    }
}

window.leaderboardService = new LeaderboardService();
