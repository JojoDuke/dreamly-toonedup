# Toonly AI Python Backend

Complete Python FastAPI backend for Toonly AI image transformation service.

## 🚀 Quick Start (Automated Setup)

### Option 1: Windows Batch Script (Easiest)
```bash
cd backend
setup.bat
```
This will automatically:
- Create virtual environment
- Install all dependencies
- Create .env.local template
- Start the server

### Option 2: Python Setup Script (Cross-platform)
```bash
cd backend
python setup.py
```

## 📋 Manual Setup

If you prefer to set up manually:

### 1. Create Virtual Environment
```bash
cd backend
python -m venv venv
```

### 2. Activate Virtual Environment

**Windows:**
```bash
venv\Scripts\activate
```

**Mac/Linux:**
```bash
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install --no-cache-dir -r requirements.txt
```

### 4. Configure Environment Variables

Create a `.env.local` file in the backend directory:

```env
OPENAI_API_KEY=sk-your-actual-openai-api-key-here
DATABASE_URL=postgresql://user:password@localhost:5432/database_name
```

**Note:** DATABASE_URL is optional. If not provided, the backend will work without database features (credits, user status).

### 5. Start the Server
```bash
python start.py
```

Server will run on: `http://localhost:3001`

## 🔧 Features

### Implemented Endpoints

- `GET /` - Health check
- `GET /api/user/credits` - Get user credits (requires DB)
- `GET /api/user/status` - Get subscription status (requires DB)
- `POST /api/transform-image` - Transform images (10 credits)
- `POST /api/edit-transformed-image` - Edit images (5 credits)
- `POST /api/absolute-cinema` - Create absolute cinema memes (10 credits)

### What's Included

✅ Image transformation with OpenAI
✅ Multi-image meme generation
✅ PostgreSQL database integration
✅ Credit system
✅ Template file handling
✅ CORS configuration
✅ Comprehensive logging

### What's Not Included (By Design)

❌ Authentication (no auth required)
❌ Email service
❌ Payment webhooks

## 📁 Project Structure

```
backend/
├── main.py              # Main FastAPI application
├── start.py             # Server startup script
├── setup.py             # Automated setup script
├── setup.bat            # Windows setup script
├── requirements.txt     # Python dependencies
├── env_template.txt     # Environment variable template
├── absolute-cinema-template.png
├── disaster-girl-template.png
└── venv/               # Virtual environment (created during setup)
```

## 🐛 Troubleshooting

### Import Error with OpenAI
If you get `TypeError: Client.__init__() got an unexpected keyword argument 'proxies'`:

```bash
pip uninstall openai httpx -y
pip cache purge
pip install openai==1.51.0 httpx==0.25.2
```

### Virtual Environment Issues
Delete and recreate:
```bash
deactivate
rmdir /s venv       # Windows
rm -rf venv         # Mac/Linux
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### Environment Variables Not Loading
Make sure `.env.local` is in the `backend` directory (not the root).

### Database Connection Errors
The backend will work without a database. Database features (credits, status) will simply be skipped if no DATABASE_URL is provided.

## 🔄 Deactivate Virtual Environment

When you're done working:
```bash
deactivate
```

## 📝 Notes

- Uses mock user ID (`test-user-001`) since auth is disabled
- Server runs on port 3001 (same as old Node.js backend)
- Frontend should point to `http://localhost:3001`
- Template images must be in the backend directory

## 💡 Development

To run with auto-reload during development:
```bash
uvicorn main:app --reload --port 3001
```

