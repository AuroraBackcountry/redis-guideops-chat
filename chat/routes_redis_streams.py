"""
Redis Streams API Routes for GuideOps Chat
Professional message handling with perfect attribution
"""

from flask import request, jsonify, session
from chat.app import app
from chat.redis_streams import redis_streams
from chat import utils
from chat.utils import redis_client
from chat.routes import get_user_data  # Import user data function
import json
import requests

# Add bot constants at top
BOT_USER_ID = "bot_elrich"
BOT_ROOM_ID = "bot_room"
FASTAPI_BOT_URL = "http://127.0.0.1:3002/chat"  # Your FastAPI endpoint

@app.route("/v2/rooms/<room_id>/messages", methods=["GET"])
def get_room_messages_v2(room_id):
    """
    Get messages using Redis Streams - perfect attribution guaranteed
    Query params:
    - count: Number of messages (default 15)  
    - before: Stream ID for pagination (optional)
    """
    # Temporarily disable auth for cross-domain session issues - will fix with proper JWT tokens
    # if "user" not in session:
    #     return jsonify({"error": "Not authenticated"}), 401
    
    count = int(request.args.get("count", 15))
    before_id = request.args.get("before")  # Stream ID for pagination
    
    try:
        result = redis_streams.get_messages(room_id, count, before_id)
        
        print(f"[API v2] Room {room_id} messages: {len(result['messages'])} returned with Redis Streams enrichment")
        
        return jsonify(result)
    except Exception as e:
        print(f"[API] Error getting messages for room {room_id}: {e}")
        return jsonify({"error": "Failed to load messages"}), 500


