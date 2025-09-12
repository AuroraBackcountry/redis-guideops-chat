# 🤖 AI Development Context - GuideOps Chat

*This file serves as a comprehensive context reference for AI assistants working on this project. It documents the complete development journey, technical decisions, achievements, and deployment strategy.*

---

## 📋 **Project Overview**

**Goal**: Complete SaaS chat application for guide teams with AI integration, mobile-first PWA approach, and global deployment.

**Repository**: `https://github.com/AuroraBackcountry/redis-guideops-chat.git`

**Current Status**: 🔄 **V2 MIGRATION IN PROGRESS** - Implementing unified Redis Streams schema with GPS support

**Target**: Complete V2 migration → Stable production system → AI integration

---

## 🎯 **V2 System Architecture (Current)**

### ✅ **Production Infrastructure**
- **Frontend**: Vercel deployment with React auto-build from source
- **Backend**: Railway Flask API at `redis-guideops-chat-production.up.railway.app`
- **Database**: Redis Cloud (US-West) with Redis Streams storage
- **Schema**: Unified V2 format (message_id, author_id, ts_ms, GPS coordinates)

### 🔄 **V2 Migration Status**
- **✅ V1 Code Eliminated**: Removed ZSET storage, old Socket.IO handlers, demo data
- **✅ Unified Schema**: Implemented surgical plan message validation
- **✅ Security**: Server-side identity stamping, client fields ignored
- **🔄 In Progress**: Socket.IO V2 handlers, complete frontend migration
- **🔄 Testing**: Clean Redis database, CORS fixes applied

### ✅ **Core Features Working in Production**
- **Beautiful SaaS Registration**: First user = account owner (super_admin), automatic role assignment
- **Real-time Messaging**: General rooms + private messages with instant delivery across devices
- **User Management**: Complete profile system (first_name, last_name, email, phone, role)
- **Message Identification**: Fixed user attribution with embedded user data in messages
- **Admin Panel**: Live monitoring with real-time stats (GuideOps Chat Admin Panel)
- **Session Management**: Clean login/logout with Redis Cloud persistence
- **Mobile Optimization**: Responsive design, mobile-friendly header, touch-optimized interface

### ✅ **Production-Ready Architecture**
- **Backend**: Railway hosting Flask + Redis Cloud + Socket.IO + Server-Sent Events
- **Frontend**: React UI served from Railway with beautiful responsive design
- **Real-time**: Dual system (Socket.IO for sending, SSE for receiving) working globally
- **Data Storage**: Redis Cloud with proper user data normalization and 4-year retention
- **User Structure**: Clean, ordered fields (id, email, first_name, last_name, username, role)
- **Global Performance**: US-West servers optimized for international guide teams

### ✅ **SaaS Features Live in Production**
- **Smart Registration**: First user = super_admin, others = user (tested and working)
- **Role Management**: super_admin → admin → user hierarchy fully functional
- **Profile Management**: Complete user profiles with phone numbers and role assignment
- **Admin Controls**: User management, system monitoring, role assignment working
- **Professional UI**: "GuideOps Chat" branding throughout, mobile-optimized interface

---

## 🏗️ **Architecture Decisions & Why**

