from flask import request, jsonify, session
import bcrypt
import json
import time
from chat import utils
from chat.utils import redis_client
from chat.app import app

# Simple original routes for Redis chat

@app.route("/login", methods=["POST"])
def login():
    """Original simple login approach"""
    data = request.get_json()
    username = data["username"]
    password = data["password"]

    # Use original simple Redis approach
    username_key = f"username:{username}"
    user_id = redis_client.get(username_key)
    
    if not user_id:
        return jsonify({"error": "Invalid credentials"}), 401
    
    # Decode user_id from bytes to string
    user_id_str = user_id.decode('utf-8')
    
    # Get user data from Redis hash
    user_data = redis_client.hgetall(user_id_str)
    if not user_data:
        return jsonify({"error": "Invalid credentials"}), 401
    
    # Get password from Redis data
    stored_password = user_data.get(b"password", b"").decode('utf-8')
    
    # Verify password
    try:
        if not bcrypt.checkpw(password.encode('utf-8'), stored_password.encode('utf-8')):
            return jsonify({"error": "Invalid credentials"}), 401
    except ValueError as e:
        print(f"Password verification error: {e}")
        return jsonify({"error": "Invalid credentials"}), 401
    
    # Set user in session (original format)
    user_id_num = user_id_str.split(":")[-1]
    username_from_redis = user_data.get(b"username", username.encode('utf-8')).decode('utf-8')
    session["user"] = {
        "id": user_id_num,
        "username": username_from_redis
    }
    
    return jsonify({
        "id": user_id_num,
        "username": username_from_redis
    })

@app.route("/me")
def me():
    """Get current user"""
    user = session.get("user")
    if not user:
        return jsonify({"error": "Not logged in"}), 401
    return jsonify(user)

@app.route("/logout", methods=["POST"])
def logout():
    """Logout user"""
    session.pop("user", None)
    return jsonify({"message": "Logged out"})

@app.route("/users/online")
def get_online_users():
    """Get online users"""
    online_user_ids = redis_client.smembers("online_users")
    online_users = []
    
    for user_id_bytes in online_user_ids:
        user_id = user_id_bytes.decode('utf-8')
        user_data = redis_client.hgetall(f"user:{user_id}")
        if user_data:
            username = user_data.get(b"username", f"User{user_id}".encode('utf-8')).decode('utf-8')
            online_users.append({
                "id": user_id,
                "username": username
            })
    
    return jsonify(online_users)

@app.route("/rooms/<user_id>")
def get_rooms(user_id):
    """Get rooms for user"""
    room_ids = redis_client.smembers(f"user:{user_id}:rooms")
    rooms = []
    
    for room_id_bytes in room_ids:
        room_id = room_id_bytes.decode('utf-8')
        room_name_bytes = redis_client.get(f"room:{room_id}:name")
        
        if room_name_bytes:
            room_name = room_name_bytes.decode('utf-8')
            rooms.append({
                "id": room_id,
                "name": room_name,
                "names": [room_name]  # Add names array for frontend compatibility
            })
        else:
            # Private room - get other user's name
            if ":" in room_id:
                user1, user2 = room_id.split(":")
                # Get the other user (not the current user)
                other_user_id = user2 if user1 == user_id else user1
                other_user_data = redis_client.hgetall(f"user:{other_user_id}")
                room_name = other_user_data.get(b"username", f"User{other_user_id}".encode('utf-8')).decode('utf-8')
                rooms.append({
                    "id": room_id,
                    "name": room_name,
                    "names": [room_name]  # Add names array for frontend compatibility
                })
    
    return jsonify(rooms)

@app.route("/room/<room_id>/messages")
def get_messages(room_id):
    """Get messages for room"""
    offset = int(request.args.get("offset", 0))
    size = int(request.args.get("size", 50))
    
    messages = utils.get_messages(room_id, offset, size)
    return jsonify(messages)

