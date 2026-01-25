"""
Flask Application for TDH Blunt Hunt.

This module serves the game frontend and handles leaderboard score submissions.
"""

import json
import os
from flask import Flask, render_template, request, jsonify, send_from_directory
from web3 import Web3
from eth_account import Account
from eth_account.messages import encode_defunct
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# Constants
LEADERBOARD_FILE = os.path.join(app.static_folder, 'data', 'leaderboard.json')
MAX_LEADERBOARD_ENTRIES = 500


@app.route('/')
def index():
    """Renders the main game interface."""
    return render_template('index.html')


@app.route('/admin')
def admin():
    """Serves the admin panel for the contract owner."""
    return send_from_directory('static', 'admin.html')


@app.route('/deploy')
def deploy():
    """Serves the contract deployment tool."""
    return send_from_directory('static', 'deploy.html')


@app.route('/test')
def test_page():
    """Serves the signer debug tool."""
    return send_from_directory('static', 'test.html')


@app.route('/submit-score', methods=['POST'])
def submit_score():
    """
    Handles score submission from the game.

    Expects JSON data: { "name": str, "score": int }
    Updates the local JSON leaderboard, keeps top 500, and returns the simplified rank.
    """
    try:
        data = request.json
        if not data:
            return jsonify({"success": False, "error": "No data provided"}), 400

        name = data.get('name', 'Guest')
        score = int(data.get('score', 0))

        # Load existing leaderboard
        leaderboard_data = []
        if os.path.exists(LEADERBOARD_FILE):
            with open(LEADERBOARD_FILE, 'r', encoding='utf-8') as f:
                try:
                    leaderboard_data = json.load(f)
                except json.JSONDecodeError:
                    leaderboard_data = []

        # Add new score (Rank is provisional, will be recalculated)
        leaderboard_data.append({
            "name": name,
            "score": score,
            "rank": 0
        })

        # Sort by score descending
        leaderboard_data.sort(key=lambda x: x['score'], reverse=True)

        # Keep top N and re-rank
        leaderboard_data = leaderboard_data[:MAX_LEADERBOARD_ENTRIES]
        for i, entry in enumerate(leaderboard_data):
            entry['rank'] = i + 1

        # Save back to file
        os.makedirs(os.path.dirname(LEADERBOARD_FILE), exist_ok=True)
        with open(LEADERBOARD_FILE, 'w', encoding='utf-8') as f:
            json.dump(leaderboard_data, f, indent=2)

        # Find user's new rank
        user_rank = next((x['rank'] for x in leaderboard_data if x['name'] == name and x['score'] == score), -1)

        return jsonify({"success": True, "rank": user_rank})

    except Exception as e:
        print(f"Error submitting score: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/sign-score', methods=['POST'])
def sign_score():
    """
    Signs a score for the blockchain leaderboard.
    """
    try:
        # Tries to load from environment variable first
        private_key = os.getenv('SIGNER_PRIVATE_KEY')
        
        if not private_key:
            print("Error: SIGNER_PRIVATE_KEY not found in env or env.json")
            return jsonify({"success": False, "error": "Signer not configured"}), 500
            
        # Clean the key
        private_key = private_key.strip()
        if not private_key.startswith("0x"):
            # If the user forgot 0x, add it? Or let 'eth_account' handle it?
            # eth_account usually wants 0x for hex strings.
            private_key = "0x" + private_key

        data = request.json
        player = data.get('player')
        try:
            score = int(data.get('score'))
        except (ValueError, TypeError):
             return jsonify({"success": False, "error": "Invalid score"}), 400
             
        contract_addr = data.get('contract')

        if not player or not contract_addr:
             return jsonify({"success": False, "error": "Missing data"}), 400

        # Ensure addresses are checksummed
        try:
            player = Web3.to_checksum_address(player)
            contract_addr = Web3.to_checksum_address(contract_addr)
        except ValueError:
            return jsonify({"success": False, "error": "Invalid address format"}), 400

        # Keccak256(player, score, contract) - MUST MATCH SOLIDITY
        msg_hash = Web3.solidity_keccak(
            ['address', 'uint256', 'address'],
            [player, score, contract_addr]
        )
        
        # Sign
        message = encode_defunct(hexstr=msg_hash.hex())
        signed_message = Account.sign_message(message, private_key)

        sig = signed_message.signature.hex()
        if not sig.startswith("0x"):
            sig = "0x" + sig

        return jsonify({"success": True, "signature": sig})

    except Exception as e:
        print(f"Sign Error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True)
