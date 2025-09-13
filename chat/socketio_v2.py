"""
Socket.IO V2 Handlers - Surgical Plan Implementation
Minimal handlers to get Flask app running
"""

from flask_socketio import emit, join_room, leave_room
from flask import session, request
from chat.utils import redis_client


def io_connect():
    """V2 Socket.IO connect handler with automatic room joining"""
    print(f"[Socket.IO V2] Client connected: {request.sid}")
    
    # Get user from session if available
    if "user" in session:
        user_id = session["user"]["id"]
        username = session["user"]["username"]
        
        # Auto-join user's rooms (for now just room 0, expandable)
        user_rooms = ["0"]  # TODO: Get from user:{user_id}:rooms
        for room_id in user_rooms:
            join_room(str(room_id))
            print(f"[Socket.IO V2] User {user_id} ({username}) joined room {room_id}")
        
        emit("connected", {
            "status": "authenticated", 
            "version": "v2",
            "user_id": user_id,
            "rooms": user_rooms
        })
    else:
        # Unauthenticated connection - still allow for cross-domain compatibility
        print(f"[Socket.IO V2] Unauthenticated client connected: {request.sid}")
        emit("connected", {"status": "unauthenticated", "version": "v2"})


def io_disconnect():
    """V2 Socket.IO disconnect handler"""
    print(f"[Socket.IO V2] Client disconnected: {request.sid}")


def io_join_room(room_id):
    """V2 Socket.IO room join handler"""
    print(f"[Socket.IO V2] Client {request.sid} joining room {room_id}")
    join_room(room_id)


def io_on_message(message):
    """V2 Socket.IO message handler - placeholder"""
    print(f"[Socket.IO V2] Message received: {message}")
    # V2 message handling will be implemented with surgical plan
    emit("message_ack", {"status": "received", "version": "v2"})
