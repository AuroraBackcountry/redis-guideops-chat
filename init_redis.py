#!/usr/bin/env python3
"""
Simple script to initialize Redis with the general room
"""
import redis
import json
import time

# Connect to Redis
redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

def init_redis():
    """Initialize Redis with basic chat data"""
    print("🔄 Initializing Redis...")
    
    # Clear existing data
    redis_client.flushall()
    print("✅ Cleared existing data")
    
    # Initialize counters
    redis_client.set("total_users", 0)
    redis_client.set("total_channels", 0)
    print("✅ Initialized counters")
    
    # Create general room (room:0)
    redis_client.set("room:0:name", "General")
    print("✅ Created general room")
    
    # Create general channel (channel:0) for enhanced features
    general_channel = {
        "id": "0",
        "name": "General", 
        "description": "General discussion channel",
        "type": "public",
        "owner_id": "1",
        "created_at": str(time.time()),
        "updated_at": str(time.time()),
        "member_count": "0"
    }
    redis_client.hmset("channel:0", general_channel)
    redis_client.sadd("public_channels", "0")
    print("✅ Created general channel")
    
    # Create demo users
    demo_users = [
        {"username": "Pablo", "password": "password123", "first_name": "Pablo", "last_name": "Garcia"},
        {"username": "Joe", "password": "password123", "first_name": "Joe", "last_name": "Smith"},
        {"username": "Mary", "password": "password123", "first_name": "Mary", "last_name": "Johnson"},
        {"username": "Alex", "password": "password123", "first_name": "Alex", "last_name": "Brown"}
    ]
    
    for i, user_data in enumerate(demo_users, 1):
        # Create user
        user_id = str(i)
        username = user_data["username"]
        
        # Set username mapping
        redis_client.set(f"username:{username}", f"user:{user_id}")
        
        # Create user profile
        user_profile = {
            "id": user_id,
            "username": username,
            "first_name": user_data["first_name"],
            "last_name": user_data["last_name"],
            "email": f"{username.lower()}@example.com",
            "role": "user",
            "created_at": str(time.time()),
            "last_seen": str(time.time()),
            "password": "$2b$10$6EAmi/pJI/V.FhYyKkT9N.JGRcsKZxwREp3pufdnicUGgnUdvVDX6"  # password123
        }
        redis_client.hmset(f"user:{user_id}", user_profile)
        
        # Add user to general room
        redis_client.sadd(f"user:{user_id}:rooms", "0")
        
        print(f"✅ Created user: {username}")
    
    # Set total users count
    redis_client.set("total_users", len(demo_users))
    
    print("\n🎉 Redis initialization complete!")
    print("Demo users created:")
    for user in demo_users:
        print(f"  - {user['username']} (password: {user['password']})")
    print(f"\nGeneral room: room:0")
    print(f"General channel: channel:0")

if __name__ == "__main__":
    init_redis()
