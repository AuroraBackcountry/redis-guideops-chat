"""
Enhanced Redis data models for GuideOps Chat
Based on the Redis Labs video pattern but extended for Slack-like functionality
"""
import json
import time
import uuid
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from chat.config import get_config

redis_client = get_config().redis_client

# User roles/permissions
class UserRole:
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin" 
    USER = "user"

# Channel types
class ChannelType:
    PUBLIC = "public"
    PRIVATE = "private"
    DM = "dm"

@dataclass
class User:
    id: str
    username: str
    first_name: str = ""
    last_name: str = ""
    phone: str = ""
    email: str = ""
    role: str = UserRole.USER
    avatar_url: str = ""
    created_at: float = 0
    last_seen: float = 0
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'User':
        # Filter out any unexpected keys
        valid_keys = set(cls.__dataclass_fields__.keys())
        filtered_data = {k: v for k, v in data.items() if k in valid_keys}
        return cls(**filtered_data)

@dataclass
class Channel:
    id: str
    name: str
    description: str = ""
    type: str = ChannelType.PUBLIC
    owner_id: str = ""
    created_at: float = 0
    updated_at: float = 0
    member_count: int = 0
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Channel':
        # Filter out any unexpected keys
        valid_keys = set(cls.__dataclass_fields__.keys())
        filtered_data = {k: v for k, v in data.items() if k in valid_keys}
        return cls(**filtered_data)

@dataclass
class Message:
    id: str
    channel_id: str
    user_id: str
    text: str
    created_at: float
    updated_at: float = 0
    message_type: str = "regular"  # regular, system, ai_response
    attachments: List[Dict] = None
    reactions: Dict[str, List[str]] = None  # emoji -> list of user_ids
    thread_id: Optional[str] = None
    reply_count: int = 0
    
    def __post_init__(self):
        if self.attachments is None:
            self.attachments = []
        if self.reactions is None:
            self.reactions = {}
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Message':
        # Filter out any unexpected keys and handle type conversion
        valid_keys = set(cls.__dataclass_fields__.keys())
        filtered_data = {k: v for k, v in data.items() if k in valid_keys}
        
        # Handle special cases for lists/dicts that might be None
        if 'attachments' in filtered_data and filtered_data['attachments'] is None:
            filtered_data['attachments'] = []
        if 'reactions' in filtered_data and filtered_data['reactions'] is None:
            filtered_data['reactions'] = {}
            
        return cls(**filtered_data)

class RedisUserManager:
    """Manages user data in Redis"""
    
    @staticmethod
    def create_user(username: str, password: str, **kwargs) -> User:
        """Create a new user with enhanced fields"""
        # Generate unique user ID
        user_id = str(redis_client.incr("total_users"))
        
        # Create user object
        user = User(
            id=user_id,
            username=username,
            first_name=kwargs.get('first_name', ''),
            last_name=kwargs.get('last_name', ''),
            phone=kwargs.get('phone', ''),
            email=kwargs.get('email', ''),
            role=kwargs.get('role', UserRole.USER),
            avatar_url=kwargs.get('avatar_url', ''),
            created_at=time.time(),
            last_seen=time.time()
        )
        
        # Store in Redis
        user_key = f"user:{user_id}"
        username_key = f"username:{username}"
        
        # Hash password (using existing bcrypt logic)
        import bcrypt
        hashed_password = bcrypt.hashpw(str(password).encode("utf-8"), bcrypt.gensalt(10))
        
        # Store user data
        user_data = user.to_dict()
        user_data['password'] = hashed_password
        redis_client.hmset(user_key, user_data)
        
        # Create username -> user_id mapping
        redis_client.set(username_key, user_key)
        
        # Add user to general channel (channel:0)
        redis_client.sadd(f"user:{user_id}:channels", "0")
        redis_client.sadd("channel:0:members", user_id)
        
        return user
    
    @staticmethod
    def get_user(user_id: str) -> Optional[User]:
        """Get user by ID"""
        user_key = f"user:{user_id}"
        user_data = redis_client.hgetall(user_key)
        
        if not user_data:
            return None
        
        # Convert bytes to strings
        user_dict = {k.decode('utf-8'): v.decode('utf-8') if isinstance(v, bytes) else v 
                    for k, v in user_data.items()}
        
        # Remove password from returned data
        user_dict.pop('password', None)
        
        return User.from_dict(user_dict)
    
    @staticmethod
    def get_user_by_username(username: str) -> Optional[User]:
        """Get user by username"""
        username_key = f"username:{username}"
        user_key = redis_client.get(username_key)
        
        if not user_key:
            return None
        
        user_id = user_key.decode('utf-8').split(':')[-1]
        return RedisUserManager.get_user(user_id)
    
    @staticmethod
    def update_user(user_id: str, **updates) -> bool:
        """Update user fields"""
        user_key = f"user:{user_id}"
        updates['updated_at'] = time.time()
        
        try:
            redis_client.hmset(user_key, updates)
            return True
        except Exception:
            return False
    
    @staticmethod
    def set_user_online(user_id: str):
        """Mark user as online"""
        redis_client.sadd("online_users", user_id)
        RedisUserManager.update_user(user_id, last_seen=time.time())
    
    @staticmethod
    def set_user_offline(user_id: str):
        """Mark user as offline"""
        redis_client.srem("online_users", user_id)
        RedisUserManager.update_user(user_id, last_seen=time.time())
    
    @staticmethod
    def get_online_users() -> List[User]:
        """Get all online users"""
        online_ids = [uid.decode('utf-8') for uid in redis_client.smembers("online_users")]
        users = []
        for user_id in online_ids:
            user = RedisUserManager.get_user(user_id)
            if user:
                users.append(user)
        return users

