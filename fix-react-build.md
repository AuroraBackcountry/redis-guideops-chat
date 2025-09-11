# 🔧 Fix React Build Dependencies

## Current Issue:
`Error: Cannot find module 'ajv/dist/compile/codegen'`

## Solutions (Pick One):

### Option 1: Node Version Management
```bash
# Use specific Node version
nvm use 16.20.0
cd client
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
npm run build
```

### Option 2: Dependency Upgrade
```bash
cd client
npm install ajv@^8.0.0 --save-dev
npm install @types/node@^16.0.0 --save-dev
npm run build
```

### Option 3: React Scripts Update
```bash
cd client
npm install react-scripts@5.0.1 --save
npm run build
```

### Option 4: Fresh React Setup
```bash
# Create new React app with current dependencies
npx create-react-app guideops-chat-new
# Copy your components over
# Much cleaner dependency tree
```

## Once Fixed:
```bash
# Normal workflow becomes:
1. Edit: client/src/components/Navbar.jsx
2. Build: npm run build  
3. Deploy: git add . && git commit && git push
4. Railway: Deploys automatically
```
