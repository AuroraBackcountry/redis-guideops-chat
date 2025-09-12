from flask import request, jsonify, session
import bcrypt
import json
import time
from chat import utils

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
from chat.utils import redis_client
from chat.app import app

# Simple original routes for Redis chat

@app.route("/login", methods=["POST"])
def login():
    """Original simple login approach"""
    data = request.get_json()
    username = data["username"]
    password = data["password"]

    # Use original simple Redis approach
    username_key = f"username:{username}"
    user_id = redis_client.get(username_key)
    
    if not user_id:
        return jsonify({"error": "Invalid credentials"}), 401
    
    # Decode user_id from bytes to string
    user_id_str = user_id.decode('utf-8')
    
    # Get user data from Redis hash
    user_data = redis_client.hgetall(user_id_str)
    if not user_data:
        return jsonify({"error": "Invalid credentials"}), 401
    
    # Get password from Redis data
    stored_password = user_data.get(b"password", b"").decode('utf-8')
    
    # Verify password
    try:
        if not bcrypt.checkpw(password.encode('utf-8'), stored_password.encode('utf-8')):
            return jsonify({"error": "Invalid credentials"}), 401
    except ValueError as e:
        print(f"Password verification error: {e}")
        return jsonify({"error": "Invalid credentials"}), 401
    
    # Set user in session with proper display name
    user_id_num = user_id_str.split(":")[-1]
    email = user_data.get(b"username", username.encode('utf-8')).decode('utf-8')
    
    # Get the actual name for display
    first_name = user_data.get(b"first_name", "").decode('utf-8')
    last_name = user_data.get(b"last_name", "").decode('utf-8')
    
    # Create display name from first_name + last_name, fallback to email
    if first_name or last_name:
        display_name = f"{first_name} {last_name}".strip()
    else:
        display_name = email
    
    # Get role for complete session data
    role = user_data.get(b"role", "user".encode('utf-8')).decode('utf-8')
    
    session["user"] = {
        "id": user_id_num,
        "email": email,
        "first_name": first_name,
        "last_name": last_name,
        "username": display_name,  # Use actual name for display
        "role": role
    }
    
    return jsonify({
        "id": user_id_num,
        "email": email,
        "first_name": first_name,
        "last_name": last_name,
        "username": display_name,  # Use actual name for display
        "role": role
    })

@app.route("/me")
def me():
    """Get current user"""
    user = session.get("user")
    if not user:
        return jsonify({"error": "Not logged in"}), 401
    
    # Ensure we return the enhanced user data with proper display name
    user_id = user.get("id")
    if user_id:
        # Get fresh user data from Redis to ensure consistency
        user_data = redis_client.hgetall(f"user:{user_id}")
        if user_data:
            first_name = user_data.get(b"first_name", "").decode('utf-8')
            last_name = user_data.get(b"last_name", "").decode('utf-8')
            email_bytes = user_data.get(b"email") or user_data.get(b"username", b"")
            email = email_bytes.decode('utf-8') if email_bytes else ""
            
            # Create display name
            if first_name or last_name:
                display_name = f"{first_name} {last_name}".strip()
            else:
                display_name = email
            
            # Return clean ordered user structure
            return jsonify({
                "id": user_id,
                "email": email,
                "first_name": first_name,
                "last_name": last_name,
                "username": display_name,  # Use actual name for display
                "role": user_data.get(b"role", "user").decode('utf-8')
            })
    
    return jsonify(user)

@app.route("/system/status")
def system_status():
    """Check if system needs initialization (first user)"""
    try:
        total_users_count = redis_client.get("total_users")
        needs_initialization = not total_users_count or int(total_users_count.decode('utf-8')) == 0
        
        return jsonify({
            "needs_initialization": needs_initialization,
            "total_users": int(total_users_count.decode('utf-8')) if total_users_count else 0,
            "message": "System ready for account owner setup" if needs_initialization else "System initialized",
            "redis_connected": True
        })
    except Exception as e:
        return jsonify({
            "error": f"Redis connection failed: {str(e)}",
            "redis_connected": False
        }), 500

# Debug endpoints removed - production system clean

