# GuideOps Chat - Professional Team Communication

Real-time chat application for global guide teams with GPS location sharing, mobile-first design, and AI integration capabilities.

## 🌍 **Live Production System**

- **Frontend**: [Vercel Deployment](https://guideops-chat-frontend.vercel.app)
- **Backend**: [Railway API](https://redis-guideops-chat-production.up.railway.app)
- **Database**: Redis Cloud (US-West region)

## ✨ **Key Features**

- **🔐 SaaS Registration**: First user becomes account owner (super_admin)
- **💬 Real-time Messaging**: Instant delivery across devices globally
- **📱 Mobile-First**: Responsive design optimized for phones and tablets
- **📍 GPS Integration**: Optional location sharing in messages
- **👥 User Management**: Complete profiles with role-based permissions
- **🌐 Global Ready**: Optimized for international guide teams

## 🏗️ **Technical Architecture**

### **Frontend (Vercel)**
- **React 18** with modern hooks and context
- **Socket.IO Client** for real-time messaging
- **Axios** with credentials for API calls
- **Responsive Design** optimized for mobile-first usage

### **Backend (Railway)**
- **Flask** with Redis Cloud integration
- **Redis Streams** for message storage (V2 schema)
- **Socket.IO** for real-time communication
- **Server-Sent Events** for cross-platform messaging

### **Database (Redis Cloud)**
- **Redis Streams** for message storage with GPS metadata
- **User profiles** with role-based permissions
- **Session management** with cross-domain support
- **4-year retention** capability for compliance

## 🚀 **V2 Message Schema**

### **Unified Schema (Redis Streams)**
```json
{
  "message_id": "uuid-v4",
  "room_id": "0", 
  "author_id": "1",
  "text": "Hello team!",
  "ts_ms": 1757563715000,
  "lat": 49.2827,
  "long": -123.1207,
  "v": 2
}
```

### **Key Improvements Over V1:**
- **🔒 Server-side identity stamping** (client cannot spoof author)
- **📍 GPS coordinates** with validation (-90 to 90 lat, -180 to 180 long)
- **🔄 Deduplication** with Redis `dedupe:` keys
- **⚡ Redis Streams** for better performance and ordering
- **🎯 Single write path** for HTTP and Socket.IO

## 🔧 **API Endpoints**

### **V2 API (Current)**
```bash
# Authentication
POST /register          # Create account (first user = super_admin)
POST /login             # Login with email/password
GET  /me                # Get current user session

# Messaging (Redis Streams)
GET  /v2/rooms/{id}/messages    # Get messages with GPS metadata
POST /v2/rooms/{id}/messages    # Send message with optional GPS

# User Management
GET  /users/online      # Get online users
GET  /rooms/{user_id}   # Get user's rooms
GET  /admin            # Admin panel with live stats
```

### **Message Format (V2)**
```python
# Send message with GPS
POST /v2/rooms/0/messages
{
  "text": "Hello from Vancouver!",
  "lat": 49.2827,
  "long": -123.1207
}

# Response
{
  "ok": true,
  "message": {
    "message_id": "uuid-v4",
    "room_id": "0",
    "author_id": "1", 
    "text": "Hello from Vancouver!",
    "ts_ms": 1757563715000,
    "lat": 49.2827,
    "long": -123.1207,
    "v": 2
  }
}
```

## 🏗️ **Architecture Details**

### **Redis Streams Storage**
```bash
# Messages stored in streams (not ZSET)
stream:room:0    # General room messages
stream:room:1:2  # Private messages between users 1 and 2

# User data (unchanged)
user:1           # User profile hash
user:1:rooms     # Set of room IDs user belongs to
online_users     # Set of currently online user IDs
```

### **Security Features**
- **Server-side identity stamping** (client cannot spoof author_id)
- **Input validation** (GPS coordinates, message length)
- **Deduplication** (prevents duplicate messages)
- **Session management** (Redis-backed with cross-domain support)

## 🛠️ **Development Setup**

### **Prerequisites**
- **Node.js 16+** for React development
- **Python 3.9+** for Flask backend
- **Redis Cloud account** (or local Redis for development)

### **Environment Variables**
```bash
# Backend (Railway)
REDIS_URL=redis://default:password@host:port
SECRET_KEY=your-production-secret-key
FLASK_ENV=production
CHAT_CONFIG=chat.config.ConfigProd

# Frontend (Vercel)
REACT_APP_API_URL=https://redis-guideops-chat-production.up.railway.app
```

### **Local Development**
```bash
# Backend
PORT=3000 python3 app.py

# Frontend (if building locally)
cd client
npm install --legacy-peer-deps
npm start
```

## 🚀 **Production Deployment**

### **Current Architecture**
- **Frontend**: Vercel (auto-builds React from source)
- **Backend**: Railway (Flask + Redis Streams)
- **Database**: Redis Cloud (US-West region)

### **Deployment URLs**
- **Chat Application**: https://guideops-chat-frontend.vercel.app
- **Backend API**: https://redis-guideops-chat-production.up.railway.app
- **Admin Panel**: https://redis-guideops-chat-production.up.railway.app/admin

## 📊 **System Status**

### **✅ Working**
- **User registration** with role management
- **Real-time messaging** across devices
- **Admin panel** with live monitoring
- **Mobile-optimized** responsive design

### **🔄 In Progress**
- **V2 migration** to unified Redis Streams schema
- **GPS integration** for location-aware messaging
- **Socket.IO V2** handlers implementation

## 🎯 **Next: AI Integration**

Ready for **FastAPI + n8n + Zep** knowledge graphs integration for intelligent guide assistance.

---

*Built for global guide teams requiring reliable, mobile-first communication with GPS tracking and 4-year message retention.*
