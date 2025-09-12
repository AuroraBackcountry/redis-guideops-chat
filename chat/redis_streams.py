"""
Redis Streams Implementation for GuideOps Chat
Production-ready message storage with proper ordering, deduplication, and user snapshots
"""

import json
import time
from typing import Dict, List, Optional, Any
from chat.utils import redis_client


def get_user_data(user_id):
    """
    Get user data following Redis best practices (simple and clean)
    Based on Redis documentation: HGETALL user:{id}
    """
    if not user_id:
        return None
        
    user_data = redis_client.hgetall(f"user:{user_id}")
    if not user_data:
        return None
    
    # Core fields following Redis documentation
    user_id_str = str(user_id)
    first_name = user_data.get(b"first_name", "").decode('utf-8')
    last_name = user_data.get(b"last_name", "").decode('utf-8')
    email_bytes = user_data.get(b"email") or user_data.get(b"username", b"")
    email = email_bytes.decode('utf-8') if email_bytes else ""
    role = user_data.get(b"role", "user").decode('utf-8')
    
    # Create display name for UI
    if first_name or last_name:
        display_name = f"{first_name} {last_name}".strip()
    else:
        display_name = email
    
    # Simple user object (Redis best practices) - Clean order
    return {
        "id": user_id_str,
        "email": email,
        "first_name": first_name,
        "last_name": last_name,
        "username": display_name,  # Display name for UI
        "role": role
    }