class RedisChannelManager:
    """Manages channel data in Redis"""
    
    @staticmethod
    def create_channel(name: str, owner_id: str, channel_type: str = ChannelType.PUBLIC, description: str = "") -> Channel:
        """Create a new channel"""
        # Generate unique channel ID
        channel_id = str(redis_client.incr("total_channels"))
        
        channel = Channel(
            id=channel_id,
            name=name,
            description=description,
            type=channel_type,
            owner_id=owner_id,
            created_at=time.time(),
            updated_at=time.time(),
            member_count=1
        )
        
        # Store channel data
        channel_key = f"channel:{channel_id}"
        redis_client.hmset(channel_key, channel.to_dict())
        
        # Add owner as first member
        redis_client.sadd(f"channel:{channel_id}:members", owner_id)
        redis_client.sadd(f"user:{owner_id}:channels", channel_id)
        
        # Add to public channels list if public
        if channel_type == ChannelType.PUBLIC:
            redis_client.sadd("public_channels", channel_id)
        
        return channel
    
    @staticmethod
    def get_channel(channel_id: str) -> Optional[Channel]:
        """Get channel by ID"""
        channel_key = f"channel:{channel_id}"
        channel_data = redis_client.hgetall(channel_key)
        
        if not channel_data:
            return None
        
        # Convert bytes to strings
        channel_dict = {k.decode('utf-8'): v.decode('utf-8') if isinstance(v, bytes) else v 
                       for k, v in channel_data.items()}
        
        return Channel.from_dict(channel_dict)
    
    @staticmethod
    def get_user_channels(user_id: str) -> List[Channel]:
        """Get all channels for a user"""
        channel_ids = [cid.decode('utf-8') for cid in redis_client.smembers(f"user:{user_id}:channels")]
        channels = []
        
        for channel_id in channel_ids:
            channel = RedisChannelManager.get_channel(channel_id)
            if channel:
                channels.append(channel)
        
        return channels
    
    @staticmethod
    def add_user_to_channel(channel_id: str, user_id: str) -> bool:
        """Add user to channel"""
        try:
            redis_client.sadd(f"channel:{channel_id}:members", user_id)
            redis_client.sadd(f"user:{user_id}:channels", channel_id)
            
            # Update member count
            redis_client.hincrby(f"channel:{channel_id}", "member_count", 1)
            return True
        except Exception:
            return False
    
    @staticmethod
    def remove_user_from_channel(channel_id: str, user_id: str) -> bool:
        """Remove user from channel"""
        try:
            redis_client.srem(f"channel:{channel_id}:members", user_id)
            redis_client.srem(f"user:{user_id}:channels", channel_id)
            
            # Update member count
            redis_client.hincrby(f"channel:{channel_id}", "member_count", -1)
            return True
        except Exception:
            return False
    
    @staticmethod
    def get_channel_members(channel_id: str) -> List[User]:
        """Get all members of a channel"""
        member_ids = [uid.decode('utf-8') for uid in redis_client.smembers(f"channel:{channel_id}:members")]
        members = []
        
        for user_id in member_ids:
            user = RedisUserManager.get_user(user_id)
            if user:
                members.append(user)
        
        return members
    
    @staticmethod
    def create_dm_channel(user1_id: str, user2_id: str) -> Channel:
        """Create or get DM channel between two users"""
        # Ensure consistent ordering for DM channel IDs
        if int(user1_id) > int(user2_id):
            user1_id, user2_id = user2_id, user1_id
        
        dm_id = f"dm:{user1_id}:{user2_id}"
        
        # Check if DM already exists
        existing = redis_client.exists(f"channel:{dm_id}")
        if existing:
            return RedisChannelManager.get_channel(dm_id)
        
        # Create DM channel
        user1 = RedisUserManager.get_user(user1_id)
        user2 = RedisUserManager.get_user(user2_id)
        
        dm_name = f"{user1.username}, {user2.username}"
        
        channel = Channel(
            id=dm_id,
            name=dm_name,
            description=f"Direct messages between {user1.username} and {user2.username}",
            type=ChannelType.DM,
            owner_id=user1_id,  # First user is considered owner
            created_at=time.time(),
            updated_at=time.time(),
            member_count=2
        )
        
        # Store channel
        redis_client.hmset(f"channel:{dm_id}", channel.to_dict())
        
        # Add both users as members
        redis_client.sadd(f"channel:{dm_id}:members", user1_id, user2_id)
        redis_client.sadd(f"user:{user1_id}:channels", dm_id)
        redis_client.sadd(f"user:{user2_id}:channels", dm_id)
        
        return channel

