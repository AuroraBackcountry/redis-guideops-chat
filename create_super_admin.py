#!/usr/bin/env python3
"""
Script to create the initial super admin user for Redis GuideOps Chat
"""

import redis
import bcrypt
import time

# Connect to Redis
redis_client = redis.Redis(host='localhost', port=6379, db=0)

def create_super_admin():
    """Create the initial super admin user"""
    print("🔧 Creating Super Admin User")
    print("=" * 40)
    
    # Get super admin details
    email = input("Enter super admin email: ").strip()
    if not email:
        print("❌ Email is required")
        return
    
    name = input("Enter super admin name: ").strip()
    if not name:
        print("❌ Name is required")
        return
    
    password = input("Enter super admin password (min 6 chars): ").strip()
    if len(password) < 6:
        print("❌ Password must be at least 6 characters")
        return
    
    # Check if user already exists
    username_key = f"username:{email}"
    existing_user = redis_client.get(username_key)
    
    if existing_user:
        print(f"❌ User with email {email} already exists")
        return
    
    try:
        # Generate unique user ID
        user_id = str(redis_client.incr("total_users"))
        
        # Hash password
        hashed_password = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(10))
        
        # Parse name into first/last name
        name_parts = name.strip().split(" ", 1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ""
        
        # Create super admin profile
        user_profile = {
            "id": user_id,
            "username": email,
            "first_name": first_name,
            "last_name": last_name,
            "email": email,
            "role": "super_admin",  # Super admin role
            "avatar_url": "",
            "created_at": str(time.time()),
            "last_seen": str(time.time()),
            "password": hashed_password
        }
        
        # Store user data
        user_key = f"user:{user_id}"
        redis_client.hmset(user_key, user_profile)
        
        # Create email -> user_id mapping
        redis_client.set(username_key, user_key)
        
        # Add user to general room
        redis_client.sadd(f"user:{user_id}:rooms", "0")
        
        print("\n✅ Super Admin Created Successfully!")
        print(f"   ID: {user_id}")
        print(f"   Email: {email}")
        print(f"   Name: {name}")
        print(f"   Role: super_admin")
        print("\n🚀 You can now log in with these credentials")
        
    except Exception as e:
        print(f"❌ Error creating super admin: {e}")

if __name__ == "__main__":
    create_super_admin()
