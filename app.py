"""
Flask Application for TDH Blunt Hunt.

This module serves the game frontend and handles leaderboard score submissions.
"""

import json
import os
import time
import jwt
from functools import wraps
from flask import Flask, render_template, request, jsonify, send_from_directory, abort
from web3 import Web3
from eth_account import Account
from eth_account.messages import encode_defunct
from dotenv import load_dotenv
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_cors import CORS

load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('FLASK_SECRET_KEY', os.urandom(32).hex())

# CORS Configuration
ALLOWED_ORIGINS = os.getenv('ALLOWED_ORIGINS', 'http://localhost:5000,http://127.0.0.1:5000').split(',')
CORS(app, resources={r"/api/*": {"origins": [o.strip() for o in ALLOWED_ORIGINS if o.strip()]}})

# Rate Limiting
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://",
)

# JWT Session Config
JWT_SECRET = os.getenv('JWT_SECRET', os.urandom(32).hex())
SESSION_EXPIRY = 300  # 5 minutes
MAX_SCORE_PER_SEC = 2000  # Plausibility threshold
MIN_GAME_TIME = 5  # Minimum seconds to prevent instant subs


@app.route('/')
def index():
    """Renders the main game interface."""
    return render_template('index.html')


def require_admin(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        admin_secret = os.getenv('ADMIN_SECRET')
        if not admin_secret:
            abort(403)
        if request.args.get('secret') != admin_secret and request.headers.get('X-Admin-Secret') != admin_secret:
            abort(403)
        return f(*args, **kwargs)
    return decorated_function


@app.route('/admin')
@require_admin
def admin():
    """Serves the admin panel for the contract owner."""
    return send_from_directory('static', 'admin.html')


@app.route('/deploy')
@require_admin
def deploy():
    """Serves the contract deployment tool."""
    return send_from_directory('static', 'deploy.html')


@app.route('/api/contract-source')
@require_admin
def contract_source():
    """Serves the Solidity contract source for the deploy tool."""
    return send_from_directory('contracts', 'Leaderboard.sol', mimetype='text/plain')




@app.route('/api/session/start', methods=['POST'])
@limiter.limit("5 per minute")
def start_session():
    """Starts a game session for a player. Returns a signed JWT token."""
    try:
        data = request.get_json(silent=True)
        if not data or 'player' not in data:
            return jsonify({"success": False, "error": "Missing player address"}), 400
        
        player = Web3.to_checksum_address(data['player'])
        
        # Create a signed JWT containing the session data
        token = jwt.encode(
            {
                "player": player,
                "start_time": time.time(),
                "exp": time.time() + SESSION_EXPIRY
            },
            JWT_SECRET,
            algorithm="HS256"
        )
        
        return jsonify({"success": True, "session_token": token})
    except Exception as e:
        app.logger.exception("Session start error: %s", e)
        return jsonify({"success": False, "error": "Invalid request"}), 400


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

        if not player or not contract_addr:
             return jsonify({"success": False, "error": "Missing data"}), 400

        # Ensure addresses are checksummed
        try:
            player = Web3.to_checksum_address(player)
            contract_addr = Web3.to_checksum_address(contract_addr)
        except ValueError:
            return jsonify({"success": False, "error": "Invalid address format"}), 400

        # --- VERIFICATION LOGIC (JWT) ---
        session_token = data.get('session_token')
        if not session_token:
            return jsonify({"success": False, "error": "No session token. Start a game first."}), 403
        
        try:
            session = jwt.decode(session_token, JWT_SECRET, algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            return jsonify({"success": False, "error": "Session expired. Submit faster!"}), 403
        except jwt.InvalidTokenError:
            return jsonify({"success": False, "error": "Invalid session token."}), 403
        
        # Verify the token belongs to this player
        if session.get('player') != player:
            return jsonify({"success": False, "error": "Session player mismatch."}), 403
        
        start_time = session['start_time']
        now = time.time()
        elapsed = now - start_time
            
        # 1. Minimum Time (Anti-Instant)
        if elapsed < MIN_GAME_TIME:
            return jsonify({"success": False, "error": "Game too short. Suspicious behavior."}), 403
            
        # 2. Plausibility Check (Points per Second)
        # Score must be achievable within the elapsed time
        # We add a 2 second buffer for latency
        if score > (elapsed + 2) * MAX_SCORE_PER_SEC:
             return jsonify({"success": False, "error": f"Score too high for time elapsed ({int(elapsed)}s). Anti-cheat triggered."}), 403

        # --- SIGNING LOGIC ---

        # Nonce provided by the frontend (read from on-chain)
        # The contract verifies the nonce in the hash, so a fake nonce
        # would cause signature verification to fail on-chain.
        try:
            nonce = int(data.get('nonce', 0))
        except (ValueError, TypeError):
            nonce = 0

        # Keccak256(player, score, contract, nonce) - MUST MATCH SOLIDITY
        msg_hash = Web3.solidity_keccak(
            ['address', 'uint256', 'address', 'uint256'],
            [player, score, contract_addr, nonce]
        )
        
        # Sign
        message = encode_defunct(hexstr=msg_hash.hex())
        signed_message = Account.sign_message(message, private_key)

        sig = signed_message.signature.hex()
        if not sig.startswith("0x"):
            sig = "0x" + sig

        return jsonify({"success": True, "signature": sig})

    except Exception as e:
        app.logger.exception("Score signing error: %s", e)
        return jsonify({"success": False, "error": "Internal server error"}), 500


if __name__ == '__main__':
    # Production: Set debug=False
    app.run(debug=False, port=5000, host='0.0.0.0')
