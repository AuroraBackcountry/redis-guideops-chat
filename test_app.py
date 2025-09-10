#!/usr/bin/env python3
"""
Simple test app to diagnose Railway deployment issues
"""

import os
import sys
print("=== DIAGNOSTIC APP STARTING ===")
print(f"Python version: {sys.version}")
print(f"Working directory: {os.getcwd()}")

# Test environment variables
print("=== ENVIRONMENT VARIABLES ===")
redis_url = os.environ.get("REDIS_URL")
flask_env = os.environ.get("FLASK_ENV")
secret_key = os.environ.get("SECRET_KEY")
chat_config = os.environ.get("CHAT_CONFIG")

print(f"REDIS_URL: {'SET' if redis_url else 'MISSING'}")
print(f"FLASK_ENV: {flask_env}")
print(f"SECRET_KEY: {'SET' if secret_key else 'MISSING'}")
print(f"CHAT_CONFIG: {chat_config}")

# Test Redis connection
print("=== TESTING REDIS CONNECTION ===")
try:
    import redis
    from urllib.parse import urlparse
    
    if redis_url:
        url = urlparse(redis_url)
        print(f"Redis Host: {url.hostname}")
        print(f"Redis Port: {url.port}")
        print(f"Redis Password: {'***' if url.password else 'None'}")
        
        # Test connection
        redis_client = redis.Redis(
            host=url.hostname,
            port=url.port or 6379,
            password=url.password
        )
        
        # Simple ping test
        result = redis_client.ping()
        print(f"Redis ping result: {result}")
        print("✅ Redis connection successful!")
        
    else:
        print("❌ No REDIS_URL environment variable")
        
except Exception as e:
    print(f"❌ Redis connection failed: {e}")

# Test basic Flask
print("=== TESTING BASIC FLASK ===")
try:
    from flask import Flask
    test_app = Flask(__name__)
    
    @test_app.route("/")
    def hello():
        return "Hello from Railway!"
    
    print("✅ Basic Flask import successful!")
    
    # Start simple server
    port = int(os.environ.get("PORT", 3000))
    print(f"Starting test server on port {port}")
    test_app.run(host='0.0.0.0', port=port, debug=False)
    
except Exception as e:
    print(f"❌ Flask test failed: {e}")

print("=== DIAGNOSTIC COMPLETE ===")