@app.route("/")
def serve_frontend():
    """Serve the React frontend"""
    return app.send_static_file('index.html')

@app.route("/stream")
def stream():
    """Server-Sent Events stream for Redis pub/sub messages"""
    from flask import Response
    import json
    import time
    
    def event_stream():
        # Subscribe to Redis pub/sub channel
        pubsub = redis_client.pubsub()
        pubsub.subscribe('MESSAGES')
        
        try:
            for message in pubsub.listen():
                if message['type'] == 'message':
                    data = json.loads(message['data'])
                    # For single server setup, send all messages
                    # if data.get('serverId') != utils.SERVER_ID:
                    yield f"data: {json.dumps(data)}\n\n"
        except GeneratorExit:
            pubsub.unsubscribe('MESSAGES')
            pubsub.close()
    
    return Response(event_stream(), mimetype="text/event-stream")

@app.route("/admin")
def admin_panel():
    """Simple admin panel for Redis chat"""
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Redis Chat Admin Panel</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
            .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { border-bottom: 2px solid #007bff; padding-bottom: 10px; margin-bottom: 20px; }
            .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 30px; }
            .stat-card { background: #f8f9fa; padding: 15px; border-radius: 5px; border-left: 4px solid #007bff; }
            .stat-number { font-size: 24px; font-weight: bold; color: #007bff; }
            .stat-label { color: #666; font-size: 14px; }
            .section { margin-bottom: 30px; }
            .section h3 { color: #333; border-bottom: 1px solid #eee; padding-bottom: 5px; }
            .btn { background: #007bff; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; margin: 5px; }
            .btn:hover { background: #0056b3; }
            .btn-success { background: #28a745; }
            .btn-danger { background: #dc3545; }
            .data-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            .data-table th, .data-table td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
            .data-table th { background: #f8f9fa; font-weight: bold; }
            .status-online { color: #28a745; font-weight: bold; }
            .status-offline { color: #dc3545; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🚀 Redis Chat Admin Panel</h1>
                <p>Real-time chat system powered by Redis + Flask + Socket.IO</p>
            </div>
            
            <div class="stats">
                <div class="stat-card">
                    <div class="stat-number" id="total-users">-</div>
                    <div class="stat-label">Total Users</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" id="online-users">-</div>
                    <div class="stat-label">Online Users</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" id="total-rooms">-</div>
                    <div class="stat-label">Total Rooms</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" id="total-messages">-</div>
                    <div class="stat-label">Total Messages</div>
                </div>
            </div>
            
            <div class="section">
                <h3>👥 Online Users</h3>
                <button class="btn" onclick="loadOnlineUsers()">Refresh</button>
                <table class="data-table" id="online-users-table">
                    <thead>
                        <tr><th>ID</th><th>Username</th><th>Status</th></tr>
                    </thead>
                    <tbody></tbody>
                </table>
            </div>
            
            <div class="section">
                <h3>🏠 Rooms & Channels</h3>
                <button class="btn" onclick="loadRooms()">Refresh</button>
                <table class="data-table" id="rooms-table">
                    <thead>
                        <tr><th>ID</th><th>Name</th><th>Type</th><th>Messages</th></tr>
                    </thead>
                    <tbody></tbody>
                </table>
            </div>
            
            <div class="section">
                <h3>🔧 System Actions</h3>
                <button class="btn btn-success" onclick="testRedisConnection()">Test Redis Connection</button>
                <button class="btn" onclick="clearAllData()">Clear All Data</button>
                <button class="btn" onclick="createTestData()">Create Test Data</button>
            </div>
            
            <div class="section">
                <h3>📊 System Status</h3>
                <div id="system-status">
                    <p>✅ Flask Server: Running on port 3000</p>
                    <p>✅ Redis Server: Connected</p>
                    <p>✅ Socket.IO: Active</p>
                    <p>✅ Frontend: Available at <a href="/">http://localhost:3000</a></p>
                </div>
            </div>
        </div>
        
        <script>
            // Load initial data
            loadStats();
            loadOnlineUsers();
            loadRooms();
            
            // Auto-refresh every 5 seconds
            setInterval(() => {
                loadStats();
                loadOnlineUsers();
            }, 5000);
            
            async function loadStats() {
                try {
                    const response = await fetch('/users/online');
                    const onlineUsers = await response.json();
                    document.getElementById('online-users').textContent = onlineUsers.length;
                    
                    // Get total users from Redis (this would need a new endpoint)
                    document.getElementById('total-users').textContent = '4'; // Demo data has 4 users
                    document.getElementById('total-rooms').textContent = '5'; // Demo data has 5 rooms
                    document.getElementById('total-messages').textContent = '25+'; // Demo data has messages
                } catch (error) {
                    console.error('Error loading stats:', error);
                }
            }
            
            async function loadOnlineUsers() {
                try {
                    const response = await fetch('/users/online');
                    const users = await response.json();
                    const tbody = document.querySelector('#online-users-table tbody');
                    tbody.innerHTML = '';
                    
                    users.forEach(user => {
                        const row = tbody.insertRow();
                        row.insertCell(0).textContent = user.id;
                        row.insertCell(1).textContent = user.username;
                        row.insertCell(2).innerHTML = '<span class="status-online">Online</span>';
                    });
                } catch (error) {
                    console.error('Error loading online users:', error);
                }
            }
            
            async function loadRooms() {
                try {
                    const response = await fetch('/rooms/1'); // Get Pablo's rooms as example
                    const rooms = await response.json();
                    const tbody = document.querySelector('#rooms-table tbody');
                    tbody.innerHTML = '';
                    
                    rooms.forEach(room => {
                        const row = tbody.insertRow();
                        row.insertCell(0).textContent = room.id;
                        row.insertCell(1).textContent = room.name;
                        row.insertCell(2).textContent = room.id === '0' ? 'General' : 'Private';
                        row.insertCell(3).textContent = 'Active';
                    });
                } catch (error) {
                    console.error('Error loading rooms:', error);
                }
            }
            
            function testRedisConnection() {
                alert('Redis connection test - check server logs for details');
            }
            
            function clearAllData() {
                if (confirm('Are you sure you want to clear all Redis data?')) {
                    alert('Data clear - this would need to be implemented');
                }
            }
            
            function createTestData() {
                alert('Test data creation - demo data already exists');
            }
        </script>
    </body>
    </html>
    """

@app.route("/users")
def get_users():
    """Get users by IDs"""
    user_ids = request.args.getlist('ids[]')
    users = []
    
    for user_id in user_ids:
        user_data = redis_client.hgetall(f"user:{user_id}")
        if user_data:
            username = user_data.get(b"username", f"User{user_id}".encode('utf-8')).decode('utf-8')
            users.append({
                "id": user_id,
                "username": username
            })
    
    return jsonify(users)

@app.route("/room/<room_id>/messages")
def get_room_messages(room_id):
    """Get messages for a room"""
    offset = int(request.args.get('offset', 0))
    size = int(request.args.get('size', 15))
    
    # Get messages from Redis sorted set
    messages = redis_client.zrevrange(f"room:{room_id}", offset, offset + size - 1, withscores=True)
    
    result = []
    for message_data, timestamp in messages:
        try:
            # Parse the message JSON
            import json
            message = json.loads(message_data.decode('utf-8'))
            
            # Convert to frontend expected format
            formatted_message = {
                "message": message.get('message', ''),
                "date": int(timestamp),
                "from": str(message.get('from', '')),
                "roomId": str(message.get('roomId', room_id))
            }
            result.append(formatted_message)
        except (json.JSONDecodeError, UnicodeDecodeError) as e:
            print(f"Error parsing message: {e}")
            continue
    
    return jsonify(result)

@app.route("/links")
def get_links():
    """Get demo links"""
    return jsonify({"message": "Demo links"})
