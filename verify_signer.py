import os
from dotenv import load_dotenv
from eth_account import Account
from eth_account.messages import encode_defunct
from web3 import Web3

load_dotenv()

def test_signer():
    print("--- Verifying Signer Configuration ---")
    private_key = os.getenv('SIGNER_PRIVATE_KEY')
    
    # Fallback logic check similar to app.py
    if not private_key and os.path.exists('env.json'):
        import json
        print("Loading from env.json fallback...")
        with open('env.json', 'r') as f:
            data = json.load(f)
            private_key = data.get('SIGNER_PRIVATE_KEY')

    if not private_key:
        print("FAIL: No key found in environment or env.json")
        return

    # Clean key
    private_key = private_key.strip()
    if not private_key.startswith("0x"):
        private_key = "0x" + private_key
    
    print(f"Key loaded properly. Prefix: {private_key[:4]}...")

    try:
        # Dummy data
        player = "0x1234567890123456789012345678901234567890"
        score = 123
        contract = "0x70B4a8F2937835B381534706d7821Cb06E29e9A4"
        
        # Checksum
        player = Web3.to_checksum_address(player)
        contract = Web3.to_checksum_address(contract)

        msg_hash = Web3.solidity_keccak(
            ['address', 'uint256', 'address'],
            [player, score, contract]
        )
        message = encode_defunct(hexstr=msg_hash.hex())
        signed = Account.sign_message(message, private_key)
        
        print(f"SUCCESS: Signature generated: {signed.signature.hex()[:10]}...")
        
        # Recover address
        account = Account.from_key(private_key)
        print(f"Signer Public Address: {account.address}")
        
    except Exception as e:
        print(f"FAIL: Signing error: {e}")

if __name__ == "__main__":
    test_signer()
