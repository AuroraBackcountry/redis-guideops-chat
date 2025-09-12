"""
Message Validation and Normalization - Surgical Plan Implementation
One canonical schema (streams only) with server-side identity stamping
"""

import time
import uuid
import json
from typing import Dict, Any, Optional


def validate_and_normalize_msg(room_id: str, author_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate and normalize message according to surgical plan schema.
    
    Message fields (all lowercase, fixed types):
    {
      "message_id": "<uuid-v4>",     // server or client-provided, required
      "room_id": "<string>",         // required
      "author_id": "<string>",       // server-stamped, required
      "text": "<string>",            // non-empty, required
      "ts_ms": <int>,                // server time in ms, required
      "lat": <float|null>,           // optional, validated
      "long": <float|null>,          // optional, validated
      "v": 2                         // schema version
    }
    """
    
    # Extract text from various possible fields
    text = (payload.get("text") or payload.get("message") or "").strip()
    if not text:
        raise ValueError("Empty message")

    # message_id: accept client UUID or generate one
    mid = payload.get("message_id") or payload.get("id")
    try:
        mid = str(uuid.UUID(mid)) if mid else str(uuid.uuid4())
    except Exception:
        mid = str(uuid.uuid4())

    # lat/long optional + range check
    lat = payload.get("lat") or payload.get("latitude")
    lon = payload.get("long") or payload.get("longitude")
    
    if lat is not None:
        try:
            lat = float(lat)
            if not (-90.0 <= lat <= 90.0):
                raise ValueError("lat out of range")
        except (ValueError, TypeError):
            raise ValueError("Invalid latitude format")
    
    if lon is not None:
        try:
            lon = float(lon)
            if not (-180.0 <= lon <= 180.0):
                raise ValueError("long out of range")
        except (ValueError, TypeError):
            raise ValueError("Invalid longitude format")

    return {
        "message_id": mid,
        "room_id": str(room_id),
        "author_id": str(author_id),            # SERVER-STAMPED
        "text": text,
        "ts_ms": int(time.time() * 1000),
        "lat": lat if lat is not None else None,
        "long": lon if lon is not None else None,
        "v": 2
    }


# Constants for Redis Streams
STREAM_KEY_TPL = "stream:room:{room_id}"
STREAM_MAXLEN = 100_000
DEDUPE_TTL = 300  # seconds


def publish_message(room_id: str, author_user: Dict[str, Any], payload: Dict[str, Any], redis_client) -> Dict[str, Any]:
    """
    Single write path for all messages (HTTP + Socket.IO)
    Includes idempotency to block duplicates
    """
    msg = validate_and_normalize_msg(room_id, author_user["id"], payload)

    # idempotency: room + message_id must be unique for a short window
    dedupe_key = f"dedupe:{msg['room_id']}:{msg['message_id']}"
    if not redis_client.set(dedupe_key, "1", nx=True, ex=DEDUPE_TTL):
        return msg  # duplicate accept-as-ack

    # XADD to Redis Stream (approx trim)
    stream_key = STREAM_KEY_TPL.format(room_id=msg["room_id"])
    redis_client.xadd(
        stream_key,
        fields=msg,
        maxlen=STREAM_MAXLEN,
        approximate=True
    )

    # Optional: pubsub for live fanout
    redis_client.publish("MESSAGES", json.dumps({"type": "message", "data": msg}))
    
    return msg