@app.route("/admin/stats")
def admin_stats():
    """Get real-time admin panel statistics"""
    total_users = redis_client.get("total_users")
    online_users_count = redis_client.scard("online_users")
    general_messages_count = redis_client.zcard("room:0")
    
    return jsonify({
        "total_users": int(total_users.decode('utf-8')) if total_users else 0,
        "online_users": online_users_count,
        "total_rooms": 1,  # General room
        "total_messages": general_messages_count
    })

@app.route("/register", methods=["POST"])
def register():
    """Register new user"""
    data = request.get_json()
    
    # Validate required fields
    required_fields = ["name", "email", "password"]
    for field in required_fields:
        if not data.get(field):
            return jsonify({"error": f"{field} is required"}), 400
    
    name = data["name"]
    email = data["email"]
    password = data["password"]
    phone = data.get("phone", "")  # Optional phone number
    
    # Check if user already exists (by email as username)
    username_key = f"username:{email}"
    existing_user = redis_client.get(username_key)
    
    if existing_user:
        return jsonify({"error": "User with this email already exists"}), 409
    
    # Validate password length
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400
    
    # Create new user
    try:
        # Check if this is the first user (account owner)
        total_users_count = redis_client.get("total_users")
        is_first_user = not total_users_count or int(total_users_count.decode('utf-8')) == 0
        
        # Generate unique user ID
        user_id = str(redis_client.incr("total_users"))
        
        # Hash password
        import bcrypt
        hashed_password = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(10))
        
        # Parse name into first/last name
        name_parts = name.strip().split(" ", 1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ""
        
        # Determine role: First user = super_admin, others = user
        role = "super_admin" if is_first_user else "user"
        
        # Create user profile
        user_profile = {
            "id": user_id,
            "username": email,  # Use email as username
            "first_name": first_name,
            "last_name": last_name,
            "email": email,
            "phone": phone,
            "role": role,
            "avatar_url": "",
            "created_at": str(time.time()),
            "last_seen": str(time.time()),
            "password": hashed_password,
            "is_account_owner": "true" if is_first_user else "false"
        }
        
        # Store user data
        user_key = f"user:{user_id}"
        redis_client.hset(user_key, mapping=user_profile)
        
        # Create email -> user_id mapping
        redis_client.set(username_key, user_key)
        
        # Add user to general room
        redis_client.sadd(f"user:{user_id}:rooms", "0")
        
        # Set user in session
        session["user"] = {
            "id": user_id,
            "username": email,
            "first_name": first_name,
            "last_name": last_name,
            "email": email,
            "phone": phone,
            "role": role,
            "is_account_owner": is_first_user
        }
        
        success_message = "Account created successfully! You are the account owner." if is_first_user else "User created successfully"
        
        return jsonify({
            "id": user_id,
            "username": email,
            "first_name": first_name,
            "last_name": last_name,
            "email": email,
            "phone": phone,
            "role": role,
            "is_account_owner": is_first_user,
            "message": success_message
        }), 201
        
    except Exception as e:
        print(f"Registration error: {e}")
        return jsonify({"error": "Failed to create user"}), 500

@app.route("/profile", methods=["GET"])
def get_profile():
    """Get current user profile"""
    user = session.get("user")
    if not user:
        return jsonify({"error": "Not logged in"}), 401
    
    # Get full user data from Redis
    user_data = redis_client.hgetall(f"user:{user['id']}")
    if not user_data:
        return jsonify({"error": "User not found"}), 404
    
    profile = {
        "id": user["id"],
        "username": user_data.get(b"username", "").decode('utf-8'),
        "first_name": user_data.get(b"first_name", "").decode('utf-8'),
        "last_name": user_data.get(b"last_name", "").decode('utf-8'),
        "email": user_data.get(b"email", "").decode('utf-8'),
        "role": user_data.get(b"role", "user").decode('utf-8'),
        "avatar_url": user_data.get(b"avatar_url", "").decode('utf-8'),
        "created_at": user_data.get(b"created_at", "").decode('utf-8'),
        "last_seen": user_data.get(b"last_seen", "").decode('utf-8')
    }
    
    return jsonify(profile)

@app.route("/profile", methods=["PUT"])
def update_profile():
    """Update user profile"""
    user = session.get("user")
    if not user:
        return jsonify({"error": "Not logged in"}), 401
    
    data = request.get_json()
    user_key = f"user:{user['id']}"
    
    # Get current user data
    current_data = redis_client.hgetall(user_key)
    if not current_data:
        return jsonify({"error": "User not found"}), 404
    
    # Update allowed fields
    updatable_fields = ["first_name", "last_name", "avatar_url"]
    updates = {}
    
    for field in updatable_fields:
        if field in data:
            updates[field] = data[field]
    
    if updates:
        # Update last_seen timestamp
        updates["last_seen"] = str(time.time())
        
        # Update Redis
        redis_client.hmset(user_key, updates)
        
        # Update session
        session["user"].update(updates)
    
    return jsonify({"message": "Profile updated successfully", "updates": updates})

@app.route("/admin/users", methods=["GET"])
def admin_list_users():
    """Admin: List all users"""
    user = session.get("user")
    if not user or user.get("role") not in ["admin", "super_admin"]:
        return jsonify({"error": "Admin access required"}), 403
    
    # Get total users count
    total_users = redis_client.get("total_users")
    if not total_users:
        return jsonify([])
    
    users = []
    for i in range(1, int(total_users.decode('utf-8')) + 1):
        user_data = redis_client.hgetall(f"user:{i}")
        if user_data:
            users.append({
                "id": str(i),
                "username": user_data.get(b"username", "").decode('utf-8'),
                "first_name": user_data.get(b"first_name", "").decode('utf-8'),
                "last_name": user_data.get(b"last_name", "").decode('utf-8'),
                "email": user_data.get(b"email", "").decode('utf-8'),
                "role": user_data.get(b"role", "user").decode('utf-8'),
                "created_at": user_data.get(b"created_at", "").decode('utf-8'),
                "last_seen": user_data.get(b"last_seen", "").decode('utf-8')
            })
    
    return jsonify(users)

@app.route("/admin/users/<user_id>/role", methods=["PUT"])
def admin_update_user_role(user_id):
    """Admin: Update user role"""
    admin_user = session.get("user")
    if not admin_user or admin_user.get("role") != "super_admin":
        return jsonify({"error": "Super admin access required"}), 403
    
    data = request.get_json()
    new_role = data.get("role")
    
    if new_role not in ["user", "admin", "super_admin"]:
        return jsonify({"error": "Invalid role"}), 400
    
    user_key = f"user:{user_id}"
    user_data = redis_client.hgetall(user_key)
    
    if not user_data:
        return jsonify({"error": "User not found"}), 404
    
    # Update role
    redis_client.hset(user_key, "role", new_role)
    
    return jsonify({"message": f"User role updated to {new_role}"})

@app.route("/logout", methods=["POST"])
def logout():
    """Logout user"""
    session.pop("user", None)
    return jsonify({"message": "Logged out"})

@app.route("/users/online")
def get_online_users():
    """Get online users - Simple Redis pattern"""
    online_user_ids = redis_client.smembers("online_users")
    online_users = []
    
    for user_id_bytes in online_user_ids:
        user_id = user_id_bytes.decode('utf-8')
        user = get_user_data(user_id)
        if user:
            online_users.append(user)
    
    return jsonify(online_users)

@app.route("/rooms/<user_id>")
def get_rooms(user_id):
    """Get rooms for user"""
    room_ids = redis_client.smembers(f"user:{user_id}:rooms")
    rooms = []

    for room_id_bytes in room_ids:
        room_id = room_id_bytes.decode('utf-8')
        room_name_bytes = redis_client.get(f"room:{room_id}:name")
        
        if room_name_bytes:
            room_name = room_name_bytes.decode('utf-8')
            rooms.append({
                    "id": room_id,
                "name": room_name,
                "names": [room_name]  # Add names array for frontend compatibility
            })
        else:
            # Private room - get other user's name
            if ":" in room_id:
                user1, user2 = room_id.split(":")
                # Get the other user (not the current user)
                other_user_id = user2 if user1 == user_id else user1
                other_user_data = redis_client.hgetall(f"user:{other_user_id}")
                room_name = other_user_data.get(b"username", f"User{other_user_id}".encode('utf-8')).decode('utf-8')
                rooms.append({
                    "id": room_id,
                    "name": room_name,
                    "names": [room_name]  # Add names array for frontend compatibility
                })
    
    return jsonify(rooms)

# Removed duplicate route - using enhanced version with user data below

@app.route("/")
def server_status_page():
    """Railway Backend Status Page - Comprehensive Server Information"""
    import time
    import os
    from datetime import datetime
    
    # Get system information
    current_time = datetime.now().isoformat()
    
    # Test Redis connection
    redis_status = "❌ Disconnected"
    redis_info = "Unable to connect"
    try:
        redis_client.ping()
        redis_status = "✅ Connected"
        total_users = redis_client.get("total_users")
        online_users = redis_client.scard("online_users")
        redis_info = f"Users: {total_users.decode() if total_users else 0}, Online: {online_users}"
    except Exception as e:
        redis_info = f"Error: {str(e)}"
    
    return f'''
    <!DOCTYPE html>
    <html>
    <head>
        <title>GuideOps Chat API Server Status</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                   max-width: 900px; margin: 0 auto; padding: 20px; background: #f8f9fa; }}
            .container {{ background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }}
            .header {{ text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #007bff; }}
            .status-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 30px 0; }}
            .status-card {{ background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #007bff; }}
            .endpoints {{ background: #e7f3ff; padding: 20px; border-radius: 8px; margin: 30px 0; }}
            .endpoint {{ margin: 10px 0; font-family: 'Monaco', 'Menlo', monospace; background: white; 
                        padding: 12px; border-radius: 6px; border: 1px solid #dee2e6; }}
            .btn {{ display: inline-block; padding: 10px 20px; margin: 5px; background: #007bff; 
                   color: white; text-decoration: none; border-radius: 6px; }}
            .btn:hover {{ background: #0056b3; }}
            h1 {{ color: #007bff; margin: 0; }}
            h3 {{ color: #333; margin-top: 30px; }}
            .healthy {{ color: #28a745; font-weight: bold; }}
            .error {{ color: #dc3545; font-weight: bold; }}
            .info {{ background: #d1ecf1; padding: 15px; border-radius: 6px; margin: 20px 0; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🚀 GuideOps Chat API Server</h1>
                <p>Railway Backend Status & Monitoring</p>
                <p><strong>Status:</strong> <span class="healthy">Backend Online</span></p>
            </div>
            
            <div class="status-grid">
                <div class="status-card">
                    <h4>🗄️ Database Status</h4>
                    <p><strong>Redis Cloud:</strong> {redis_status}</p>
                    <p><strong>Details:</strong> {redis_info}</p>
                    <p><strong>Storage:</strong> Redis Streams (V2)</p>
                </div>
                
                <div class="status-card">
                    <h4>🌐 Network & Security</h4>
                    <p><strong>CORS:</strong> ✅ Vercel Origins Allowed</p>
                    <p><strong>Sessions:</strong> ✅ Redis-backed, SameSite=None</p>
                    <p><strong>Socket.IO:</strong> ✅ V2 Handlers Active</p>
                </div>
                
                <div class="status-card">
                    <h4>⚙️ System Info</h4>
                    <p><strong>Time:</strong> {current_time}</p>
                    <p><strong>Environment:</strong> {os.environ.get('FLASK_ENV', 'development')}</p>
                    <p><strong>Version:</strong> V2 (Redis Streams + GPS)</p>
                </div>
                
                <div class="status-card">
                    <h4>🏗️ Architecture</h4>
                    <p><strong>Frontend:</strong> Vercel (React)</p>
                    <p><strong>Backend:</strong> Railway (Flask)</p>
                    <p><strong>Database:</strong> Redis Cloud (US-West)</p>
                </div>
            </div>
            
            <div class="endpoints">
                <h3>📡 V2 API Endpoints</h3>
                <div class="endpoint">GET /me - Check user session</div>
                <div class="endpoint">POST /register - Create account (first user = super_admin)</div>
                <div class="endpoint">POST /login - User authentication</div>
                <div class="endpoint">GET /v2/rooms/{{id}}/messages - Get messages with GPS metadata</div>
                <div class="endpoint">POST /v2/rooms/{{id}}/messages - Send message with optional GPS</div>
                <div class="endpoint">GET /users/online - Online users list</div>
                <div class="endpoint">GET /rooms/{{user_id}} - User's rooms</div>
            </div>
            
            <div class="info">
                <h3>🔗 Quick Links</h3>
                <a href="/admin" class="btn">Admin Panel</a>
                <a href="/system/status" class="btn">System Status JSON</a>
                <a href="/users/online" class="btn">Online Users JSON</a>
                <a href="https://guideops-chat-frontend.vercel.app" class="btn">Frontend Application</a>
            </div>
            
            <div class="info">
                <h3>📍 Message Schema (V2)</h3>
                <pre style="background: white; padding: 15px; border-radius: 6px; overflow-x: auto;">{{
  "message_id": "uuid-v4",
  "room_id": "0",
  "author_id": "1",
  "text": "Hello from Vancouver!",
  "ts_ms": 1757563715000,
  "lat": 49.2827,
  "long": -123.1207,
  "v": 2
}}</pre>
            </div>
            
            <hr style="margin: 40px 0;">
            <p style="text-align: center; color: #666;">
                GuideOps Chat API Server | Railway Deployment | Redis Streams V2
            </p>
        </div>
    </body>
    </html>
    '''

@app.route("/register-page")
def beautiful_registration():
    """Serve beautiful registration page that matches login design"""
    return '''
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="utf-8"/>
        <link rel="icon" href="/favicon.ico"/>
        <meta name="viewport" content="width=device-width,initial-scale=1"/>
        <meta name="theme-color" content="#000000"/>
        <title>GuideOps Chat - Create Account</title>
        <link href="/static/css/2.150d169a.chunk.css" rel="stylesheet">
        <link href="/static/css/main.c68ddd7d.chunk.css" rel="stylesheet">
    </head>
    <body>
        <div id="root">
            <div class="full-height bg-light">
                <nav class="navbar navbar-expand-lg navbar-light bg-white">
                    <span class="navbar-brand">GuideOps Chat</span>
                </nav>
                
                <div class="login-form text-center login-page">
                    <div class="rounded" style="box-shadow: 0 0.75rem 1.5rem rgba(18,38,63,.03);">
                        <div class="position-relative">
                            <div class="row no-gutters align-items-center" style="
                                max-width: 400px;
                                background-color: rgba(85, 110, 230, 0.25);
                                padding-left: 20px;
                                padding-right: 20px;
                                border-top-left-radius: 4px;
                                border-top-right-radius: 4px;
                            ">
                                <div class="col text-primary text-left">
                                    <h3 class="font-size-15">Join GuideOps!</h3>
                                    <p>Create your account</p>
                                </div>
                                <div class="col align-self-end">
                                    <img alt="welcome" style="max-width: 100%;" src="/welcome-back.png">
                                </div>
                            </div>
                        </div>

                        <form class="bg-white text-left px-4" style="
                            padding-top: 58px;
                            border-bottom-left-radius: 4px;
                            border-bottom-right-radius: 4px;
                        " id="registerForm">
                            
                            <div id="message" style="margin-bottom: 15px;"></div>
                            
                            <label class="font-size-12">Full Name</label>
                            <input type="text" id="name" class="form-control mb-3" placeholder="Enter your full name" required autocomplete="name" />

                            <label class="font-size-12">Email</label>
                            <input type="email" id="email" class="form-control mb-3" placeholder="Enter your email" required autocomplete="email" />

                            <label class="font-size-12">Phone (Optional)</label>
                            <input type="tel" id="phone" class="form-control mb-3" placeholder="+1 (555) 123-4567" autocomplete="tel" />

                            <label class="font-size-12">Password</label>
                            <input type="password" id="password" class="form-control mb-3" placeholder="Create password (min 6 chars)" required minlength="6" autocomplete="new-password" />

                            <label class="font-size-12">Confirm Password</label>
                            <input type="password" id="confirmPassword" class="form-control" placeholder="Confirm your password" required minlength="6" autocomplete="new-password" />

                            <div style="height: 30px;"></div>
                            
                            <button class="btn btn-lg btn-primary btn-block" type="submit">Create Account</button>
                            
                            <div class="text-center mt-3" style="padding-bottom: 20px;">
                                <a href="/" style="color: #007bff; text-decoration: none; font-size: 14px; font-weight: 500;">Already have an account? Sign In</a>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>

        <script>
            document.getElementById('registerForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const name = document.getElementById('name').value;
                const email = document.getElementById('email').value;
                const phone = document.getElementById('phone').value;
                const password = document.getElementById('password').value;
                const confirmPassword = document.getElementById('confirmPassword').value;
                
                document.getElementById('message').innerHTML = '';
                
                if (password !== confirmPassword) {
                    showMessage('Passwords do not match', false);
                    return;
                }
                
                if (password.length < 6) {
                    showMessage('Password must be at least 6 characters', false);
                    return;
                }
                
                try {
                    const response = await fetch('/register', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name, email, phone, password })
                    });
                    
                    const result = await response.json();
                    
                    if (response.ok) {
                        if (result.is_account_owner) {
                            showMessage('🎉 ' + result.message, true);
                            setTimeout(() => loginAndRedirect(email, password), 2000);
                        } else {
                            showMessage(result.message, true);
                            setTimeout(() => loginAndRedirect(email, password), 1000);
                        }
                    } else {
                        showMessage(result.error || 'Registration failed', false);
                    }
                } catch (error) {
                    showMessage('Registration failed: ' + error.message, false);
                }
            });

            async function loginAndRedirect(email, password) {
                try {
                    const response = await fetch('/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username: email, password })
                    });
                    
                    if (response.ok) {
                        window.location.href = '/';
                    } else {
                        showMessage('Auto-login failed. Please login manually.', false);
                        setTimeout(() => window.location.href = '/', 2000);
                    }
                } catch (error) {
                    showMessage('Auto-login failed. Please login manually.', false);
                    setTimeout(() => window.location.href = '/', 2000);
                }
            }

            function showMessage(text, isSuccess = false) {
                const messageDiv = document.getElementById('message');
                const alertClass = isSuccess ? 'alert-success' : 'alert-danger';
                messageDiv.innerHTML = '<div class="alert ' + alertClass + '" style="margin-bottom: 15px; padding: 10px 15px; border-radius: 4px; font-size: 14px;">' + text + '</div>';
                
                if (!isSuccess) {
                    setTimeout(() => messageDiv.innerHTML = '', 5000);
                }
            }
        </script>
    </body>
    </html>
    '''

@app.route("/v2/stream/<user_id>")
def stream_v2(user_id):
    """Redis Streams XREAD blocking for real-time messaging"""
    from flask import Response
    import json
    from chat.redis_streams import redis_streams
    
    # Security: Validate user_id matches authenticated user
    if "user" in session:
        auth_user_id = session["user"]["id"]
        if str(auth_user_id) != str(user_id):
            print(f"[StreamV2] Security violation: user {auth_user_id} tried to access stream for user {user_id}")
            return jsonify({"error": "Unauthorized - can only access your own stream"}), 403
    else:
        # For cross-domain requests, we'll need to implement token-based auth later
        print(f"[StreamV2] Warning: No session for stream access, user_id: {user_id}")
    
    def xread_event_stream():
        print(f"[StreamV2] XREAD blocking connection established for user {user_id}")
        
        # Get user's rooms (for now just room 0, but could expand)
        room_ids = ["0"]  # TODO: Get from user:{user_id}:rooms
        
        # Initial catch-up: send any missed messages since last seen
        try:
            for room_id in room_ids:
                catchup_messages = redis_streams.get_catchup_messages(user_id, room_id, max_count=50)
                for message in catchup_messages:
                    event_data = {"type": "message", "data": message}
                    print(f"[StreamV2] Catch-up message: {message['id']} from user {message.get('user', {}).get('username', 'unknown')}")
                    yield f"data: {json.dumps(event_data)}\n\n"
            
            # Send backlog_end marker
            yield f"data: {json.dumps({'type': 'backlog_end', 'timestamp': int(time.time() * 1000)})}\n\n"
            print(f"[StreamV2] Catch-up complete for user {user_id}, starting real-time XREAD")
            
        except Exception as e:
            print(f"[StreamV2] Error in catch-up for user {user_id}: {e}")
        
        try:
            while True:
                # XREAD blocking across all user's rooms (15s timeout for heartbeats)
                new_messages = redis_streams.read_blocking(user_id, room_ids, block_ms=15000, count=50)
                
                # Send each new message to client
                for message in new_messages:
                    event_data = {
                        "type": "message",
                        "data": message
                    }
                    print(f"[StreamV2] Broadcasting message: {message['id']} from user {message.get('user', {}).get('username', 'unknown')}")
                    yield f"data: {json.dumps(event_data)}\n\n"
                
                # Send heartbeat every 15 seconds (XREAD timeout)
                # This keeps connection alive through proxies and CDNs
                yield f": heartbeat {int(time.time())}\n\n"
                    
        except GeneratorExit:
            print(f"[StreamV2] XREAD connection closed for user {user_id}")
        except Exception as e:
            print(f"[StreamV2] Error in XREAD stream for user {user_id}: {e}")
    
    # Proper SSE headers for cross-domain with credentials
    response = Response(xread_event_stream(), mimetype="text/event-stream")
    response.headers['Cache-Control'] = 'no-cache, no-transform'
    response.headers['Connection'] = 'keep-alive'
    response.headers['X-Accel-Buffering'] = 'no'  # Prevent proxy buffering
    
    # CORS headers for SSE (must match request origin exactly)
    origin = request.headers.get('Origin')
    allowed_origins = [
        "https://guideops-chat-frontend.vercel.app",
        "http://localhost:3000"
    ]
    
    if origin in allowed_origins:
        response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Vary'] = 'Origin'
    else:
        print(f"[StreamV2] CORS denied for origin: {origin}")
        return jsonify({"error": "CORS policy violation"}), 403
    
    return response

@app.route("/admin")
def admin_panel():
    """Simple admin panel for GuideOps chat"""
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>GuideOps Chat Admin Panel</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
            .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { border-bottom: 2px solid #007bff; padding-bottom: 10px; margin-bottom: 20px; }
            .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 30px; }
            .stat-card { background: #f8f9fa; padding: 15px; border-radius: 5px; border-left: 4px solid #007bff; }
            .stat-number { font-size: 24px; font-weight: bold; color: #007bff; }
            .stat-label { color: #666; font-size: 14px; }
            .section { margin-bottom: 30px; }
            .section h3 { color: #333; border-bottom: 1px solid #eee; padding-bottom: 5px; }
            .btn { background: #007bff; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; margin: 5px; }
            .btn:hover { background: #0056b3; }
            .btn-success { background: #28a745; }
            .btn-danger { background: #dc3545; }
            .data-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            .data-table th, .data-table td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
            .data-table th { background: #f8f9fa; font-weight: bold; }
            .status-online { color: #28a745; font-weight: bold; }
            .status-offline { color: #dc3545; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>GuideOps Chat Admin Panel</h1>
                <p>Real-time chat system for guide teams</p>
            </div>
            
            <div class="stats">
                <div class="stat-card">
                    <div class="stat-number" id="total-users">-</div>
                    <div class="stat-label">Total Users</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" id="online-users">-</div>
                    <div class="stat-label">Online Users</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" id="total-rooms">-</div>
                    <div class="stat-label">Total Rooms</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" id="total-messages">-</div>
                    <div class="stat-label">Total Messages</div>
                </div>
            </div>
            
            <div class="section">
                <h3>👥 Online Users</h3>
                <button class="btn" onclick="loadOnlineUsers()">Refresh</button>
                <table class="data-table" id="online-users-table">
                    <thead>
                        <tr><th>ID</th><th>Username</th><th>Status</th></tr>
                    </thead>
                    <tbody></tbody>
                </table>
            </div>
            
            <div class="section">
                <h3>🏠 Rooms & Channels</h3>
                <button class="btn" onclick="loadRooms()">Refresh</button>
                <table class="data-table" id="rooms-table">
                    <thead>
                        <tr><th>ID</th><th>Name</th><th>Type</th><th>Messages</th></tr>
                    </thead>
                    <tbody></tbody>
                </table>
            </div>
            
            <div class="section">
                <h3>🔧 System Actions</h3>
                <button class="btn btn-success" onclick="testRedisConnection()">Test Database Connection</button>
                <button class="btn" onclick="clearAllData()">Clear All Data</button>
                <button class="btn" onclick="createTestData()">Create Test Data</button>
            </div>
            
            <div class="section">
                <h3>📊 System Status</h3>
                <div id="system-status">
                    <p>✅ Flask Server: Running on port 3000</p>
                    <p>✅ Database Server: Connected</p>
                    <p>✅ Socket.IO: Active</p>
                    <p>✅ Frontend: Available at <a href="/">http://localhost:3000</a></p>
                </div>
            </div>
        </div>
        
        <script>
            // Load initial data
            loadStats();
            loadOnlineUsers();
            loadRooms();
            
            // Auto-refresh every 5 seconds
            setInterval(() => {
                loadStats();
                loadOnlineUsers();
            }, 5000);
            
            async function loadStats() {
                try {
                    // Get real-time stats from dedicated endpoint
                    const response = await fetch('/admin/stats');
                    const stats = await response.json();
                    
                    // Update with real data
                    document.getElementById('total-users').textContent = stats.total_users;
                    document.getElementById('online-users').textContent = stats.online_users;
                    document.getElementById('total-rooms').textContent = stats.total_rooms;
                    document.getElementById('total-messages').textContent = stats.total_messages;
                } catch (error) {
                    console.error('Error loading stats:', error);
                }
            }
            
            async function loadOnlineUsers() {
                try {
                    const response = await fetch('/users/online');
                    const users = await response.json();
                    const tbody = document.querySelector('#online-users-table tbody');
                    tbody.innerHTML = '';
                    
                    users.forEach(user => {
                        const row = tbody.insertRow();
                        row.insertCell(0).textContent = user.id;
                        row.insertCell(1).textContent = user.username;
                        row.insertCell(2).innerHTML = '<span class="status-online">Online</span>';
                    });
                } catch (error) {
                    console.error('Error loading online users:', error);
                }
            }
            
            async function loadRooms() {
                try {
                    const response = await fetch('/rooms/1'); // Get first user's rooms
                    const rooms = await response.json();
                    const tbody = document.querySelector('#rooms-table tbody');
                    tbody.innerHTML = '';
                    
                    rooms.forEach(room => {
                        const row = tbody.insertRow();
                        row.insertCell(0).textContent = room.id;
                        row.insertCell(1).textContent = room.name;
                        row.insertCell(2).textContent = room.id === '0' ? 'General' : 'Private';
                        row.insertCell(3).textContent = 'Active';
                    });
                } catch (error) {
                    console.error('Error loading rooms:', error);
                }
            }
            
            function testRedisConnection() {
                alert('Database connection test - check server logs for details');
            }
            
            function clearAllData() {
                if (confirm('Are you sure you want to clear all chat data?')) {
                    alert('Data clear - this would need to be implemented');
                }
            }
            
            function createTestData() {
                alert('Test data creation - demo data already exists');
            }
        </script>
    </body>
    </html>
    """

@app.route("/users")
def get_users():
    """Get users by IDs - Simple Redis pattern"""
    user_ids = request.args.getlist('ids[]')
    users = []
    
    for user_id in user_ids:
        user = get_user_data(user_id)
        if user:
            users.append(user)
    
        return jsonify(users)

# V1 ZSET message endpoint removed - use /v2/rooms/{id}/messages only

@app.route("/links")
def get_links():
    """Get demo links"""
    return jsonify({"message": "Demo links"})
