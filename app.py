"""
Flask Application for TDH Blunt Hunt.

This module serves the game frontend and handles leaderboard score submissions.
"""

import json
import os
import time
from flask import Flask, render_template, request, jsonify, send_from_directory
from web3 import Web3
from eth_account import Account
from eth_account.messages import encode_defunct
from dotenv import load_dotenv
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

load_dotenv()

app = Flask(__name__)

# Rate Limiting
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://",
)

# In-memory session storage: { player_address: { start_time: timestamp } }
# In production, use Redis or a database.
game_sessions = {}
SESSION_EXPIRY = 300 # 5 minutes
MAX_SCORE_PER_SEC = 2000 # Plausibility threshold
MIN_GAME_TIME = 5 # Minimum seconds to prevent instant subs


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




@app.route('/api/session/start', methods=['POST'])
@limiter.limit("5 per minute")
def start_session():
    """Starts a game session for a player."""
    try:
        data = request.get_json(silent=True)
        if not data or 'player' not in data:
            return jsonify({"success": False, "error": "Missing player address"}), 400
        
        player = Web3.to_checksum_address(data['player'])
        game_sessions[player] = {
            "start_time": time.time()
        }
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400


@app.route('/api/sign-score', methods=['POST'])
@limiter.limit("10 per minute")
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

        # Validate JSON content
        if not request.is_json:
             return jsonify({"success": False, "error": "Content-Type must be application/json"}), 415

        data = request.get_json(silent=True)
        if not data:
            return jsonify({"success": False, "error": "Invalid JSON body"}), 400

        player = data.get('player')
        try:
            score = int(data.get('score'))
        except (ValueError, TypeError):
             return jsonify({"success": False, "error": "Invalid score"}), 400
             
        contract_addr = data.get('contract')
        is_cheater = data.get('cheater', False)

        if is_cheater:
             print(f"⚠️ Cheater detected: {player} attempted to submit score {score}")
             return jsonify({"success": False, "error": "Score tampering detected. Request denied."}), 403

        if not player or not contract_addr:
             return jsonify({"success": False, "error": "Missing data"}), 400

        # Ensure addresses are checksummed
        try:
            player = Web3.to_checksum_address(player)
            contract_addr = Web3.to_checksum_address(contract_addr)
        except ValueError:
            return jsonify({"success": False, "error": "Invalid address format"}), 400

        # --- VERIFICATION LOGIC ---
        now = time.time()
        session = game_sessions.get(player)
        
        if not session:
            return jsonify({"success": False, "error": "No active session found for this player. Start a game first."}), 403
            
        start_time = session['start_time']
        elapsed = now - start_time
        
        # 1. Session Expiry
        if elapsed > SESSION_EXPIRY:
            game_sessions.pop(player, None)
            return jsonify({"success": False, "error": "Session expired. Submit faster!"}), 403
            
        # 2. Minimum Time (Anti-Instant)
        if elapsed < MIN_GAME_TIME:
            return jsonify({"success": False, "error": "Game too short. Suspicious behavior."}), 403
            
        # 3. Plausibility Check (Points per Second)
        # Score must be achievable within the elapsed time
        # We add a 2 second buffer for latency
        if score > (elapsed + 2) * MAX_SCORE_PER_SEC:
             return jsonify({"success": False, "error": f"Score too high for time elapsed ({int(elapsed)}s). Anti-cheat triggered."}), 403

        # Clear session after successful signing attempt (valid or not)
        # This forces a new session for every game
        game_sessions.pop(player, None)

        # --- SIGNING LOGIC ---

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
    # Production: Set debug=False
    app.run(debug=False, port=5000, host='0.0.0.0')
