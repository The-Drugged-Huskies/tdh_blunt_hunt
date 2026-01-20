from flask import Flask, render_template, request, jsonify, send_from_directory
import json
import os

app = Flask(__name__)

LEADERBOARD_FILE = os.path.join(app.static_folder, 'data', 'leaderboard.json')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/withdraw')
def withdraw():
    return send_from_directory('static', 'withdraw.html')

@app.route('/deploy')
def deploy():
    return send_from_directory('static', 'deploy.html')

@app.route('/submit-score', methods=['POST'])
def submit_score():
    try:
        data = request.json
        name = data.get('name', 'Guest')
        score = data.get('score', 0)
        
        # Load existing leaderboard
        leaderboard_data = []
        if os.path.exists(LEADERBOARD_FILE):
            with open(LEADERBOARD_FILE, 'r') as f:
                try:
                    leaderboard_data = json.load(f)
                except json.JSONDecodeError:
                    leaderboard_data = []
        
        # Add new score (Rank is provisional, will be recalculated)
        leaderboard_data.append({
            "name": name,
            "score": int(score),
            "rank": 0 
        })
        
        # Sort by score descending
        leaderboard_data.sort(key=lambda x: x['score'], reverse=True)
        
        # Keep top 500 and re-rank
        leaderboard_data = leaderboard_data[:500]
        for i, entry in enumerate(leaderboard_data):
            entry['rank'] = i + 1
            
        # Save back to file
        with open(LEADERBOARD_FILE, 'w') as f:
            json.dump(leaderboard_data, f, indent=2)
            
        return jsonify({"success": True, "rank": next((x['rank'] for x in leaderboard_data if x['name'] == name and x['score'] == score), -1)})
        
    except Exception as e:
        print(f"Error submitting score: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
