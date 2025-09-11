# Frontend Deployment Guide (Vercel)

## Environment Variables

### Local Development
Create a `.env.local` file in the client directory:

```bash
# Leave empty to use relative URLs (connects to local backend on port 5000)
REACT_APP_API_URL=
```

### Production (Vercel)
Set in Vercel dashboard or via CLI:

```bash
# Your Railway backend URL
REACT_APP_API_URL=https://redis-guideops-chat-production.up.railway.app
```

## Deployment Steps

### 1. Deploy to Vercel (recommended)
```bash
npm install -g vercel
cd client
vercel --prod
```

### 2. Alternative: Vercel GitHub Integration
1. Connect GitHub repo to Vercel
2. Set environment variable: `REACT_APP_API_URL`
3. Deploy automatically on git push

## Build Process

The React build issues are resolved by Vercel's build environment:
- Fresh Node.js environment
- Better dependency resolution  
- Automatic ajv/dependency conflict handling

## CORS Configuration

The backend has been configured to accept requests from:
- `http://localhost:3000` (local development)
- `https://*.vercel.app` (Vercel deployments)
- Your custom domain if configured

## Socket.IO Configuration

WebSocket connections will automatically use the same `REACT_APP_API_URL` for real-time communication.