class RedisStreamsChat:
    """Redis Streams-based chat message storage"""
    
    def __init__(self):
        self.redis = redis_client
    
    def get_room_stream_key(self, room_id: str) -> str:
        """Get Redis Stream key for room - matches message_validator.py format"""
        return f"stream:room:{room_id}"
    
    def add_message(self, room_id: str, user_id: str, message_text: str, latitude: float = None, longitude: float = None) -> Dict[str, Any]:
        """
        Add message to room stream with denormalized user data, timestamp, and GPS location
        Returns the complete message object with Redis Stream ID
        
        Args:
            room_id: Room identifier
            user_id: User identifier  
            message_text: Message content
            latitude: GPS latitude (optional)
            longitude: GPS longitude (optional)
        """
        # Get user snapshot for message
        user_data = get_user_data(user_id)
        if not user_data:
            raise ValueError(f"User {user_id} not found")
        
        # Create user snapshot (minimal but complete for historical accuracy)
        user_snapshot = {
            "id": str(user_id),
            "username": user_data.get("username", f"User {user_id}"),
            "first_name": user_data.get("first_name", ""),
            "last_name": user_data.get("last_name", ""),
            "role": user_data.get("role", "user")
        }
        
        # Enhanced timestamps (authoritative)
        ts_server = int(time.time() * 1000)  # milliseconds
        ts_iso = time.strftime('%Y-%m-%dT%H:%M:%S.%fZ', time.gmtime())  # ISO 8601 UTC
        
        # GPS location data (optional)
        location_data = {}
        if latitude is not None and longitude is not None:
            location_data = {
                "latitude": float(latitude),
                "longitude": float(longitude),
                "timestamp": ts_iso  # When location was captured
            }
        
        # Message fields for Redis Stream
        stream_fields = {
            "room_id": str(room_id),
            "user_id": str(user_id),
            "text": str(message_text),
            "ts_server": str(ts_server),
            "ts_iso": ts_iso,
            "kind": "message",
            # Denormalized user snapshot (JSON string)
            "user_snapshot": json.dumps(user_snapshot)
        }
        
        # Add location data if provided
        if location_data:
            stream_fields["location"] = json.dumps(location_data)
        
        # Add to Redis Stream with auto-generated ID
        stream_key = self.get_room_stream_key(room_id)
        stream_id = self.redis.xadd(stream_key, stream_fields)
        
        # Return complete message object for frontend and API
        message_obj = {
            "id": stream_id.decode('utf-8') if isinstance(stream_id, bytes) else stream_id,
            "roomId": str(room_id),
            "from": str(user_id),
            "user": user_snapshot,
            "text": str(message_text),
            "message": str(message_text),  # Backward compatibility
            "tsServer": ts_server,
            "tsIso": ts_iso,  # Enhanced ISO 8601 timestamp
            "date": int(ts_server / 1000),  # Backward compatibility (seconds)
            "kind": "message"
        }
        
        # Add location data to response if provided
        if location_data:
            message_obj["location"] = location_data
            
        return message_obj
    
    def get_messages(self, room_id: str, count: int = 15, before_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Get messages from room stream with proper pagination
        
        Args:
            room_id: Room identifier
            count: Number of messages to return
            before_id: Stream ID to paginate from (exclusive)
        
        Returns:
            Dict with messages array and pagination info
        """
        stream_key = self.get_room_stream_key(room_id)
        
        # Check if stream exists
        if not self.redis.exists(stream_key):
            return {
                "messages": [],
                "hasMore": False,
                "oldestId": None,
                "newestId": None
            }
        
        if before_id:
            # Paginating backwards from a specific ID
            # XREVRANGE from before_id (exclusive) going backwards
            messages = self.redis.xrevrange(stream_key, f"({before_id}", "-", count=count)
        else:
            # Get latest messages
            messages = self.redis.xrevrange(stream_key, "+", "-", count=count)
        
        # Convert to frontend format
        formatted_messages = []
        oldest_id = None
        newest_id = None
        
        for stream_id, fields in messages:
            stream_id = stream_id.decode('utf-8') if isinstance(stream_id, bytes) else stream_id
            
            # Decode fields
            decoded_fields = {}
            for key, value in fields.items():
                decoded_key = key.decode('utf-8') if isinstance(key, bytes) else key
                decoded_value = value.decode('utf-8') if isinstance(value, bytes) else value
                decoded_fields[decoded_key] = decoded_value
            
            # Parse user snapshot
            user_snapshot = {}
            try:
                user_snapshot = json.loads(decoded_fields.get("user_snapshot", "{}"))
            except json.JSONDecodeError:
                pass
            
            # Parse location data
            location_data = {}
            try:
                if decoded_fields.get("location"):
                    location_data = json.loads(decoded_fields.get("location", "{}"))
            except json.JSONDecodeError:
                pass
            
            # Create message object with enhanced data
            message = {
                "id": stream_id,
                "roomId": decoded_fields.get("room_id", room_id),
                "from": decoded_fields.get("user_id", ""),
                "user": user_snapshot,
                "text": decoded_fields.get("text", ""),
                "message": decoded_fields.get("text", ""),  # Backward compatibility
                "tsServer": int(decoded_fields.get("ts_server", 0)),
                "tsIso": decoded_fields.get("ts_iso", ""),  # Enhanced ISO timestamp
                "date": int(int(decoded_fields.get("ts_server", 0)) / 1000),  # Backward compatibility
                "kind": decoded_fields.get("kind", "message")
            }
            
            # Add location data if available
            if location_data:
                message["location"] = location_data
            
            formatted_messages.append(message)
            
            # Track pagination IDs
            if oldest_id is None or stream_id < oldest_id:
                oldest_id = stream_id
            if newest_id is None or stream_id > newest_id:
                newest_id = stream_id
        
        # Check if there are more messages before the oldest one we loaded
        has_more = False
        if oldest_id:
            # Check if there are any messages before our oldest
            earlier_check = self.redis.xrevrange(stream_key, f"({oldest_id}", "-", count=1)
            has_more = len(earlier_check) > 0
        
        # Reverse to get chronological order (oldest first)
        formatted_messages.reverse()
        
        return {
            "messages": formatted_messages,
            "hasMore": has_more,
            "oldestId": oldest_id,
            "newestId": newest_id,
            "count": len(formatted_messages)
        }
    
    def clear_room_messages(self, room_id: str) -> bool:
        """Clear all messages from a room (for fresh start)"""
        stream_key = self.get_room_stream_key(room_id)
        try:
            self.redis.delete(stream_key)
            return True
        except Exception as e:
            print(f"Error clearing room {room_id}: {e}")
            return False
    
    def add_info_message(self, room_id: str, message_text: str) -> Dict[str, Any]:
        """Add system/info message to room stream"""
        ts_server = int(time.time() * 1000)
        
        stream_fields = {
            "room_id": str(room_id),
            "user_id": "info",
            "text": str(message_text),
            "ts_server": str(ts_server),
            "kind": "info",
            "user_snapshot": json.dumps({"id": "info", "username": "System", "role": "system"})
        }
        
        stream_key = self.get_room_stream_key(room_id)
        stream_id = self.redis.xadd(stream_key, stream_fields)
        
        return {
            "id": stream_id.decode('utf-8') if isinstance(stream_id, bytes) else stream_id,
            "roomId": str(room_id),
            "from": "info",
            "user": {"id": "info", "username": "System", "role": "system"},
            "text": str(message_text),
            "message": str(message_text),
            "tsServer": ts_server,
            "date": int(ts_server / 1000),
            "kind": "info"
        }


# Global instance
redis_streams = RedisStreamsChat()
