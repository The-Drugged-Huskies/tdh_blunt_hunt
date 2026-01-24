
import os
import json
from dotenv import load_dotenv

load_dotenv()

print("-" * 30)
print("DEBUG: Checking Environment Variables")
print("-" * 30)

# Check 1: System/Dotenv
key_env = os.getenv('SIGNER_PRIVATE_KEY')
if key_env:
    print(f"[OK] Found in os.getenv: {key_env[:6]}...{key_env[-4:]}")
else:
    print("[FAIL] Not found in os.getenv")

# Check 2: env.json
key_json = None
if os.path.exists('env.json'):
    try:
        with open('env.json', 'r') as f:
            data = json.load(f)
            key_json = data.get('SIGNER_PRIVATE_KEY')
            if key_json:
                print(f"[OK] Found in env.json: {key_json[:6]}...{key_json[-4:]}")
            else:
                print("[FAIL] env.json exists but SIGNER_PRIVATE_KEY missing")
    except Exception as e:
        print(f"[FAIL] Error reading env.json: {e}")
else:
    print("[INFO] env.json not found")

print("-" * 30)
if key_env or key_json:
    print("SUCCESS: Signer key is accessible.")
else:
    print("ERROR: Signer key NOT found in any source.")
print("-" * 30)
