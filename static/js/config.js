/**
 * Global Game Configuration
 * Central source of truth for contract addresses and game settings.
 */
const GameConfig = {
    // The deployed Leaderboard Contract Address
    LEADERBOARD_CONTRACT_ADDRESS: "0xB39E6E0C6674564b6f36E112458E65aE05395737",

    // Default Game Cost (Visual only, contract enforces actual cost)
    GAME_COST_DOGE: "1.0",

    // Chain Information
    DOGECHAIN_ID: '0x7D0', // 2000
    RPC_URL: 'https://rpc.dogechain.dog',

    // Network Configuration for MetaMask
    DOGECHAIN_CONFIG: {
        chainId: '0x7D0',
        chainName: 'Dogechain Mainnet',
        nativeCurrency: {
            name: 'DOGE',
            symbol: 'DOGE',
            decimals: 18,
        },
        rpcUrls: ['https://rpc.dogechain.dog'],
        blockExplorerUrls: ['https://explorer.dogechain.dog/'],
    }
};

// Expose for debugging
window.GameConfig = GameConfig;
