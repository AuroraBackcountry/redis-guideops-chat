from flask import request, jsonify, session
import bcrypt
import json
import time
from chat import utils
from chat.utils import redis_client

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
    
    # Get user data from Redis hash
    user_data = redis_client.hgetall(user_id)
    if not user_data:
        return jsonify({"error": "Invalid credentials"}), 401
    
    # Verify password
    stored_password = user_data.get("password", "")
    if not bcrypt.checkpw(password.encode('utf-8'), stored_password.encode('utf-8')):
        return jsonify({"error": "Invalid credentials"}), 401
    
    # Set user in session (original format)
    user_id_num = user_id.split(":")[-1]
    session["user"] = {
        "id": user_id_num,
        "username": user_data.get("username", username)
    }
    
    return jsonify({
        "id": user_id_num,
        "username": user_data.get("username", username)
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
    
    for user_id in online_user_ids:
        user_data = redis_client.hgetall(f"user:{user_id}")
        if user_data:
            online_users.append({
                "id": user_id,
                "username": user_data.get("username", f"User{user_id}")
            })
    
    return jsonify(online_users)

@app.route("/rooms/<user_id>")
def get_rooms(user_id):
    """Get rooms for user"""
    room_ids = redis_client.smembers(f"user:{user_id}:rooms")
    rooms = []
    
    for room_id in room_ids:
        room_name = redis_client.get(f"room:{room_id}:name")
        if room_name:
            rooms.append({
                "id": room_id,
                "name": room_name
            })
        else:
            # Private room - get other user's name
            if ":" in room_id:
                user1, user2 = room_id.split(":")
                other_user_id = user2 if user1 == user_id else user1
                other_user_data = redis_client.hgetall(f"user:{other_user_id}")
                room_name = other_user_data.get("username", f"User{other_user_id}")
                rooms.append({
                    "id": room_id,
                    "name": room_name
                })
    
    return jsonify(rooms)

@app.route("/room/<room_id>/messages")
def get_messages(room_id):
    """Get messages for room"""
    offset = int(request.args.get("offset", 0))
    size = int(request.args.get("size", 50))
    
    messages = utils.get_messages(room_id, offset, size)
    return jsonify(messages)

@app.route("/links")
def get_links():
    """Get demo links"""
    return jsonify({"message": "Demo links"})
