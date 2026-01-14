import json
import random

def generate_leaderboard():
    data = []
    # Known top ranks
    top_names = ["DogeKing", "ElonMusk", "SnoopDogg", "Vitalik", "Kabosu", "Harambe", "Cheems", "Pepe", "Wojak", "Bogdanoff"]
    
    # Generate Top 10
    for i, name in enumerate(top_names):
        data.append({
            "rank": i + 1,
            "name": name,
            "score": 1
        })
    
    # Generate rest up to 500
    for i in range(11, 501):
        data.append({
            "rank": i,
            "name": f"Player{i}",
            "score": 1
        })
    
    with open(r'c:\Users\janne\OneDrive\Desktop\TDH_BLUNT_HUNT\static\data\leaderboard.json', 'w') as f:
        json.dump(data, f, indent=2)

if __name__ == "__main__":
    generate_leaderboard()
