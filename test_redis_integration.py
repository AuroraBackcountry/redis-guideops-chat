#!/usr/bin/env python3
"""
Test script for Redis integration
Run this to verify that the enhanced Redis structure is working correctly
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from chat.redis_models import (
    RedisUserManager, RedisChannelManager, RedisMessageManager,
    UserRole, ChannelType, init_enhanced_redis
)
from chat.config import get_config

def test_redis_integration():
    """Test all Redis functionality"""
    print("🧪 Testing Redis Integration...")
    
    # Initialize Redis
    init_enhanced_redis()
    redis_client = get_config().redis_client
    
    # Clear test data
    print("🧹 Clearing existing test data...")
    for key in redis_client.scan_iter(match="test_*"):
        redis_client.delete(key)
    
    print("\n1️⃣ Testing User Management...")
    
    # Test user creation
    user1 = RedisUserManager.create_user(
        username="test_alice",
        password="password123",
        first_name="Alice",
        last_name="Johnson",
        email="alice@example.com",
        role=UserRole.USER
    )
    print(f"✅ Created user: {user1.username} (ID: {user1.id})")
    
    user2 = RedisUserManager.create_user(
        username="test_bob",
        password="password123",
        first_name="Bob",
        last_name="Smith",
        email="bob@example.com",
        role=UserRole.ADMIN
    )
    print(f"✅ Created user: {user2.username} (ID: {user2.id})")
    
    # Test user retrieval
    retrieved_user = RedisUserManager.get_user(user1.id)
    assert retrieved_user.username == "test_alice"
    print(f"✅ Retrieved user: {retrieved_user.username}")
    
    # Test user by username
    user_by_name = RedisUserManager.get_user_by_username("test_bob")
    assert user_by_name.id == user2.id
    print(f"✅ Found user by username: {user_by_name.username}")
    
    # Test online status
    RedisUserManager.set_user_online(user1.id)
    RedisUserManager.set_user_online(user2.id)
    online_users = RedisUserManager.get_online_users()
    print(f"✅ Online users: {[u.username for u in online_users]}")
    
    print("\n2️⃣ Testing Channel Management...")
    
    # Test channel creation
    public_channel = RedisChannelManager.create_channel(
        name="test-general",
        owner_id=user1.id,
        channel_type=ChannelType.PUBLIC,
        description="Test general channel"
    )
    print(f"✅ Created public channel: {public_channel.name} (ID: {public_channel.id})")
    
    private_channel = RedisChannelManager.create_channel(
        name="test-private",
        owner_id=user2.id,
        channel_type=ChannelType.PRIVATE,
        description="Test private channel"
    )
    print(f"✅ Created private channel: {private_channel.name} (ID: {private_channel.id})")
    
    # Test DM channel
    dm_channel = RedisChannelManager.create_dm_channel(user1.id, user2.id)
    print(f"✅ Created DM channel: {dm_channel.name} (ID: {dm_channel.id})")
    
    # Test adding users to channel
    RedisChannelManager.add_user_to_channel(public_channel.id, user2.id)
    print(f"✅ Added {user2.username} to {public_channel.name}")
    
    # Test getting user channels
    user1_channels = RedisChannelManager.get_user_channels(user1.id)
    print(f"✅ User {user1.username} channels: {[c.name for c in user1_channels]}")
    
    # Test getting channel members
    members = RedisChannelManager.get_channel_members(public_channel.id)
    print(f"✅ Channel {public_channel.name} members: {[m.username for m in members]}")
    
    print("\n3️⃣ Testing Message Management...")
    
    # Test sending messages
    msg1 = RedisMessageManager.send_message(
        channel_id=public_channel.id,
        user_id=user1.id,
        text="Hello everyone! This is a test message."
    )
    print(f"✅ Sent message: {msg1.text[:30]}...")
    
    msg2 = RedisMessageManager.send_message(
        channel_id=public_channel.id,
        user_id=user2.id,
        text="Hi Alice! How are you doing?"
    )
    print(f"✅ Sent message: {msg2.text[:30]}...")
    
    msg3 = RedisMessageManager.send_message(
        channel_id=dm_channel.id,
        user_id=user1.id,
        text="This is a private DM message."
    )
    print(f"✅ Sent DM message: {msg3.text[:30]}...")
    
    # Test retrieving messages
    public_messages = RedisMessageManager.get_messages(public_channel.id)
    print(f"✅ Retrieved {len(public_messages)} messages from {public_channel.name}")
    
    dm_messages = RedisMessageManager.get_messages(dm_channel.id)
    print(f"✅ Retrieved {len(dm_messages)} DM messages")
    
    # Test message update
    success = RedisMessageManager.update_message(
        msg1.id, public_channel.id, text="Updated message text!"
    )
    if success:
        print(f"✅ Updated message {msg1.id}")
    
    print("\n4️⃣ Testing Data Consistency...")
    
    # Verify data relationships
    assert len(user1_channels) >= 2  # General + DM + any others
    assert any(c.type == ChannelType.DM for c in user1_channels)
    assert any(c.type == ChannelType.PUBLIC for c in user1_channels)
    
    # Verify message ordering (should be reverse chronological)
    messages = RedisMessageManager.get_messages(public_channel.id)
    if len(messages) > 1:
        assert messages[0].created_at >= messages[1].created_at
        print("✅ Messages are properly ordered")
    
    print("\n🎉 All tests passed! Redis integration is working correctly.")
    
    print("\n📊 Summary:")
    print(f"   👥 Users created: 2")
    print(f"   📁 Channels created: 3 (1 public, 1 private, 1 DM)")
    print(f"   💬 Messages sent: 3")
    print(f"   🔄 Updates performed: 1")
    
    return True

if __name__ == "__main__":
    try:
        test_redis_integration()
        print("\n✅ Redis integration test completed successfully!")
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