### **1. Dual Real-time Communication System**
**Decision**: Use both Socket.IO and Server-Sent Events (SSE)
**Why**: Based on [Redis chat tutorial](https://redis.io/learn/howtos/chatapp#realtime-chat-and-session-handling) - Socket.IO for sending messages, SSE for receiving real-time updates via `/stream` endpoint
**Implementation**: 
- Messages sent via Socket.IO `message` event
- Real-time updates received via SSE from `/stream` endpoint
- Redis Pub/Sub bridges the two systems

### **2. Redis Data Structure**
**Decision**: Follow Redis tutorial data model exactly
**Why**: Proven, scalable structure from official Redis documentation
**Structure**:
```
users: user:{id} (hash with username, password)
rooms: room:{id} (sorted set with messages, score = timestamp)  
user_rooms: user:{id}:rooms (set of room IDs)
online_users: online_users (set of user IDs)
```

### **3. Message Format Standardization**
**Decision**: Ensure consistent message format between backend and frontend
**Why**: Frontend expects specific field names (`message.message`, `message.date`, `message.from`)
**Format**:
```json
{
  "message": "text content",
  "date": 1757523000,
  "from": "2", 
  "roomId": "0"
}
```

---

## 🔧 **Major Technical Challenges & Solutions**

### **Challenge 1: Eventlet Monkey Patching Issues**
**Problem**: `RuntimeError: Working outside of application context` due to Python 3.13 + eventlet compatibility
**Solution**: Kept original eventlet configuration despite errors - server still functions correctly
**Lesson**: Don't over-engineer fixes for warnings if core functionality works

### **Challenge 2: Server-Sent Events Not Working**
**Problem**: Messages stored in Redis but not appearing in real-time
**Root Cause**: SSE endpoint was filtering out ALL messages due to server ID check
**Original Code**:
```python
if data.get('serverId') != utils.SERVER_ID:  # This filtered everything!
    yield f"data: {json.dumps(data)}\n\n"
```
**Solution**: Removed server ID filtering for single-server setup
**Fixed Code**:
```python
# For single server setup, send all messages
yield f"data: {json.dumps(data)}\n\n"
```

### **Challenge 3: API Format Mismatches**
**Problem**: Frontend expecting different data formats than backend providing
**Solutions**:
- Added `/users?ids[]=1&ids[]=2` endpoint for user data lookup
- Added `/room/{id}/messages` endpoint with proper pagination
- Fixed room names in private messages (showing other user's name, not own name)
- Added `names` array to room objects for frontend compatibility

### **Challenge 4: Redis Bytes vs Strings**
**Problem**: Redis returns bytes, Python code expected strings
**Solution**: Systematic `.decode('utf-8')` conversion throughout codebase
**Pattern**:
```python
user_id = redis_client.get(username_key).decode('utf-8')
username = user_data.get(b"username", "").decode('utf-8')
```

---

## 🚀 **Development Journey**

### **Phase 1: Initial Setup & Migration**
- Cloned repository with 195+ migrated UI components from Stream Chat
- Set up Flask + Redis + Socket.IO backend
- Created Redis data models and API endpoints

### **Phase 2: Integration Attempts**
- Built enhanced Redis models (`RedisUserManager`, `RedisChannelManager`, etc.)
- Created Stream Chat hook replacements (`useRedisChat`, `useChatContext`, etc.)
- Attempted to integrate advanced UI components

### **Phase 3: Debugging & Simplification**
- Encountered Socket.IO connection issues
- Reverted to original Redis tutorial implementation
- Fixed API compatibility issues one by one

### **Phase 4: Success & Stabilization**
- Achieved working real-time chat
- Fixed Server-Sent Events filtering
- Implemented admin panel
- Committed working state to GitHub

---

## 📁 **Key Files & Their Roles**

### **Backend Core**
- `app.py` - Main Flask application entry point with eventlet monkey patching
- `chat/app.py` - Flask app initialization, CORS, Socket.IO setup
- `chat/routes.py` - **CRITICAL** - All API endpoints including `/stream` SSE endpoint
- `chat/socketio_signals.py` - Socket.IO event handlers (connect, disconnect, message)
- `chat/utils.py` - Redis connection and utility functions
- `chat/demo_data.py` - Creates demo users (Pablo, Joe, Mary, Alex)

### **Frontend Core**
- `client/src/App.jsx` - Main React app with basic Chat component active
- `client/src/hooks.js` - Socket.IO client setup and event handling
- `client/src/api.js` - API client functions
- `client/src/components/Chat/index.jsx` - **ACTIVE** basic chat UI
- `client/src/components/Chat/use-chat-handlers.js` - Chat state management

### **Advanced UI (Available but Inactive)**
- `client/src/components/Chat/ChatRedisEnhanced.tsx` - Advanced UI wrapper (commented out)
- `client/src/hooks/useRedisChat.js` - Redis-compatible hooks for advanced UI
- `client/src/components/Team*` - Advanced UI components (ready for integration)

---

## 🔍 **Current State Analysis**

### **What's Working Perfectly**
1. **Message Storage**: All messages persist in Redis correctly
2. **Real-time Delivery**: Messages appear instantly for all users
3. **User Management**: Login, presence, room membership all functional
4. **Private Messaging**: 1:1 chats work with proper room naming
5. **Admin Monitoring**: Live system stats and user tracking

### **What's Ready for Enhancement**
1. **Typing Indicators**: Components exist, just need backend integration
2. **Advanced UI**: All components migrated, just need to uncomment in App.jsx
3. **AI Integration**: FastAPI server ready, just need user integration
4. **File Uploads**: UI components ready for backend implementation

### **What Needs Future Work**
1. **User Registration**: Currently uses demo users only
2. **Channel Creation**: Basic implementation exists, needs refinement
3. **Message Reactions**: UI components ready, backend needed
4. **Thread Replies**: Advanced feature for later

---

## 🎨 **UI Component Strategy**

### **Current Approach: Basic First**
- Using simple `Chat` component from `client/src/components/Chat/index.jsx`
- Proven to work with Redis backend
- Clean, functional interface

### **Advanced UI Available**
- Complete set of Stream Chat-style components
- Beautiful SCSS styling with themes
- Location sharing, file uploads, admin panels
- Ready to activate by uncommenting `ChatRedisEnhanced` in App.jsx

---

## 🤖 **AI Integration Architecture**

### **Planned Approach**
- **FastAPI Server**: Already built at `elrich-fastapi.py` (port 3002)
- **n8n Integration**: Webhook system ready for AI workflows
- **DM-Based**: AI assistant as special user for 1:1 conversations
- **Streaming**: Server-Sent Events for real-time AI responses

### **Integration Points**
- Add AI user to Redis user system
- Create DM room between user and AI
- Route AI messages through FastAPI → n8n → streaming response

---

## 📊 **Performance & Scalability**

### **Current Capacity**
- **Target Users**: ~50 users (per user requirements)
- **Message Storage**: Redis sorted sets with timestamp scoring
- **Real-time**: Sub-second message delivery
- **Persistence**: In-memory Redis (fast) with optional disk persistence

### **Scaling Strategy**
- **Phase 1**: Redis-only (current)
- **Phase 2**: Redis (cache) + Postgres (persistence) when scaling needed
- **Deployment**: Railway, Fly.io, DigitalOcean App Platform recommended

---

## 🔧 **Development Environment**

### **Local Setup**
- **Redis**: Local Redis server
- **Backend**: Flask on port 3000 (`PORT=3000 python3 app.py`)
- **Frontend**: React build served by Flask (not separate npm start)
- **AI**: FastAPI on port 3002 (when needed)

### **Key Commands**
```bash
# Start Redis
redis-server

# Start Backend
PORT=3000 python3 app.py

# Access Chat
http://localhost:3000

# Access Admin
http://localhost:3000/admin
```

---

## 🎯 **Next Development Priorities**

### **Immediate (Ready to Implement)**
1. **Typing Indicators** - Backend Socket.IO events + frontend display
2. **Advanced UI Activation** - Uncomment ChatRedisEnhanced
3. **AI Assistant Integration** - Add AI user + FastAPI routing

### **Short Term**
1. **User Registration** - Replace demo users with real signup
2. **Channel Management** - Improve create/join/leave functionality
3. **Message Reactions** - Backend support for emoji reactions

### **Long Term**
1. **File Uploads** - Backend storage + UI integration
2. **Location Sharing** - GPS integration + maps
3. **Admin Panel Enhancement** - User management, moderation tools

---

## 💡 **Key Lessons Learned**

### **Technical Insights**
1. **Follow Proven Patterns**: Redis tutorial architecture worked perfectly
2. **API Compatibility Critical**: Frontend/backend format alignment essential
3. **Real-time is Complex**: Dual system (Socket.IO + SSE) necessary for reliability
4. **Simplify First**: Basic implementation before advanced features

### **Development Process**
1. **Save Working States**: Commit frequently, especially when things work
2. **Debug Systematically**: API format mismatches were root cause of many issues
3. **Read Documentation**: Redis tutorial provided the solution architecture
4. **Test End-to-End**: Real browser testing revealed issues unit tests missed

### **Architecture Decisions**
1. **Don't Over-Engineer**: Simple solutions often work better than complex ones
2. **Data Format Consistency**: Standardize message/user/room formats early
3. **Real-time Requires Redundancy**: Multiple communication channels for reliability

---

## 🔍 **Debugging Playbook**

### **When Messages Don't Appear**
1. Check Redis storage: `redis-cli zrange "room:0" 0 -1`
2. Test API endpoints: `curl http://localhost:3000/room/0/messages`
3. Check SSE stream: `curl http://localhost:3000/stream`
4. Verify Socket.IO connection in browser console

### **When Real-time Stops Working**
1. Check eventlet monkey patching (warnings OK, errors not OK)
2. Verify Redis Pub/Sub: `redis-cli monitor`
3. Test manual pub/sub: `redis-cli publish MESSAGES '{"test": "data"}'`
4. Check server ID filtering in `/stream` endpoint

### **When Users Can't Connect**
1. Verify Redis user data: `redis-cli hgetall user:1`
2. Check online_users set: `redis-cli smembers online_users`
3. Test login endpoint: `curl -X POST http://localhost:3000/login`
4. Verify session handling in Socket.IO

---

## 📚 **External References**

### **Core Documentation**
- [Redis Chat Tutorial](https://redis.io/learn/howtos/chatapp#realtime-chat-and-session-handling) - **PRIMARY REFERENCE**
- [Flask-SocketIO Documentation](https://flask-socketio.readthedocs.io/)
- [Redis Commands Reference](https://redis.io/commands)

### **Key Technologies**
- **Backend**: Flask, Redis, Socket.IO, Server-Sent Events
- **Frontend**: React, Socket.IO Client, Advanced UI Components
- **AI**: FastAPI, n8n, Streaming Responses
- **Deployment**: Railway, Fly.io, DigitalOcean recommended

---

## 🚀 **Success Metrics**

### ✅ **Achieved Goals**
- [x] Real-time human-to-human messaging
- [x] Redis backend integration
- [x] Advanced UI components preserved
- [x] Message persistence and retrieval
- [x] User presence tracking
- [x] Private messaging functionality
- [x] Admin monitoring capabilities

### 🎯 **Ready for Next Phase**
- [ ] Typing indicators
- [ ] AI assistant integration
- [ ] Advanced UI activation
- [ ] Enhanced user management
- [ ] File upload capabilities

---

## 🛠️ **Production Deployment Journey & Lessons Learned**

### **Railway Deployment Challenges Solved**

#### **Critical Issues Resolved:**
1. **Environment Variables**: Railway shared variables not connected to service (solved with "Add All")
2. **Redis URL Format**: Missing protocol/credentials in connection string (solved with proper format)
3. **Automatic Redis Addon**: `app.json` creating conflicting Redis services (removed addon)
4. **Port Configuration**: Hardcoded PORT conflicting with Railway's dynamic assignment (removed)
5. **Dual Redis Initialization**: Redis initialized twice causing conflicts (added ping check)
6. **Static File Serving**: Flask trying to serve non-existent React build files (added fallback)
7. **User Data Attribution**: Messages showing wrong or missing sender names (embedded user data)
8. **Frontend Build Issues**: React build dependencies preventing proper workflow (ajv conflicts)

#### **Railway-Specific Learnings:**
- **Aggressive Caching**: Railway caches Docker layers extensively, requires cache busting
- **Auto-Detection Conflicts**: Railway forces gunicorn for Flask apps regardless of configuration
- **Deployment Lag**: GitHub pushes can take 5-15 minutes to deploy automatically
- **Environment Variable Types**: Shared vs Service variables must be explicitly connected

#### **User Identification System Fixes:**
- **Root Cause**: Frontend user data loading race conditions causing missing/wrong names
- **Solution 1**: localStorage cache for persistent user data across refreshes
- **Solution 2**: Embedded user data in messages API (eliminates separate user lookups)
- **Solution 3**: Removed usernames from own messages (modern chat UX pattern)
- **Result**: Professional, reliable message identification for guide teams

### **Current Production Architecture**
```
Railway (Vancouver) ← Flask + Socket.IO + SSE
    ↓
Redis Cloud (US-West) ← User data + Messages + Sessions
    ↓  
Global Guide Teams ← Mobile-first responsive interface
```

### **Development Workflow Challenges**
- **React Build Dependencies**: `ajv` conflicts preventing `npm run build`
- **Current Workaround**: Manual compiled JS editing for immediate changes
- **Future Solution**: Vercel frontend deployment or fixed React build dependencies
- **Professional Goal**: Edit source → push → auto-deploy workflow

---

## 🚀 **Mobile-First Production Results**

### **Target Users & Scale**
- **Year 1**: Max 100 users globally (Japan, Norway, Canada, New Zealand, South America)
- **Launch**: 20-30 team members immediately
- **Scale trigger**: 50 users → infrastructure scaling
- **Use case**: Internal guide team communication with 4-year message retention

### **PWA Requirements (30 days)**
- **Offline capability**: 24-48 hours of cached messages
- **Global performance**: Sub-second message delivery worldwide
- **File sharing**: Photos, documents, location data
- **Search functionality**: Full-text search across 4 years of messages

### **Native App Features (Within 1 year)**
- **Location data** (high priority)
- **Push notifications**
- **Camera access**
- **Contacts integration**
- **Phone/microphone/speaker access**

### **Recommended Deployment Stack**

#### **Primary Platform: Railway**
- **Location**: Vancouver-based servers (Western North America)
- **Cost**: ~$200/month total budget
- **Benefits**: Zero-config Redis + Postgres, excellent PWA support

#### **Database Architecture**
```
Redis Cloud (Primary) → Real-time chat, sessions, user presence
PostgreSQL (Railway) → Long-term storage, 4-year message retention
Zep Knowledge Graphs → AI memory and context (hybrid with n8n)
```

#### **AI Integration Strategy**
```
Chat Message → FastAPI → {
  n8n Workflows (business logic)
  +
  Zep Knowledge Graphs (user memory, team context)
} → Streaming AI Response
```

### **Global Performance Strategy**
- **Primary**: Railway (Vancouver) for North America
- **CDN**: Cloudflare for global asset delivery
- **Redis**: Global replication for low latency worldwide

---

## 🧠 **Enhanced AI Architecture**

### **Zep + n8n Hybrid Approach**
Based on Zep MCP analysis, optimal AI integration combines:

#### **Zep Knowledge Graphs** (Superior to n8n alone):
- **User Memory**: Persistent context for each guide across conversations
- **Group Graphs**: Team/location-specific knowledge sharing
- **4-Year Retention**: Perfect for due diligence requirements
- **Fact Invalidation**: Automatic knowledge updates
- **Global Context**: Knowledge spans multiple conversations

#### **n8n Workflows** (Business Logic):
- **Webhook triggers** from chat messages
- **Business process automation**
- **Integration with existing guide systems
- **Custom workflow logic**

#### **Integration Flow**:
```
User Message → FastAPI → {
  Zep: "What do we know about this user/location/topic?"
  n8n: "What business logic should trigger?"
} → Contextual AI Response → Streaming back to chat
```

---

## 📱 **Mobile-First Technical Specifications**

### **PWA Implementation**
- **Service Worker**: Offline message caching (24-48 hours)
- **Web Push**: Notifications before native apps
- **Responsive Design**: Mobile-optimized chat interface
- **Installation**: Add to home screen capability

### **Performance Requirements**
- **Message Delivery**: Sub-second globally
- **Offline Access**: Recent conversation history
- **File Uploads**: Photos, documents, location data
- **Search**: Full-text across 4-year message history

### **Native App Strategy**
- **React Native**: Code reuse from PWA
- **Expo**: Rapid iOS/Android development
- **Native Features**: Camera, location, push notifications, contacts

---

## 🔍 **Current System Status (Production Ready)**

### **✅ What's Perfect**
1. **SaaS Registration**: First user = account owner, beautiful UI
2. **Real-time Chat**: General and private messaging working flawlessly
3. **User Management**: Complete profiles, role management, admin controls
4. **Message System**: Proper identification, positioning, text encoding
5. **Data Structure**: Clean, normalized, following Redis best practices
6. **Admin Panel**: Real-time monitoring with accurate stats

### **✅ Solved Challenges**
- **HTML Encoding**: Fixed quotes/apostrophes display
- **User Identification**: Proper names instead of emails
- **Message Positioning**: Admin vs user messages correctly positioned
- **Data Consistency**: Normalized user structure across all endpoints
- **Demo Users**: Completely removed, clean registration flow

### **🎯 Ready for Deployment**
- **Core System**: Fully functional and tested
- **Local Testing**: Complete (session quirks normal for single-computer testing)
- **Production Ready**: All major functionality working
- **Mobile Optimized**: UI responsive and PWA-ready

---

## 💰 **Deployment Budget Breakdown ($200/month)**

```
Railway Pro: $50/month (Flask app + Postgres)
Redis Cloud: $60/month (global replication)
Zep Cloud: $50/month (AI knowledge graphs)
Cloudflare: $20/month (global CDN)
Monitoring: $20/month (error tracking, analytics)
Total: ~$200/month
```

---

## 🎯 **Next Development Phases**

### **Phase 1: Production Deployment (Next 30 days)**
- Deploy core chat system to Railway
- Set up Redis Cloud for global performance
- PWA optimization for mobile
- Test with 20-30 team members

### **Phase 2: AI Integration (After validation)**
- FastAPI + Zep knowledge graphs
- n8n workflow integration
- Streaming AI responses
- User/team memory systems

### **Phase 3: Native Apps (Within 1 year)**
- React Native development
- App Store/Google Play deployment
- Native feature integration (camera, location, push)

---

## 📊 **Success Metrics - ACHIEVED**

### **✅ Launch Success (Completed)**
- **✅ Production deployment**: Live on Railway + Redis Cloud
- **✅ Real-time messaging**: Working across mobile and desktop devices
- **✅ User registration**: SaaS onboarding functional with role assignment
- **✅ Mobile experience**: Responsive design working on phones
- **✅ Global accessibility**: Ready for international guide teams
- **✅ Professional branding**: "GuideOps Chat" throughout interface

### **🎯 Current Production Status**
- **Users**: Registration working, user profiles complete
- **Messaging**: Real-time delivery, embedded user identification
- **Admin Panel**: Live monitoring with accurate statistics
- **Performance**: Sub-second message delivery tested
- **Mobile**: Cross-device communication confirmed working

### **🔄 Next Phase Goals (AI Integration)**
- **AI assistant**: FastAPI + n8n + Zep knowledge graphs integration
- **Enhanced features**: File uploads, location sharing, advanced search
- **Native apps**: React Native development for iOS/Android
- **Scaling**: PostgreSQL migration when reaching 50+ users

---

## 🛠️ **Development Workflow Status**

### **Current Workflow (Functional but Manual)**
```
Backend Changes: Edit Flask → Push → Railway auto-deploys ✅
Frontend Changes: Edit React source + compiled JS → Push → Railway deploys ✅
```

### **Target Workflow (Professional)**
```
All Changes: Edit source only → Push → Auto-build → Auto-deploy ✅
```

### **Solutions for Professional Workflow:**
1. **Fix React build dependencies** (ajv conflicts) - see `fix-react-build.md`
2. **Separate frontend deployment** (Vercel for React, Railway for Flask)
3. **Updated development environment** (newer Node.js, React versions)

---

*This context file documents the complete journey from Stream Chat migration to live production SaaS chat system serving global guide teams.*

**Last Updated**: September 2025  
**Commit Hash**: 74495fb  
**Status**: ✅ LIVE IN PRODUCTION - Railway + Redis Cloud deployment successful
**URL**: `https://redis-guideops-chat-production.up.railway.app`



# **Context from a YouTube video Transcript**
# Basic Redis Chat App Demo Python (Flask)

Showcases how to impliment chat app in Python (Flask), Socket.IO and Redis. This example uses **pub/sub** feature combined with web-sockets for implementing the message communication between client and server.

<a href="https://github.com/redis-developer/basic-redis-chat-app-demo-python/raw/master/docs/screenshot000.png"><img src="https://github.com/redis-developer/basic-redis-chat-app-demo-python/raw/master/docs/screenshot000.png" width="49%"></a>
<a href="https://github.com/redis-developer/basic-redis-chat-app-demo-python/raw/master/docs/screenshot001.png"><img src="https://github.com/redis-developer/basic-redis-chat-app-demo-python/raw/master/docs/screenshot001.png" width="49%"></a>

# Overview video

Here's a short video that explains the project and how it uses Redis:

[![Watch the video on YouTube](https://github.com/redis-developer/basic-redis-chat-app-demo-python/raw/master/docs/YTThumbnail.png)](https://www.youtube.com/watch?v=miK7xDkDXF0)

## Technical Stacks

- Frontend - _React_, _Socket.IO_
- Backend - _Flask_, _Redis_

## How it works?

### Initialization

For simplicity, a key with **total_users** value is checked: if it does not exist, we fill the Redis database with initial data.
`EXISTS total_users` (checks if the key exists)

The demo data initialization is handled in multiple steps:

**Creating of demo users:**
We create a new user id: `INCR total_users`. Then we set a user ID lookup key by user name: **_e.g._** `SET username:nick user:1`. And finally, the rest of the data is written to the hash set: **_e.g._** `HSET user:1 username "nick" password "bcrypt_hashed_password"`.

Additionally, each user is added to the default "General" room. For handling rooms for each user, we have a set that holds the room ids. Here's an example command of how to add the room: **_e.g._** `SADD user:1:rooms "0"`.

**Populate private messages between users.**
At first, private rooms are created: if a private room needs to be established, for each user a room id: `room:1:2` is generated, where numbers correspond to the user ids in ascending order.

**_E.g._** Create a private room between 2 users: `SADD user:1:rooms 1:2` and `SADD user:2:rooms 1:2`.

Then we add messages to this room by writing to a sorted set:

**_E.g._** `ZADD room:1:2 1615480369 "{'from': 1, 'date': 1615480369, 'message': 'Hello', 'roomId': '1:2'}"`.

We use a stringified _JSON_ for keeping the message structure and simplify the implementation details for this demo-app.

**Populate the "General" room with messages.** Messages are added to the sorted set with id of the "General" room: `room:0`

### Registration

![How it works](docs/screenshot000.png)

Redis is used mainly as a database to keep the user/messages data and for sending messages between connected servers.

#### How the data is stored:

- The chat data is stored in various keys and various data types.
  - User data is stored in a hash set where each user entry contains the next values:
    - `username`: unique user name;
    - `password`: hashed password

* User hash set is accessed by key `user:{userId}`. The data for it stored with `HSET key field data`. User id is calculated by incrementing the `total_users`.

  - E.g `INCR total_users`

* Username is stored as a separate key (`username:{username}`) which returns the userId for quicker access.
  - E.g `SET username:Alex 4`

#### How the data is accessed:

- **Get User** `HGETALL user:{id}`

  - E.g `HGETALL user:2`, where we get data for the user with id: 2.

- **Online users:** will return ids of users which are online
  - E.g `SMEMBERS online_users`

#### Code Example: Prepare User Data in Redis HashSet

```Python
def create_user(username, password):
    username_key = make_username_key(username)
    # Create a user
    hashed_password = bcrypt.hashpw(str(password).encode("utf-8"), bcrypt.gensalt(10))
    next_id = redis_client.incr("total_users")
    user_key = f"user:{next_id}"
    redis_client.set(username_key, user_key)
    redis_client.hmset(user_key, {"username": username, "password": hashed_password})

    redis_client.sadd(f"user:{next_id}:rooms", "0")

    return {"id": next_id, "username": username}
```

### Rooms

![How it works](docs/screenshot001.png)

#### How the data is stored:

Each user has a set of rooms associated with them.

**Rooms** are sorted sets which contains messages where score is the timestamp for each message. Each room has a name associated with it.

- Rooms which user belongs too are stored at `user:{userId}:rooms` as a set of room ids.

  - E.g `SADD user:Alex:rooms 1`

- Set room name: `SET room:{roomId}:name {name}`
  - E.g `SET room:1:name General`

#### How the data is accessed:

- **Get room name** `GET room:{roomId}:name`.

  - E. g `GET room:0:name`. This should return "General"

- **Get room ids of a user:** `SMEMBERS user:{id}:rooms`.
  - E. g `SMEMBERS user:2:rooms`. This will return IDs of rooms for user with ID: 2

#### Code Example: Get all My Rooms

```Python
def get_rooms_for_user_id(user_id=0):
    """Get rooms for the selected user."""
    # We got the room ids
    room_ids = list(
        map(
            lambda x: x.decode("utf-8"),
            list(utils.redis_client.smembers(f"user:{user_id}:rooms")),
        )
    )
    rooms = []

    for room_id in room_ids:
        name = utils.redis_client.get(f"room:{room_id}:name")

        # It's a room without a name, likey the one with private messages
        if not name:
            room_exists = utils.redis_client.exists(f"room:{room_id}")
            if not room_exists:
                continue

            user_ids = room_id.split(":")
            if len(user_ids) != 2:
                return jsonify(None), 400

            rooms.append(
                {
                    "id": room_id,
                    "names": [
                        utils.hmget(f"user:{user_ids[0]}", "username"),
                        utils.hmget(f"user:{user_ids[1]}", "username"),
                    ],
                }
            )
        else:
            rooms.append({"id": room_id, "names": [name.decode("utf-8")]})
    return jsonify(rooms), 200
```

### Messages

#### Pub/sub

After initialization, a pub/sub subscription is created: `SUBSCRIBE MESSAGES`. At the same time, each server instance will run a listener on a message on this channel to receive real-time updates.

Again, for simplicity, each message is serialized to **_JSON_**, which we parse and then handle in the same manner, as WebSocket messages.

Pub/sub allows connecting multiple servers written in different platforms without taking into consideration the implementation detail of each server.

#### How the data is stored:

- Messages are stored at `room:{roomId}` key in a sorted set (as mentioned above). They are added with `ZADD room:{roomId} {timestamp} {message}` command. Message is serialized to an app-specific JSON string.
  - E.g `ZADD room:0 1617197047 { "From": "2", "Date": 1617197047, "Message": "Hello", "RoomId": "1:2" }`

#### How the data is accessed:

- **Get list of messages** `ZREVRANGE room:{roomId} {offset_start} {offset_end}`.
  - E.g `ZREVRANGE room:1:2 0 50` will return 50 messages with 0 offsets for the private room between users with IDs 1 and 2.

#### Code Example: Send Message

```Python
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
    msg = {
        "id": room_id,
        "names": [
            utils.hmget(f"user:{ids[0]}", "username"),
            utils.hmget(f"user:{ids[1]}", "username"),
        ],
    }
    publish("show.room", msg, broadcast=True)
utils.redis_client.zadd(room_key, {message_string: int(message["date"])})
```

### Session handling

The chat server works as a basic _REST_ API which involves keeping the session and handling the user state in the chat rooms (besides the WebSocket/real-time part).

When a WebSocket/real-time server is instantiated, which listens for the next events:

**Connection**. A new user is connected. At this point, a user ID is captured and saved to the session (which is cached in Redis). Note, that session caching is language/library-specific and it's used here purely for persistence and maintaining the state between server reloads.

A global set with `online_users` key is used for keeping the online state for each user. So on a new connection, a user ID is written to that set:

**E.g.** `SADD online_users 1` (We add user with id 1 to the set **online_users**).

After that, a message is broadcasted to the clients to notify them that a new user is joined the chat.

**Disconnect**. It works similarly to the connection event, except we need to remove the user for **online_users** set and notify the clients: `SREM online_users 1` (makes user with id 1 offline).

**Message**. A user sends a message, and it needs to be broadcasted to the other clients. The pub/sub allows us also to broadcast this message to all server instances which are connected to this Redis:

`PUBLISH message "{'serverId': 4132, 'type':'message', 'data': {'from': 1, 'date': 1615480369, 'message': 'Hello', 'roomId': '1:2'}}"`

Note we send additional data related to the type of the message and the server id. Server id is used to discard the messages by the server instance which sends them since it is connected to the same `MESSAGES` channel.

`type` field of the serialized JSON corresponds to the real-time method we use for real-time communication (connect/disconnect/message).

`data` is method-specific information. In the example above it's related to the new message.

#### How the data is stored / accessed:

The session data is stored in Redis by utilizing the [**redis**](https://pypi.org/project/redis/) client module.

```Python
class Config(object):
    # Parse redis environment variables.
    redis_endpoint_url = os.environ.get("REDIS_ENDPOINT_URL", "127.0.0.1:6379")
    REDIS_HOST, REDIS_PORT = tuple(redis_endpoint_url.split(":"))
    REDIS_PASSWORD = os.environ.get("REDIS_PASSWORD", None)
    SECRET_KEY = os.environ.get("SECRET_KEY", "Optional default value")
    SESSION_TYPE = "redis"
    redis_client = redis.Redis(
        host=REDIS_HOST, port=REDIS_PORT, password=REDIS_PASSWORD
    )
    SESSION_REDIS = redis_client
```

```Python
from flask_session import Session
sess = Session()
# ...
sess.init_app(app)
```

## How to run it locally?

#### Copy `.env.sample` to create `.env`. And provide the values for environment variables

    - REDIS_ENDPOINT_URI: Redis server URI
    - REDIS_PASSWORD: Password to the server

#### Run frontend

```sh
cd client
yarn install
yarn start
```

#### Run backend

Run with venv:

```sh
python app.py
```

## Try it out

#### Deploy to Heroku

<p>
    <a href="https://heroku.com/deploy" target="_blank">
        <img src="https://www.herokucdn.com/deploy/button.svg" alt="Deploy to Heorku" />
    </a>
</p>

#### Deploy to Google Cloud

<p>
    <a href="https://deploy.cloud.run" target="_blank">
        <img src="https://deploy.cloud.run/button.svg" alt="Run on Google Cloud" width="150px"/>
    </a>
</p>