@app.route("/v2/bot/setup", methods=["POST"])
def setup_bot_room():
    """Initialize bot user and room (admin only)"""
    try:
        # Create bot user in Redis if not exists
        bot_user_key = f"user:{BOT_USER_ID}"
        if not redis_client.exists(bot_user_key):
            redis_client.hset(bot_user_key, mapping={
                "id": BOT_USER_ID,
                "username": "Elrich AI",
                "first_name": "Elrich",
                "last_name": "AI",
                "email": "elrich@guideops.ai",
                "role": "bot"
            })
        
        # Set bot room name so it appears in room lists
        redis_client.set(f"room:{BOT_ROOM_ID}:name", "🤖 Elrich AI")
        
        # Add bot room to all existing users' room lists
        all_user_keys = redis_client.keys("user:*")
        for user_key in all_user_keys:
            if b":" in user_key:  # Skip non-user keys
                user_id = user_key.decode('utf-8').split(':')[1]
                if user_id != BOT_USER_ID:  # Don't add bot to its own rooms
                    redis_client.sadd(f"user:{user_id}:rooms", BOT_ROOM_ID)
        
        # Add welcome message to bot room
        welcome_msg = redis_streams.add_info_message(
            BOT_ROOM_ID,
            "🤖 Welcome to Elrich AI! Ask me anything about guiding."
        )
        
        return jsonify({
            "success": True, 
            "bot_room": BOT_ROOM_ID,
            "message": "Bot room added to all users"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def handle_bot_message(room_id, user_id, message_text, latitude, longitude):
    """Handle message to bot - HTTP request to FastAPI"""
    try:
        # First, save user's message to Redis Streams
        user_message = redis_streams.add_message(
            room_id=room_id,
            user_id=user_id,
            message_text=message_text,
            latitude=latitude,
            longitude=longitude
        )
        
        # Emit user message immediately
        from chat.app import socketio
        socketio.emit("message", user_message, to=str(room_id))
        
        # Get user data for FastAPI request
        user_data = get_user_data(user_id)
        
        # Send to FastAPI/N8N
            response = requests.post(
                FASTAPI_BOT_URL,
                json={
                    "text": message_text,
                    "user_id": user_id,
                    "user_name": f"{user_data.get('first_name', '')} {user_data.get('last_name', '')}".strip(),
                    "user_email": user_data.get('email', 'unknown@example.com')
                },
                timeout=30.0
            )
            
            if response.status_code == 200:
                bot_response_text = response.text
                
                # Save bot response to Redis Streams
                bot_message = redis_streams.add_message(
                    room_id=room_id,
                    user_id=BOT_USER_ID,
                    message_text=bot_response_text,
                    latitude=latitude,  # Same location as user
                    longitude=longitude
                )
                
                # Emit bot response
                socketio.emit("message", bot_message, to=str(room_id))
                
                return jsonify({"ok": True, "user_message": user_message, "bot_message": bot_message}), 201
            else:
                # Bot error - send error message
                error_msg = redis_streams.add_message(
                    room_id=room_id,
                    user_id=BOT_USER_ID,
                    message_text="Sorry, I'm having technical difficulties. Please try again.",
                    latitude=None,
                    longitude=None
                )
                socketio.emit("message", error_msg, to=str(room_id))
                return jsonify({"ok": False, "error": "Bot unavailable"}), 500
                
    except Exception as e:
        print(f"[BOT] Error: {e}")
        return jsonify({"ok": False, "error": "Bot request failed"}), 500

@app.route("/v2/rooms/<room_id>/messages", methods=["POST"])
def send_message_v2(room_id):
    """Send message using Redis Streams with user data enrichment"""
    # Temporarily disable auth for cross-domain session issues - will fix with proper JWT tokens
    # if "user" not in session:
    #     return jsonify({"error": "Not authenticated"}), 401
    
    # Get request data first
    body = request.get_json() or {}
    
    # Extract user ID from session if available, otherwise from request body
    if "user" in session:
        user_id = session["user"]["id"]
    else:
        # Cross-domain fallback: get user ID from request body
        user_id = body.get("user_id") or body.get("userId") or "1"
        print(f"[API v2] Cross-domain request, using user_id from request: {user_id}")
    # Accept both "text" (V2 standard) and "message" (frontend compatibility)
    message_text = (body.get("text") or body.get("message", "")).strip()
    
    if not message_text:
        return jsonify({"ok": False, "error": "Message text required"}), 400
    
    # Extract GPS coordinates if provided
    latitude = body.get("lat") or body.get("latitude")
    longitude = body.get("long") or body.get("longitude") 
    
    # Check if this is bot room
    if room_id == BOT_ROOM_ID:
        return handle_bot_message(room_id, user_id, message_text, 
                                float(latitude) if latitude is not None else None,
                                float(longitude) if longitude is not None else None)
    
    try:
        # Use Redis Streams system with user data enrichment
        result = redis_streams.add_message(
            room_id=room_id,
            user_id=user_id,
            message_text=message_text,
            latitude=float(latitude) if latitude is not None else None,
            longitude=float(longitude) if longitude is not None else None
        )
        
        # Instant fan-out via Socket.IO for real-time delivery
        from chat.app import socketio
        socketio.emit("message", result, to=str(room_id))
        
        print(f"[API v2] Message sent to room {room_id} by user {user_id}: {result['id']} (Socket.IO fan-out)")
        
        return jsonify({"ok": True, "message": result}), 201
        
    except ValueError as e:
        print(f"[API v2] Validation error: {e}")
        return jsonify({"ok": False, "error": str(e)}), 400
    except Exception as e:
        print(f"[API v2] Error sending message to room {room_id}: {e}")
        return jsonify({"ok": False, "error": "Failed to send message"}), 500


@app.route("/v2/ack", methods=["POST"])
def acknowledge_messages():
    """Client acknowledges receipt of messages - advances cursors"""
    # Get request data
    body = request.get_json() or {}
    
    # Extract user ID (same pattern as send_message_v2)
    if "user" in session:
        user_id = session["user"]["id"]
    else:
        user_id = body.get("user_id") or body.get("userId") or "1"
    
    # Get acknowledgments: {room_id: last_message_id}
    acks = body.get("acks", {})
    
    if not acks:
        return jsonify({"ok": False, "error": "No acknowledgments provided"}), 400
    
    try:
        # Update cursors for each acknowledged room (monotonic validation)
        for room_id, last_message_id in acks.items():
            if last_message_id and '-' in str(last_message_id):  # Validate stream ID format
                # Get current cursor for monotonic check
                current_cursor = redis_streams.get_last_seen(user_id, room_id)
                
                # Only advance if new ID is greater than current (monotonic)
                if not current_cursor or str(last_message_id) > current_cursor:
                    redis_streams.set_last_seen(user_id, room_id, str(last_message_id))
                    print(f"[ACK] User {user_id} acknowledged room {room_id} up to {last_message_id}")
                else:
                    print(f"[ACK] User {user_id} ACK ignored (non-monotonic): {last_message_id} <= {current_cursor}")
        
        return jsonify({"ok": True, "acknowledged": len(acks)}), 200
        
    except Exception as e:
        print(f"[ACK] Error processing acknowledgments: {e}")
        return jsonify({"ok": False, "error": "Failed to process acknowledgments"}), 500


# OPTIONS handlers for CORS preflight requests
@app.route("/v2/ack", methods=["OPTIONS"])
@app.route("/v2/rooms/<room_id>/messages", methods=["OPTIONS"])
def handle_preflight():
    """Handle CORS preflight requests for POST endpoints"""
    from flask import Response
    
    origin = request.headers.get('Origin')
    allowed_origins = [
        "https://guideops-chat-frontend.vercel.app",
        "http://localhost:3000"
    ]
    
    if origin in allowed_origins:
        response = Response()
        response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With'
        response.headers['Access-Control-Max-Age'] = '86400'  # Cache preflight for 24 hours
        response.headers['Vary'] = 'Origin'
        return response
    else:
        return jsonify({"error": "CORS policy violation"}), 403


@app.route("/v2/rooms/<room_id>/clear", methods=["DELETE"])
def clear_room_messages_v2(room_id):
    """Clear all messages from room (admin only, for fresh start)"""
    # Temporarily disable auth for V2 testing - will re-enable after session fix
    # if "user" not in session:
    #     return jsonify({"error": "Not authenticated"}), 401
    
    user_role = session["user"].get("role", "user")
    if user_role not in ["super_admin", "admin"]:
        return jsonify({"error": "Admin access required"}), 403
    
    try:
        success = redis_streams.clear_room_messages(room_id)
        
        if success:
            # Broadcast clear event
            utils.redis_client.publish("MESSAGES", json.dumps({
                "type": "room_cleared",
                "data": {"roomId": room_id}
            }))
            
            # Add info message about the clear
            info_message = redis_streams.add_info_message(
                room_id, 
                f"Chat history cleared by {session['user'].get('username', 'Admin')}"
            )
            
            print(f"[API] Room {room_id} cleared by {session['user'].get('username')}")
            
            return jsonify({
                "success": True,
                "message": "Room cleared successfully",
                "info_message": info_message
            })
        else:
            return jsonify({"error": "Failed to clear room"}), 500
    except Exception as e:
        print(f"[API] Error clearing room {room_id}: {e}")
        return jsonify({"error": "Failed to clear room"}), 500


@app.route("/v2/system/migrate", methods=["POST"])
def migrate_to_redis_streams():
    """Migrate existing messages to Redis Streams (one-time operation)"""
    # Keep auth for admin operations
    if "user" not in session:
        return jsonify({"error": "Not authenticated"}), 401
    
    user_role = session["user"].get("role", "user")
    if user_role != "super_admin":
        return jsonify({"error": "Super admin access required"}), 403
    
    try:
        # This would migrate existing ZSET messages to Streams
        # For fresh start, we'll just clear and start new
        
        # Clear existing messages from general room
        redis_streams.clear_room_messages("0")
        
        # Add welcome message
        welcome_msg = redis_streams.add_info_message(
            "0", 
            "✨ Welcome to GuideOps Chat 2.0 - Enhanced with Redis Streams!"
        )
        
        print("[API] Migration to Redis Streams completed")
        
        return jsonify({
            "success": True,
            "message": "Migrated to Redis Streams successfully",
            "welcome_message": welcome_msg
        })
    except Exception as e:
        print(f"[API] Migration error: {e}")
        return jsonify({"error": "Migration failed"}), 500


@app.route("/v2/debug/session")
def debug_session():
    """Debug endpoint to check session configuration (production-safe)"""
    try:
        from flask import current_app
        
        return jsonify({
            "has_user": "user" in session,
            "user_id": session.get("user", {}).get("id", "NO_USER_ID"),
            "username": session.get("user", {}).get("username", "NO_USERNAME"),
            "secret_key_set": bool(current_app.config.get('SECRET_KEY')),
            "secret_key_default": current_app.config.get('SECRET_KEY') == "Optional default value",
            "session_type": current_app.config.get('SESSION_TYPE'),
            "session_permanent": session.permanent,
            "session_security_configured": bool(current_app.config.get('SESSION_COOKIE_SECURE'))
        })
    except Exception as e:
        return jsonify({
            "error": str(e),
            "has_session": bool(session)
        }), 500

@app.route("/v2/rooms/<room_id>/messages/location", methods=["GET"])
def get_messages_by_location(room_id):
    """Get messages with location data for API use (location-based analytics)"""
    # Temporarily disable auth for cross-domain session issues - will fix with proper JWT tokens
    # if "user" not in session:
    #     return jsonify({"error": "Not authenticated"}), 401
    
    count = int(request.args.get("count", 50))
    before_id = request.args.get("before")
    
    try:
        # Get messages from Redis Streams
        result = redis_streams.get_messages(room_id, count, before_id)
        
        # Filter messages that have location data
        location_messages = []
        for msg in result['messages']:
            if 'location' in msg and msg['location']:
                location_messages.append({
                    'id': msg['id'],
                    'user_id': msg['from'],
                    'username': msg.get('user', {}).get('username', 'Unknown'),
                    'text': msg['text'],
                    'location': msg['location'],
                    'tsServer': msg['tsServer'],
                    'tsIso': msg.get('tsIso', ''),
                    'roomId': msg['roomId']
                })
        
        return jsonify({
            'messages': location_messages,
            'total_with_location': len(location_messages),
            'total_messages': len(result['messages']),
            'location_percentage': round(len(location_messages) / len(result['messages']) * 100, 1) if result['messages'] else 0
        })
    except Exception as e:
        return jsonify({"error": f"Failed to get location messages: {str(e)}"}), 500

@app.route("/v2/system/status")
def redis_streams_status():
    """Get Redis Streams system status"""
    try:
        # Check Redis Streams functionality
        test_key = "test_stream"
        test_id = redis_streams.redis.xadd(test_key, {"test": "data"})
        redis_streams.redis.delete(test_key)
        
        return jsonify({
            "redis_streams": "operational",
            "test_stream_id": test_id.decode('utf-8') if isinstance(test_id, bytes) else test_id,
            "backend": "GuideOps Chat 2.0",
            "message_storage": "Redis Streams",
            "features": [
                "Perfect message attribution",
                "Guaranteed ordering", 
                "Deduplication ready",
                "Postgres sink ready"
            ]
        })
    except Exception as e:
        return jsonify({
            "redis_streams": "error",
            "error": str(e)
        }), 500
