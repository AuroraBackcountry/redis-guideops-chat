import json

from flask import session
from flask_socketio import emit, join_room

from chat import utils
from chat.redis_streams import redis_streams


def publish(name, message, broadcast=False, room=None):
    """If the messages' origin is the same sever, use socket.io for sending, otherwise: pub/sub"""
    if room:
        emit(name, message, room=room, broadcast=True)
    else:
        emit(name, message, broadcast=broadcast)
    # Here is an additional publish for the redis pub/sub
    outgoing = {"serverId": utils.SERVER_ID, "type": name, "data": message}
    utils.redis_client.publish("MESSAGES", json.dumps(outgoing))


def io_connect():
    """Handle socket.io connection, check if the session is attached"""
    # it's better to use get method for dict-like objects, it provides helpful setting of default value
    user = session.get("user", None)
    if not user:
        return

    user_id = user.get("id", None)
    utils.redis_client.sadd("online_users", user_id)

    msg = dict(user)
    msg["online"] = True

    publish("user.connected", msg, broadcast=True)


def io_disconnect():
    user = session.get("user", None)
    if user:
        utils.redis_client.srem("online_users", user["id"])
        msg = dict(user)
        msg["online"] = False
        publish("user.disconnected", msg, broadcast=True)


def io_join_room(id_room):
    join_room(id_room)


def io_on_message(message):
    """Handle incoming message - routes to v1 (legacy) or v2 (Redis Streams)"""
    
    # Check if this is a v2 message request (Redis Streams)
    if message.get("version") == "v2":
        io_on_message_v2(message)
        return
    
    # Legacy v1 message handling
    print("received v1 (legacy) message event", message)

    # No HTML escaping needed - messages are displayed as plain text
    # The original escape function was causing display issues with apostrophes and quotes
    # The user might be set as offline if he tried to access the chat from another tab, pinging by message
    # resets the user online status
    utils.redis_client.sadd("online_users", message["from"])
    # We've got a new message. Store it in db, then send back to the room. */
    message_string = json.dumps(message)
    room_id = message["roomId"]
    room_key = f"room:{room_id}"

    is_private = not bool(utils.redis_client.exists(f"{room_key}:name"))
    room_has_messages = bool(utils.redis_client.exists(room_key))

    if is_private and not room_has_messages:
        ids = room_id.split(":")
        # Use original simple method
        names = [
            utils.hmget(f"user:{ids[0]}", "username")[0] or f"User{ids[0]}",
            utils.hmget(f"user:{ids[1]}", "username")[0] or f"User{ids[1]}",
        ]
        
        msg = {
            "id": room_id,
            "names": names,
        }
        publish("show.room", msg, broadcast=True)
    utils.redis_client.zadd(room_key, {message_string: int(message["date"])})

    if is_private:
        publish("message", message, room=room_id)
    else:
        publish("message", message, broadcast=True)


def io_on_message_v2(message):
    """Handle Redis Streams messages via Socket.IO"""
    print("received v2 (Redis Streams) message event", message)
    
    if "user" not in session:
        print("User not in session, ignoring v2 message")
        return
    
    user_id = session["user"]["id"]
    room_id = message["roomId"]
    message_text = message.get("message", "").strip()
    latitude = message.get("latitude")  # Optional GPS coordinates
    longitude = message.get("longitude")
    
    if not message_text:
        print("Empty v2 message, ignoring")
        return
    
    try:
        # Add message using Redis Streams with optional location
        stream_message = redis_streams.add_message(room_id, user_id, message_text, latitude, longitude)
        
        # Update user online status
        utils.redis_client.sadd("online_users", user_id)
        
        # Broadcast the stream message
        publish("message", stream_message, broadcast=True, room=room_id)
        
        print(f"[SocketIO v2] Message sent via streams: {stream_message['id']}")
        
    except Exception as e:
        print(f"[SocketIO v2] Error sending message: {e}")
        from flask_socketio import emit
        emit("error", {"message": "Failed to send message"})
