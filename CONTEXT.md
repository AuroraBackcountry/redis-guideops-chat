# 🤖 AI Development Context - GuideOps Chat V2

*This file serves as a comprehensive context reference for AI assistants working on this project. It documents the V2 migration, current system architecture, and deployment strategy.*

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
- **✅ Codebase Cleanup**: Removed unused Python files, redundant documentation
- **🔄 In Progress**: Complete Socket.IO V2 handlers, test production system

---

## 🏗️ **V2 Architecture Decisions**

### **1. Redis Streams Migration**
**Decision**: Migrate from ZSET to Redis Streams for message storage
**Why**: Better performance, ordering guarantees, and metadata support
**Implementation**: 
- Messages stored in `stream:room:{id}` with XADD
- Unified schema with GPS coordinates and server timestamps
- Deduplication with `dedupe:` keys

### **2. Unified Message Schema**
**Decision**: Single V2 schema for all message operations
**Why**: Eliminates API conflicts and ensures data consistency
**Schema**:
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

### **3. Server-Side Identity Stamping**
**Decision**: Backend authorizes all message authors, ignore client identity fields
**Why**: Security and reliability for professional guide team communication
**Implementation**: 
- Session-based user authentication
- Strip client `author_id`, `from`, `username` fields
- Server stamps authoritative `author_id` from session

---

## 📁 **Current V2 System Files**

### **Backend V2 Core**
- **`app.py`** - Main Flask application entry point
- **`chat/app.py`** - Flask app with V2 Socket.IO setup and CORS
- **`chat/routes.py`** - Core API endpoints (user management, admin)
- **`chat/routes_redis_streams.py`** - **V2 API** - Redis Streams message endpoints
- **`chat/redis_streams.py`** - Redis Streams implementation with GPS support
- **`chat/message_validator.py`** - Unified schema validation (surgical plan)
- **`chat/socketio_v2.py`** - V2 Socket.IO handlers (minimal implementation)
- **`chat/config.py`** - Production configuration with cross-domain sessions
- **`chat/utils.py`** - Redis utilities and helper functions

### **Frontend V2 Core**
- **`client/src/App.jsx`** - Main React app using api-v2.js only
- **`client/src/api-v2.js`** - V2 API client with Redis Streams support
- **`client/src/pages/ChatPage.jsx`** - Main chat interface with GPS integration
- **`client/src/components/MessageListV2.jsx`** - Enhanced message display
- **`client/src/hooks.js`** - Socket.IO client and session management

### **AI Integration (Ready)**
- **`elrich-fastapi.py`** - FastAPI server for n8n + Zep integration

---

## 🚀 **Current V2 System Status**

### **✅ Production Infrastructure**
- **Frontend**: Vercel deployment with GitHub auto-build
- **Backend**: Railway Flask API with Redis Streams V2
- **Database**: Redis Cloud (US-West) with clean schema
- **Monitoring**: Comprehensive status page and admin panel

### **✅ V2 Features Implemented**
- **Unified Schema**: Single message format with GPS support
- **Security**: Server-side identity stamping and validation
- **Performance**: Redis Streams with deduplication
- **Mobile-First**: Responsive design for global guide teams

### **🔄 Current Focus**
- **Complete V2 migration**: Finish Socket.IO V2 handlers
- **Test production system**: Clean Redis + V2 schema
- **Prepare for AI integration**: FastAPI + n8n + Zep architecture

---

## 💰 **Production Deployment ($200/month budget)**

### **Current Costs:**
- **Railway**: ~$50/month (Flask backend)
- **Redis Cloud**: ~$60/month (US-West region, 1GB)
- **Vercel**: ~$0/month (frontend, within free tier)
- **Available**: ~$90/month for AI services (Zep, monitoring)

---

*This context file documents the V2 GuideOps Chat system with Redis Streams, GPS support, and unified schema for global guide teams.*

**Last Updated**: September 2025  
**Commit Hash**: 770eea4  
**Status**: 🔄 V2 MIGRATION - Clean codebase with unified Redis Streams schema
**Frontend**: `https://guideops-chat-frontend.vercel.app` (GitHub auto-deploy)
**Backend**: `https://redis-guideops-chat-production.up.railway.app` (generate domain)
