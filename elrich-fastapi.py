#!/usr/bin/env python3
"""
FastAPI server for Elrich AI bot with streaming responses.
Handles webhook integration with n8n and provides Server-Sent Events for real-time streaming.
"""

import asyncio
import json
import time
import uuid
from typing import Dict, Any, Optional
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Elrich AI Bot", version="1.0.0")

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://10.0.0.234:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
N8N_WEBHOOK_URL = "https://n8n-aurora-ai.com/webhook/stream/query-ai"

class User(BaseModel):
    id: str
    first_name: str
    last_name: str
    email: str

class Message(BaseModel):
    id: str
    text: str

class Location(BaseModel):
    lat: Optional[float] = None
    lon: Optional[float] = None
    accuracy: Optional[float] = None
    timestamp: Optional[int] = None

class ChatRequest(BaseModel):
    session_id: str
    user: User
    message: Message
    location: Location

class SimpleChatRequest(BaseModel):
    text: str
    user_id: str = "ben_a347d129407d"
    user_name: str = "Ben Johns"
    user_email: str = "benwillski@gmail.com"

@app.get("/")
async def root():
    return {"message": "Elrich AI Bot FastAPI Server", "status": "running"}

@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": time.time()}

@app.post("/chat")
async def chat_with_elrich(request: SimpleChatRequest):
    """
    Simple endpoint to chat with Elrich and get streaming response
    """
    # Generate session and message IDs
    session_id = f"session_{int(time.time() * 1000)}_{uuid.uuid4().hex[:6]}"
    message_id = f"msg_{int(time.time() * 1000)}{int(time.time() % 1000)}"
    
    # Split user name
    name_parts = request.user_name.split(' ')
    first_name = name_parts[0] if name_parts else "Unknown"
    last_name = ' '.join(name_parts[1:]) if len(name_parts) > 1 else ""
    
    # Prepare webhook payload
    webhook_payload = {
        "session_id": session_id,
        "user": {
            "id": request.user_id,
            "first_name": first_name,
            "last_name": last_name,
            "email": request.user_email
        },
        "message": {
            "id": message_id,
            "text": request.text
        },
        "location": {
            "lat": None,
            "lon": None,
            "accuracy": None,
            "timestamp": None
        }
    }
    
    print(f"🚀 Sending to n8n: {json.dumps(webhook_payload, indent=2)}")
    
    async def stream_response():
        """Generator function for streaming response"""
        try:
            async with httpx.AsyncClient() as client:
                async with client.stream(
                    'POST',
                    N8N_WEBHOOK_URL,
                    json=webhook_payload,
                    headers={'Content-Type': 'application/json'},
                    timeout=60.0
                ) as response:
                    if response.status_code == 200:
                        print("✅ Connected to n8n, streaming response...")
                        
                        accumulated_text = ""
                        buffer = ""
                        
                        async for chunk in response.aiter_text():
                            if not chunk:
                                continue
                                
                            buffer += chunk
                            lines = buffer.split('\n')
                            buffer = lines.pop()  # Keep incomplete line
                            
                            for line in lines:
                                if not line.strip():
                                    continue
                                    
                                try:
                                    data = json.loads(line)
                                    if data.get('type') == 'item' and data.get('content'):
                                        accumulated_text += data['content']
                                        
                                        # Send Server-Sent Event
                                        sse_data = {
                                            "type": "message_update",
                                            "text": accumulated_text,
                                            "word_count": len(accumulated_text.split())
                                        }
                                        
                                        yield f"data: {json.dumps(sse_data)}\n\n"
                                        print(f"📤 Streamed: {len(accumulated_text)} chars")
                                        
                                except json.JSONDecodeError:
                                    continue
                        
                        # Send final message
                        final_data = {
                            "type": "message_complete",
                            "text": accumulated_text,
                            "final": True
                        }
                        yield f"data: {json.dumps(final_data)}\n\n"
                        print("🎉 Streaming completed")
                        
                    else:
                        error_data = {
                            "type": "error",
                            "message": f"n8n webhook failed: {response.status_code}"
                        }
                        yield f"data: {json.dumps(error_data)}\n\n"
                        
        except Exception as e:
            print(f"❌ Streaming error: {e}")
            error_data = {
                "type": "error", 
                "message": f"Streaming failed: {str(e)}"
            }
            yield f"data: {json.dumps(error_data)}\n\n"
    
    return StreamingResponse(
        stream_response(),
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream",
        }
    )

@app.post("/webhook")
async def receive_webhook(request: ChatRequest):
    """
    Advanced endpoint that matches your exact webhook format
    """
    print(f"📨 Webhook received: {request.message.text}")
    print(f"👤 From user: {request.user.first_name} {request.user.last_name}")
    
    # Forward to n8n and return response
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                N8N_WEBHOOK_URL,
                json=request.dict(),
                headers={'Content-Type': 'application/json'},
                timeout=30.0
            )
            
            if response.status_code == 200:
                return {"status": "success", "response": response.text}
            else:
                raise HTTPException(status_code=response.status_code, detail="n8n webhook failed")
                
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting Elrich FastAPI server...")
    print("📡 Endpoints:")
    print("   POST /chat - Simple chat with streaming")
    print("   POST /webhook - Full webhook format")
    print("   GET /health - Health check")
    
    uvicorn.run(app, host="0.0.0.0", port=3002)
