import os
from flask import Flask, send_from_directory, jsonify
from google.cloud import firestore
from flask_cors import CORS

# 环境注入
PROJECT_ID = os.environ.get("VITE_FIREBASE_PROJECT_ID", "bjhpyh1")

app = Flask(__name__, static_folder='dist', static_url_path='/')
CORS(app)

# 显式连接
db = firestore.Client(project=PROJECT_ID, database="(default)")

@app.route('/api/health')
def health():
    return jsonify({"status": "ok"})

# 示例：获取所有人员
@app.route('/api/players', methods=['GET'])
def get_players():
    print(f"DEBUG: Operation on {db.project}")
    players_ref = db.collection('players')
    docs = players_ref.stream()
    players = []
    for doc in docs:
        players.append(doc.to_dict())
    return jsonify(players)

# 示例：获取所有周期
@app.route('/api/periods', methods=['GET'])
def get_periods():
    print(f"DEBUG: Operation on {db.project}")
    periods_ref = db.collection('periods')
    docs = periods_ref.stream()
    periods = []
    for doc in docs:
        periods.append(doc.to_dict())
    return jsonify(periods)

# 通配符路由：确保所有非 API 请求均返回 dist/index.html
@app.errorhandler(404)
def not_found(e):
    return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