class RedisMessageManager:
    """Manages message data in Redis"""
    
    @staticmethod
    def send_message(channel_id: str, user_id: str, text: str, **kwargs) -> Message:
        """Send a message to a channel"""
        message_id = str(uuid.uuid4())
        
        message = Message(
            id=message_id,
            channel_id=channel_id,
            user_id=user_id,
            text=text,
            created_at=time.time(),
            updated_at=time.time(),
            message_type=kwargs.get('message_type', 'regular'),
            attachments=kwargs.get('attachments', []),
            thread_id=kwargs.get('thread_id'),
        )
        
        # Store message in channel's sorted set (score = timestamp)
        channel_key = f"channel:{channel_id}:messages"
        message_json = json.dumps(message.to_dict())
        redis_client.zadd(channel_key, {message_json: message.created_at})
        
        # Update channel's last activity
        redis_client.hset(f"channel:{channel_id}", "updated_at", time.time())
        
        return message
    
    @staticmethod
    def get_messages(channel_id: str, offset: int = 0, limit: int = 50) -> List[Message]:
        """Get messages from a channel"""
        channel_key = f"channel:{channel_id}:messages"
        
        # Get messages in reverse chronological order
        message_data = redis_client.zrevrange(channel_key, offset, offset + limit - 1)
        
        messages = []
        for msg_json in message_data:
            try:
                msg_dict = json.loads(msg_json.decode('utf-8'))
                messages.append(Message.from_dict(msg_dict))
            except (json.JSONDecodeError, UnicodeDecodeError):
                continue
        
        return messages
    
    @staticmethod
    def update_message(message_id: str, channel_id: str, **updates) -> bool:
        """Update a message"""
        # This is complex with sorted sets, so for now we'll implement basic updates
        # In production, you might want to store message metadata separately
        updates['updated_at'] = time.time()
        
        # For now, we'll need to fetch all messages, update the one we want, and re-store
        # This is not optimal but works for the MVP
        messages = RedisMessageManager.get_messages(channel_id, limit=1000)
        
        for msg in messages:
            if msg.id == message_id:
                for key, value in updates.items():
                    setattr(msg, key, value)
                
                # Remove old message and add updated one
                channel_key = f"channel:{channel_id}:messages"
                old_json = json.dumps({**msg.to_dict(), **{k: getattr(msg, k) for k in updates if k != 'updated_at'}})
                redis_client.zrem(channel_key, old_json)
                
                new_json = json.dumps(msg.to_dict())
                redis_client.zadd(channel_key, {new_json: msg.created_at})
                return True
        
        return False

def init_enhanced_redis():
    """Initialize Redis with enhanced data structure"""
    # Check if already initialized
    if redis_client.exists("enhanced_init"):
        return
    
    # Set initialization flag
    redis_client.set("enhanced_init", "1")
    
    # Initialize counters
    redis_client.setnx("total_users", 0)
    redis_client.setnx("total_channels", 0)
    
    # Create general channel (channel:0)
    general_channel = Channel(
        id="0",
        name="General",
        description="General discussion channel",
        type=ChannelType.PUBLIC,
        owner_id="1",  # Will be first user
        created_at=time.time(),
        updated_at=time.time(),
        member_count=0
    )
    
    redis_client.hmset("channel:0", general_channel.to_dict())
    redis_client.sadd("public_channels", "0")
    
    # Also create the old room:0 structure for backward compatibility
    redis_client.set("room:0:name", "General")
    
    print("✅ Enhanced Redis data structure initialized")
